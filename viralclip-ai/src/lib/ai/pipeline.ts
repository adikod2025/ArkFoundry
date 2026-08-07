/**
 * THE GRAPH — orchestrator that wires the nodes into a directed pipeline with
 * a shared state, verifier gates between stages, and one bounded self-correction
 * loop. This is the "multi-agent graph engine" the product markets — made real,
 * in place of the spec's `Math.random()` placeholder.
 *
 * Flow (edges):
 *
 *   segment ─▶ identify ─▶ [enough valid?] ──no──▶ identify(round+1)   (loop,
 *                 ▲__________________________________|   capped by maxIdentifyRounds)
 *                                    │yes
 *                                    ▼
 *                              snap ─▶ score ─▶ dedupeAndRank ─▶ clips
 *
 * Every stage writes to `PipelineState` and appends a `TraceEntry`, so a failed
 * run can be inspected node-by-node rather than as one opaque transcript.
 */

import type { ViralLLM } from "./llm.ts";
import { HeuristicLLM } from "./llm.ts";
import { identifyCandidates } from "./nodes/identify.ts";
import { dedupeAndRank } from "./nodes/rank.ts";
import { scoreCandidates } from "./nodes/score.ts";
import { segmentTranscript } from "./nodes/segment.ts";
import { snapBoundaries } from "./nodes/snap.ts";
import {
  type Candidate,
  type PipelineConfig,
  type PipelineState,
  type TranscriptInput,
  DEFAULT_CONFIG,
} from "./types.ts";
import {
  verifyCandidate,
  verifyLength,
  verifyRanked,
  verifyScore,
  verifySegments,
  verifySnappedToUtterances,
} from "./verify.ts";

export interface RunOptions {
  llm?: ViralLLM;
  config?: Partial<PipelineConfig>;
  now?: () => number; // injectable clock keeps traces deterministic in evals
}

export async function detectViralClips(
  input: TranscriptInput,
  opts: RunOptions = {}
): Promise<PipelineState> {
  const cfg: PipelineConfig = { ...DEFAULT_CONFIG, ...opts.config };
  const llm = opts.llm ?? new HeuristicLLM();
  const clock = opts.now ?? (() => 0);

  const state: PipelineState = {
    input,
    platform: cfg.platform,
    segments: [],
    candidates: [],
    scored: [],
    clips: [],
    trace: [],
  };

  const stage = async <T>(
    node: string,
    run: () => Promise<{ value: T; note: string; ok: boolean }>
  ): Promise<T> => {
    const t0 = clock();
    const { value, note, ok } = await run();
    state.trace.push({ node, ok, note, durationMs: clock() - t0 });
    return value;
  };

  // NODE 1 — segment (deterministic)
  state.segments = await stage("segment", async () => {
    const segments = segmentTranscript(input);
    const v = verifySegments(segments, input);
    return {
      value: segments,
      ok: v.ok,
      note: v.ok ? `${segments.length} segments` : v.reasons.join("; "),
    };
  });

  // NODE 2 — identify (LLM), with a BOUNDED self-correction loop.
  // Edge condition: loop back with a wider net until we clear minCandidates or
  // exhaust maxIdentifyRounds — the skill's "plan → act → observe → correct".
  let candidates: Candidate[] = [];
  for (let round = 0; round < cfg.maxIdentifyRounds; round++) {
    const res = await stage(`identify:round${round}`, async () => {
      const r = await identifyCandidates(
        llm,
        input,
        state.segments,
        round,
        cfg.identifySamples
      );
      // Merge with prior rounds, de-duplicated by id, then keep only verified.
      const merged = dedupeById([...candidates, ...r.candidates]).filter(
        (c) => verifyCandidate(c, input).ok
      );
      candidates = merged;
      const enough = merged.length >= cfg.minCandidates;
      return {
        value: merged,
        ok: true,
        note: `round ${round}: +${r.candidates.length} (−${r.dropped} invalid), ${merged.length} total, enough=${enough}`,
      };
    });
    candidates = res;
    if (candidates.length >= cfg.minCandidates) break; // satisfied → exit loop
  }
  state.candidates = candidates;

  // NODE 3 — snap (deterministic). Drop anything that can't be made cuttable
  // within platform bounds rather than shipping a bad clip.
  state.candidates = await stage("snap", async () => {
    const snapped = snapBoundaries(state.candidates, input, cfg);
    const valid = snapped.filter(
      (c) =>
        verifySnappedToUtterances(c, input).ok &&
        verifyLength(c, cfg).ok &&
        verifyCandidate(c, input).ok
    );
    return {
      value: valid,
      ok: valid.length > 0 || snapped.length === 0,
      note: `${valid.length}/${snapped.length} snapped within bounds`,
    };
  });

  // NODE 4 — score (LLM judge → deterministic score). Drop unverifiable scores.
  state.scored = await stage("score", async () => {
    const scored = await scoreCandidates(llm, state.candidates, cfg);
    const valid = scored.filter((c) => verifyScore(c, cfg).ok);
    return {
      value: valid,
      ok: valid.length === scored.length,
      note: `${valid.length}/${scored.length} scored & verified`,
    };
  });

  // NODE 5 — dedupe + rank (deterministic). Final verifier gate on the output.
  state.clips = await stage("rank", async () => {
    const clips = dedupeAndRank(state.scored, cfg);
    const v = verifyRanked(clips, cfg);
    return {
      value: clips,
      ok: v.ok,
      note: v.ok ? `${clips.length} clips ranked` : v.reasons.join("; "),
    };
  });

  return state;
}

function dedupeById(cands: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of cands) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}
