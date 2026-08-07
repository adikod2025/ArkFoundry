/**
 * Demo launcher for the viral-detection graph. Runs the full pipeline on a
 * realistic ~2.5-minute transcript with the offline HeuristicLLM and prints the
 * ranked clips plus the per-node trace — a keys-free way to "launch" the engine.
 *
 * Run:  npm run ai:demo   (node --experimental-strip-types src/lib/ai/evals/demo.ts)
 */

import { detectViralClips } from "../pipeline.ts";
import type { TranscriptInput, Utterance } from "../types.ts";

function lines(step: number, texts: string[]): Utterance[] {
  const out: Utterance[] = [];
  let t = 0;
  for (const text of texts) {
    out.push({ start: Math.round(t * 10) / 10, end: Math.round((t + step) * 10) / 10, text });
    t += step;
  }
  return out;
}

// A realistic solo-founder podcast segment with several genuine hooks.
const utterances = lines(3.2, [
  "Welcome back to the show, today it's just me for a solo episode.",
  "I want to talk about how we grew the company in year one.",
  "Here's the biggest mistake I made when I started out.",
  "Nobody tells you the secret that distribution beats product every time.",
  "I was completely broke for almost two years because I ignored it.",
  "You won't believe how quickly things turned around after that.",
  "We went from zero to fifty thousand dollars a month in ninety days.",
  "And honestly it came down to one channel that just worked.",
  "So let me actually walk you through exactly how we did it.",
  "First we picked a platform that none of our competitors were touching.",
  "Then we committed to posting every single day, no exceptions at all.",
  "The engagement we saw in the first month was frankly insane.",
  "People kept asking, how are you growing this fast right now?",
  "The answer is boring: consistency compounds harder than talent.",
  "Let me give you the three numbers that changed everything for us.",
  "Our cost per lead dropped by about eighty percent in six weeks.",
  "Revenue tripled, and churn actually fell at the same time.",
  "I remember crying at my desk the day we hit six figures.",
  "It was the proudest moment of my entire career, no question.",
  "Alright, that's the core story of our first real breakthrough.",
  "Quick note before we wrap, a couple of housekeeping items.",
  "Remember to subscribe if any of this was useful to you.",
  "We read every single comment so please keep them coming.",
  "That is genuinely all I've got for you today, thanks so much.",
]);

const input: TranscriptInput = {
  videoId: "demo-podcast",
  durationSec: Math.round(utterances[utterances.length - 1].end),
  utterances,
};

function bar(score: number): string {
  const n = Math.round(score / 10);
  return "█".repeat(n) + "░".repeat(10 - n);
}

function mmss(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

async function main() {
  console.log("\n🎬  ViralClip AI — detection engine\n" + "=".repeat(60));
  console.log(`Source: ${input.videoId}  ·  ${mmss(input.durationSec)}  ·  ${input.utterances.length} utterances\n`);

  const state = await detectViralClips(input, { config: { platform: "TIKTOK", targetClipCount: 5 } });

  console.log("Pipeline trace (node → outcome):");
  for (const t of state.trace) {
    console.log(`  ${t.ok ? "✓" : "✗"} ${t.node.padEnd(20)} ${t.note}`);
  }

  console.log(`\nRanked clips (${state.clips.length}):\n` + "-".repeat(60));
  state.clips.forEach((c, i) => {
    console.log(
      `\n#${i + 1}  ${bar(c.viralScore)}  ${c.viralScore}/100   [${mmss(c.startSec)}–${mmss(c.endSec)}]  ${c.format} ${c.platform}`
    );
    console.log(`    hook: ${c.hookType}`);
    console.log(
      `    dims: hook ${c.dimensions.hook} · emotion ${c.dimensions.emotion} · clarity ${c.dimensions.clarity} · share ${c.dimensions.shareability} · pacing ${c.dimensions.pacing}`
    );
    const quote = c.excerpt.length > 96 ? c.excerpt.slice(0, 96) + "…" : c.excerpt;
    console.log(`    “${quote}”`);
  });
  console.log("\n" + "=".repeat(60));
  console.log("Note: offline HeuristicLLM. Swap in AnthropicLLM for production scoring.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
