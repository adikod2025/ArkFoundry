/**
 * Shared state and data contracts for the viral-clip detection graph.
 *
 * Per the agent-architecture skill: "Design the shared state explicitly and
 * early. Decide what each node reads and what it's allowed to write." Every
 * node in `pipeline.ts` reads from and writes to a `PipelineState`, and every
 * value that crosses a node boundary has a checkable shape defined here so a
 * deterministic verifier can reject malformed output before it propagates.
 *
 * Validators are hand-rolled (no external schema dependency) so the pipeline
 * and its eval harness run under plain Node with zero install.
 */

export const PLATFORMS = [
  "TIKTOK",
  "REELS",
  "YOUTUBE_SHORTS",
  "LINKEDIN",
  "TWITTER",
] as const;
export type Platform = (typeof PLATFORMS)[number];

/** A single timed unit of transcript, as returned by Deepgram utterances. */
export interface Utterance {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

/** The input to the whole graph: what enters the pipeline. */
export interface TranscriptInput {
  videoId: string;
  durationSec: number;
  utterances: Utterance[];
}

/** A coherent window of speech produced by the deterministic segmenter. */
export interface Segment {
  start: number;
  end: number;
  text: string;
  utteranceIdx: number[]; // indices into TranscriptInput.utterances
}

/** A rough viral-moment proposal from the identify node (LLM reasoning). */
export interface Candidate {
  id: string;
  startSec: number;
  endSec: number;
  hookType: string; // e.g. "curiosity-gap", "bold-claim", "story", "how-to"
  reason: string; // why this moment might travel
  excerpt: string; // transcript text spanned, for the scorer to read
}

/** The five viral dimensions the judge scores, each 0-100. */
export interface DimensionScores {
  hook: number; // does the opening grab in the first ~2s
  emotion: number; // emotional intensity / stakes
  clarity: number; // understandable without the rest of the video
  shareability: number; // would a viewer send it to a friend
  pacing: number; // tight, no dead air
}

/** A candidate after scoring + deterministic boundary/format finalization. */
export interface ScoredCandidate extends Candidate {
  dimensions: DimensionScores;
  viralScore: number; // 0-100, RECOMPUTED deterministically from dimensions
  justification: string;
  platform: Platform;
  format: string; // "9:16" | "4:5" | "1:1"
}

/** The shared object that flows along the graph's edges. */
export interface PipelineState {
  input: TranscriptInput;
  platform: Platform;
  segments: Segment[];
  candidates: Candidate[];
  scored: ScoredCandidate[];
  clips: ScoredCandidate[]; // final, ranked, deduped output
  // Observability: the skill asks that state be inspectable so a failing node
  // can be seen with exactly what it was handed.
  trace: TraceEntry[];
}

export interface TraceEntry {
  node: string;
  ok: boolean;
  note: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Configuration — one place to tune the graph's behavior.
// ---------------------------------------------------------------------------

export interface PipelineConfig {
  platform: Platform;
  targetClipCount: number;
  /** Dimension weights; must sum to 1. Used to RECOMPUTE viralScore. */
  weights: DimensionScores;
  /** Repeated-sampling passes in the identify node (test-time compute). */
  identifySamples: number;
  /** Minimum valid candidates before we stop self-correcting the identifier. */
  minCandidates: number;
  /** Hard cap on identify self-correction rounds (bounded loop). */
  maxIdentifyRounds: number;
  /** Two candidates overlapping more than this fraction are deduped. */
  maxOverlapFraction: number;
}

/** Platform clip-length bounds in seconds (min, max). */
export const PLATFORM_LENGTH: Record<Platform, [number, number]> = {
  TIKTOK: [15, 60],
  REELS: [15, 60],
  YOUTUBE_SHORTS: [15, 60],
  LINKEDIN: [30, 90],
  TWITTER: [15, 140],
};

export const PLATFORM_FORMAT: Record<Platform, string> = {
  TIKTOK: "9:16",
  REELS: "9:16",
  YOUTUBE_SHORTS: "9:16",
  LINKEDIN: "4:5",
  TWITTER: "1:1",
};

export const DEFAULT_CONFIG: PipelineConfig = {
  platform: "TIKTOK",
  targetClipCount: 10,
  weights: {
    hook: 0.3,
    emotion: 0.2,
    clarity: 0.2,
    shareability: 0.2,
    pacing: 0.1,
  },
  identifySamples: 2,
  minCandidates: 5,
  maxIdentifyRounds: 2,
  maxOverlapFraction: 0.5,
};
