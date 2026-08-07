# ViralClip AI

Turn one long video into a ranked set of platform-ready viral clips. Built from
the one-session build spec, with one substantive upgrade: the "AI viral engine"
is a **real Graph-Engineering pipeline**, not the spec's `Math.random()` stub.

## What's here

A Next.js 14 (App Router) SaaS scaffold — Clerk auth, Prisma/Postgres, Stripe
billing, UploadThing uploads, Inngest background jobs, Deepgram transcription —
wired around a genuine viral-clip detection graph.

```
src/
├── lib/ai/            ← the viral-detection graph (the heart; see its README)
│   ├── pipeline.ts    ← orchestrator: nodes, edges, shared state, self-correction
│   ├── nodes/         ← segment · identify · snap · score · rank
│   ├── verify.ts      ← deterministic verifiers
│   ├── llm.ts         ← ViralLLM interface: HeuristicLLM (offline) + AnthropicLLM
│   └── evals/         ← runnable eval harness (33 assertions, all green)
├── inngest/functions.ts ← transcribe → detectViralClips → persist (no more random)
├── lib/               ← prisma, stripe, uploadthing, inngest, deepgram, replicate
├── app/               ← landing, dashboard, auth, API routes + webhooks
└── components/        ← dashboard UI + minimal shadcn primitives
```

## The interesting part: the viral-detection graph

The spec admits (§12, §14) that viral scoring is faked. This build replaces it
with a directed graph of single-responsibility nodes, each with its own verifier
and model tier — designed with the `agent-architecture` skill. See
[`src/lib/ai/README.md`](src/lib/ai/README.md) for the full write-up. Highlights:

- **4 of 5 nodes are deterministic code** (segment, snap, rank, score-math) — the
  model is used only where reasoning is genuinely hard (identify, judge).
- **The headline `viralScore` is recomputed** from the judge's dimensions, so an
  LLM can't hand-wave the number ranking depends on.
- **Bounded self-correction**: a strict first pass, then a wider net if the yield
  is low — capped, never unbounded.
- **Model pluralism**: frontier model to find moments, cheap model to score them.
- **Evals as first-class**: they already caught a real segmentation bug.

### Run the graph's evals right now (no keys, no install)

```bash
npm run ai:eval
# → node --experimental-strip-types src/lib/ai/evals/run.ts
# → RESULT: 33 passed, 0 failed
```

This runs the entire pipeline offline with the deterministic `HeuristicLLM`.
Swap in `AnthropicLLM` (needs `ANTHROPIC_API_KEY`) for production quality; the
graph structure and every verifier are identical.

## Full setup (the SaaS around the graph)

Requires external accounts and keys (Clerk, Supabase, Stripe, UploadThing,
Inngest, Deepgram, Replicate, Anthropic). Copy `.env.example` → `.env.local` and
fill them in, then:

```bash
npm install
npx prisma migrate dev --name init && npx prisma generate
npm run dev
npx inngest-cli@latest dev     # separate terminal, for local background jobs
```

See the build spec (§10) for the full phase-by-phase setup and deploy steps.

## What's real vs. stubbed in this build

| Area | Status |
|------|--------|
| Viral-moment detection & scoring graph | **Real, tested** (`src/lib/ai`, 33 evals green) |
| Inngest pipeline wiring to the graph | Real |
| Deepgram → graph transcript adapter | Real |
| App scaffold, routes, webhooks, UI | Faithful to spec |
| Actual video cutting/encoding | Placeholder (passes source URL) — see spec §12; needs GPU/ffmpeg |
| External service keys & deploy | Not provisioned in this environment |

## Corrections applied to the spec

- **Added `src/middleware.ts`** — Clerk's `auth()` throws without it; the spec
  omitted it entirely.
- **Moved the dashboard to a real `/dashboard` segment** — the spec's pathless
  `(dashboard)` route group collided with the landing `app/page.tsx` (both map to
  `/`) and didn't match the sidebar's `/dashboard/*` links.
- **Replaced random viral scoring** with the real detection graph.

## Integration note on the AI module

`src/lib/ai` uses explicit `.ts` import specifiers so it runs directly under
Node's native TypeScript for the eval harness with zero build step. `tsconfig`
sets `moduleResolution: "bundler"` + `allowImportingTsExtensions` so it also
type-checks in the app. If your bundler rejects `.ts` specifiers, consume the
module via its compiled output — the logic is bundler-agnostic.
