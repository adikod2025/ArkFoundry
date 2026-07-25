# ATA 100 / iSpec 2200 Chapter Reference

Standard chapter numbering for aircraft systems documentation and component
classification. AviOS entities (Component, Defect, MaintenanceEvent) should carry
a 2-digit chapter and optionally section (e.g. 32-41 wheels and brakes).

## Aircraft general
- 05 Time limits / maintenance checks
- 06 Dimensions and areas
- 07 Lifting and shoring
- 08 Leveling and weighing
- 09 Towing and taxiing
- 10 Parking, mooring, storage
- 11 Placards and markings
- 12 Servicing

## Airframe systems
- 21 Air conditioning and pressurization
- 22 Auto flight
- 23 Communications
- 24 Electrical power
- 25 Equipment / furnishings
- 26 Fire protection
- 27 Flight controls
- 28 Fuel
- 29 Hydraulic power
- 30 Ice and rain protection
- 31 Indicating / recording systems
- 32 Landing gear
- 33 Lights
- 34 Navigation
- 35 Oxygen
- 36 Pneumatic
- 37 Vacuum
- 38 Water / waste
- 44 Cabin systems
- 45 Central maintenance system (onboard diagnostics — a data source for AviOS)
- 46 Information systems
- 49 Airborne auxiliary power (APU)

## Structures
- 51 Standard practices and structures — general
- 52 Doors
- 53 Fuselage
- 54 Nacelles / pylons
- 55 Stabilizers
- 56 Windows
- 57 Wings

## Powerplant
- 70 Standard practices — engines
- 71 Power plant (general)
- 72 Engine (turbine/turboprop)
- 73 Engine fuel and control
- 74 Ignition
- 75 Engine air
- 76 Engine controls
- 77 Engine indicating
- 78 Exhaust
- 79 Engine oil
- 80 Starting

## Notes for AviOS modeling
- Highest unscheduled-removal rates are typically ATA 32 (landing gear/wheels/
  brakes), 21, 24, 29, 34; highest cost concentration is 71–80 (engines) —
  calibrate simulator Layer 2 base rates per chapter against FAA SDRS pulls,
  not uniformly.
- Chapter 45 (central maintenance system) fault messages are a real telemetry
  input stream on modern types (ACMS/ACARS) — relevant to Layer 1 realism.
- iSpec 2200 and Spec 2000 (materiel/e-commerce) are licensed A4A documents:
  use the numbering (facts), do not reproduce document text.
