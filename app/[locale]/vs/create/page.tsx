"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion } from "framer-motion";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import {
  createClaim,
  createRematch,
  getVS,
  type CreateClaimParams,
  type VSData,
} from "@/lib/contract";
import { getExplorerTxUrl, getExplorerUrl } from "@/lib/genlayer";
import { removePendingVS, savePendingVS, type PendingVS } from "@/lib/pending-vs";
import {
  CATEGORY_GUIDANCE,
  DEADLINE_PRESET_IDS,
  DEADLINE_PRESET_SECONDS,
  MIN_STAKE,
  PREFILLS,
  getShareUrl,
  normalizeResolutionSource,
} from "@/lib/constants";
import type {
  SourceClaimDraftCandidate,
  SourceClaimDraftResponse,
} from "@/lib/claimDrafts";
import {
  generatePrivateInviteKey,
  rememberPrivateInviteKey,
} from "@/lib/private-links";
import { toast } from "sonner";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { GlassCard, Button, Input, ListboxField } from "@/components/ui";
import ClaimStrengthCard from "@/components/ClaimStrengthCard";
import CreateChallengeTicket from "@/components/vs/CreateChallengeTicket";
import Confetti from "@/components/Confetti";
import {
  Check,
  ChevronDown,
  Clock,
  Coins,
  Copy,
  Eye,
  FileEdit,
  GitBranch,
  Link2,
  SlidersHorizontal,
  User,
  Users,
  Wand2,
  Zap,
} from "lucide-react";

const MARKET_TYPES = [
  "binary",
  "moneyline",
  "spread",
  "total",
  "prop",
  "custom",
] as const;

const ODDS_MODES = ["pool", "fixed"] as const;

const VISIBILITY_TOGGLE_OPTIONS = [
  { key: "public" as const, labelKey: "visibilityPublic" as const },
  { key: "private" as const, labelKey: "visibilityPrivate" as const },
];

const STAKE_PRESET_AMOUNTS = [MIN_STAKE, 5, 10, 25] as const;
const SOURCE_DRAFTS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_SOURCE_DRAFTS === "1";

function isPresetStakeAmount(value: number): boolean {
  return (STAKE_PRESET_AMOUNTS as readonly number[]).includes(value);
}

type ChallengeExampleRow = {
  question: string;
  creator: string;
  opponent: string;
};

function parseChallengeExamples(raw: unknown): ChallengeExampleRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ChallengeExampleRow[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "question" in item &&
      "creator" in item &&
      "opponent" in item
    ) {
      const row = item as Record<string, unknown>;
      if (
        typeof row.question === "string" &&
        typeof row.creator === "string" &&
        typeof row.opponent === "string"
      ) {
        out.push({
          question: row.question,
          creator: row.creator,
          opponent: row.opponent,
        });
      }
    }
  }
  return out;
}

function formatLocalDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatLocalTimeInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
}

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();
  const t = useTranslations("create");
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const DEADLINE_PRESETS = useMemo(
    () =>
      DEADLINE_PRESET_IDS.map((id) => ({
        id,
        seconds: DEADLINE_PRESET_SECONDS[id],
        label: t(`presets.${id}`),
      })),
    [t],
  );
  const messages = useMessages();
  const challengeFieldUid = useId().replace(/:/g, "");
  const challengeQuestionHeadingId = `create-challenge-heading-${challengeFieldUid}`;
  const challengeQuestionFieldId = `create-challenge-q-${challengeFieldUid}`;
  const [challengePlaceholder, setChallengePlaceholder] = useState("");
  const [creatorPosPlaceholder, setCreatorPosPlaceholder] = useState("");
  const [opponentPosPlaceholder, setOpponentPosPlaceholder] = useState("");

  const [question, setQuestion] = useState("");
  const [creatorPos, setCreatorPos] = useState("");
  const [opponentPos, setOpponentPos] = useState("");
  const [url, setUrl] = useState("");
  const [deadlinePreset, setDeadlinePreset] = useState<number | null>(null);
  const [customDeadlineDate, setCustomDeadlineDate] = useState("");
  const [customDeadlineTime, setCustomDeadlineTime] = useState("");
  const [stake, setStake] = useState(5);
  const [customStakeDraft, setCustomStakeDraft] = useState("");
  const [customStakeFocused, setCustomStakeFocused] = useState(false);
  const [category, setCategory] = useState("custom");
  const [marketType, setMarketType] = useState<string>("binary");
  const [oddsMode, setOddsMode] = useState<string>("pool");
  const [fixedOddsMultiple, setFixedOddsMultiple] = useState("2.00");
  const [handicapLine, setHandicapLine] = useState("");
  const [settlementRule, setSettlementRule] = useState("");
  const [maxChallengers, setMaxChallengers] = useState(1);
  /** Texto del 4º slot (custom); vacío cuando el valor coincide con preset 1/2/5 para mostrar placeholder "–". */
  const [maxChallengersSlotDraft, setMaxChallengersSlotDraft] = useState("");
  const [visibility, setVisibility] =
    useState<CreateClaimParams["visibility"]>("public");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingParent, setLoadingParent] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
  const [createdPending, setCreatedPending] = useState(false);
  const [createdTxHash, setCreatedTxHash] = useState("");
  const [createdExplorerTxHash, setCreatedExplorerTxHash] = useState("");
  const [createdInviteKey, setCreatedInviteKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [draftResult, setDraftResult] = useState<SourceClaimDraftResponse | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [lastDraftedUrl, setLastDraftedUrl] = useState("");
  const [sourceSeedUrl, setSourceSeedUrl] = useState("");
  const [isApplyingDraft, startApplyingDraft] = useTransition();
  const [rematchSource, setRematchSource] = useState<VSData | null>(null);
  const [hydratedFromRematch, setHydratedFromRematch] = useState(false);
  const [rematchId, setRematchId] = useState<number | null>(null);
  /** Evita mismatch de hidratación: fechas relativas y `min` del input dependen de zona horaria y del reloj del cliente. */
  const categoryGuidance =
    CATEGORY_GUIDANCE[category as keyof typeof CATEGORY_GUIDANCE] ??
    CATEGORY_GUIDANCE.custom;
  const guidanceKey =
    category in CATEGORY_GUIDANCE ? category : "custom";
  const recommendedSettlementTemplate = t(
    `guidance.${guidanceKey}.settlementTemplate`,
  );
  const settlementMatchesRecommended =
    settlementRule.trim() === recommendedSettlementTemplate.trim();
  const ticketSettlementPreview =
    settlementRule.trim() || recommendedSettlementTemplate;
  const ticketDraftId = useMemo(() => {
    const s = `${question}|${creatorPos}|${stake}|${marketType}|${oddsMode}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const n = Math.abs(h);
    const part = (n % 0xffff).toString(16).toUpperCase().padStart(4, "0");
    const suffix = String.fromCharCode(65 + (n % 26));
    return `PRV-${part}-${suffix}`;
  }, [question, creatorPos, stake, marketType, oddsMode]);
  const verificationQuestionHint = t(
    `guidance.${guidanceKey}.questionHint`,
  );
  const isOneToMany = maxChallengers > 1;
  const isPrivate = visibility === "private";
  const presetStakeHighlight =
    isPresetStakeAmount(stake) &&
    !customStakeFocused &&
    customStakeDraft.trim() === "";
  const isAdvancedClaim =
    marketType !== "binary" ||
    oddsMode !== "pool" ||
    isOneToMany ||
    handicapLine.trim().length > 0 ||
    settlementRule.trim().length > 0;
  const customDeadline = useMemo(() => {
    if (!customDeadlineDate || !customDeadlineTime) {
      return "";
    }
    return `${customDeadlineDate}T${customDeadlineTime}`;
  }, [customDeadlineDate, customDeadlineTime]);
  const minCustomDeadlineDate = formatLocalDateInputValue(new Date());

  function applyDeadlinePreset(seconds: number) {
    const presetDate = new Date(Date.now() + seconds * 1000);
    setDeadlinePreset(seconds);
    setCustomDeadlineDate(formatLocalDateInputValue(presetDate));
    setCustomDeadlineTime(formatLocalTimeInputValue(presetDate));
  }

  const payoutPreview = useMemo(() => {
    const multiple = Number(fixedOddsMultiple);
    if (!Number.isFinite(multiple) || multiple < 1) {
      return null;
    }
    return Math.round(stake * multiple * 100) / 100;
  }, [fixedOddsMultiple, stake]);

  useEffect(() => {
    if (isPresetStakeAmount(stake)) {
      setCustomStakeDraft("");
    } else {
      setCustomStakeDraft(String(stake));
    }
  }, [stake]);

  const normalizedSourceUrl = useMemo(() => normalizeResolutionSource(url), [url]);
  useEffect(() => {
    if (!lastDraftedUrl) {
      return;
    }

    if (!normalizedSourceUrl || normalizedSourceUrl !== lastDraftedUrl) {
      setDraftResult(null);
      setDraftError("");
    }
  }, [lastDraftedUrl, normalizedSourceUrl]);
  const requiresExplicitSettlementRule =
    category === "custom" || marketType !== "binary" || handicapLine.trim().length > 0;
  const questionNeedsWork =
    question.trim().length > 0 && question.trim().length < 24;
  const sourceNeedsWork =
    url.trim().length > 0 && normalizedSourceUrl.length === 0;
  const settlementNeedsWork =
    requiresExplicitSettlementRule &&
    settlementRule.trim().length < 16;
  const claimStrengthInput = useMemo(
    () => {
      const deadlineTs = customDeadline
        ? Math.floor(new Date(customDeadline).getTime() / 1000)
        : 0;

      return {
        question,
        creator_position: creatorPos,
        opponent_position: opponentPos,
        resolution_url: url,
        settlement_rule: settlementRule,
        category,
        deadline: Number.isFinite(deadlineTs) ? deadlineTs : 0,
      };
    },
    [category, creatorPos, customDeadline, opponentPos, question, settlementRule, url]
  );
  const lastRecommendedTemplateRef = useRef(recommendedSettlementTemplate);
  const initializedRecommendedTemplateRef = useRef(false);

  useEffect(() => {
    const previousTemplate = lastRecommendedTemplateRef.current.trim();
    const nextTemplate = recommendedSettlementTemplate.trim();

    if (!initializedRecommendedTemplateRef.current) {
      initializedRecommendedTemplateRef.current = true;
      lastRecommendedTemplateRef.current = nextTemplate;
      return;
    }

    setSettlementRule((current) => {
      const trimmed = current.trim();
      if (!trimmed || trimmed === previousTemplate) {
        return nextTemplate;
      }
      return current;
    });

    lastRecommendedTemplateRef.current = nextTemplate;
  }, [recommendedSettlementTemplate]);

  useLayoutEffect(() => {
    const raw = (
      messages.create as { challengeQuestionExamples?: unknown }
    ).challengeQuestionExamples;
    const list = parseChallengeExamples(raw);
    if (list.length === 0) {
      setChallengePlaceholder("");
      setCreatorPosPlaceholder("");
      setOpponentPosPlaceholder("");
      return;
    }
    const picked = list[Math.floor(Math.random() * list.length)]!;
    setChallengePlaceholder(picked.question);
    setCreatorPosPlaceholder(picked.creator);
    setOpponentPosPlaceholder(picked.opponent);
  }, [locale, messages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URL(window.location.href).searchParams;
    const rawRematchId = Number(searchParams.get("rematch") ?? "");
    const rawSourceUrl = searchParams.get("source") ?? "";
    setRematchId(Number.isInteger(rawRematchId) && rawRematchId > 0 ? rawRematchId : null);
    const normalizedSourceSeed = normalizeResolutionSource(rawSourceUrl);
    if (normalizedSourceSeed) {
      setUrl(normalizedSourceSeed);
      setSourceSeedUrl(normalizedSourceSeed);
    }
  }, []);

  useEffect(() => {
    if (!rematchId || hydratedFromRematch) {
      return;
    }

    let cancelled = false;
    const currentRematchId = rematchId;

    async function loadRematchSource() {
      setLoadingParent(true);
      const source = await getVS(currentRematchId);
      if (cancelled) {
        return;
      }

      if (!source) {
        toast.error(t("rematchNotFound"));
        setLoadingParent(false);
        return;
      }

      setRematchSource(source);
      setQuestion(source.question);
      setCreatorPos(source.creator_position);
      setOpponentPos(source.counter_position ?? source.opponent_position);
      setUrl(source.resolution_url);
      setStake(source.creator_stake ?? source.stake_amount);
      setCategory(source.category || "custom");
      setMarketType(source.market_type ?? "binary");
      setOddsMode(source.odds_mode ?? "pool");
      setFixedOddsMultiple(
        source.challenger_payout_bps && source.challenger_payout_bps > 0
          ? (source.challenger_payout_bps / 10000).toFixed(2)
          : "2.00"
      );
      setHandicapLine(source.handicap_line ?? "");
      setSettlementRule(source.settlement_rule ?? "");
      setVisibility(source.is_private ? "private" : "public");
      const mc =
        source.max_challengers && source.max_challengers > 0
          ? source.max_challengers
          : 1;
      setMaxChallengers(mc);
      setMaxChallengersSlotDraft([1, 2, 5].includes(mc) ? "" : String(mc));
      setAdvancedOpen(
        (source.market_type ?? "binary") !== "binary" ||
          (source.odds_mode ?? "pool") !== "pool" ||
          (source.max_challengers ?? 1) > 1 ||
          Boolean(source.handicap_line) ||
          Boolean(source.settlement_rule)
      );
      setHydratedFromRematch(true);
      setLoadingParent(false);
    }

    loadRematchSource();

    return () => {
      cancelled = true;
    };
  }, [hydratedFromRematch, rematchId, t]);

  useEffect(() => {
    if (!created || !createdPending) {
      return;
    }

    const createdId = created;
    let cancelled = false;

    async function syncCreatedClaim() {
      const liveClaim = await getVS(createdId, {
        inviteKey: createdInviteKey,
        viewerAddress: address ?? undefined,
      }).catch(() => null);

      if (cancelled || !liveClaim) {
        return;
      }

      removePendingVS(createdId);
      setCreatedPending(false);
      setShowConfetti(true);
      toast.success(rematchId ? t("rematchCreatedAndFunded") : t("vsCreatedAndFunded"));
      setTimeout(() => setShowConfetti(false), 4000);
    }

    void syncCreatedClaim();
    const intervalId = setInterval(syncCreatedClaim, 8000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [address, created, createdInviteKey, createdPending, rematchId, t]);

  function prefill(catId: string) {
    setCategory(catId);
    const prefillValues = PREFILLS[catId];
    if (prefillValues) {
      setQuestion(prefillValues.q);
      setCreatorPos(prefillValues.a);
      setOpponentPos(prefillValues.b);
      setUrl(prefillValues.u);
    }
  }

  const requestSourceDrafts = useCallback(async (sourceUrl: string) => {
    setDraftLoading(true);
    setDraftError("");
    setDraftResult(null);

    try {
      const response = await fetch("/api/claim-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: sourceUrl,
          locale,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | SourceClaimDraftResponse
        | { error?: { message?: string } }
        | null;

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload ? payload.error?.message : undefined;
        throw new Error(errorMessage || t("sourceDraftFailed"));
      }

      const result = payload as SourceClaimDraftResponse;
      setDraftResult(result);
      setLastDraftedUrl(result.sourceUrl);
      toast.success(t("sourceDraftReady", { count: result.candidates.length }));
    } catch (err: any) {
      const message = err?.message || t("sourceDraftFailed");
      setDraftError(message);
      toast.error(message);
    } finally {
      setDraftLoading(false);
    }
  }, [locale, t]);

  async function handleGenerateFromSource() {
    if (!normalizedSourceUrl) {
      toast.error(t("sourceDraftInvalidUrl"));
      return;
    }

    await requestSourceDrafts(normalizedSourceUrl);
  }

  function applySourceDraft(candidate: SourceClaimDraftCandidate) {
    startApplyingDraft(() => {
      setQuestion(candidate.claimText);
      setCreatorPos(candidate.sideA);
      setOpponentPos(candidate.sideB);
      setUrl(candidate.primaryResolutionSource);
      setCategory(candidate.category);
      setMarketType("binary");
      setOddsMode("pool");
      setFixedOddsMultiple("2.00");
      setHandicapLine("");
      setSettlementRule(candidate.settlementRule);
      setMaxChallengers(1);
      setMaxChallengersSlotDraft("");
      setAdvancedOpen(Boolean(candidate.settlementRule.trim()));
      setDeadlinePreset(null);

      const suggestedDeadline = new Date(candidate.deadlineAt);
      if (Number.isFinite(suggestedDeadline.getTime())) {
        setCustomDeadlineDate(formatLocalDateInputValue(suggestedDeadline));
        setCustomDeadlineTime(formatLocalTimeInputValue(suggestedDeadline));
      }

      setLastDraftedUrl(candidate.primaryResolutionSource);
    });

    toast.success(t("sourceDraftApplied"));
  }

  useEffect(() => {
    if (!SOURCE_DRAFTS_ENABLED || !sourceSeedUrl) {
      return;
    }

    void requestSourceDrafts(sourceSeedUrl);
    setSourceSeedUrl("");
  }, [requestSourceDrafts, sourceSeedUrl]);

  async function handleSubmit() {
    if (!question || !creatorPos || !opponentPos) {
      toast.error(t("fillAllFields"));
      return;
    }
    if (!isConnected || !address) {
      toast.error(t("connectWalletFirst"));
      return;
    }

    if (!Number.isFinite(stake) || stake < MIN_STAKE) {
      toast.error(t("invalidStakeMin", { amount: MIN_STAKE }));
      return;
    }

    if (!customDeadline) {
      toast.error(t("completeExactDeadline"));
      return;
    }

    const deadlineTimestamp = Math.floor(new Date(customDeadline).getTime() / 1000);

    if (!Number.isFinite(deadlineTimestamp) || deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      toast.error(t("invalidDeadline"));
      return;
    }

    const fixedMultiple = Number(fixedOddsMultiple);
    if (oddsMode === "fixed" && (!Number.isFinite(fixedMultiple) || fixedMultiple < 1)) {
      toast.error(t("invalidFixedOdds"));
      return;
    }

    if (!normalizedSourceUrl) {
      toast.error(t("sourceRequired"));
      return;
    }

    if (requiresExplicitSettlementRule && settlementRule.trim().length < 16) {
      toast.error(t("settlementRuleRequired"));
      return;
    }

    const normalizedMaxChallengers = Math.max(1, Math.min(100, Math.floor(maxChallengers)));
    const inviteKey = isPrivate ? generatePrivateInviteKey() : "";
    const params: CreateClaimParams = {
      question,
      creator_position: creatorPos,
      counter_position: opponentPos,
      resolution_url: normalizedSourceUrl,
      deadline: deadlineTimestamp,
      stake_amount: stake,
      category,
      market_type: marketType,
      odds_mode: oddsMode,
      challenger_payout_bps:
        oddsMode === "fixed" ? Math.round(fixedMultiple * 10000) : 0,
      handicap_line: handicapLine.trim(),
      settlement_rule: settlementRule.trim(),
      max_challengers: normalizedMaxChallengers,
      visibility,
      invite_key: inviteKey,
    };

    setLoading(true);

    try {
      const result =
        rematchId
          ? await createRematch(address!, rematchId, params)
          : await createClaim(address!, params);

      toast.success(
        result.pending
          ? t("submittedPending")
          : rematchId
          ? t("rematchCreatedAndFunded")
          : t("vsCreatedAndFunded")
      );
      if (result.claimId) {
        setCreated(result.claimId);
        setCreatedPending(Boolean(result.pending));
        setCreatedTxHash(result.txHash || "");
        setCreatedExplorerTxHash(result.explorerTxHash || "");
        setCreatedInviteKey(inviteKey);
        if (inviteKey) {
          rememberPrivateInviteKey(result.claimId, inviteKey);
        }

        // Store optimistic VS so it appears in lists before consensus
        savePendingVS({
          id: result.claimId,
          creator: address!,
          opponent: "0x0000000000000000000000000000000000000000",
          question,
          creator_position: creatorPos,
          opponent_position: opponentPos,
          resolution_url: normalizedSourceUrl,
          stake_amount: stake,
          deadline: deadlineTimestamp,
          state: "open",
          winner: "0x0000000000000000000000000000000000000000",
          resolution_summary: "",
          created_at: Math.floor(Date.now() / 1000),
          category,
          pending: true,
          createdAtMs: Date.now(),
          txHash: result.txHash || "",
        } satisfies PendingVS);
      } else {
        router.push("/dashboard");
      }
      if (!result.pending) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    } catch (err: any) {
      toast.error(err.message || t("errorCreating"));
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!created) {
      return;
    }
    await navigator.clipboard.writeText(getShareUrl(created, createdInviteKey));
    setCopied(true);
    toast.success(t("linkCopied"));
    setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <>
        <Confetti active={showConfetti} />
        <PageTransition>
          <AnimatedItem>
            <div className="text-center pt-6">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="font-display text-5xl font-extrabold text-pv-emerald mb-4 tracking-tight"
              >
                PROVEN.
              </motion.div>
              <h2 className="font-display text-2xl font-bold mb-2 tracking-tight">
                {createdPending
                  ? t("pendingTitle")
                  : rematchId
                  ? t("rematchCreatedAndFunded")
                  : t("vsCreatedAndFunded")}
              </h2>
              <p className="text-pv-muted mb-7">
                {createdPending
                  ? t("pendingHint")
                  : createdInviteKey
                  ? t("sendThisPrivateLink")
                  : t("sendThisLink")}
              </p>

              <GlassCard className="mb-5">
                <div className="flex gap-2.5">
                  <input
                    readOnly
                    value={getShareUrl(created, createdInviteKey)}
                    className="input flex-1 font-mono text-xs"
                  />
                  <button
                    onClick={copyLink}
                    className="px-5 py-3 rounded bg-pv-emerald text-pv-bg font-bold text-sm flex items-center gap-2 hover:brightness-110 transition-all focus-ring"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? tc("copied") : tc("copy")}
                  </button>
                </div>
              </GlassCard>

              <div className="flex gap-3 justify-center mb-7">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Challenge me on PROVEN: ${getShareUrl(created, createdInviteKey)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip text-pv-muted hover:text-pv-emerald hover:border-pv-emerald/[0.3] transition-colors"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl(created, createdInviteKey))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip text-pv-muted hover:text-pv-emerald hover:border-pv-emerald/[0.3] transition-colors"
                >
                  Telegram
                </a>
              </div>

              <div className="space-y-2 mb-5">
                {createdPending && createdTxHash && (
                  <p className="text-pv-muted text-xs font-mono">
                    {t("walletTx")}: {createdTxHash.slice(0, 10)}...{createdTxHash.slice(-8)}
                  </p>
                )}
                {createdExplorerTxHash &&
                  (!createdPending || createdExplorerTxHash !== createdTxHash) && (
                  <p className="text-pv-muted text-xs font-mono">
                    {createdPending ? t("consensusTx") : "Tx"}:{" "}
                    <a
                      href={getExplorerTxUrl(createdExplorerTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pv-emerald hover:underline"
                    >
                      {createdExplorerTxHash.slice(0, 10)}...{createdExplorerTxHash.slice(-8)}
                    </a>
                  </p>
                )}
                <p className="text-pv-muted text-xs">
                  <a
                    href={getExplorerUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pv-emerald hover:underline"
                  >
                    {t("openExplorer")}
                  </a>
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href={`/vs/${created}`}>
                  <Button variant="primary" fullWidth={false} className="px-7" size="sm">
                    {t("viewVS")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  fullWidth={false}
                  className="px-7"
                  size="sm"
                  onClick={() => {
                    setCreated(null);
                    setCreatedPending(false);
                    setCreatedTxHash("");
                    setQuestion("");
                    setCreatorPos("");
                    setOpponentPos("");
                    setUrl("");
                    setHandicapLine("");
                    setSettlementRule("");
                    setVisibility("public");
                    setCreatedExplorerTxHash("");
                    setCreatedInviteKey("");
                  }}
                >
                  {t("createAnother")}
                </Button>
              </div>
            </div>
          </AnimatedItem>
        </PageTransition>
      </>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-6">
        <AnimatedItem>
          <div className="mb-8 w-full sm:mb-10">
          {rematchId && (
            <GlassCard className="mb-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-pv-emerald/[0.12] border border-pv-emerald/[0.22] flex items-center justify-center text-pv-emerald shrink-0">
                  <GitBranch size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-pv-emerald/80">
                    {t("rematchEyebrow")}
                  </div>
                  <p className="text-sm font-semibold mt-1">
                    {t("rematchFrom", { id: rematchId })}
                  </p>
                  <p className="text-sm text-pv-muted mt-1">
                    {loadingParent
                      ? t("rematchLoading")
                      : rematchSource
                      ? t("rematchHint")
                      : t("rematchPending")}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:gap-6">
            <h1 className="min-w-0 font-display text-2xl font-bold uppercase tracking-tighter text-pv-text sm:text-3xl md:text-4xl">
              <span className="block">{t("pageTitleBefore")}</span>
              <span className="mt-1 block text-pv-emerald sm:mt-1.5">
                {t("pageTitleAccent")}
              </span>
            </h1>
            <div
              className="h-px w-full bg-white/[0.12] sm:min-h-px sm:min-w-[2rem] sm:flex-1"
              aria-hidden
            />
          </div>
          </div>
        </AnimatedItem>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="flex flex-col gap-5 lg:col-span-8">
      {SOURCE_DRAFTS_ENABLED && (
        <AnimatedItem>
          <GlassCard
            glass
            noPad
            glow="none"
            className="!rounded-2xl border border-white/[0.12] w-full"
          >
            <div className="space-y-5 p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                      aria-hidden
                    >
                      <Wand2 size={16} strokeWidth={2} />
                    </span>
                    {t("sourceDraftTitle")}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pv-muted">
                    {t("sourceDraftHint")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  fullWidth={false}
                  onClick={handleGenerateFromSource}
                  loading={draftLoading}
                  disabled={!normalizedSourceUrl || draftLoading}
                  className="rounded-xl px-5 py-3 font-display text-[11px] font-bold uppercase tracking-[0.16em]"
                >
                  {draftLoading ? t("sourceDraftGenerating") : t("sourceDraftGenerate")}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                  {t("sourceDraftInputLabel")}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t("verificationUrlPlaceholder")}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="form-field-pv min-h-[3.25rem] font-mono text-xs"
                />
                <p className="text-xs leading-relaxed text-pv-muted">
                  {t("sourceDraftInputHint")}
                </p>
              </div>

              {draftError ? (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] px-4 py-3 text-sm text-amber-200">
                  {draftError}
                </div>
              ) : null}

              {draftResult ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/[0.08] bg-pv-bg/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-pv-emerald/20 bg-pv-emerald/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-pv-emerald">
                        {t(`sourceDraftSourceTypes.${draftResult.sourceType}`)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                        {t("sourceDraftSummaryLabel")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-pv-text/90">
                      {draftResult.sourceSummary}
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {draftResult.candidates.map((candidate, index) => {
                      const draftDeadline = new Date(candidate.deadlineAt);
                      const hasDeadline = Number.isFinite(draftDeadline.getTime());

                      return (
                        <div
                          key={`${candidate.claimText}-${index}`}
                          className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4 sm:p-5"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-pv-cyan/25 bg-pv-cyan/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-pv-cyan">
                                  {tCat(candidate.category)}
                                </span>
                                <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                                  {candidate.confidenceScore}/100
                                </span>
                              </div>
                              <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-pv-text">
                                {candidate.claimText}
                              </h3>
                            </div>
                            <Button
                              variant="primary"
                              fullWidth={false}
                              onClick={() => applySourceDraft(candidate)}
                              disabled={isApplyingDraft}
                              className="rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em]"
                            >
                              {t("sourceDraftUse")}
                            </Button>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/[0.08] bg-pv-bg/60 p-3">
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted">
                                {t("sourceDraftSideA")}
                              </div>
                              <div className="mt-2 text-sm font-medium text-pv-text/90">
                                {candidate.sideA}
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-pv-bg/60 p-3">
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted">
                                {t("sourceDraftSideB")}
                              </div>
                              <div className="mt-2 text-sm font-medium text-pv-text/90">
                                {candidate.sideB}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="rounded-xl border border-white/[0.08] bg-pv-bg/60 p-3">
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted">
                                {t("sourceDraftDeadline")}
                              </div>
                              <div className="mt-2 text-sm font-medium text-pv-text/90">
                                {hasDeadline
                                  ? `${draftDeadline.toLocaleString(locale === "en" ? "en-US" : "es-AR", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })} (${candidate.timezone})`
                                  : candidate.deadlineAt}
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-pv-bg/60 p-3">
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted">
                                {t("sourceDraftPrimarySource")}
                              </div>
                              <div className="mt-2 break-all text-sm font-medium text-pv-text/90">
                                {candidate.primaryResolutionSource}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl border border-white/[0.08] bg-pv-bg/60 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted">
                              {t("sourceDraftSettlementRule")}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-pv-text/90">
                              {candidate.settlementRule}
                            </p>
                          </div>

                          {candidate.ambiguityFlags.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {candidate.ambiguityFlags.map((flag) => (
                                <span
                                  key={flag}
                                  className="rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-1 text-[10px] font-medium text-amber-200"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </GlassCard>
        </AnimatedItem>
      )}
      <AnimatedItem>
        <GlassCard
          glass
          noPad
          glow="none"
          className="!rounded-2xl border border-white/[0.12] w-full"
        >
          <div className="space-y-6 p-6 sm:p-8">
            <div className="mb-2 flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                aria-hidden
              >
                <FileEdit size={18} strokeWidth={2} />
              </span>
              <h2
                id={challengeQuestionHeadingId}
                className="font-display text-base font-bold uppercase tracking-[0.16em] text-pv-text sm:text-lg sm:tracking-[0.18em]"
              >
                {t("challengeSectionTitle")}
              </h2>
            </div>
            <div className="relative">
              <textarea
                id={challengeQuestionFieldId}
                rows={4}
                className="min-h-[120px] w-full resize-none rounded-xl border border-white/[0.15] bg-transparent p-6 font-display text-lg leading-snug tracking-tight text-pv-text outline-none transition-all placeholder:text-pv-muted/50 focus:border-pv-emerald/60 focus:ring-1 focus:ring-pv-emerald/40 sm:text-xl"
                placeholder={challengePlaceholder}
                aria-labelledby={challengeQuestionHeadingId}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </div>
            <p
              className={`text-xs leading-relaxed ${
                questionNeedsWork ? "text-amber-300" : "text-pv-muted"
              }`}
            >
              {questionNeedsWork
                ? t("qualitySpecificity")
                : verificationQuestionHint.trim() || t("questionStrengthHint")}
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                    aria-hidden
                  >
                    <User size={16} strokeWidth={2} />
                  </span>
                  <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-emerald sm:tracking-[0.2em]">
                    {t("ibet")}
                  </span>
                </div>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/[0.12] bg-pv-bg/90 px-4 py-3.5 font-body text-sm text-pv-text outline-none transition-colors placeholder:text-pv-muted/55 focus:border-pv-emerald/50 focus:ring-1 focus:ring-pv-emerald/20"
                  placeholder={creatorPosPlaceholder}
                  value={creatorPos}
                  onChange={(event) => setCreatorPos(event.target.value)}
                  autoComplete="off"
                  aria-label={t("ibet")}
                />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                    aria-hidden
                  >
                    <Users size={16} strokeWidth={2} />
                  </span>
                  <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-muted sm:tracking-[0.2em]">
                    {isOneToMany ? t("challengerSideBets") : t("rivalBets")}
                  </span>
                </div>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/[0.12] bg-pv-bg/90 px-4 py-3.5 font-body text-sm text-pv-text outline-none transition-colors placeholder:text-pv-muted/55 focus:border-pv-emerald/50 focus:ring-1 focus:ring-pv-emerald/20"
                  placeholder={opponentPosPlaceholder}
                  value={opponentPos}
                  onChange={(event) => setOpponentPos(event.target.value)}
                  autoComplete="off"
                  aria-label={
                    isOneToMany ? t("challengerSideBets") : t("rivalBets")
                  }
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </AnimatedItem>

      <AnimatedItem>
        <GlassCard
          glass
          noPad
          glow="none"
          className="!rounded-2xl border border-white/[0.12] w-full"
          role="group"
          aria-label={t("visibility")}
        >
          <div className="flex flex-col items-stretch justify-between gap-6 p-6 sm:p-8 md:flex-row md:items-center">
            <div className="min-w-0 space-y-2.5">
              <h3 className="flex items-center gap-2.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                  aria-hidden
                >
                  <Eye size={16} strokeWidth={2} />
                </span>
                {t("visibility")}
              </h3>
              <p className="max-w-xl text-xs leading-relaxed text-pv-muted">
                {isPrivate ? t("visibilityPrivateHint") : t("visibilityPublicHint")}
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto">
              {VISIBILITY_TOGGLE_OPTIONS.map(({ key, labelKey }) => {
                const selected = visibility === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVisibility(key)}
                    aria-pressed={selected}
                    className={`flex-1 rounded-lg px-6 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] transition-[color,background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pv-emerald/40 focus-visible:ring-offset-2 focus-visible:ring-offset-pv-bg sm:tracking-[0.2em] md:flex-none md:min-w-[9.5rem] ${
                      selected
                        ? "bg-pv-emerald text-pv-bg shadow-[0_0_22px_-6px_rgba(78,222,163,0.35)] hover:brightness-[1.05] active:scale-[0.98]"
                        : "border border-white/[0.12] bg-pv-surface text-pv-muted hover:border-white/[0.2] hover:text-pv-text active:scale-[0.98]"
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </GlassCard>
      </AnimatedItem>

        <AnimatedItem>
          <GlassCard
            glass
            noPad
            glow="none"
            className="!rounded-2xl border border-white/[0.12] w-full"
          >
            <div className="space-y-3 p-6 sm:p-8">
              <h3 className="flex items-center gap-2.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                  aria-hidden
                >
                  <Coins size={16} strokeWidth={2} />
                </span>
                {t("stakeSectionTitle")}
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {STAKE_PRESET_AMOUNTS.map((amount) => (
                  <motion.button
                    key={amount}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStake(amount)}
                    aria-pressed={
                      stake === amount && presetStakeHighlight
                    }
                    className={`min-w-0 rounded-lg border px-1.5 py-2 font-display text-[11px] font-bold leading-tight transition-[border-color,background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pv-emerald/35 focus-visible:ring-offset-2 focus-visible:ring-offset-pv-bg sm:px-2 sm:py-2.5 sm:text-xs ${
                      stake === amount && presetStakeHighlight
                        ? "border-pv-emerald bg-pv-emerald/[0.12] text-pv-emerald shadow-[0_0_16px_-8px_rgba(78,222,163,0.3)]"
                        : "border border-white/[0.12] bg-pv-surface text-pv-muted hover:border-pv-emerald/35 hover:text-pv-emerald"
                    }`}
                  >
                    {amount} GEN
                  </motion.button>
                ))}
                <div
                  className={`flex min-h-[2.75rem] w-full min-w-0 items-center justify-center rounded-lg border px-1.5 py-1.5 transition-[border-color,background-color,color,box-shadow] sm:min-h-[3.25rem] sm:px-2 sm:py-2 ${
                    customStakeFocused || !isPresetStakeAmount(stake)
                      ? "border-pv-emerald bg-pv-emerald/[0.12] text-pv-emerald shadow-[0_0_16px_-8px_rgba(78,222,163,0.3)]"
                      : "border border-white/[0.12] bg-pv-surface text-pv-muted"
                  }`}
                >
                  <div className="inline-flex max-w-full items-center justify-center gap-0.5 sm:gap-1">
                    <input
                      type="number"
                      min={MIN_STAKE}
                      step={1}
                      inputMode="numeric"
                      aria-label={t("stakeCustomAmount")}
                      className={`max-w-full shrink-0 bg-transparent font-display text-[11px] font-bold tabular-nums text-inherit outline-none placeholder:text-pv-muted/50 focus:outline-none sm:text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        customStakeDraft.trim() !== ""
                          ? "text-right"
                          : "text-center"
                      }`}
                      style={{
                        width: customStakeDraft.trim()
                          ? `${Math.max(2, customStakeDraft.length + 0.5)}ch`
                          : "min(100%, 11ch)",
                      }}
                      placeholder={t("stakeCustomPlaceholder")}
                      value={customStakeDraft}
                      onChange={(event) => setCustomStakeDraft(event.target.value)}
                      onFocus={() => setCustomStakeFocused(true)}
                      onBlur={() => {
                        setCustomStakeFocused(false);
                        const raw = customStakeDraft.trim();
                        if (raw === "") {
                          if (!isPresetStakeAmount(stake)) {
                            setStake(MIN_STAKE);
                          }
                          return;
                        }
                        const n = Math.floor(Number(raw));
                        if (!Number.isFinite(n) || n < MIN_STAKE) {
                          if (isPresetStakeAmount(stake)) {
                            setCustomStakeDraft("");
                          } else {
                            setCustomStakeDraft(String(stake));
                          }
                          return;
                        }
                        setStake(n);
                      }}
                    />
                    {customStakeDraft.trim() !== "" && (
                      <span
                        className="shrink-0 font-display text-[10px] font-bold leading-none tracking-tight text-inherit sm:text-[11px]"
                        aria-hidden
                      >
                        GEN
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </AnimatedItem>

        <AnimatedItem>
          <GlassCard
            glass
            noPad
            glow="none"
            className="!rounded-2xl border border-white/[0.12] w-full"
            role="group"
            aria-label={t("deadline")}
          >
            <div className="space-y-4 p-6 sm:p-8">
              <h3 className="flex items-center gap-2.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                  aria-hidden
                >
                  <Clock size={16} strokeWidth={2} />
                </span>
                {t("deadline")}
              </h3>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {DEADLINE_PRESETS.map((preset) => {
                  const selected = deadlinePreset === preset.seconds;
                  return (
                    <motion.button
                      key={preset.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => applyDeadlinePreset(preset.seconds)}
                      aria-pressed={selected}
                      className={`min-w-0 rounded-lg border px-1.5 py-2 font-display text-[11px] font-bold leading-tight transition-[border-color,background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pv-emerald/35 focus-visible:ring-offset-2 focus-visible:ring-offset-pv-bg sm:px-2 sm:py-2.5 sm:text-xs ${
                        selected
                          ? "border-pv-emerald bg-pv-emerald/[0.12] text-pv-emerald shadow-[0_0_16px_-8px_rgba(78,222,163,0.3)]"
                          : "border border-white/[0.12] bg-pv-surface text-pv-muted hover:border-pv-emerald/35 hover:text-pv-emerald"
                      }`}
                    >
                      {preset.label}
                    </motion.button>
                  );
                })}
              </div>

              <GlassCard className="p-4 sm:p-5">
                <p className="label mb-3">{t("orChooseExactDate")}</p>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                  <Input
                    type="date"
                    label={`${t("exactDate")} *`}
                    min={minCustomDeadlineDate}
                    value={customDeadlineDate}
                    onChange={(event) => {
                      setDeadlinePreset(null);
                      setCustomDeadlineDate(event.target.value);
                    }}
                    className="text-sm [color-scheme:dark]"
                  />
                  <Input
                    type="time"
                    label={`${t("exactTime")} *`}
                    value={customDeadlineTime}
                    onChange={(event) => {
                      setDeadlinePreset(null);
                      setCustomDeadlineTime(event.target.value);
                    }}
                    disabled={!customDeadlineDate}
                    className="text-sm [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </GlassCard>
            </div>
          </GlassCard>
        </AnimatedItem>

        <AnimatedItem>
          <GlassCard
            glass
            noPad
            glow="none"
            className="!rounded-2xl border border-white/[0.12] w-full"
            role="group"
            aria-label={t("verificationSourceSectionTitle")}
          >
            <div className="space-y-4 p-6 sm:p-8">
              <h3 className="flex items-center gap-2.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                  aria-hidden
                >
                  <Link2 size={16} strokeWidth={2} />
                </span>
                {t("verificationSourceSectionTitle")}
              </h3>

              <label className="sr-only" htmlFor="create-verification-url">
                {t("verificationSource")}
              </label>
              <input
                id="create-verification-url"
                type="text"
                name="verificationSource"
                autoComplete="off"
                spellCheck={false}
                placeholder={t("verificationUrlPlaceholder")}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="form-field-pv min-h-[3.25rem] font-mono text-xs"
              />
              <p
                className={`text-xs leading-relaxed ${
                  sourceNeedsWork ? "text-amber-300" : "text-pv-muted"
                }`}
              >
                {sourceNeedsWork ? t("qualitySource") : t("sourceStrengthHint")}
              </p>

              <div className="space-y-3 rounded-xl border border-white/[0.08] bg-pv-bg/70 p-4 sm:p-5">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-pv-emerald/85">
                  {t("verificationGuidanceTitle")}
                </h4>
                <p className="text-sm leading-relaxed text-pv-muted">
                  {t(`guidance.${guidanceKey}.sourceHint`)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categoryGuidance.sourceExamples.map((example: string) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setUrl(example)}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] font-medium text-pv-muted/70 transition-colors hover:border-white/[0.14] hover:text-pv-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pv-emerald/30 focus-visible:ring-offset-2 focus-visible:ring-offset-pv-bg"
                    >
                      {example}
                    </button>
                  ))}
                </div>
                {verificationQuestionHint.trim() !== "" && (
                  <p className="text-xs leading-relaxed text-pv-muted/85">
                    {verificationQuestionHint}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        </AnimatedItem>

        <AnimatedItem>
          <GlassCard
            glass
            noPad
            glow="none"
            className="!rounded-2xl border border-white/[0.12] w-full overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02] sm:px-8 sm:py-6"
            >
              <div className="flex min-w-0 gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
                  aria-hidden
                >
                  <SlidersHorizontal size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0 space-y-1">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
                    {t("advancedToggle")}
                  </h3>
                  <p className="text-[10px] leading-relaxed text-pv-muted sm:text-[11px]">
                    {t("advancedHint")}
                  </p>
                </div>
              </div>
              <ChevronDown
                size={20}
                className={`shrink-0 text-pv-muted transition-transform duration-200 ease-out ${
                  advancedOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            {advancedOpen && (
              <div className="space-y-8 border-t border-white/[0.08] px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                  <ListboxField
                    id="create-market-type"
                    label={t("marketType") ?? ""}
                    value={marketType}
                    options={MARKET_TYPES.map((value) => ({
                      value,
                      label: t(`marketTypes.${value}`) ?? value,
                    }))}
                    onChange={setMarketType}
                  />

                  <ListboxField
                    id="create-odds-mode"
                    label={t("oddsMode") ?? ""}
                    value={oddsMode}
                    options={ODDS_MODES.map((value) => ({
                      value,
                      label: t(`oddsModes.${value}`) ?? value,
                    }))}
                    onChange={setOddsMode}
                  />

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                      {t("maxChallengers")}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 5].map((value) => (
                        <motion.button
                          key={value}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setMaxChallengers(value);
                            setMaxChallengersSlotDraft("");
                          }}
                          aria-pressed={maxChallengers === value}
                          className={`min-h-[2.75rem] min-w-0 rounded-lg border px-1.5 py-2 font-display text-[11px] font-bold leading-tight transition-[border-color,background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pv-emerald/35 focus-visible:ring-offset-2 focus-visible:ring-offset-pv-bg sm:min-h-[3rem] sm:px-2 sm:py-2.5 sm:text-xs ${
                            maxChallengers === value
                              ? "border-pv-emerald bg-pv-emerald/[0.12] text-pv-emerald shadow-[0_0_16px_-8px_rgba(78,222,163,0.3)]"
                              : "border border-white/[0.12] bg-pv-surface text-pv-muted hover:border-pv-emerald/35 hover:text-pv-emerald"
                          }`}
                        >
                          {value}
                        </motion.button>
                      ))}
                      <div
                        className={`flex min-h-[2.75rem] min-w-0 items-center justify-center rounded-lg border px-1.5 py-2 transition-[border-color,background-color,color,box-shadow] sm:min-h-[3rem] sm:px-2 sm:py-2.5 ${
                          [1, 2, 5].includes(maxChallengers)
                            ? "border border-white/[0.12] bg-pv-surface"
                            : "border-pv-emerald bg-pv-emerald/[0.12] text-pv-emerald shadow-[0_0_16px_-8px_rgba(78,222,163,0.3)]"
                        }`}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={t("maxChallengers")}
                          placeholder={t("maxChallengersCustomPlaceholder")}
                          className="w-full min-w-0 bg-transparent text-center font-display text-xs font-bold tabular-nums text-inherit outline-none placeholder:font-normal placeholder:text-pv-muted/45 focus:outline-none sm:text-sm"
                          value={maxChallengersSlotDraft}
                          onChange={(event) => {
                            const raw = event.target.value.replace(/\D/g, "");
                            setMaxChallengersSlotDraft(raw);
                            if (raw === "") {
                              setMaxChallengers(1);
                              return;
                            }
                            const n = parseInt(raw, 10);
                            if (Number.isFinite(n) && n >= 1 && n <= 100) {
                              setMaxChallengers(n);
                            }
                          }}
                          onBlur={() => {
                            const raw = maxChallengersSlotDraft.replace(/\D/g, "");
                            if (raw === "") {
                              setMaxChallengers(1);
                              setMaxChallengersSlotDraft("");
                              return;
                            }
                            const n = parseInt(raw, 10);
                            if (!Number.isFinite(n) || n < 1) {
                              setMaxChallengers(1);
                              setMaxChallengersSlotDraft("");
                              return;
                            }
                            const clamped = Math.min(100, Math.max(1, n));
                            setMaxChallengers(clamped);
                            if ([1, 2, 5].includes(clamped)) {
                              setMaxChallengersSlotDraft("");
                            } else {
                              setMaxChallengersSlotDraft(String(clamped));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                      {t("handicapLine")}
                    </label>
                    <input
                      type="text"
                      className="form-field-pv"
                      placeholder={t("handicapPlaceholder")}
                      value={handicapLine}
                      onChange={(event) => setHandicapLine(event.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>

                {oddsMode === "fixed" && (
                  <div className="space-y-3 rounded-xl border border-white/[0.08] bg-pv-bg/40 p-4 sm:p-5">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-pv-emerald">
                        {t("fixedOddsLabel")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={fixedOddsMultiple}
                        onChange={(event) => setFixedOddsMultiple(event.target.value)}
                        className="form-field-pv tabular-nums"
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-pv-muted">
                      {t("fixedOddsHint")}
                      {payoutPreview !== null
                        ? ` ${t("fixedOddsPreview", { amount: payoutPreview })}`
                        : ""}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <label
                    htmlFor="settlement-rule-textarea"
                    className="block text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted"
                  >
                    {t("settlementRule")}
                  </label>
                  <textarea
                    id="settlement-rule-textarea"
                    rows={4}
                    className="form-field-pv min-h-[100px] w-full resize-none"
                    placeholder={t("settlementPlaceholder")}
                    value={settlementRule}
                    onChange={(event) => setSettlementRule(event.target.value)}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <p className="min-w-0 flex-1 text-left text-[11px] leading-relaxed text-pv-muted">
                      {t("settlementRuleHint")}{" "}
                      <span
                        className={
                          settlementNeedsWork ? "text-amber-300" : undefined
                        }
                      >
                        {settlementNeedsWork
                          ? t("qualitySettlement")
                          : t("settlementStrengthHint")}
                      </span>
                    </p>
                    <button
                      type="button"
                      disabled={settlementMatchesRecommended}
                      onClick={() =>
                        setSettlementRule(recommendedSettlementTemplate)
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-pv-text/90 transition-colors hover:border-white/[0.16] hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.1] disabled:hover:bg-white/[0.04] sm:max-w-[min(100%,14rem)] sm:self-auto"
                      aria-label={t("useRecommendedRule")}
                    >
                      <Wand2
                        className="size-3.5 shrink-0 text-pv-emerald/90"
                        aria-hidden
                      />
                      <span>{t("useRecommendedRule")}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </AnimatedItem>

          </div>

          <aside className="lg:col-span-4 text-pv-text">
            <AnimatedItem>
              <div className="flex flex-col gap-6 lg:sticky lg:top-24">
                <CreateChallengeTicket
                  draftId={ticketDraftId}
                  marketTypeLabel={t(`marketTypes.${marketType}`)}
                  oddsModeLabel={t(`oddsModes.${oddsMode}`)}
                  formatLabel={
                    isOneToMany
                      ? t("oneToManySummary", { count: maxChallengers })
                      : t("headToHeadSummary")
                  }
                  visibilityLabel={
                    isPrivate ? t("visibilityPrivate") : t("visibilityPublic")
                  }
                  settlementPreview={ticketSettlementPreview}
                  stakeAmount={stake}
                  walletAddress={address}
                />
                <ClaimStrengthCard input={claimStrengthInput} />
                {isConnected ? (
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    loading={loading}
                    className="rounded-2xl py-5 font-display text-sm font-bold uppercase tracking-widest"
                  >
                    {loading ? (
                      t("funding")
                    ) : (
                      <>
                        <span>
                          {rematchId
                            ? t("createRematchAndFund", { amount: stake })
                            : t("createAndFund", { amount: stake })}
                        </span>
                        <Zap className="size-5 shrink-0" aria-hidden />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={connect}
                    className="rounded-2xl py-5 font-display text-sm font-bold uppercase tracking-widest"
                  >
                    {t("connectWallet")}
                  </Button>
                )}
                <p className="text-center text-[9px] font-bold uppercase tracking-widest text-pv-muted/55 leading-snug">
                  {t("ticketSignatureNote")}
                </p>
              </div>
            </AnimatedItem>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}
