/**
 * Eval fixtures — synthetic transcripts with KNOWN properties, so assertions
 * can be objective. The skill: "Define test cases — realistic inputs with
 * known-good expectations — and run them on every change."
 */

import type { TranscriptInput, Utterance } from "../types.ts";

/** Build utterances of ~`step`s each from a list of lines, starting at `t0`. */
function lines(t0: number, step: number, texts: string[]): Utterance[] {
  const out: Utterance[] = [];
  let t = t0;
  for (const text of texts) {
    out.push({ start: round(t), end: round(t + step), text });
    t += step;
  }
  return out;
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * FIXTURE A — a hook-rich podcast clip. Contains an obvious planted viral
 * moment ("the biggest mistake ... nobody tells you the secret") we assert gets
 * surfaced. Utterances are short (3s) so boundaries are dense and snappable.
 */
export const hookRich: {
  input: TranscriptInput;
  plantedHookText: string;
} = (() => {
  const us = lines(0, 3, [
    "So today I want to talk about building a startup.",
    "A lot of people ask me where to begin.",
    "Here's the biggest mistake founders make early on.",
    "Nobody tells you the secret: distribution beats product.",
    "I was broke for two years because I ignored this.",
    "You won't believe how fast things changed after.",
    "We went from zero to fifty thousand dollars a month.",
    "And it all came down to one channel that worked.",
    "Let me walk you through exactly how we did it.",
    "First, we picked a platform nobody else was using.",
    "Then we posted every single day without fail.",
    "The results were honestly insane within weeks.",
    "Anyway, that's the story of our first big break.",
    "Thanks for listening, more next time.",
    "Quick housekeeping note before we wrap up here.",
    "Remember to subscribe if this was helpful at all.",
    "We read every comment so keep them coming.",
    "Alright, that is genuinely all for today folks.",
  ]);
  return {
    input: { videoId: "fixture-hookRich", durationSec: 54, utterances: us },
    plantedHookText: "Nobody tells you the secret",
  };
})();

/**
 * FIXTURE B — a mostly-flat monologue whose only hooks are BORDERLINE: two
 * open-question beats that score below the identifier's strict first-pass
 * threshold but above its relaxed threshold. So the strict round finds nothing,
 * the bounded loop widens the net, and the second round recovers them. Proves
 * the self-correction loop actually recovers instead of just spinning. The two
 * questions sit in different segments (early vs late) so they become two clips.
 */
export const flatTalk: { input: TranscriptInput } = (() => {
  const us = lines(0, 4, [
    "Let me give a brief update on the quarterly numbers.", // 0-4
    "Revenue was roughly in line with our projections.", // 4-8
    "But have you ever wondered why that actually happens?", // 8-12  (borderline hook)
    "Costs stayed about flat compared to last quarter.", // 12-16
    "Headcount did not change much over the period.", // 16-20
    "We renewed a few contracts as expected this month.", // 20-24
    "The roadmap remains broadly the same as before.", // 24-28
    "Support volume was steady with no major spikes.", // 28-32
    "So what does all of this really mean for us going forward?", // 32-36 (borderline)
    "That covers the operational summary, thanks everyone.", // 36-40
  ]);
  return { input: { videoId: "fixture-flatTalk", durationSec: 40, utterances: us } };
})();

/**
 * FIXTURE C — a tiny, near-empty transcript. The graph must degrade gracefully:
 * produce zero or few clips WITHOUT throwing and WITHOUT violating any verifier.
 */
export const tiny: { input: TranscriptInput } = {
  input: {
    videoId: "fixture-tiny",
    durationSec: 6,
    utterances: lines(0, 3, ["Hey.", "Bye."]),
  },
};
