import assert from "node:assert/strict";
import test from "node:test";

import {
  classifySourceType,
  isBlockedSourceHost,
  sanitizeGeneratedDrafts,
} from "../../lib/server/source-claim-generator";

test("blocks unsupported social source hosts", () => {
  assert.equal(isBlockedSourceHost("https://x.com/some/status/1"), true);
  assert.equal(isBlockedSourceHost("https://twitter.com/test"), true);
  assert.equal(isBlockedSourceHost("https://openai.com/index/hello"), false);
});

test("classifies trusted media sources distinctly", () => {
  assert.equal(classifySourceType("https://www.bbc.com/sport"), "media");
  assert.equal(classifySourceType("https://apple.com/newsroom"), "official");
});

test("sanitizeGeneratedDrafts keeps valid unique candidates only", () => {
  const result = sanitizeGeneratedDrafts({
    sourceUrl: "https://openai.com/index/update",
    sourceType: "official",
    payload: {
      sourceSummary: "OpenAI published a future launch update.",
      candidates: [
        {
          category: "culture",
          claimText: "Will OpenAI publish the announced update before June 30, 2026?",
          sideA: "OpenAI publishes it before June 30, 2026",
          sideB: "OpenAI does not publish it before June 30, 2026",
          deadlineAt: "2026-06-30T23:00:00.000Z",
          timezone: "UTC",
          primaryResolutionSource: "https://openai.com/index/update",
          settlementRule:
            "Resolve this only from the linked official source at the deadline. If the update is publicly published there before the deadline, Side A wins.",
          ambiguityFlags: ["Deadline based on the announced publication window."],
          confidenceScore: 91,
        },
        {
          category: "culture",
          claimText: "Will OpenAI publish the announced update before June 30, 2026?",
          sideA: "Duplicate",
          sideB: "Duplicate",
          deadlineAt: "2026-06-30T23:00:00.000Z",
          timezone: "UTC",
          primaryResolutionSource: "https://openai.com/index/update",
          settlementRule: "This duplicate should be removed because the claim text repeats.",
          ambiguityFlags: [],
          confidenceScore: 40,
        },
      ],
    },
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]?.category, "culture");
  assert.equal(result.candidates[0]?.confidenceScore, 91);
});

