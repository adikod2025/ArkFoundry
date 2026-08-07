/**
 * NODE 5 — dedupeAndRank  (deterministic, no LLM)
 *
 * Repeated sampling and overlapping windows produce near-duplicate candidates.
 * This node sorts by the deterministic viralScore, greedily drops any clip that
 * overlaps an already-accepted, higher-scoring clip beyond the configured
 * fraction, and caps the set at the target count. Its verifier is `verifyRanked`.
 */

import type { PipelineConfig, ScoredCandidate } from "../types.ts";
import { overlapFraction } from "../verify.ts";

export function dedupeAndRank(
  scored: ScoredCandidate[],
  cfg: PipelineConfig
): ScoredCandidate[] {
  const sorted = [...scored].sort((a, b) => b.viralScore - a.viralScore);
  const kept: ScoredCandidate[] = [];
  for (const c of sorted) {
    const clashes = kept.some(
      (k) => overlapFraction(c, k) > cfg.maxOverlapFraction
    );
    if (!clashes) kept.push(c);
    if (kept.length >= cfg.targetClipCount) break;
  }
  return kept;
}
