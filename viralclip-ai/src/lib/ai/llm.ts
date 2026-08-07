/**
 * The LLM layer, kept behind a narrow interface so the graph depends on a
 * capability, not a vendor. Two implementations:
 *
 *  - HeuristicLLM  — deterministic, offline, zero-dependency. Makes the whole
 *                    pipeline runnable and its evals reproducible without any
 *                    API key. This is what the eval harness uses.
 *  - AnthropicLLM  — the production path. Note the deliberate MODEL PLURALISM:
 *                    `identify` (open-ended reasoning) targets a frontier tier;
 *                    `score` (rubric-bounded judging) targets a cheaper tier.
 *                    The skill: "model selection becomes a per-node decision."
 *
 * The interface is intentionally structured (returns typed objects, not free
 * text) so a deterministic verifier downstream can check every field.
 */

import type { DimensionScores, Segment } from "./types.ts";

export interface RawCandidate {
  startSec: number;
  endSec: number;
  hookType: string;
  reason: string;
  excerpt: string;
}

export interface ScoreResult {
  dimensions: DimensionScores;
  justification: string;
}

export interface ViralLLM {
  /**
   * Propose viral-moment candidates from the segmented transcript.
   * @param round self-correction round; higher rounds should widen the net.
   * @param sample repeated-sampling index; lets a stochastic model diversify.
   */
  identify(
    segments: Segment[],
    durationSec: number,
    round: number,
    sample: number
  ): Promise<RawCandidate[]>;

  /** Judge one candidate across the five dimensions against a fixed rubric. */
  score(excerpt: string, hookType: string): Promise<ScoreResult>;
}

// ---------------------------------------------------------------------------
// Heuristic (offline, deterministic) implementation
// ---------------------------------------------------------------------------

const HOOK_PATTERNS: Array<{ re: RegExp; type: string; weight: number }> = [
  { re: /\b(secret|nobody tells you|no one tells you|truth about)\b/i, type: "curiosity-gap", weight: 34 },
  { re: /\b(biggest mistake|worst thing|never do|stop doing)\b/i, type: "warning", weight: 30 },
  { re: /\b(here'?s (why|how)|the reason|this is how)\b/i, type: "how-to", weight: 26 },
  { re: /\b(i was (shocked|wrong|broke)|changed my life|blew my mind)\b/i, type: "personal-stakes", weight: 30 },
  { re: /\b(you won'?t believe|crazy|insane|unbelievable)\b/i, type: "spectacle", weight: 22 },
  { re: /\b(\$\d[\d,]*|\d+\s?(x|percent|%)|\d+\s?(million|k|thousand))\b/i, type: "bold-number", weight: 24 },
  { re: /\?/, type: "open-question", weight: 14 },
];

const EMOTION_WORDS = /\b(love|hate|fear|angry|amazing|terrible|shocked|cried|proud|devastat|thrill|scared|excited|furious)\w*/gi;

function feature(text: string) {
  let hook = 0;
  let hookType = "insight";
  for (const p of HOOK_PATTERNS) {
    if (p.re.test(text) && p.weight > hook) {
      hook = p.weight;
      hookType = p.type;
    }
  }
  const emotionHits = (text.match(EMOTION_WORDS) || []).length;
  const exclaim = (text.match(/!/g) || []).length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return { hook, hookType, emotionHits, exclaim, words };
}

/**
 * A stand-in for a reasoning model. Deterministic given (segments, round,
 * sample), so evals are reproducible. `round` relaxes the acceptance threshold
 * (this is what makes the self-correction loop observably recover); `sample`
 * perturbs it slightly so repeated sampling unions a slightly different set.
 */
export class HeuristicLLM implements ViralLLM {
  async identify(
    segments: Segment[],
    _durationSec: number,
    round: number,
    sample: number
  ): Promise<RawCandidate[]> {
    const threshold = Math.max(6, 22 - round * 8 - sample * 2);
    const out: RawCandidate[] = [];
    for (const seg of segments) {
      const f = feature(seg.text);
      const salience = f.hook + f.emotionHits * 6 + f.exclaim * 4;
      if (salience >= threshold) {
        out.push({
          startSec: seg.start,
          endSec: seg.end,
          hookType: f.hookType,
          reason: `salience ${salience} (hook ${f.hook}, emotion ${f.emotionHits}, round ${round})`,
          excerpt: seg.text,
        });
      }
    }
    return out;
  }

  async score(excerpt: string, hookType: string): Promise<ScoreResult> {
    const f = feature(excerpt);
    const hook = clamp(30 + f.hook * 2 + (hookType !== "insight" ? 10 : 0), 0, 100);
    const emotion = clamp(25 + f.emotionHits * 15 + f.exclaim * 6, 0, 100);
    // Standalone clarity: rewards a "goldilocks" length, punishes fragments.
    const clarity = clamp(100 - Math.abs(f.words - 90) * 0.6, 20, 100);
    const shareability = clamp((hook + emotion) / 2 + f.exclaim * 3, 0, 100);
    // Pacing: words-per-implied-second; too sparse reads as dead air.
    const pacing = clamp(40 + Math.min(f.words, 120) * 0.5, 0, 100);
    return {
      dimensions: {
        hook: Math.round(hook),
        emotion: Math.round(emotion),
        clarity: Math.round(clarity),
        shareability: Math.round(shareability),
        pacing: Math.round(pacing),
      },
      justification: `hook=${hookType}; ${f.words} words, ${f.emotionHits} emotion cues, ${f.exclaim} exclamations.`,
    };
  }
}

// ---------------------------------------------------------------------------
// Anthropic (production) implementation — model pluralism per node
// ---------------------------------------------------------------------------

interface AnthropicOpts {
  apiKey?: string;
  identifyModel?: string; // frontier tier: hard, open-ended reasoning
  scoreModel?: string; // cheaper tier: bounded rubric judging
  baseUrl?: string;
}

/**
 * Production LLM path. Not exercised by the offline eval harness. Prompts ask
 * for STRICT JSON so the downstream verifier can validate structure; anything
 * unparseable is treated as an empty result and handled by the graph's
 * self-correction, never crashing the run.
 */
export class AnthropicLLM implements ViralLLM {
  private key: string;
  private identifyModel: string;
  private scoreModel: string;
  private baseUrl: string;

  constructor(opts: AnthropicOpts = {}) {
    this.key = opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    // Frontier for reasoning, cheaper for judging — the skill's model pluralism.
    this.identifyModel = opts.identifyModel ?? "claude-sonnet-5";
    this.scoreModel = opts.scoreModel ?? "claude-haiku-4-5-20251001";
    this.baseUrl = opts.baseUrl ?? "https://api.anthropic.com/v1/messages";
  }

  async identify(
    segments: Segment[],
    durationSec: number,
    round: number,
    sample: number
  ): Promise<RawCandidate[]> {
    const widen = round > 0
      ? `\n\nA previous pass returned too few usable moments. Cast a WIDER net: include subtler hooks and shorter beats.`
      : "";
    const transcript = segments
      .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
      .join("\n");
    const prompt =
      `You are a short-form video editor. From this timestamped transcript ` +
      `(video is ${durationSec}s long), identify the moments most likely to go ` +
      `viral as standalone clips. Look for curiosity gaps, bold claims, ` +
      `emotional peaks, and self-contained stories.${widen}\n\n` +
      `Transcript:\n${transcript}\n\n` +
      `Return ONLY a JSON array; each item: ` +
      `{"startSec":number,"endSec":number,"hookType":string,"reason":string,"excerpt":string}. ` +
      `Timestamps must lie within 0..${durationSec}.`;
    const text = await this.call(this.identifyModel, prompt, sample);
    return safeJsonArray(text) as RawCandidate[];
  }

  async score(excerpt: string, hookType: string): Promise<ScoreResult> {
    const prompt =
      `Score this candidate clip (hook type: ${hookType}) for viral potential ` +
      `on five dimensions, each 0-100:\n` +
      `- hook: does the first ~2s grab attention\n` +
      `- emotion: emotional intensity / stakes\n` +
      `- clarity: understandable without the rest of the video\n` +
      `- shareability: would a viewer send it to a friend\n` +
      `- pacing: tight, no dead air\n\n` +
      `Clip transcript:\n"""${excerpt}"""\n\n` +
      `Return ONLY JSON: {"hook":n,"emotion":n,"clarity":n,"shareability":n,` +
      `"pacing":n,"justification":string}.`;
    const text = await this.call(this.scoreModel, prompt, 0);
    const obj = safeJsonObject(text);
    const num = (k: string) => clamp(Number(obj?.[k] ?? 0), 0, 100);
    return {
      dimensions: {
        hook: num("hook"),
        emotion: num("emotion"),
        clarity: num("clarity"),
        shareability: num("shareability"),
        pacing: num("pacing"),
      },
      justification: String(obj?.justification ?? ""),
    };
  }

  private async call(model: string, prompt: string, sample: number): Promise<string> {
    if (!this.key) throw new Error("ANTHROPIC_API_KEY not set");
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        // Vary temperature by sample so repeated sampling actually diversifies.
        temperature: Math.min(1, 0.4 + sample * 0.3),
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.map((c) => c.text ?? "").join("") ?? "";
  }
}

// --- helpers ---------------------------------------------------------------

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(x) ? x : lo));
}

/** Extract the first JSON array from model text; [] on failure (never throws). */
function safeJsonArray(text: string): unknown[] {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const v = JSON.parse(m[0]);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Extract the first JSON object from model text; null on failure. */
function safeJsonObject(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}
