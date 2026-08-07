# Viral-Clip Detection Graph

This module is the part of ViralClip AI that the build spec left as a stub —
its "multi-agent graph engine" was literally `Math.floor(Math.random() * 30) + 70`
(spec §7, admitted in §12/§14). It is rebuilt here as a real
**Graph-Engineering** pipeline, following the `agent-architecture` skill.

It is self-contained, dependency-free, and runs offline. `npm run ai:eval`
executes the whole graph against synthetic transcripts and checks the skill's
guarantees hold.

## Why a graph (and not one prompt)

The job — "turn a long transcript into a ranked set of self-contained viral
clips" — mixes genuinely hard reasoning (which moments will travel?) with a lot
of mechanical work (segmenting, snapping cuts to word boundaries, enforcing
platform lengths, de-duplicating, ranking). Handing all of that to one prompt
is the monolith the skill warns against: it wastes a frontier model on string
manipulation, and it produces a headline "viral score" no one can verify.

So the work is a **directed graph of single-responsibility nodes**, each with its
own verifier and model tier:

```
segment ─▶ identify ─▶ [enough valid?] ──no──▶ identify(round+1)   (bounded loop)
              ▲__________________________________|
                                 │yes
                                 ▼
                           snap ─▶ score ─▶ dedupeAndRank ─▶ clips
```

| Node | File | Type | Model tier | Verifier |
|------|------|------|-----------|----------|
| 1. segment | `nodes/segment.ts` | deterministic | none | `verifySegments` |
| 2. identify | `nodes/identify.ts` | LLM reasoning | frontier (`claude-sonnet-5`) | `verifyCandidate` (schema + range) |
| 3. snap | `nodes/snap.ts` | deterministic | none | `verifySnappedToUtterances`, `verifyLength` |
| 4. score | `nodes/score.ts` | LLM-as-judge | cheap (`claude-haiku-4-5`) | `verifyScore` (dims in range + recomputed sum) |
| 5. rank | `nodes/rank.ts` | deterministic | none | `verifyRanked` (sorted, deduped, capped) |

The orchestrator (`pipeline.ts`) owns the shared `PipelineState`, runs each node
behind its verifier, and appends a `TraceEntry` per node so a failed run is
inspectable node-by-node instead of as one opaque transcript.

## How this maps to the skill

- **Design the graph before prompts.** Nodes, edges, and the `PipelineState`
  contract (`types.ts`) were fixed first; prompts came last.
- **Deterministic verification, not a bigger model.** Four of five nodes are
  pure code. The headline `viralScore` is *recomputed* from the judge's
  dimensions (`computeViralScore`), so the model proposes sub-scores but cannot
  hand-wave the number ranking depends on.
- **Test-time compute.** `identify` runs `identifySamples` passes and unions the
  results (`pipeline.ts`), so one bad draw doesn't sink the run.
- **Bounded self-correction.** If a strict first pass yields too few valid
  candidates, the identify node re-runs with a wider net — capped at
  `maxIdentifyRounds`, never unbounded. Eval fixture B proves it recovers.
- **Model pluralism.** `AnthropicLLM` targets a frontier model for reasoning and
  a cheap model for judging — a per-node decision, set in one place.
- **Treat it as software.** `evals/` holds fixtures with known-good properties
  and 33 assertions; they already caught a real segmentation bug (gapless
  transcripts collapsing into one segment) and drove the fix.

## Swapping in real models

Offline/tests use the deterministic `HeuristicLLM` automatically. In production,
pass `AnthropicLLM` (reads `ANTHROPIC_API_KEY`):

```ts
import { detectViralClips, AnthropicLLM } from "@/lib/ai";

const state = await detectViralClips(transcriptInput, {
  llm: new AnthropicLLM(),
  config: { platform: "TIKTOK", targetClipCount: 10 },
});
// state.clips → ranked, verified ScoredCandidate[]
// state.trace → per-node observability
```

The interface (`ViralLLM`) is the only seam; any provider that returns the
structured shapes works, because every field is verified downstream.

## Running the evals

```bash
npm run ai:eval          # node --experimental-strip-types src/lib/ai/evals/run.ts
```

Exits non-zero on any failed assertion, so it can gate CI.

## A note on integration

These files use explicit `.ts` import specifiers so the graph runs directly
under Node's native TypeScript (`--experimental-strip-types`) with zero build
step — which is how the eval harness proves it works. When importing from the
Next.js app, either keep `moduleResolution: "bundler"` (type-checks as-is) or
consume the module through its compiled output; the logic is bundler-agnostic.
