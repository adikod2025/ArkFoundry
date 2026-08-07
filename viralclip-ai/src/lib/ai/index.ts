/**
 * Public surface of the viral-clip detection graph.
 *
 * Production usage (e.g. from the Inngest job):
 *
 *   import { detectViralClips, AnthropicLLM } from "@/lib/ai";
 *   const state = await detectViralClips(transcriptInput, {
 *     llm: new AnthropicLLM(),          // frontier+cheap tiers, per node
 *     config: { platform: "TIKTOK", targetClipCount: 10 },
 *   });
 *   // state.clips → ranked, verified ScoredCandidate[]
 *
 * Tests/offline: omit `llm` to use the deterministic HeuristicLLM.
 */

export { detectViralClips, type RunOptions } from "./pipeline.ts";
export { AnthropicLLM, HeuristicLLM, type ViralLLM } from "./llm.ts";
export * from "./types.ts";
export * as verify from "./verify.ts";
