# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass

from genlayer import *

ST_OPEN = "open"
ST_ACTIVE = "active"
ST_RESOLVED = "resolved"
ST_CANCELLED = "cancelled"

SIDE_CREATOR = "creator"
SIDE_CHALLENGERS = "challengers"
SIDE_DRAW = "draw"
SIDE_UNRESOLVABLE = "unresolvable"

MARKET_BINARY = "binary"
MARKET_MONEYLINE = "moneyline"
MARKET_SPREAD = "spread"
MARKET_TOTAL = "total"
MARKET_PROP = "prop"
MARKET_CUSTOM = "custom"

ODDS_POOL = "pool"
ODDS_FIXED = "fixed"

VISIBILITY_PUBLIC = "public"
VISIBILITY_PRIVATE = "private"

MAX_CHALLENGERS = 100
DEFAULT_FIXED_PAYOUT_BPS = 20000
MIN_STAKE = 2


@allow_storage
@dataclass
class Claim:
    creator: Address
    question: str
    creator_position: str
    counter_position: str
    resolution_url: str
    creator_stake: u256
    total_challenger_stake: u256
    reserved_creator_liability: u256
    deadline: u256
    state: str
    winner_side: str
    resolution_summary: str
    confidence: u256
    category: str
    parent_id: u256
    challenger_count: u256
    created_at: u256
    market_type: str
    odds_mode: str
    challenger_payout_bps: u256
    handicap_line: str
    settlement_rule: str
    max_challengers: u256
    visibility: str
    invite_key: str


class ProvenContract(gl.Contract):
    claims: TreeMap[u256, Claim]
    claim_count: u256
    ch_addr: TreeMap[u256, Address]
    ch_amount: TreeMap[u256, u256]
    wins: TreeMap[Address, u256]
    losses: TreeMap[Address, u256]
    total_resolved: u256

    def __init__(self):
        self.claim_count = u256(0)
        self.total_resolved = u256(0)

    def _k(self, claim_id: u256, index: u256) -> u256:
        return u256(claim_id * u256(MAX_CHALLENGERS) + index)

    def _txt(self, value: str, fallback: str = "") -> str:
        if value is None:
            return fallback
        value = value.strip()
        return value if value else fallback

    def _pick(self, value: str, fallback: str, valid: tuple, msg: str) -> str:
        value = self._txt(value, fallback).lower()
        if value not in valid:
            raise gl.vm.UserError(msg)
        return value

    def _cat(self, value: str) -> str:
        return self._txt(value, "custom")

    def _market(self, value: str) -> str:
        return self._pick(
            value,
            MARKET_BINARY,
            (
                MARKET_BINARY,
                MARKET_MONEYLINE,
                MARKET_SPREAD,
                MARKET_TOTAL,
                MARKET_PROP,
                MARKET_CUSTOM,
            ),
            "Unsupported market type",
        )

    def _odds(self, value: str) -> str:
        return self._pick(
            value,
            ODDS_POOL,
            (ODDS_POOL, ODDS_FIXED),
            "Unsupported odds mode",
        )

    def _vis(self, value: str) -> str:
        return self._pick(
            value,
            VISIBILITY_PUBLIC,
            (VISIBILITY_PUBLIC, VISIBILITY_PRIVATE),
            "Unsupported visibility mode",
        )

    def _max_ch(self, count: u256) -> u256:
        if count <= u256(0):
            return u256(MAX_CHALLENGERS)
        if count > u256(MAX_CHALLENGERS):
            raise gl.vm.UserError("Maximum challengers exceeds platform limit")
        return count

    def _bps(self, odds_mode: str, payout_bps: u256) -> u256:
        if odds_mode != ODDS_FIXED:
            return u256(0)
        if payout_bps <= u256(0):
            payout_bps = u256(DEFAULT_FIXED_PAYOUT_BPS)
        if payout_bps < u256(10000):
            raise gl.vm.UserError("Fixed odds payout must be at least 10000 bps")
        return payout_bps

    def _rule(self, category: str, market_type: str) -> str:
        if category == "deportes":
            if market_type == MARKET_SPREAD:
                return "Use official score and apply line exactly."
            if market_type == MARKET_TOTAL:
                return "Use official score and grade total exactly."
            return "Use official result; include OT or penalties only if stated."
        if category == "crypto":
            return "Use linked price source at deadline."
        if category == "clima":
            return "Use linked weather source for the stated place and date."
        if category == "cultura":
            return "Use the linked official result only."
        if market_type == MARKET_CUSTOM:
            return "Use linked source only; ambiguity means UNRESOLVABLE."
        return "Use positions exactly as written."

    def _require_stake(self, amount: u256):
        if amount < u256(MIN_STAKE):
            raise gl.vm.UserError(f"Stake must be at least {MIN_STAKE}")
        if gl.message.value != amount:
            raise gl.vm.UserError("Sent value must equal stake amount")

    def _gross(self, amount: u256, payout_bps: u256) -> u256:
        return u256((amount * payout_bps) // u256(10000))

    def _creator_liability(self, amount: u256, payout_bps: u256) -> u256:
        gross = self._gross(amount, payout_bps)
        return u256(0) if gross <= amount else u256(gross - amount)

    def _avail_liability(self, claim: Claim) -> u256:
        if claim.reserved_creator_liability >= claim.creator_stake:
            return u256(0)
        return u256(claim.creator_stake - claim.reserved_creator_liability)

    def _addr(self, value) -> Address:
        return value if isinstance(value, Address) else Address(str(value))

    def _transfer(self, addr: Address, amount: u256):
        if amount > u256(0):
            gl.get_contract_at(addr).emit_transfer(value=amount)

    def _bump(self, store: TreeMap[Address, u256], addr: Address):
        current = store[addr] if addr in store else u256(0)
        store[addr] = u256(current + u256(1))

    def _claim(self, claim_id: u256) -> Claim:
        if claim_id not in self.claims:
            raise gl.vm.UserError("Claim not found")
        return self.claims[claim_id]

    def _public_only(self, claim: Claim):
        if claim.visibility == VISIBILITY_PRIVATE:
            raise gl.vm.UserError("Private claim requires access link")

    def _check_access(self, claim: Claim, invite_key: str = ""):
        if claim.visibility != VISIBILITY_PRIVATE:
            return
        invite_key = self._txt(invite_key)
        if not invite_key or invite_key != claim.invite_key:
            raise gl.vm.UserError("Private claim requires a valid invite link")

    def _claim_to_dict(self, claim_id: u256, include_challengers: bool) -> dict:
        claim = self._claim(claim_id)
        ch_count = int(claim.challenger_count)
        challengers = []
        challenger_addresses = []
        first_challenger = ""

        for i in range(ch_count):
            key = self._k(claim_id, u256(i))
            challenger_address = str(self.ch_addr[key])
            if i == 0:
                first_challenger = challenger_address
            challenger_addresses.append(challenger_address)
            if include_challengers:
                stake = self.ch_amount[key]
                payout = (
                    self._gross(stake, claim.challenger_payout_bps)
                    if claim.odds_mode == ODDS_FIXED
                    else stake
                )
                challengers.append(
                    {
                        "address": challenger_address,
                        "stake": int(stake),
                        "potential_payout": int(payout),
                    }
                )

        result = {
            "id": int(claim_id),
            "creator": str(claim.creator),
            "question": claim.question,
            "creator_position": claim.creator_position,
            "counter_position": claim.counter_position,
            "resolution_url": claim.resolution_url,
            "creator_stake": int(claim.creator_stake),
            "total_challenger_stake": int(claim.total_challenger_stake),
            "reserved_creator_liability": int(claim.reserved_creator_liability),
            "available_creator_liability": int(self._avail_liability(claim)),
            "deadline": int(claim.deadline),
            "state": claim.state,
            "winner_side": claim.winner_side,
            "resolution_summary": claim.resolution_summary,
            "confidence": int(claim.confidence),
            "category": claim.category,
            "parent_id": int(claim.parent_id),
            "challenger_count": ch_count,
            "market_type": claim.market_type,
            "odds_mode": claim.odds_mode,
            "challenger_payout_bps": int(claim.challenger_payout_bps),
            "handicap_line": claim.handicap_line,
            "settlement_rule": claim.settlement_rule,
            "max_challengers": int(claim.max_challengers),
            "created_at": int(claim.created_at),
            "visibility": claim.visibility,
            "is_private": claim.visibility == VISIBILITY_PRIVATE,
            "first_challenger": first_challenger,
            "challenger_addresses": challenger_addresses,
            "total_pot": int(claim.creator_stake + claim.total_challenger_stake),
        }
        if include_challengers:
            result["challengers"] = challengers
        return result

    def _create_claim(
        self,
        question: str,
        creator_position: str,
        counter_position: str,
        resolution_url: str,
        deadline: u256,
        stake_amount: u256,
        category: str,
        parent_id: u256,
        market_type: str,
        odds_mode: str,
        challenger_payout_bps: u256,
        handicap_line: str,
        settlement_rule: str,
        max_challengers: u256,
        visibility: str,
        invite_key: str,
    ) -> int:
        question = self._txt(question)
        creator_position = self._txt(creator_position)
        counter_position = self._txt(counter_position)
        resolution_url = self._txt(resolution_url)
        handicap_line = self._txt(handicap_line)
        settlement_rule = self._txt(settlement_rule)
        category = self._cat(category)
        market_type = self._market(market_type)
        odds_mode = self._odds(odds_mode)
        max_challengers = self._max_ch(max_challengers)
        challenger_payout_bps = self._bps(odds_mode, challenger_payout_bps)
        visibility = self._vis(visibility)
        invite_key = self._txt(invite_key)

        if not question:
            raise gl.vm.UserError("Question cannot be empty")
        if not creator_position:
            raise gl.vm.UserError("Creator position cannot be empty")
        if not counter_position:
            raise gl.vm.UserError("Counter position cannot be empty")
        if not resolution_url:
            raise gl.vm.UserError("Verification source is required")
        if visibility == VISIBILITY_PRIVATE and not invite_key:
            raise gl.vm.UserError("Private claims require an invite key")
        self._require_stake(stake_amount)
        if parent_id > u256(0) and parent_id not in self.claims:
            raise gl.vm.UserError("Parent claim not found")

        self.claim_count = u256(self.claim_count + u256(1))
        claim_id = self.claim_count
        self.claims[claim_id] = Claim(
            creator=gl.message.sender_address,
            question=question,
            creator_position=creator_position,
            counter_position=counter_position,
            resolution_url=resolution_url,
            creator_stake=stake_amount,
            total_challenger_stake=u256(0),
            reserved_creator_liability=u256(0),
            deadline=deadline,
            state=ST_OPEN,
            winner_side="",
            resolution_summary="",
            confidence=u256(0),
            category=category,
            parent_id=parent_id,
            challenger_count=u256(0),
            created_at=u256(0),
            market_type=market_type,
            odds_mode=odds_mode,
            challenger_payout_bps=challenger_payout_bps,
            handicap_line=handicap_line,
            settlement_rule=settlement_rule,
            max_challengers=max_challengers,
            visibility=visibility,
            invite_key=invite_key,
        )
        return int(claim_id)

    @gl.public.write.payable
    def create_claim(
        self,
        question: str,
        creator_position: str,
        counter_position: str,
        resolution_url: str,
        deadline: u256,
        stake_amount: u256,
        category: str = "custom",
        parent_id: u256 = u256(0),
        market_type: str = MARKET_BINARY,
        odds_mode: str = ODDS_POOL,
        challenger_payout_bps: u256 = u256(0),
        handicap_line: str = "",
        settlement_rule: str = "",
        max_challengers: u256 = u256(0),
        visibility: str = VISIBILITY_PUBLIC,
        invite_key: str = "",
    ) -> int:
        return self._create_claim(
            question,
            creator_position,
            counter_position,
            resolution_url,
            deadline,
            stake_amount,
            category,
            parent_id,
            market_type,
            odds_mode,
            challenger_payout_bps,
            handicap_line,
            settlement_rule,
            max_challengers,
            visibility,
            invite_key,
        )

    @gl.public.write.payable
    def create_rematch(
        self,
        parent_id: u256,
        deadline: u256,
        stake_amount: u256,
        question: str = "",
        creator_position: str = "",
        counter_position: str = "",
        resolution_url: str = "",
        category: str = "",
        market_type: str = "",
        odds_mode: str = "",
        challenger_payout_bps: u256 = u256(0),
        handicap_line: str = "",
        settlement_rule: str = "",
        max_challengers: u256 = u256(0),
        visibility: str = "",
        invite_key: str = "",
    ) -> int:
        parent = self._claim(parent_id)
        if challenger_payout_bps <= u256(0):
            challenger_payout_bps = parent.challenger_payout_bps
        if max_challengers <= u256(0):
            max_challengers = parent.max_challengers
        return self._create_claim(
            self._txt(question, parent.question),
            self._txt(creator_position, parent.creator_position),
            self._txt(counter_position, parent.counter_position),
            self._txt(resolution_url, parent.resolution_url),
            deadline,
            stake_amount,
            self._txt(category, parent.category),
            parent_id,
            self._txt(market_type, parent.market_type),
            self._txt(odds_mode, parent.odds_mode),
            challenger_payout_bps,
            self._txt(handicap_line, parent.handicap_line),
            self._txt(settlement_rule, parent.settlement_rule),
            max_challengers,
            self._txt(visibility, parent.visibility),
            self._txt(invite_key, parent.invite_key),
        )

    @gl.public.write.payable
    def challenge_claim(self, claim_id: u256, stake_amount: u256, invite_key: str = ""):
        claim = self._claim(claim_id)
        if claim.state != ST_OPEN and claim.state != ST_ACTIVE:
            raise gl.vm.UserError("Claim is not accepting challengers")
        if gl.message.sender_address == claim.creator:
            raise gl.vm.UserError("Cannot challenge your own claim")
        if claim.visibility == VISIBILITY_PRIVATE:
            invite_key = self._txt(invite_key)
            if not invite_key or invite_key != claim.invite_key:
                raise gl.vm.UserError("Valid private invite link required")
        self._require_stake(stake_amount)

        count = int(claim.challenger_count)
        if count >= int(claim.max_challengers):
            raise gl.vm.UserError("Maximum challengers reached")
        for i in range(count):
            if self.ch_addr[self._k(claim_id, u256(i))] == gl.message.sender_address:
                raise gl.vm.UserError("Already challenged this claim")

        if claim.odds_mode == ODDS_FIXED:
            liability = self._creator_liability(stake_amount, claim.challenger_payout_bps)
            if liability > self._avail_liability(claim):
                raise gl.vm.UserError("Not enough creator liquidity at these odds")
            claim.reserved_creator_liability = u256(claim.reserved_creator_liability + liability)

        key = self._k(claim_id, u256(count))
        self.ch_addr[key] = gl.message.sender_address
        self.ch_amount[key] = stake_amount
        claim.total_challenger_stake = u256(claim.total_challenger_stake + stake_amount)
        claim.challenger_count = u256(claim.challenger_count + u256(1))
        claim.state = ST_ACTIVE
        self.claims[claim_id] = claim

    @gl.public.write
    def resolve_claim(self, claim_id: u256):
        claim = self._claim(claim_id)
        if claim.state != ST_ACTIVE:
            raise gl.vm.UserError("Claim must have challengers before resolving")

        question = str(claim.question)
        creator_pos = str(claim.creator_position)
        counter_pos = str(claim.counter_position)
        source_url = str(claim.resolution_url)
        market_type = str(claim.market_type)
        odds_mode = str(claim.odds_mode)
        line = str(claim.handicap_line) or "-"
        rule = str(claim.settlement_rule) or self._rule(str(claim.category), market_type)

        def leader_fn():
            evidence = "No source. Use general knowledge only if highly confident; else UNRESOLVABLE."
            if source_url:
                res = gl.nondet.web.get(source_url)
                if res.body is not None:
                    body = res.body.decode("utf-8")
                    evidence = body[:5000] if len(body) > 5000 else body

            prompt = (
                'Return JSON only: {"verdict":"CREATOR_WINS|CHALLENGERS_WIN|DRAW|UNRESOLVABLE",'
                '"confidence":0-100,"explanation":"short"}\n'
                f"q:{question}\ncreator:{creator_pos}\nchallengers:{counter_pos}\n"
                f"cat:{claim.category}\ntype:{market_type}\nodds:{odds_mode}\n"
                f"line:{line}\nrule:{rule}\nsource:{source_url or 'none'}\n"
                f"evidence:\n{evidence}"
            )
            data = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(data, dict):
                return {"verdict": SIDE_UNRESOLVABLE, "confidence": 0, "explanation": "AI returned invalid format"}

            verdict = {
                "CREATOR_WINS": SIDE_CREATOR,
                "CHALLENGERS_WIN": SIDE_CHALLENGERS,
                "DRAW": SIDE_DRAW,
                "UNRESOLVABLE": SIDE_UNRESOLVABLE,
            }.get(data.get("verdict", "UNRESOLVABLE"), SIDE_UNRESOLVABLE)

            try:
                confidence = max(0, min(100, int(data.get("confidence", 50))))
            except Exception:
                confidence = 50

            return {
                "verdict": verdict,
                "confidence": confidence,
                "explanation": data.get("explanation", "No explanation provided"),
            }

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            calldata = leader_result.calldata
            if not isinstance(calldata, dict) or "verdict" not in calldata:
                return False
            return leader_fn()["verdict"] == calldata["verdict"]

        outcome = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        claim.state = ST_RESOLVED
        claim.winner_side = outcome["verdict"]
        claim.resolution_summary = outcome["explanation"]
        claim.confidence = u256(outcome["confidence"])
        self.claims[claim_id] = claim

        creator_stake = claim.creator_stake
        total_ch = claim.total_challenger_stake
        total_pot = u256(creator_stake + total_ch)
        ch_count = int(claim.challenger_count)

        if outcome["verdict"] == SIDE_CREATOR:
            self._transfer(claim.creator, total_pot)
            self._bump(self.wins, claim.creator)
            for i in range(ch_count):
                self._bump(self.losses, self.ch_addr[self._k(claim_id, u256(i))])

        elif outcome["verdict"] == SIDE_CHALLENGERS:
            paid_out = u256(0)
            self._bump(self.losses, claim.creator)
            for i in range(ch_count):
                key = self._k(claim_id, u256(i))
                addr = self.ch_addr[key]
                stake = self.ch_amount[key]
                payout = (
                    self._gross(stake, claim.challenger_payout_bps)
                    if claim.odds_mode == ODDS_FIXED
                    else u256(stake + ((stake * creator_stake) // total_ch))
                    if total_ch > u256(0)
                    else stake
                )
                paid_out = u256(paid_out + payout)
                self._transfer(addr, payout)
                self._bump(self.wins, addr)
            if claim.odds_mode == ODDS_FIXED and total_pot > paid_out:
                self._transfer(claim.creator, u256(total_pot - paid_out))

        else:
            self._transfer(claim.creator, creator_stake)
            for i in range(ch_count):
                key = self._k(claim_id, u256(i))
                self._transfer(self.ch_addr[key], self.ch_amount[key])

        self.total_resolved = u256(self.total_resolved + u256(1))

    @gl.public.write
    def cancel_claim(self, claim_id: u256):
        claim = self._claim(claim_id)
        if claim.state != ST_OPEN:
            raise gl.vm.UserError("Can only cancel claims with no challengers")
        if gl.message.sender_address != claim.creator:
            raise gl.vm.UserError("Only creator can cancel")
        claim.state = ST_CANCELLED
        self.claims[claim_id] = claim
        self._transfer(claim.creator, claim.creator_stake)

    @gl.public.view
    def get_claim(self, claim_id: u256) -> dict:
        claim = self._claim(claim_id)
        self._public_only(claim)
        return self._claim_to_dict(claim_id, True)

    @gl.public.view
    def get_claim_summary(self, claim_id: u256) -> dict:
        claim = self._claim(claim_id)
        self._public_only(claim)
        return self._claim_to_dict(claim_id, False)

    @gl.public.view
    def get_claim_with_access(self, claim_id: u256, invite_key: str = "") -> dict:
        claim = self._claim(claim_id)
        self._check_access(claim, invite_key)
        return self._claim_to_dict(claim_id, True)

    @gl.public.view
    def get_claim_summary_with_access(self, claim_id: u256, invite_key: str = "") -> dict:
        claim = self._claim(claim_id)
        self._check_access(claim, invite_key)
        return self._claim_to_dict(claim_id, False)

    @gl.public.view
    def get_claim_summaries(self, start_id: u256 = u256(1), limit: u256 = u256(50)) -> list:
        items = []
        total = int(self.claim_count)
        start = max(1, int(start_id))
        limit = min(100, int(limit))
        if limit <= 0 or start > total:
            return items
        end = min(total + 1, start + limit)
        for claim_num in range(start, end):
            claim_id = u256(claim_num)
            if claim_id in self.claims and self.claims[claim_id].visibility != VISIBILITY_PRIVATE:
                items.append(self._claim_to_dict(claim_id, False))
        return items

    @gl.public.view
    def get_claim_count(self) -> int:
        return int(self.claim_count)

    @gl.public.view
    def get_user_claims(self, user_address: str) -> list:
        addr = self._addr(user_address)
        items = []
        for claim_num in range(int(self.claim_count)):
            claim_id = u256(claim_num + 1)
            if claim_id not in self.claims:
                continue
            claim = self.claims[claim_id]
            if claim.creator == addr:
                items.append(int(claim_id))
                continue
            for j in range(int(claim.challenger_count)):
                if self.ch_addr[self._k(claim_id, u256(j))] == addr:
                    items.append(int(claim_id))
                    break
        return items

    @gl.public.view
    def get_user_claim_summaries(self, user_address: str) -> list:
        return [self._claim_to_dict(u256(claim_id), False) for claim_id in self.get_user_claims(user_address)]

    @gl.public.view
    def get_open_claims(self) -> list:
        items = []
        for claim_num in range(int(self.claim_count)):
            claim_id = u256(claim_num + 1)
            if claim_id not in self.claims:
                continue
            claim = self.claims[claim_id]
            if claim.visibility == VISIBILITY_PRIVATE:
                continue
            if claim.state == ST_OPEN or claim.state == ST_ACTIVE:
                items.append(int(claim_id))
        return items

    @gl.public.view
    def get_open_claim_summaries(self) -> list:
        return [self._claim_to_dict(u256(claim_id), False) for claim_id in self.get_open_claims()]

    @gl.public.view
    def get_claims_by_parent(self, parent_id: u256) -> list:
        items = []
        for claim_num in range(int(self.claim_count)):
            claim_id = u256(claim_num + 1)
            if claim_id in self.claims and self.claims[claim_id].parent_id == parent_id:
                items.append(int(claim_id))
        return items

    @gl.public.view
    def get_user_stats(self, user_address: str) -> dict:
        addr = self._addr(user_address)
        wins = int(self.wins[addr]) if addr in self.wins else 0
        losses = int(self.losses[addr]) if addr in self.losses else 0
        return {"wins": wins, "losses": losses, "total": wins + losses}

    @gl.public.view
    def get_pool(self) -> int:
        return int(self.balance)

    @gl.public.view
    def get_platform_stats(self) -> dict:
        return {
            "total_claims": int(self.claim_count),
            "total_resolved": int(self.total_resolved),
            "total_pool": int(self.balance),
        }

    @gl.public.view
    def get_rivalry_chain(self, claim_id: u256) -> list:
        self._claim(claim_id)
        root = claim_id
        seen = set()
        while True:
            if int(root) in seen:
                break
            seen.add(int(root))
            parent_id = self.claims[root].parent_id
            if parent_id == u256(0) or parent_id not in self.claims:
                break
            root = parent_id

        chain = [int(root)]
        chain_seen = {int(root)}
        changed = True
        total = int(self.claim_count)
        while changed:
            changed = False
            for claim_num in range(total):
                claim_id = u256(claim_num + 1)
                if int(claim_id) in chain_seen or claim_id not in self.claims:
                    continue
                if int(self.claims[claim_id].parent_id) in chain_seen:
                    chain.append(int(claim_id))
                    chain_seen.add(int(claim_id))
                    changed = True
        return chain
