/**
 * NODE 2 — identifyCandidates  (LLM reasoning, frontier tier)
 *
 * The one genuinely hard, open-ended node: judge which moments could travel.
 * Applies TWO of the skill's reliability moves:
 *
 *  - Repeated sampling (test-time compute): run the identifier `identifySamples`
 *    times and UNION the results, so we don't bet the run on one draw.
 *  - Schema verification: every raw candidate is checked by `verifyCandidate`;
 *    malformed items are dropped, never propagated.
 *
 * The bounded self-correction loop lives one level up in `pipeline.ts`, which
 * re-invokes this node with a higher `round` when the valid yield is too low.
 */

import type { RawCandidate, ViralLLM } from "../llm.ts";
import type { Candidate, Segment, TranscriptInput } from "../types.ts";
import { verifyCandidate } from "../verify.ts";

export interface IdentifyResult {
  candidates: Candidate[];
  dropped: number; // count that failed verification (observability)
}

export async function identifyCandidates(
  llm: ViralLLM,
  input: TranscriptInput,
  segments: Segment[],
  round: number,
  samples: number
): Promise<IdentifyResult> {
  const raw: RawCandidate[] = [];
  for (let s = 0; s < Math.max(1, samples); s++) {
    raw.push(...(await llm.identify(segments, input.durationSec, round, s)));
  }

  const candidates: Candidate[] = [];
  let dropped = 0;
  let n = 0;
  for (const r of raw) {
    const c: Candidate = {
      id: `c${round}_${n++}`,
      startSec: r.startSec,
      endSec: r.endSec,
      hookType: r.hookType || "insight",
      reason: r.reason || "",
      excerpt: r.excerpt || excerptFor(input, r.startSec, r.endSec),
    };
    // Deterministic verifier gate — the skill's "validation gate between steps".
    if (verifyCandidate(c, input).ok) candidates.push(c);
    else dropped++;
  }
  return { candidates, dropped };
}

/** Reconstruct excerpt text from utterances if the model omitted it. */
function excerptFor(input: TranscriptInput, start: number, end: number): string {
  return input.utterances
    .filter((u) => u.end > start && u.start < end)
    .map((u) => u.text)
    .join(" ")
    .trim();
}
