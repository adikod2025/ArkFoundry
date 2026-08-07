/**
 * NODE 4 — scoreCandidates  (LLM-as-judge, cheaper tier)
 *
 * Viral potential isn't mechanically checkable, so this is the skill's second
 * verifier rung: an LLM judge scoring against an explicit five-dimension rubric.
 * Two guards keep a soft judge honest:
 *
 *  1. The judge only proposes the five DIMENSIONS. The headline `viralScore` is
 *     RECOMPUTED here as a deterministic weighted sum (`computeViralScore`), so
 *     the model can't inflate the number that ranking depends on.
 *  2. Every result passes `verifyScore`; anything out of range is clamped/dropped
 *     upstream rather than trusted.
 *
 * Candidates are scored in parallel — independent judgements with no shared
 * state, exactly the "parallelization / sectioning" pattern.
 */

import type { ViralLLM } from "../llm.ts";
import {
  type Candidate,
  type PipelineConfig,
  type ScoredCandidate,
  PLATFORM_FORMAT,
} from "../types.ts";
import { computeViralScore, verifyDimensions } from "../verify.ts";

export async function scoreCandidates(
  llm: ViralLLM,
  candidates: Candidate[],
  cfg: PipelineConfig
): Promise<ScoredCandidate[]> {
  const results = await Promise.all(
    candidates.map(async (c) => {
      const { dimensions, justification } = await llm.score(c.excerpt, c.hookType);
      // Defensive clamp so a bad judge can't poison the deterministic math.
      const dims = verifyDimensions(dimensions).ok ? dimensions : clampDims(dimensions);
      const scored: ScoredCandidate = {
        ...c,
        dimensions: dims,
        viralScore: computeViralScore(dims, cfg), // deterministic, not model-set
        justification,
        platform: cfg.platform,
        format: PLATFORM_FORMAT[cfg.platform],
      };
      return scored;
    })
  );
  return results;
}

function clampDims(d: Record<string, number>) {
  const c = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
  return {
    hook: c(d.hook),
    emotion: c(d.emotion),
    clarity: c(d.clarity),
    shareability: c(d.shareability),
    pacing: c(d.pacing),
  };
}
