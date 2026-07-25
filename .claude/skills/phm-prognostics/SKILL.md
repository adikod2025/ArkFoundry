---
name: phm-prognostics
description: Prognostics and health management (PHM) knowledge for AviOS predictive models — RUL estimation, degradation modeling, the C-MAPSS/N-CMAPSS benchmarks, failure-rate calibration, and the temporal-holdout validation protocol. Use this skill whenever working on the Fleet MRO Simulator Layers 1–2 (telemetry generation, failure models, ground-truth labels), training or evaluating any AviOS predictive model, choosing metrics, splitting datasets, generating synthetic sensor data, or writing any code or claim about prediction accuracy, RUL, remaining useful life, failure prediction, or model validation.
---

# PHM & Prognostics for AviOS

Purpose: keep the predictive core technically sound and its claims defensible.
The two failure modes this skill exists to prevent: (1) training on labels the
model could never see in production (leakage), and (2) publishing an accuracy
number that can't survive a sophisticated buyer's first question.

## Non-negotiable validation rules

These come from the AviOS Real-Data Ask spec (`AviOS_Minimal_Real_Data_Ask.html`)
and standard PHM practice:

- **Temporal splits only.** Train on years 1..N−1, hold out the final full year.
  Random splits leak future information into training and inflate every metric —
  this is the first question a technical buyer asks. Applies to synthetic data too.
- **Ground-truth labels are held out at inference.** The simulator's Label Store
  (true RUL, true failure mode) is for training targets and scoring only. If a
  feature pipeline can see true health, the benchmark is meaningless.
- **Calibrate base rates before training.** Real fleets produce few failures per
  component type (class imbalance is severe). Over-seeding failures in synthetic
  data trains a confidently wrong model. Calibrate simulator Layer 2 emergent
  rates against FAA SDRS per ATA chapter; report the divergence.
- **Report uncertainty.** RUL point estimates without confidence bounds are not
  acceptable in a safety-adjacent sale. Prefer prediction intervals (quantile
  regression, MC dropout, or ensembles) and report calibration of the intervals.
- **Acceptance gate before citing any figure publicly:** ≥10 positive events in
  the holdout for that chapter, precision CI width ≤ 0.15, recall ≥ the MSG-3
  schedule baseline. Below the gate, validate at system level (2-digit ATA), not
  component level.

## Metrics (use these, in this vocabulary)

For event prediction (will component X fail within horizon T, default T=30 days):
precision per alert, recall of actual failures, median advance warning (days),
false alerts per tail-month, all vs. the baseline of the existing MSG-3 schedule.
For RUL regression: RMSE and the asymmetric PHM08 scoring function (late
predictions penalized more than early — being late means an in-service failure).
A common C-MAPSS convention: cap early-life RUL targets with a piecewise-linear
function (typically 125 cycles) since degradation is unobservable when healthy.

## Public benchmarks and datasets

Details and links in `references/datasets.md`. Summary:

- **NASA C-MAPSS** (2008): 21-sensor simulated turbofan run-to-failure, four
  subsets FD001–FD004 (one/six operating conditions × one/two fault modes).
  The field's standard benchmark; heavily published, so state-of-the-art RMSE
  references are easy to find.
- **NASA N-CMAPSS** (2021): successor with real flight profiles and continuous
  degradation — much more realistic; prefer it for anything you publish.
- **The one legitimate pre-pilot accuracy claim:** "our RUL model scores X on
  N-CMAPSS" — reproducible by anyone. Synthetic-simulator accuracy proves the
  simulator, not the product; never present it as product accuracy.
- Base-rate and cost calibration: FAA SDRS, NGAFID (annotated GA flight data),
  BTS Form 41 Schedule P-5.2 (US carrier maintenance costs).

## Synthetic telemetry (simulator Layer 1)

Generate sensors *from* true health plus noise so the causal chain
health → signal → label exists (a degrading component drifts: EGT margin down,
vibration up). C-MAPSS is turbofan-only — do not present C-MAPSS-style signals
as hydraulics/avionics/airframe telemetry; those need their own degradation
signatures. Blend real FDR/QAR or NGAFID streams where licensed, to anchor the
synthetic distribution. Keep the RNG seeded and runs reproducible.

## Model-development guidance

- Start with strong classical baselines (gradient boosting on windowed features,
  Cox/Weibull survival models) before deep sequence models; on tabular
  maintenance-event data the classical baselines are often competitive and are
  far easier to explain to a reliability engineer.
- Class imbalance: prefer proper scoring + threshold tuning on the operating
  point the airline cares about (false alerts per tail-month) over naive
  oversampling.
- NFF (no fault found) contaminates labels: an unscheduled removal is not always
  a true failure. Where removal reason exists, use it; expect label noise ~10–30%
  on avionics chapters and choose losses/metrics accordingly.
- Literature currency: International Journal of PHM (open access,
  papers.phmsociety.org/index.php/ijphm) and PHM Society conference proceedings —
  check for prior art before inventing an architecture.

For dataset links, benchmark conventions, and the reading list, see
`references/datasets.md`.
