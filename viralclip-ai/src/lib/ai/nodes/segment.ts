/**
 * NODE 1 — segmentTranscript  (deterministic, no LLM)
 *
 * Turns raw utterances into coherent candidate windows by splitting on speech
 * gaps and a soft max length. Pure code: the skill notes a node "can be pure
 * deterministic code with zero LLM calls" — spending a model here would be
 * waste. Its verifier is `verifySegments`.
 */

import type { Segment, TranscriptInput } from "../types.ts";

export interface SegmentOptions {
  /** A silence gap (s) larger than this starts a new segment. */
  gapThreshold: number;
  /** Grow a segment until it reaches at least this length (s) when possible. */
  minLen: number;
  /**
   * Soft target length (s): once a segment reaches this, close it at the next
   * boundary even without a silence gap. Without this, gapless transcripts (a
   * continuous talker) collapse into one giant segment and the identifier can't
   * localize distinct moments — a failure the eval harness caught.
   */
  targetLen: number;
  /** Never let a segment exceed this length (s). */
  maxLen: number;
}

const DEFAULTS: SegmentOptions = {
  gapThreshold: 1.2,
  minLen: 15,
  targetLen: 30,
  maxLen: 60,
};

export function segmentTranscript(
  input: TranscriptInput,
  opts: Partial<SegmentOptions> = {}
): Segment[] {
  const o = { ...DEFAULTS, ...opts };
  const us = input.utterances;
  const segments: Segment[] = [];

  let cur: { idx: number[]; start: number; end: number; text: string } | null = null;
  const flush = () => {
    if (cur && cur.text.trim()) {
      segments.push({
        start: cur.start,
        end: cur.end,
        text: cur.text.trim(),
        utteranceIdx: cur.idx,
      });
    }
    cur = null;
  };

  for (let i = 0; i < us.length; i++) {
    const u = us[i];
    if (!cur) {
      cur = { idx: [i], start: u.start, end: u.end, text: u.text };
      continue;
    }
    const gap = u.start - cur.end;
    const wouldLen = u.end - cur.start;
    const curLen = cur.end - cur.start;
    const gapBreak = gap > o.gapThreshold && curLen >= o.minLen;
    const targetBreak = curLen >= o.targetLen; // close gapless runs into moments
    if (gapBreak || targetBreak || wouldLen > o.maxLen) {
      flush();
      cur = { idx: [i], start: u.start, end: u.end, text: u.text };
    } else {
      cur.idx.push(i);
      cur.end = u.end;
      cur.text += " " + u.text;
    }
  }
  flush();
  return segments;
}
