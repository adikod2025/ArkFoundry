# Workflow Patterns — Implementation Reference

Deeper detail on the agentic workflow patterns introduced in SKILL.md. Read the
section for the pattern you're building. Real systems compose several of these —
an orchestrator whose workers each run a small chain, a router that dispatches to
parallelized research, and so on.

## Contents
1. Prompt Chaining
2. Routing
3. Parallelization
4. Orchestrator–Worker
5. Graph Engineering: nodes, edges, shared state
6. Test-time compute in practice
7. Verification engineering in practice
8. Self-correction loops
9. Anti-patterns

---

## 1. Prompt Chaining

Decompose a task into a fixed sequence of steps; each LLM call's output becomes
the next call's input.

**When:** the task is genuinely sequential and the steps are known in advance —
outline → draft → edit; extract → normalize → summarize.

**Build it well:**
- Keep each step doing one thing. A step that's still too big is a candidate for
  its own sub-chain.
- Put a **validation gate** between steps. Before passing output downstream,
  check it (schema, length, a required field, a sanity rule). An early error
  otherwise silently corrupts everything after it.
- Make each step's contract explicit — what it receives, what it must emit — so a
  failure is attributable to one stage.

**Cost:** latency is additive (steps run in series) and a broken early step
breaks the chain. If steps are independent, prefer parallelization.

---

## 2. Routing

Classify the input first, then dispatch to the handler best suited to it.

**When:** requests vary widely in kind or difficulty and one path handles them
all poorly — a support inbox mixing refunds, bug reports, and sales; queries
ranging from trivial to research-grade.

**Build it well:**
- The router is a small, fast classifier. Keep it cheap; it runs on every request.
- Route by *difficulty and type*, not just topic. Cheap/known → fast model or a
  canned path; hard/open-ended → frontier model or a full sub-workflow.
- Always have a default route for inputs that match nothing.
- Log routing decisions — misroutes are your best signal for refining categories.

Routing is the natural front door for model pluralism: it's where a request
earns (or is denied) expensive compute.

---

## 3. Parallelization

Run multiple LLM calls concurrently and aggregate. Two distinct flavors:

- **Sectioning** — split a task into independent sub-tasks that run at once
  (research several sub-questions; review a document along separate dimensions),
  then combine. Cuts wall-clock latency.
- **Voting / sampling** — run the *same* task multiple times to get diverse
  attempts, then select or aggregate (majority vote, or filter by a verifier).
  This is the mechanism behind test-time compute.

**Build it well:**
- Make sub-tasks truly independent — if B needs A's output, that's a chain, not
  parallel work.
- Design the **aggregation step** deliberately: concatenate, majority-vote,
  synthesize with another LLM call, or keep only verifier-passing candidates.
- Cap fan-out. Concurrency has real cost; more samples show diminishing returns.

---

## 4. Orchestrator–Worker

A central orchestrator LLM plans the approach, decomposes the task into
sub-tasks *dynamically*, delegates each to a worker, and synthesizes the results.

**When:** the sub-tasks can't be enumerated up front — they depend on the input.
Coding across an unknown set of files, research whose next question depends on
what you just found, multi-part deliverables of varying shape.

**Distinction from parallelization:** parallelization uses a *fixed*
decomposition you defined at design time; the orchestrator *decides* the
decomposition at run time. Use orchestrator–worker when you can't predict the
breakdown in advance.

**Build it well:**
- The orchestrator owns planning and synthesis and holds the high-level context;
  workers get only the focused context their sub-task needs. This is the whole
  point — workers stay small and reliable.
- Give workers structured return contracts so synthesis is mechanical, not
  another fragile free-text parse.
- Bound the orchestrator's planning loop so it can't decompose forever.

---

## 5. Graph Engineering: nodes, edges, shared state

The umbrella structure the other patterns slot into.

**Nodes** — a unit of work: an LLM call, a tool call, deterministic code, or a
nested sub-graph. Each node declares its own tools, model tier, and failure
handling. Keep nodes single-responsibility; that's what makes them independently
testable and independently retryable.

**Edges** — how control flows between nodes: straight-through, **conditional**
(branch on state — a router is a conditional edge), and **loops** (route back to
an earlier node for self-correction). Conditional edges and loops are what lift a
graph above a linear chain.

**Shared state** — the object flowing along edges that nodes read and write.
Design it explicitly and early:
- Decide what each node reads and what it's allowed to write.
- Prefer append/structured updates over letting every node rewrite everything —
  it keeps state debuggable and prevents nodes from clobbering each other.
- The state at any point should be inspectable, so you can see exactly what a
  failing node was handed.

**Design order:** shape the graph first — draw nodes, edges, and the state
contract on paper — *then* implement nodes one at a time, testing each in
isolation before wiring the whole thing.

---

## 6. Test-time compute in practice

Spend inference compute to raise quality instead of upgrading the base model.

- **Repeated sampling:** generate N candidates (parallelization, voting flavor).
- **Selection:** pick the winner — a deterministic verifier is ideal; otherwise
  majority vote or an LLM judge.
- **Best-of-N** works only with a real selection signal. N mediocre candidates
  and no way to tell them apart buys nothing — invest in the verifier first.
- **Tune N to the stakes.** High-value or hard-to-reverse outputs justify more
  samples and stronger verification; cheap, low-risk ones may not justify any.

The rule of thumb: money spent on verification usually beats money spent on a
bigger model, because a verifier makes *every* sample more valuable.

---

## 7. Verification engineering in practice

Build the checkable property into the task instead of bolting a check on after.

- **Deterministic first.** If output can be a data structure, validate its
  schema. If it's code, run it against tests in a sandbox. If it's a
  calculation, recompute and compare. If it's a claim about a source, check the
  claim against the source programmatically.
- **Shape outputs to be verifiable.** Asking for structured JSON you can
  validate beats free prose you can only judge subjectively. This single choice
  turns many "unverifiable" nodes into deterministically-checkable ones.
- **LLM-as-a-judge when you must.** Give an explicit rubric, ask for a
  structured verdict (score + reasons), and prefer more than one judge or more
  than one framing for high-stakes calls to reduce single-judge bias.
- **Verifiers are nodes too.** In a graph, a verifier is a node whose failure
  routes back (loop edge) to the producer for another attempt.

---

## 8. Self-correction loops

The cycle: **plan → act → observe → self-correct → repeat.**

- **Observe** = feed real feedback back in: the verifier's failure, the tool
  error, the judge's critique, the environment's response — not the model's own
  say-so about whether it succeeded.
- **Self-correct** = the agent revises its next attempt using that observation.
- **Always bound the loop:** a max iteration count, a no-progress detector (two
  attempts producing the same failure → stop), and a graceful fallback (escalate,
  return best-so-far, or surface the failure). An unbounded self-correcting loop
  is a way to spend unlimited tokens making no progress.

---

## 9. Anti-patterns

- **Monolith-first.** Cramming the whole job into one prompt and tuning it
  forever. Decompose instead.
- **No verifier.** Trusting generated output because it "looks right." If you
  can't check it, you can't scale it.
- **Uniform model tier.** Running formatting and routing on your most expensive
  model. Route by difficulty.
- **Unbounded loops.** Self-correction or orchestration with no iteration cap or
  no-progress detection.
- **Prompt-first, structure-later.** Writing prompts before sketching the
  pipeline. Design the graph first.
- **Untested changes.** Editing a production agent with no eval suite to catch
  the regression. Treat it as software.
