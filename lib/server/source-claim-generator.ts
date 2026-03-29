import {
  CLAIM_DRAFT_CATEGORY_IDS,
  type ClaimDraftCategory,
  type ClaimDraftSourceType,
  type SourceClaimDraftCandidate,
  type SourceClaimDraftResponse,
} from "@/lib/claimDrafts";
import { normalizeResolutionSource } from "@/lib/constants";

const DEFAULT_GEMINI_MODEL = process.env.CLAIM_DRAFT_MODEL || "gemini-2.5-flash";
const MAX_SOURCE_CHARS = 14000;
const BLOCKED_SOURCE_HOSTS = [
  "x.com",
  "twitter.com",
  "t.co",
  "reddit.com",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
];
const MEDIA_SOURCE_HOSTS = [
  "bbc.com",
  "espn.com",
  "billboard.com",
  "coingecko.com",
  "coinmarketcap.com",
  "weather.com",
];

type ClaimDraftRequest = {
  sourceUrl: string;
  locale?: string;
};

type GeminiCandidatePayload = {
  sourceSummary?: unknown;
  rejectionReason?: unknown;
  candidates?: unknown;
};

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, value: string) => {
      const codePoint = Number(value);
      return Number.isFinite(codePoint) ? String.fromCharCode(codePoint) : "";
    });
}

function stripHtmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function extractHtmlTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : "";
}

function getHostname(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isBlockedSourceHost(sourceUrl: string) {
  const hostname = getHostname(sourceUrl);
  return BLOCKED_SOURCE_HOSTS.some(
    (blockedHost) => hostname === blockedHost || hostname.endsWith(`.${blockedHost}`)
  );
}

export function classifySourceType(sourceUrl: string): ClaimDraftSourceType {
  const hostname = getHostname(sourceUrl);
  if (
    MEDIA_SOURCE_HOSTS.some(
      (mediaHost) => hostname === mediaHost || hostname.endsWith(`.${mediaHost}`)
    )
  ) {
    return "media";
  }

  return hostname ? "official" : "other";
}

async function fetchSourceSnapshot(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    method: "GET",
    headers: {
      "User-Agent": "PROVEN Source Draft Bot/1.0",
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch source (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
    throw new Error("Source must be an HTML or text page");
  }

  const rawBody = await response.text();
  const title = extractHtmlTitle(rawBody);
  const text = stripHtmlToText(rawBody).slice(0, MAX_SOURCE_CHARS);

  if (text.length < 200) {
    throw new Error("Source does not contain enough readable text");
  }

  return {
    sourceUrl: normalizeResolutionSource(response.url || sourceUrl),
    title,
    text,
  };
}

function createDraftPrompt(args: {
  sourceUrl: string;
  sourceType: ClaimDraftSourceType;
  title: string;
  text: string;
  locale: string;
}) {
  const outputLanguage = args.locale === "es" ? "Spanish" : "English";

  return [
    "You are drafting challenge-ready claims for PROVEN, a stake-backed claim duel product.",
    "Use only the provided source material.",
    "Generate at most 3 claim ideas and only include future, verifiable outcomes.",
    "If the source is weak, subjective, already resolved, or not clearly challenge-ready, return an empty candidates array and explain why in rejectionReason.",
    "",
    "Hard rules:",
    "- One claim per candidate. No multi-part claims.",
    "- Each candidate must have mutually exclusive sideA and sideB.",
    "- Every candidate must keep one primary resolution source.",
    "- settlementRule must explain exactly how the claim should be judged.",
    "- deadlineAt must be a future ISO 8601 datetime string.",
    "- timezone should be explicit, usually UTC.",
    "- category must be one of: deportes, clima, crypto, tech, cultura, custom.",
    "- Prefer narrow, challenge-ready outcomes over broad speculative ones.",
    "- Keep the writing concise and user-facing.",
    `- Write all user-facing strings in ${outputLanguage}.`,
    "",
    "Category guide:",
    "- deportes: sports fixtures, results, standings, official match outcomes",
    "- clima: weather conditions tied to a named place and date",
    "- crypto: token, exchange, market, listing, protocol announcement, price threshold",
    "- tech: company, product, platform, launch, release, or official announcement",
    "- cultura: entertainment releases, rankings, awards, publications, or named events",
    "- custom: only if none of the above fit cleanly",
    "",
    "Source metadata:",
    `- sourceUrl: ${args.sourceUrl}`,
    `- sourceType: ${args.sourceType}`,
    `- title: ${args.title || "(none)"}`,
    `- currentTime: ${new Date().toISOString()}`,
    "",
    "Source text:",
    args.text,
  ].join("\n");
}

function getGeminiDraftSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      sourceSummary: {
        type: "string",
        description: "One or two short sentences summarizing the source.",
      },
      rejectionReason: {
        type: ["string", "null"],
        description: "Why no candidates were produced, if applicable.",
      },
      candidates: {
        type: "array",
        minItems: 0,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: {
              type: "string",
              enum: [...CLAIM_DRAFT_CATEGORY_IDS],
            },
            claimText: { type: "string" },
            sideA: { type: "string" },
            sideB: { type: "string" },
            deadlineAt: { type: "string", format: "date-time" },
            timezone: { type: "string" },
            primaryResolutionSource: { type: "string", format: "uri" },
            settlementRule: { type: "string" },
            ambiguityFlags: {
              type: "array",
              items: { type: "string" },
              minItems: 0,
              maxItems: 4,
            },
            confidenceScore: {
              type: "integer",
              minimum: 0,
              maximum: 100,
            },
          },
          required: [
            "category",
            "claimText",
            "sideA",
            "sideB",
            "deadlineAt",
            "timezone",
            "primaryResolutionSource",
            "settlementRule",
            "ambiguityFlags",
            "confidenceScore",
          ],
        },
      },
    },
    required: ["sourceSummary", "rejectionReason", "candidates"],
  };
}

async function callGeminiDraftModel(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Generator is not configured. Add GEMINI_API_KEY on the server.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: getGeminiDraftSchema(),
        },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Generator request failed (${response.status}): ${errorText || "Unknown error"}`);
  }

  const payload = await response.json();
  const candidateText = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part?.text || "")
    .join("")
    .trim();

  if (!candidateText) {
    throw new Error("Generator returned an empty response");
  }

  return JSON.parse(candidateText) as GeminiCandidatePayload;
}

function isClaimDraftCategory(value: unknown): value is ClaimDraftCategory {
  return typeof value === "string" && (CLAIM_DRAFT_CATEGORY_IDS as readonly string[]).includes(value);
}

export function sanitizeGeneratedDrafts(args: {
  sourceUrl: string;
  sourceType: ClaimDraftSourceType;
  payload: GeminiCandidatePayload;
}) {
  const sourceSummary =
    typeof args.payload.sourceSummary === "string" && args.payload.sourceSummary.trim()
      ? args.payload.sourceSummary.trim()
      : "Source loaded successfully. Review the suggestions below before publishing.";
  const rejectionReason =
    typeof args.payload.rejectionReason === "string" && args.payload.rejectionReason.trim()
      ? args.payload.rejectionReason.trim()
      : "";

  const seenClaims = new Set<string>();
  const candidates: SourceClaimDraftCandidate[] = Array.isArray(args.payload.candidates)
    ? args.payload.candidates.flatMap((candidate) => {
        if (!candidate || typeof candidate !== "object") {
          return [];
        }

        const raw = candidate as Record<string, unknown>;
        const claimText = typeof raw.claimText === "string" ? raw.claimText.trim() : "";
        const sideA = typeof raw.sideA === "string" ? raw.sideA.trim() : "";
        const sideB = typeof raw.sideB === "string" ? raw.sideB.trim() : "";
        const deadlineAt = typeof raw.deadlineAt === "string" ? raw.deadlineAt.trim() : "";
        const timezone = typeof raw.timezone === "string" && raw.timezone.trim() ? raw.timezone.trim() : "UTC";
        const settlementRule =
          typeof raw.settlementRule === "string" ? raw.settlementRule.trim() : "";
        const primaryResolutionSource =
          typeof raw.primaryResolutionSource === "string"
            ? normalizeResolutionSource(raw.primaryResolutionSource)
            : "";
        const normalizedPrimarySource = primaryResolutionSource || args.sourceUrl;
        const category = isClaimDraftCategory(raw.category) ? raw.category : "custom";
        const confidenceScore = Math.max(
          0,
          Math.min(
            100,
            typeof raw.confidenceScore === "number"
              ? Math.round(raw.confidenceScore)
              : Number.parseInt(String(raw.confidenceScore || 0), 10) || 0
          )
        );
        const ambiguityFlags = Array.isArray(raw.ambiguityFlags)
          ? raw.ambiguityFlags
              .map((flag) => (typeof flag === "string" ? flag.trim() : ""))
              .filter(Boolean)
              .slice(0, 4)
          : [];

        const parsedDeadline = Date.parse(deadlineAt);
        const dedupeKey = claimText.toLowerCase();

        if (
          !claimText ||
          claimText.length < 12 ||
          !sideA ||
          !sideB ||
          sideA.toLowerCase() === sideB.toLowerCase() ||
          !settlementRule ||
          settlementRule.length < 20 ||
          !Number.isFinite(parsedDeadline) ||
          parsedDeadline <= Date.now() ||
          seenClaims.has(dedupeKey)
        ) {
          return [];
        }

        seenClaims.add(dedupeKey);

        return [
          {
            category,
            claimText,
            sideA,
            sideB,
            deadlineAt: new Date(parsedDeadline).toISOString(),
            timezone,
            primaryResolutionSource: normalizedPrimarySource,
            settlementRule,
            ambiguityFlags,
            confidenceScore,
          },
        ];
      })
    : [];

  return {
    sourceUrl: args.sourceUrl,
    sourceType: args.sourceType,
    sourceSummary,
    rejectionReason,
    candidates,
  };
}

export async function generateClaimDrafts({
  sourceUrl,
  locale = "en",
}: ClaimDraftRequest): Promise<SourceClaimDraftResponse> {
  const normalizedUrl = normalizeResolutionSource(sourceUrl);
  if (!normalizedUrl) {
    throw new Error("Enter a valid source URL");
  }

  if (isBlockedSourceHost(normalizedUrl)) {
    throw new Error("This source type is not supported yet. Use a trusted event, company, or market page.");
  }

  const sourceSnapshot = await fetchSourceSnapshot(normalizedUrl);
  const sourceType = classifySourceType(sourceSnapshot.sourceUrl);
  const prompt = createDraftPrompt({
    sourceUrl: sourceSnapshot.sourceUrl,
    sourceType,
    title: sourceSnapshot.title,
    text: sourceSnapshot.text,
    locale,
  });

  const rawPayload = await callGeminiDraftModel(prompt);
  const result = sanitizeGeneratedDrafts({
    sourceUrl: sourceSnapshot.sourceUrl,
    sourceType,
    payload: rawPayload,
  });

  if (result.candidates.length === 0) {
    throw new Error(
      result.rejectionReason ||
        "This source did not produce a challenge-ready claim. Try a cleaner official or structured source."
    );
  }

  return {
    sourceUrl: result.sourceUrl,
    sourceType: result.sourceType,
    sourceSummary: result.sourceSummary,
    candidates: result.candidates,
  };
}

