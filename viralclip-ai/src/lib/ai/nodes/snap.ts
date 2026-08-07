/**
 * NODE 3 — snapBoundaries  (deterministic, no LLM)
 *
 * A model's rough start/end would cut mid-word and ignore platform limits.
 * This node snaps every candidate's edges to real utterance boundaries and
 * forces the clip length into the platform's [min,max] window — turning a fuzzy
 * proposal into something a downstream encoder can cut exactly. Its verifiers
 * are `verifySnappedToUtterances` and `verifyLength`.
 */

import {
  type Candidate,
  type PipelineConfig,
  type TranscriptInput,
  PLATFORM_LENGTH,
} from "../types.ts";

export function snapBoundaries(
  candidates: Candidate[],
  input: TranscriptInput,
  cfg: PipelineConfig
): Candidate[] {
  const [min, max] = PLATFORM_LENGTH[cfg.platform];
  const us = input.utterances;
  if (us.length === 0) return candidates;

  const starts = us.map((u) => u.start);
  const ends = us.map((u) => u.end);

  return candidates.map((c) => {
    // 1. Snap start to the nearest utterance start.
    let si = nearestIndex(starts, c.startSec);
    let start = starts[si];

    // 2. Among utterance ends at/after `start`, prefer one whose resulting
    //    length lands in [min,max] and sits closest to the proposed end.
    let bestEnd = ends[si];
    let bestCost = Infinity;
    for (let j = si; j < ends.length; j++) {
      const len = ends[j] - start;
      if (len <= 0) continue;
      const inWindow = len >= min && len <= max;
      // Feasible ends win outright; among them, closeness to the ask breaks ties.
      const cost = (inWindow ? 0 : 1e6) + Math.abs(ends[j] - c.endSec) + (len > max ? len - max : 0);
      if (cost < bestCost) {
        bestCost = cost;
        bestEnd = ends[j];
      }
      if (len > max) break; // further ends only get longer
    }
    let end = bestEnd;

    // 3. Too short (ran out of video after `start`)? Walk the start backward,
    //    boundary by boundary, until we reach the minimum length or run out.
    while (end - start < min && si > 0) {
      si--;
      start = starts[si];
    }

    // 4. Still over max (e.g. one very long utterance)? Pull the start forward
    //    to the latest boundary that keeps us within max.
    while (end - start > max && si < ends.length - 1 && starts[si + 1] < end) {
      si++;
      start = starts[si];
    }

    return { ...c, startSec: start, endSec: end };
  });
}

function nearestIndex(sorted: number[], target: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const d = Math.abs(sorted[i] - target);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
