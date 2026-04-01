import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeModerationResult } from "../../lib/server/claim-moderation";

test("sanitizeModerationResult clamps and defaults safely", () => {
  const result = sanitizeModerationResult({
    raw: {
      decision: "block",
      violationCodes: ["death_self_harm", "other_policy"],
      confidence: 999,
    },
    policyVersion: "sha256:abc123",
    locale: "en",
  });

  assert.equal(result.decision, "block");
  assert.deepEqual(result.violationCodes, ["death_self_harm", "other_policy"]);
  assert.equal(result.confidence, 100);
  assert.equal(result.policyVersion, "sha256:abc123");
});

