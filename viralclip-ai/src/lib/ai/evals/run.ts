/**
 * Offline eval harness for the viral-clip detection graph.
 *
 * Runs the whole pipeline with the deterministic HeuristicLLM and asserts the
 * skill's guarantees hold: every verifier passes, the output is well-formed,
 * planted hooks surface, the self-correction loop recovers, and runs are
 * reproducible. Exits non-zero on any failure so it can gate CI.
 *
 * Run:  node --experimental-strip-types src/lib/ai/evals/run.ts
 */

import { detectViralClips } from "../pipeline.ts";
import { DEFAULT_CONFIG, type PipelineState } from "../types.ts";
import {
  overlapFraction,
  verifyLength,
  verifyRanked,
  verifyScore,
  verifySegments,
  verifySnappedToUtterances,
} from "../verify.ts";
import { flatTalk, hookRich, tiny } from "./fixtures.ts";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Assert the invariants that must hold for ANY input, on a finished run. */
function assertUniversalInvariants(label: string, s: PipelineState) {
  const cfg = { ...DEFAULT_CONFIG };

  check(`${label}: segments verify`, verifySegments(s.segments, s.input).ok);

  const allSnapped = s.candidates.every(
    (c) => verifySnappedToUtterances(c, s.input).ok && verifyLength(c, cfg).ok
  );
  check(`${label}: every candidate snapped to utterance edges & within length`, allSnapped);

  const allScored = s.scored.every((c) => verifyScore(c, cfg).ok);
  check(`${label}: every score = recomputed weighted sum, dims in [0,100]`, allScored);

  check(`${label}: final ranking verifier passes`, verifyRanked(s.clips, cfg).ok);

  check(
    `${label}: clips sorted by viralScore desc`,
    s.clips.every((c, i) => i === 0 || s.clips[i - 1].viralScore >= c.viralScore)
  );

  const noOverlap = s.clips.every((a, i) =>
    s.clips.every((b, j) => i >= j || overlapFraction(a, b) <= cfg.maxOverlapFraction)
  );
  check(`${label}: no two clips overlap beyond threshold`, noOverlap);

  check(
    `${label}: clip count within target`,
    s.clips.length <= cfg.targetClipCount
  );

  check(
    `${label}: every clip within video bounds`,
    s.clips.every((c) => c.startSec >= 0 && c.endSec <= s.input.durationSec + 1e-6)
  );
}

async function main() {
  console.log("\nViralClip AI — viral-detection graph evals\n" + "=".repeat(46));

  // ---- FIXTURE A: hook-rich ------------------------------------------------
  console.log("\n[A] hook-rich podcast");
  const a = await detectViralClips(hookRich.input);
  assertUniversalInvariants("A", a);
  check("A: produced at least one clip", a.clips.length >= 1, `got ${a.clips.length}`);
  const surfacedHook = a.clips.some((c) =>
    c.excerpt.includes(hookRich.plantedHookText)
  );
  check("A: planted hook moment is surfaced in a clip", surfacedHook);
  const topScore = a.clips[0]?.viralScore ?? 0;
  check("A: top clip scores in a viral range (>=60)", topScore >= 60, `top=${topScore}`);

  // ---- FIXTURE B: flat talk needs self-correction --------------------------
  console.log("\n[B] flat monologue (exercises self-correction loop)");
  const b = await detectViralClips(flatTalk.input);
  assertUniversalInvariants("B", b);
  const rounds = b.trace.filter((t) => t.node.startsWith("identify:round")).length;
  check("B: identify ran more than one round (loop engaged)", rounds > 1, `rounds=${rounds}`);
  // The strict first round should find nothing; recovery happens after relaxing.
  const round0Note = b.trace.find((t) => t.node === "identify:round0")?.note ?? "";
  check("B: strict first round found too few (0 total)", /0 total/.test(round0Note), round0Note);
  check("B: recovered clips after self-correction relaxed the net", b.clips.length >= 1, `got ${b.clips.length}`);

  // ---- FIXTURE C: tiny transcript degrades gracefully ----------------------
  console.log("\n[C] tiny transcript (graceful degradation)");
  const c = await detectViralClips(tiny.input);
  assertUniversalInvariants("C", c);
  check("C: did not throw and produced a valid (possibly empty) result", true);

  // ---- Determinism: same input → identical output --------------------------
  console.log("\n[D] determinism");
  const d1 = await detectViralClips(hookRich.input);
  const d2 = await detectViralClips(hookRich.input);
  const sig = (s: PipelineState) =>
    s.clips.map((c) => `${c.startSec}-${c.endSec}:${c.viralScore}`).join("|");
  check("D: offline pipeline is reproducible", sig(d1) === sig(d2));

  // ---- Bounded loop: never exceeds maxIdentifyRounds -----------------------
  console.log("\n[E] loop is bounded");
  const eRounds = b.trace.filter((t) => t.node.startsWith("identify:round")).length;
  check(
    "E: identify rounds never exceed maxIdentifyRounds",
    eRounds <= DEFAULT_CONFIG.maxIdentifyRounds,
    `rounds=${eRounds}, cap=${DEFAULT_CONFIG.maxIdentifyRounds}`
  );

  // ---- Summary -------------------------------------------------------------
  console.log("\n" + "=".repeat(46));
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("All viral-detection graph evals passed.\n");
}

main().catch((err) => {
  console.error("eval harness crashed:", err);
  process.exit(1);
});
