---
name: agent-architecture
description: >-
  Methodology for architecting production-ready AI agents and multi-agent
  systems using Graph Engineering, test-time compute, verification, and
  self-improving loops. Use this skill whenever the user is designing,
  building, reviewing, or debugging an agent or agentic workflow — anything
  involving multiple LLM calls, tool use, orchestration, routing, multi-step
  reasoning, "agent that does X," pipelines, or when a single prompt/agent
  loop keeps failing, hallucinating, or losing the thread on a complex task.
  Trigger even when the user doesn't say "agent" explicitly but is clearly
  wiring together LLM calls, planning a reasoning pipeline, or asking how to
  make an AI workflow more reliable or cheaper.
---

# Agent Architecture

Building an AI agent that survives contact with real users is an engineering
discipline, not a prompt-writing exercise. A single agent loop — prompt, tool
call, response, repeat — works for narrow tasks but collapses on complex ones:
context overloads, the model hallucinates a step, one bad turn poisons the rest
of the run. The durable move is to stop asking one loop to do everything and
instead **engineer the structure of the work** so each piece is small, testable,
and hard to get wrong.

This skill is the playbook for that. Use it to decide *what shape* an agent
system should take, then to build it so it's reliable and affordable at scale.

## The core mental shift: from loop engineering to graph engineering

Most people start at **loop engineering** — tuning one agent's prompt and tools
until it mostly works. The ceiling is low because you're loading one context
window with the entire job.

**Graph engineering** is the layer above. Model the work as a directed graph:

- **Nodes** do specific work — gather data, run a deterministic quality check,
  format output. Each node can have its own tools, its own model, its own
  failure handling, its own level of "intelligence."
- **Edges** route the flow between nodes (including conditionally and in loops).
- **Shared state** flows along the edges — the accumulating context each node
  reads from and writes to.

The payoff is isolation. A formatting node doesn't need the reasoning model or
the research tools. A verification node can be pure deterministic code with zero
LLM calls. When something breaks, it breaks in one node you can inspect and
retry, not somewhere in a 40-turn transcript. And you spend frontier-model
tokens only where reasoning is actually hard.

**Design the graph before you write prompts.** Sketch the pipeline end to end —
what data enters, which nodes transform it, where decisions branch, what the
final output must look like — *then* fill in each node. Jumping straight to
prompt-tuning a monolith is the most common and most expensive mistake.

## Choosing the shape: match architecture to task

Don't reach for a graph reflexively. Match the structure to the difficulty.

| Task shape | Use | Why |
| :--- | :--- | :--- |
| Single-step Q&A, summarize, extract one field | **Single agent loop** | Fast to build, nothing to orchestrate. Structure would be pure overhead. |
| Linear multi-step where each step feeds the next | **Prompt chaining** | Each step is small and debuggable; failures localize to a stage. |
| Complex, branching, or long-running workflows | **Graph engineering** | Isolates failures, mixes model tiers, controls cost, supports loops and retries. |

Start at the simplest shape that plausibly works and escalate only when you hit
its ceiling. Over-architecting a simple task wastes build time and tokens; under-
architecting a hard one produces an unreliable agent you'll rewrite anyway. The
signal to escalate is concrete: the loop overflows its context, hallucinates
steps, or you find yourself stuffing unrelated responsibilities into one prompt.

## The workflow patterns

These are the building blocks. Real systems compose several. See
`references/workflow-patterns.md` for implementation detail, wiring, and
worked examples of each.

- **Prompt chaining** — sequential steps; output of one call is input to the
  next. Best for multi-step writing or staged data processing. Add a validation
  gate between stages so an early error doesn't propagate.
- **Routing** — classify the request first, then send it to the model or
  sub-workflow suited to its complexity. Cheap queries go to fast models; hard
  ones go to frontier models or specialized pipelines.
- **Parallelization** — run independent LLM calls at once (broad research,
  brainstorming, sectioning) and aggregate. Cuts latency; also enables
  repeated sampling (below).
- **Orchestrator–worker** — a manager LLM plans strategy and decomposes the
  task, then delegates sub-tasks to specialized worker LLMs and synthesizes
  their results. The default for open-ended work whose sub-tasks aren't known
  in advance.

## Reliability comes from verification, not bigger models

The highest-leverage reliability technique is **test-time compute** (inference
scaling): spend more compute *during inference* instead of reaching for a larger
model. Two moves drive it:

- **Repeated sampling** — generate multiple candidate solutions (in parallel)
  rather than betting on one.
- **Verification** — filter those candidates through a deterministic verifier
  before you commit to an answer.

Sampling only pays off if you can *tell which candidate is good*, so
**verification engineering** is the real work. Rank your verifiers by strength:

1. **Deterministic verifiers** — unit tests, a code-execution sandbox, schema
   validators, rule-based checkers, type checks. Objective and cheap. Use these
   wherever the output has a checkable property. This is what makes "generate 10,
   keep the one that passes" work.
2. **LLM-as-a-judge** — when correctness isn't mechanically checkable (tone,
   helpfulness, faithfulness), have a model score outputs against an explicit
   rubric. Weaker than a deterministic check; give it clear criteria and, where
   possible, cross-check with more than one judge.
3. **Reward modeling / human feedback** — for steering behavior over time when
   neither of the above fully captures quality.

Whenever you design a node that produces something, ask immediately: *how will I
verify this node's output?* If the honest answer is "I can't," that's a design
smell — restructure so the output becomes checkable (e.g., ask for structured
data you can validate rather than prose you can only eyeball).

## Self-improving and self-correcting loops

Give agents a feedback loop instead of one-shot execution. The core cycle:

**plan → act → observe (environment or verifier feedback) → self-correct → repeat.**

The observation step is where verification feeds back in: a failed test, a
schema mismatch, or a judge's critique becomes the input the agent uses to fix
its next attempt. Bound the loop — cap iterations, detect no-progress, and have
a fallback — so a self-correcting agent can't spin forever. This is how agents
recover from their own mistakes rather than confidently shipping the first one.

## Controlling cost: model pluralism

You do not have to run the whole pipeline on your most expensive model. Route by
difficulty: send genuine reasoning, planning, and synthesis to frontier models,
and hand routine extraction, classification, and formatting to faster, cheaper
models. Because graph nodes are isolated, each can declare its own model — so
model selection becomes a per-node decision, and a well-designed graph often
costs a fraction of a monolith while being *more* reliable, not less.

## Treat prompts and workflows as software

Agent systems are software and deserve software discipline:

- **Version control** prompts and graph definitions.
- **Define test cases** — realistic inputs with known-good expectations — and run
  them on every change. Regressions in agents are silent otherwise.
- **Use evaluation guardrails** — deterministic checks plus LLM-as-judge — running
  continuously to catch quality drift, bias, and edge-case failures.
- **Iterate on evidence.** Change one thing, re-run the evals, keep what measurably
  helps. Vibes don't scale to production.

## How to apply this skill

When a user brings you an agent-building task:

1. **Clarify the job and its hardest sub-task.** What enters, what must come out,
   where is the reasoning genuinely difficult versus mechanical.
2. **Pick the simplest viable shape** (loop → chain → graph) and say why.
3. **Sketch the pipeline** — nodes, edges, shared state — before any prompt.
4. **For every producing node, name its verifier.** Prefer deterministic; fall
   back to LLM-as-judge with a rubric; restructure outputs to be checkable.
5. **Assign a model tier per node** by difficulty, not uniformly.
6. **Add self-correction** where the task benefits, with a bounded loop.
7. **Stand up evals** — a handful of test cases and checks — so the system can be
   improved on evidence rather than guesswork.

Lead with the reasoning, not just the recommendation: explain *why* a given shape
fits so the user can adapt it as their task evolves. For deeper treatment of any
pattern, read `references/workflow-patterns.md`.
