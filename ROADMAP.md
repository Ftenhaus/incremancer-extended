# Incremancer Extended

## Goals
Sustainable long-term progression, meaningful prestige, automation and endgame content while preserving the original gameplay and save compatibility where feasible.

## Milestones
- v0.1.0: Technical foundation: inventory formulas, regression tests, isolate saves with import support, centralize balance settings without changing gameplay.
- v0.2.0: Verify and fix resource calculation bugs, test enemy scaling boundaries and numeric limits.
- v0.3.0: Simulate and rebalance resource production, prestige costs and ascension.
- v0.4.0: Automation and progression statistics.
- v0.5.0: Skeleton progression and equipment.
- v0.6.0: Necropolis permanent buildings.
- v0.7.0: Unit evolution.
- v0.8.0: Dark Realms.
- v0.9.0: Soul Archive.
- v1.0.0: Stable release after playtesting.

## Development rules
- master remains the baseline; develop is the integration branch.
- Preserve upstream attribution. Verify licensing and permissions before distributing modified game code or assets.
- Do not publish modified game builds until licensing is resolved.
- Keep save migrations explicit and reversible. Test old saves and fresh starts.
- Document formulas and assumptions before changing balance. Check monotonicity, bulk purchase equivalence, finite numbers and progression bottlenecks.
- Proposed features and milestone numbers are provisional, subject to simulation and playtesting.
