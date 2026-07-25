# PHM Datasets, Benchmarks & Reading

## Datasets

### NASA Prognostics Center of Excellence (PCoE) repository
https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/
Mirror: https://data.phmsociety.org/nasa/

- **C-MAPSS Turbofan Degradation (2008)** — 21 sensors + 3 operational settings,
  run-to-failure trajectories. Subsets:
  - FD001: 1 operating condition, 1 fault mode (HPC degradation) — easiest
  - FD002: 6 operating conditions, 1 fault mode
  - FD003: 1 condition, 2 fault modes (HPC + fan)
  - FD004: 6 conditions, 2 fault modes — hardest
  Conventions: piecewise-linear RUL target cap (commonly 125 cycles); report
  RMSE + PHM08 asymmetric score on the official test split.
- **N-CMAPSS (2021)** — real recorded flight conditions, continuous degradation
  from healthy to failure, multiple units per file (DS01–DS08+). Use for any
  published benchmark claim; closer to line-ops reality than C-MAPSS.
- Also in the repository: bearings, batteries, milling — useful for method
  prototyping, not for aviation claims.

### Failure base rates & operations
- **FAA SDRS** (Service Difficulty Reporting System) — per-ATA failure/defect
  reports; the calibration target for simulator Layer 2 emergent rates.
- **NGAFID** (National General Aviation Flight Information Database) — annotated
  flight data with maintenance context.
- **NASA ASRS** — safety report narratives (maintenance-related subset).
- **BTS Form 41, Schedule P-5.2** — US carrier maintenance cost filings;
  independent cross-check against IATA MCX figures.

### Licensing caution (from the Simulator spec)
"Public dataset" ≠ "free for commercial use." Verify current terms for C-MAPSS,
N-CMAPSS, NGAFID, and SDRS before any of them sit under a commercial product or
marketing claim.

## Reading list (predictive core)

- Kim, An & Choi, *Prognostics and Health Management of Engineering Systems:
  An Introduction*, Springer 2017 — RUL methods, physics vs data-driven,
  uncertainty quantification.
- Jennions (ed.), IVHM series, SAE International — esp. *The Technology* (R-429)
  and *Implementation and Lessons Learned* (R-438): why PHM deployments fail
  operationally, not just algorithmically.
- International Journal of PHM (open access): https://papers.phmsociety.org/index.php/ijphm
- PHM Society / PHM Europe conference proceedings (open access) — current
  aerospace applications: PHM-driven spares inventory, benefit analyses of PHM
  in aircraft maintenance.
- Reliability Engineering & System Safety (Elsevier) — survival analysis and
  reliability modeling depth.
