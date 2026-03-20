# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json
import typing

# ════════════════════════════════════════════════════
# PROVEN — The Truth Machine
# 1v1 prediction challenges settled by AI
# ════════════════════════════════════════════════════

STATE_OPEN = "open"
STATE_ACCEPTED = "accepted"
STATE_RESOLVED = "resolved"
STATE_CANCELLED = "cancelled"

VERDICT_CREATOR_WINS = "CREATOR_WINS"
VERDICT_OPPONENT_WINS = "OPPONENT_WINS"
VERDICT_DRAW = "DRAW"
VERDICT_UNRESOLVABLE = "UNRESOLVABLE"


@allow_storage
@dataclass
class VS:
    creator: Address
    opponent: Address
    question: str
    creator_position: str
    opponent_position: str
    resolution_url: str
    stake_amount: u256
    deadline: u256
    state: str
    winner: Address
    resolution_summary: str
    created_at: u256
    category: str


class ProvenContract(gl.Contract):
    duels: TreeMap[u256, VS]
    duel_count: u256
    user_duels: TreeMap[Address, DynArray[u256]]

    def __init__(self):
        self.duel_count = u256(0)

    @gl.public.write.payable
    def create_vs(
        self,
        question: str,
        creator_position: str,
        opponent_position: str,
        resolution_url: str,
        deadline: u256,
        stake_amount: u256,
        category: str,
    ):
        if not question:
            raise gl.UserError("Question cannot be empty")
        if not creator_position:
            raise gl.UserError("Creator position cannot be empty")
        if not opponent_position:
            raise gl.UserError("Opponent position cannot be empty")
        if not resolution_url:
            raise gl.UserError("Resolution URL cannot be empty")
        if stake_amount <= u256(0):
            raise gl.UserError("Stake must be greater than zero")

        self.duel_count = u256(self.duel_count + 1)
        vs_id = self.duel_count

        vs = VS(
            creator=gl.message.sender_address,
            opponent=Address("0x0000000000000000000000000000000000000000"),
            question=question,
            creator_position=creator_position,
            opponent_position=opponent_position,
            resolution_url=resolution_url,
            stake_amount=stake_amount,
            deadline=deadline,
            state=STATE_OPEN,
            winner=Address("0x0000000000000000000000000000000000000000"),
            resolution_summary="",
            created_at=u256(0),
            category=category,
        )

        self.duels[vs_id] = vs

        if gl.message.sender_address not in self.user_duels:
            self.user_duels[gl.message.sender_address] = DynArray[u256]()
        self.user_duels[gl.message.sender_address].append(vs_id)

        return int(vs_id)

    @gl.public.write.payable
    def accept_vs(self, vs_id: u256):
        if vs_id not in self.duels:
            raise gl.UserError("VS not found")
        vs = self.duels[vs_id]
        if vs.state != STATE_OPEN:
            raise gl.UserError("VS is not open")
        if gl.message.sender_address == vs.creator:
            raise gl.UserError("Creator cannot accept their own VS")

        vs.opponent = gl.message.sender_address
        vs.state = STATE_ACCEPTED
        self.duels[vs_id] = vs

        if gl.message.sender_address not in self.user_duels:
            self.user_duels[gl.message.sender_address] = DynArray[u256]()
        self.user_duels[gl.message.sender_address].append(vs_id)

    @gl.public.write
    def resolve_vs(self, vs_id: u256):
        if vs_id not in self.duels:
            raise gl.UserError("VS not found")
        vs = self.duels[vs_id]
        if vs.state != STATE_ACCEPTED:
            raise gl.UserError("VS must be accepted before resolving")

        # Copy to memory for nondet block
        m_q = str(vs.question)
        m_cp = str(vs.creator_position)
        m_op = str(vs.opponent_position)
        m_url = str(vs.resolution_url)

        def leader_fn():
            web_response = gl.nondet.web.get(m_url)
            web_data = web_response.body.decode("utf-8")
            if len(web_data) > 6000:
                web_data = web_data[:6000]

            prompt = f"""You are an impartial judge resolving a bet between two people.
Analyze the web evidence and determine who won.

THE BET:
Question: "{m_q}"
Person A (Creator) bet: "{m_cp}"
Person B (Opponent) bet: "{m_op}"

EVIDENCE FROM THE WEB (source: {m_url}):
---
{web_data}
---

RULES:
1. Base your decision ONLY on the evidence provided.
2. If evidence clearly supports Person A, respond CREATOR_WINS.
3. If evidence clearly supports Person B, respond OPPONENT_WINS.
4. If result is a tie/draw, respond DRAW.
5. If event hasn't happened, results unavailable, or evidence insufficient, respond UNRESOLVABLE.

Respond ONLY as JSON:
{{"verdict": "CREATOR_WINS", "explanation": "one sentence"}}

Valid verdicts: CREATOR_WINS, OPPONENT_WINS, DRAW, UNRESOLVABLE"""

            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                return {"verdict": VERDICT_UNRESOLVABLE, "explanation": "AI returned invalid format"}

            verdict = result.get("verdict", VERDICT_UNRESOLVABLE)
            explanation = result.get("explanation", "No explanation provided")
            valid = [VERDICT_CREATOR_WINS, VERDICT_OPPONENT_WINS, VERDICT_DRAW, VERDICT_UNRESOLVABLE]
            if verdict not in valid:
                verdict = VERDICT_UNRESOLVABLE
            return {"verdict": verdict, "explanation": explanation}

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            lr = leaders_res.calldata
            if not isinstance(lr, dict) or "verdict" not in lr:
                return False
            my = leader_fn()
            return my["verdict"] == lr["verdict"]

        resolution = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        verdict = resolution["verdict"]
        explanation = resolution["explanation"]
        stake = vs.stake_amount
        total = u256(stake * 2)

        if verdict == VERDICT_CREATOR_WINS:
            vs.winner = vs.creator
            vs.state = STATE_RESOLVED
            vs.resolution_summary = explanation
            self.duels[vs_id] = vs
            gl.get_contract_at(vs.creator).emit_transfer(value=total)
        elif verdict == VERDICT_OPPONENT_WINS:
            vs.winner = vs.opponent
            vs.state = STATE_RESOLVED
            vs.resolution_summary = explanation
            self.duels[vs_id] = vs
            gl.get_contract_at(vs.opponent).emit_transfer(value=total)
        elif verdict == VERDICT_DRAW:
            vs.winner = Address("0x0000000000000000000000000000000000000000")
            vs.state = STATE_RESOLVED
            vs.resolution_summary = f"EMPATE: {explanation}"
            self.duels[vs_id] = vs
            gl.get_contract_at(vs.creator).emit_transfer(value=stake)
            gl.get_contract_at(vs.opponent).emit_transfer(value=stake)
        else:
            vs.winner = Address("0x0000000000000000000000000000000000000000")
            vs.state = STATE_RESOLVED
            vs.resolution_summary = f"NO RESOLVIBLE: {explanation}"
            self.duels[vs_id] = vs
            gl.get_contract_at(vs.creator).emit_transfer(value=stake)
            gl.get_contract_at(vs.opponent).emit_transfer(value=stake)

    @gl.public.write
    def cancel_vs(self, vs_id: u256):
        if vs_id not in self.duels:
            raise gl.UserError("VS not found")
        vs = self.duels[vs_id]
        if vs.state != STATE_OPEN:
            raise gl.UserError("Can only cancel open VS")
        if gl.message.sender_address != vs.creator:
            raise gl.UserError("Only creator can cancel")
        vs.state = STATE_CANCELLED
        self.duels[vs_id] = vs
        gl.get_contract_at(vs.creator).emit_transfer(value=vs.stake_amount)

    @gl.public.view
    def get_vs(self, vs_id: u256) -> dict:
        if vs_id not in self.duels:
            raise gl.UserError("VS not found")
        vs = self.duels[vs_id]
        return {
            "id": int(vs_id),
            "creator": str(vs.creator),
            "opponent": str(vs.opponent),
            "question": vs.question,
            "creator_position": vs.creator_position,
            "opponent_position": vs.opponent_position,
            "resolution_url": vs.resolution_url,
            "stake_amount": int(vs.stake_amount),
            "deadline": int(vs.deadline),
            "state": vs.state,
            "winner": str(vs.winner),
            "resolution_summary": vs.resolution_summary,
            "created_at": int(vs.created_at),
            "category": vs.category,
        }

    @gl.public.view
    def get_vs_count(self) -> int:
        return int(self.duel_count)

    @gl.public.view
    def get_user_vs_list(self, user_address: str) -> list:
        addr = Address(user_address)
        if addr not in self.user_duels:
            return []
        return [int(did) for did in self.user_duels[addr]]

    @gl.public.view
    def get_contract_balance(self) -> int:
        return int(self.balance)
