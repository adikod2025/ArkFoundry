---
name: mro-market-economics
description: MRO market data and claim-discipline rules for AviOS business content — market sizing, maintenance cost benchmarks, ROI math, and what accuracy claims are permitted at each stage. Use this skill whenever writing or reviewing anything commercial about AviOS: pitch decks, landing pages, ROI calculators, TAM slides, investor material, sales collateral, pricing models, README/marketing copy, or any sentence containing a market size, cost saving, accuracy percentage, or AOG cost figure. Also use it when simulator work needs cost calibration (repair costs, AOG duration value).
---

# MRO Market & Economics for AviOS

Purpose: every commercial number AviOS uses should trace to a citable neutral
source, and every claim should be one AviOS can survive being challenged on.
This skill carries the numbers, the sources, and the claim rules.

## Market thesis (with citations built in)

- Global commercial fleet ~30,000 aircraft (early 2026) → ~41,000 by 2036,
  3.2% CAGR. MRO spend surpassed **$136B in 2025**. Average fleet age rose to
  **13.4 years** in 2025 (from 12.1 in 2024) on OEM production shortfalls.
  Source: Oliver Wyman *Global Fleet & MRO Market Forecast 2026–2036* —
  refresh numbers from the latest edition each year, do not carry stale figures.
- Supply-chain bottlenecks cost airlines **$11B+ in 2025**, including **$3.1B**
  of extra maintenance from fleet aging (IATA / Oliver Wyman analysis).
- The timing argument, stated correctly: an aging, supply-constrained fleet
  raises both the frequency of unscheduled maintenance and the cost of every
  AOG day — which raises the value of predicting failures and pre-positioning
  parts. That is AviOS's macro tailwind.

## Cost benchmarks (the neutral referees)

- **IATA MCX / Maintenance Cost Technical Group** — annual benchmarking from
  50+ airlines (~¼ of world fleet): maintenance cost per flight hour, cost per
  ATA segment, labor/material split. Public report PDFs are linked in
  `references/market-sources.md`. Use MCX figures in ROI models; when a buyer
  challenges savings math, argue from their numbers, not ours.
- **BTS Form 41 (Schedule P-5.2)** — US carriers' filed maintenance costs;
  free independent cross-check.
- **AOG cost:** widely quoted figures range from ~$10k/day (narrowbody, minor)
  to $150k+/day (widebody, revenue loss included) but there is no single
  authoritative number. Rule: present AOG cost as *the operator's own input
  variable* in ROI calculators, with cited ranges as defaults — never as an
  AviOS-asserted fact.

## Claim discipline (the honesty boundary, enforced)

Three validity levels — label every claim internally with which one it has:

1. **Design validity** (have now): architecture matches industry practice —
   backed by the MSG-3/RCM/regulatory literature. Claimable freely.
2. **Market validity** (have now): the spend and pain are real and independently
   documented — backed by Oliver Wyman/IATA/ARSA. Claimable freely with citation.
3. **Predictive validity** (do NOT have until the pilot): observed precision on
   an operator's real historical data, per the temporal-holdout protocol in
   `AviOS_Minimal_Real_Data_Ask.html`.

Rules that follow:
- Never present simulator-derived accuracy as product accuracy — synthetic
  accuracy proves the simulator. The only legitimate pre-pilot accuracy claim is
  a public-benchmark score ("X on N-CMAPSS"), stated as such.
- Use target language before validation ("designed to", "targeting") and
  observed language after ("demonstrated", "achieved, 95% CI ±Y"), never mixed.
- AviOS is a **simulator + predictive platform**, not a "digital twin" — the
  distinction was deliberate (see Simulator spec §1); marketing copy must not
  reintroduce the term.
- Operator data results are citable only with the operator's approval, per the
  handling terms in the Real-Data Ask spec.
- Anything implying AviOS certifies airworthiness or releases aircraft to
  service is a regulatory misstatement — recommendation/prediction language only.

## Sales-context facts worth knowing

- The buyer's org: reliability engineering is the natural champion; maintenance
  control feels AOG pain daily; the CFO conversation runs on IATA MCX unit costs
  (IVHM *Business Case Theory and Practice* is the playbook for that meeting).
- Incumbent M&E software (AMOS, TRAX, OASES) is the system of record AviOS must
  integrate with, not displace — the Real-Data Ask extract tables double as the
  integration surface.
- Competitive/industry watch: Aviation Week *Inside MRO* + MRO Podcast,
  MRO Americas/Europe conferences, ARSA annual market assessment.

Sources with URLs: `references/market-sources.md`.
