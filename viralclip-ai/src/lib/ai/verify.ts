/**
 * Deterministic verifiers — the strongest rung of the skill's verifier ladder.
 *
 * The agent-architecture skill: "For every producing node, name its verifier.
 * Prefer deterministic... If the honest answer is 'I can't [verify]', that's a
 * design smell — restructure so the output becomes checkable."
 *
 * Each function returns a Verdict rather than throwing, so the orchestrator can
 * decide whether to drop a bad item, retry the node, or fall back — the skill's
 * "observe → self-correct" step reads these verdicts.
 */

import {
  type Candidate,
  type DimensionScores,
  type PipelineConfig,
  type ScoredCandidate,
  type Segment,
  type TranscriptInput,
  PLATFORM_LENGTH,
} from "./types.ts";

export interface Verdict {
  ok: boolean;
  reasons: string[]; // human-readable failures; empty when ok
}

const ok = (): Verdict => ({ ok: true, reasons: [] });
const fail = (...reasons: string[]): Verdict => ({ ok: false, reasons });
const EPS = 1e-6;

/** Segmenter output: windows in order, in range, non-empty, non-overlapping. */
export function verifySegments(
  segments: Segment[],
  input: TranscriptInput
): Verdict {
  const reasons: string[] = [];
  let prevEnd = -Infinity;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s.start < -EPS || s.end > input.durationSec + EPS)
      reasons.push(`segment ${i} [${s.start},${s.end}] out of [0,${input.durationSec}]`);
    if (s.end <= s.start) reasons.push(`segment ${i} non-positive length`);
    if (!s.text.trim()) reasons.push(`segment ${i} empty text`);
    if (s.start < prevEnd - EPS) reasons.push(`segment ${i} overlaps previous`);
    prevEnd = s.end;
  }
  return reasons.length ? { ok: false, reasons } : ok();
}

/** A single candidate is well-formed and inside the video. */
export function verifyCandidate(
  c: Candidate,
  input: TranscriptInput
): Verdict {
  const reasons: string[] = [];
  if (!Number.isFinite(c.startSec) || !Number.isFinite(c.endSec))
    reasons.push("non-finite timestamps");
  if (c.startSec < -EPS) reasons.push("start < 0");
  if (c.endSec > input.durationSec + EPS)
    reasons.push(`end ${c.endSec} > duration ${input.durationSec}`);
  if (c.endSec <= c.startSec) reasons.push("end <= start");
  if (!c.excerpt.trim()) reasons.push("empty excerpt");
  return reasons.length ? { ok: false, reasons } : ok();
}

/** Boundary snapper: start/end must land on real utterance edges. */
export function verifySnappedToUtterances(
  c: Candidate,
  input: TranscriptInput
): Verdict {
  const starts = new Set(input.utterances.map((u) => round(u.start)));
  const ends = new Set(input.utterances.map((u) => round(u.end)));
  const reasons: string[] = [];
  if (!starts.has(round(c.startSec)))
    reasons.push(`start ${c.startSec} not on an utterance boundary`);
  if (!ends.has(round(c.endSec)))
    reasons.push(`end ${c.endSec} not on an utterance boundary`);
  return reasons.length ? { ok: false, reasons } : ok();
}

/** Clip length is within the target platform's bounds. */
export function verifyLength(c: Candidate, cfg: PipelineConfig): Verdict {
  const [min, max] = PLATFORM_LENGTH[cfg.platform];
  const len = c.endSec - c.startSec;
  if (len < min - EPS) return fail(`length ${len.toFixed(1)}s < min ${min}s`);
  if (len > max + EPS) return fail(`length ${len.toFixed(1)}s > max ${max}s`);
  return ok();
}

/** Every dimension is a real number in [0,100]. */
export function verifyDimensions(d: DimensionScores): Verdict {
  const reasons: string[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (!Number.isFinite(v) || v < -EPS || v > 100 + EPS)
      reasons.push(`dimension ${k}=${v} outside [0,100]`);
  }
  return reasons.length ? { ok: false, reasons } : ok();
}

/**
 * The final viralScore must equal the weighted sum of the dimensions,
 * recomputed here — the model proposes dimensions, but the SCORE is computed
 * deterministically, so a judge cannot hand-wave the headline number.
 */
export function computeViralScore(
  d: DimensionScores,
  cfg: PipelineConfig
): number {
  const w = cfg.weights;
  const raw =
    d.hook * w.hook +
    d.emotion * w.emotion +
    d.clarity * w.clarity +
    d.shareability * w.shareability +
    d.pacing * w.pacing;
  return Math.round(clamp(raw, 0, 100));
}

export function verifyScore(c: ScoredCandidate, cfg: PipelineConfig): Verdict {
  const dv = verifyDimensions(c.dimensions);
  if (!dv.ok) return dv;
  const expected = computeViralScore(c.dimensions, cfg);
  if (Math.abs(expected - c.viralScore) > 0.5)
    return fail(`viralScore ${c.viralScore} != recomputed ${expected}`);
  if (!c.justification.trim()) return fail("empty justification");
  return ok();
}

/** Final set: sorted desc, within count, and free of large overlaps. */
export function verifyRanked(
  clips: ScoredCandidate[],
  cfg: PipelineConfig
): Verdict {
  const reasons: string[] = [];
  if (clips.length > cfg.targetClipCount)
    reasons.push(`${clips.length} clips > target ${cfg.targetClipCount}`);
  for (let i = 1; i < clips.length; i++) {
    if (clips[i].viralScore > clips[i - 1].viralScore + EPS)
      reasons.push(`not sorted at index ${i}`);
  }
  for (let i = 0; i < clips.length; i++) {
    for (let j = i + 1; j < clips.length; j++) {
      if (overlapFraction(clips[i], clips[j]) > cfg.maxOverlapFraction + EPS)
        reasons.push(`clips ${i} and ${j} overlap > ${cfg.maxOverlapFraction}`);
    }
  }
  return reasons.length ? { ok: false, reasons } : ok();
}

// --- helpers ---------------------------------------------------------------

export function overlapFraction(
  a: { startSec: number; endSec: number },
  b: { startSec: number; endSec: number }
): number {
  const inter = Math.max(0, Math.min(a.endSec, b.endSec) - Math.max(a.startSec, b.startSec));
  const shorter = Math.min(a.endSec - a.startSec, b.endSec - b.startSec);
  return shorter <= 0 ? 0 : inter / shorter;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
