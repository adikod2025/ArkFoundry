# AviOS Development — Session Operating System

You are developing **AviOS**: a predictive maintenance platform for aviation MRO,
built around a Fleet MRO Simulator (synthetic training data), a prognostic engine
(RUL / failure prediction), and an operator-facing workflow product. Its buyers
are airline M&E departments; its claims must survive sophisticated technical and
regulatory scrutiny.

## Skill routing — load before writing, not after

Three project skills in `.claude/skills/` carry the domain knowledge. Load the
relevant one(s) BEFORE producing code, schemas, content, or answers — retrofitting
domain correctness after the fact is how errors ship. Routing:

| Work touches… | Load |
|---|---|
| Entity model, maintenance workflows, task cards, defects/MEL, checks, regs, simulator Layers 3–4, anything a maintenance engineer will read | `mro-domain` |
| Telemetry generation, failure models, labels, training, evaluation, metrics, dataset splits, accuracy, simulator Layers 1–2 | `phm-prognostics` |
| Pitch/marketing/README copy, ROI math, pricing, market numbers, cost calibration, any figure with a $ or % | `mro-market-economics` |

Most real tasks cross boundaries — load every skill whose territory the task
touches, not just the primary one. Common combinations:

- **Simulator Layer 2 (failure models):** `phm-prognostics` (modeling, calibration)
  + `mro-domain` (which ATA chapters fail how, removal vs failure semantics).
- **Demo or landing page:** `mro-market-economics` (claim rules) + `mro-domain`
  (vocabulary correctness in screenshots/copy).
- **Validation report or accuracy discussion:** `phm-prognostics` (protocol,
  metrics) + `mro-market-economics` (what may be claimed, in what language).
- **Full simulator work:** all three (architecture spans every layer + cost
  calibration).

When in doubt, load it — a wasted read costs seconds; a domain error in front of
an airline costs the deal.

## Standing rules (apply even before any skill loads)

1. **Domain correctness is a release gate.** Anything user-facing that names a
   maintenance concept gets checked against `mro-domain` before it's considered
   done. Never invent ATA chapters, MEL categories, check intervals, or reg
   citations — look them up in the skill references.
2. **Validation discipline is not optional.** Temporal splits only; ground-truth
   labels held out at inference; base rates calibrated, not invented. Any code
   or text violating the `phm-prognostics` non-negotiables is a bug, not a style
   issue.
3. **Claim discipline:** every commercial number traces to a citable source;
   simulator accuracy is never product accuracy; "digital twin" is banned
   vocabulary; AviOS recommends and predicts — it never certifies, releases to
   service, or defers defects itself.
4. **Licensing:** MSG-3, iSpec 2200, Spec 2000 are licensed A4A documents —
   encode structure and logic, never reproduce text; flag any feature that would
   embed them. Verify dataset terms (C-MAPSS, NGAFID, SDRS) before commercial use.

## Canonical documents (repo root — the specs of record)

- `AviOS_Fleet_MRO_Simulator.html` — simulator architecture: closed-loop Fleet
  State Engine, four layers, tick loop, output schema. Build to this.
- `AviOS_Minimal_Real_Data_Ask.html` — pilot data extract, anonymisation rules,
  and THE validation protocol (temporal holdout, acceptance gates).
- `AviOS_MRO_Research_Library.html` — annotated source library behind the skills.

When code and spec disagree, say so explicitly rather than silently following
either.

## Definition of done for an AviOS task

- Relevant skills were loaded and their rules applied.
- Domain vocabulary verified (no invented codes/categories/intervals).
- No leakage: nothing at inference time sees ground truth or future data.
- Numbers cited; claims labeled design/market/predictive validity honestly.
- Consistent with the three canonical documents, or the divergence is flagged.
