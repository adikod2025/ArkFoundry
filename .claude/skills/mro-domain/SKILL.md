---
name: mro-domain
description: Aviation MRO domain knowledge for AviOS development — MSG-3 maintenance logic, RCM failure patterns, ATA chapter taxonomy, EASA/FAA regulations, and M&E organizational workflows. Use this skill whenever working on the Fleet MRO Simulator (especially Layers 3–4), the AviOS entity model (Aircraft, Component, MaintenanceEvent, Defect), maintenance workflow features, task cards, defect handling, MEL logic, or any code/content that names maintenance concepts, ATA chapters, work orders, checks (A/C/D), AOG, or regulatory compliance. Also use it to review domain correctness of anything AviOS presents to airline maintenance users.
---

# Aviation MRO Domain Knowledge

Purpose: keep AviOS domain-correct. Airline maintenance engineers detect vocabulary
and logic errors instantly, and one wrong concept in a demo costs credibility that
marketing can't buy back. When implementing or reviewing anything a maintenance
professional will see, check it against this skill.

## Core maintenance philosophy (why prediction is even a product)

The intellectual foundation is Nowlan & Heap's 1978 United Airlines/DoD report
*Reliability-Centered Maintenance* (free: https://reliabilitywebfiles.s3.amazonaws.com/Reliability+Centered+Maintenance+by+Nowlan+and+Heap.pdf).
Its key finding from UAL data: only ~11% of failure modes follow age-related
patterns where scheduled overhaul helps; ~89% (dominated by the ~68% "infant
mortality then random" pattern F) are essentially random in time — which is why
condition monitoring and prediction beat fixed schedules. This is AviOS's core
premise and the citation sophisticated buyers expect.

Three primary maintenance processes (use these exact terms):
- **Hard-time (HT)** — remove/overhaul at fixed interval (life-limited parts, some safety items)
- **On-condition (OC)** — periodic inspection/test against a standard; remove when failing it
- **Condition-monitoring (CM)** — no scheduled task; operate to failure, monitor fleet data (only for items with no safety effect)

AviOS's value proposition in this vocabulary: it upgrades CM items to *predicted*
removals and tightens OC intervals with evidence — it does not replace HT limits,
which are regulatory.

## MSG-3 logic (governs simulator Layer 3 scheduled maintenance)

MSG-3 (Airlines for America, licensed document) is a top-down, consequence-driven
analysis that produces the initial scheduled maintenance program:

1. Select Maintenance Significant Items (MSIs) and Structural Significant Items (SSIs).
2. For each functional failure, classify the Failure Effect Category:
   - 5 — evident, safety
   - 6 — evident, operational
   - 7 — evident, economic
   - 8 — hidden, safety
   - 9 — hidden, non-safety
3. Select applicable/effective tasks in escalation order: lubrication/servicing →
   operational/visual check → inspection/functional check → restoration → discard.
   Category 5 and 8 require a task (or redesign); 6/7/9 require one only if cost-effective.

Simulator implication: scheduled events must derive from FEC categories and task
types, not from a generic "maintenance every N hours." Letter checks (A-check
~400–1000 FH light, C-check ~20–24 months heavy, D/structural check 6–12 years)
are packaging of MSG-3 tasks, and modern programs increasingly "equalize" them
into smaller blocks — model checks as task packages, not monoliths.

## ATA chapters (component taxonomy — the industry's shared key)

Type every component and defect with an ATA 100 / iSpec 2200 chapter. The ones that
dominate unscheduled events and cost: 21 air conditioning/pressurization, 24
electrical power, 27 flight controls, 28 fuel, 29 hydraulics, 30 ice/rain
protection, 32 landing gear (top driver of removals), 34 navigation, 36 pneumatic,
49 APU, 52 doors, 57 wings, 71–80 powerplant (dominates cost). Full table:
`references/ata-chapters.md`. Never invent chapter numbers — look them up.

## Regulatory frame (simulator Layer 4; also what AviOS may legally "decide")

- **FAA**: 14 CFR Part 43 (who may perform maintenance and how it's recorded),
  Part 145 (repair stations), Part 121 subpart L + AC 120-16 (air carrier
  maintenance programs). **EASA**: Part-M / Part-CAMO (continuing airworthiness
  management), Part-145 (maintenance organizations).
- Airworthiness Directives (ADs) are mandatory with hard compliance deadlines —
  the simulator's unscheduled-event generator and any AviOS planning logic must
  treat them as non-deferrable constraints.
- MEL (Minimum Equipment List) governs dispatch with inoperative items: rectification
  categories A (per MEL interval), B (3 days), C (10 days), D (120 days),
  calendar-day based. Defect deferral logic must use these categories.
- Boundary that keeps AviOS sellable: AviOS **recommends and predicts**; only the
  operator's approved CAMO/Part-145 processes **decide and certify**. Never ship
  UI copy implying AviOS releases aircraft to service.

## The M&E organization (who the users are)

Reference: Kinnison & Siddiqui, *Aviation Maintenance Management* (McGraw-Hill).
Personas AviOS serves: Maintenance Control (day-of-ops, AOG decisions), Planning
(check packaging, yield of the maintenance opportunity), Reliability Engineering
(alert-rate monitoring, program escalation — the natural champion for AviOS),
Materiel (parts provisioning — consumer of failure predictions), Quality Assurance,
and Technical Records (the data source, often the data-quality bottleneck).
PIREPs (pilot reports) and MAREPs (maintenance reports) are the defect input
streams; a reliability program tracks rates per 1000 FH against alert levels.

## Working rules

- Use real terminology in code, schemas, UI, and test fixtures: work order, task
  card, PIREP, MEL category, TSN/CSN (time/cycles since new), TSO/CSO (since
  overhaul), LLP (life-limited part), AOG, NFF (no fault found — commonly ~30–50%
  of avionics removals; model it, it's a major real-world cost).
- When simulating repair flows, remember removals feed a rotable pool: remove →
  route to shop → repair/overhaul → serviceable stock → install elsewhere. Serials
  move between tails; the entity model must support that.
- For anything touching MSG-3, ATA numbering detail, or reg text: read
  `references/ata-chapters.md` and `references/sources.md` before answering;
  cite the source rather than guessing.
- ATA/A4A specs and MSG-3 are licensed documents — encode their *structure and
  logic* in AviOS, never paste their text, and flag any feature that would embed
  substantial portions (licensing must be purchased first).
