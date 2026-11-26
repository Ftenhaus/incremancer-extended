# Balance audit — v0.1.0

Source: dist/bundle.js, upstream v1.1.0. No gameplay changes in this audit.

| Formula | Current behavior | Risk |
|---|---|---|
| Generator purchasePrice | round(base * multi^rank * 0.5^ascension) | Bulk helpers omit ascension and rounding |
| Bulk price l | base * multi^rank * (multi^count - 1)/(multi - 1); linear when multi=1 | Floating point boundary errors |
| Bulk affordability h | inverse geometric series, floored | Exact budget boundary precision |
| Prestige resource bonus | (1+effect)^rank up to 60; then multiply by 1+effect*1.05^i for each extra rank | Infinity by rank 300 for effect 0.2 |
| Enemy getMaxHealth | Piecewise linear then exponential | Ratio at 999 = 7.06585; at 2300 = 0.0450955 |
| Skeleton XP | 800 * level^1.9 | Migration loop cap 99999 requires review |
| Brain prestige | t > e.costType == this.costs.prestigePoints | Operator precedence inconsistent with other resource bonuses |

## Save constraints
Existing localStorage keys include ZombieData and incremancerskele; talent storage and import/export paths require full inventory before migration. Use a distinct namespace, explicit import, backup, and regression tests. Never silently delete original saves.

## Tests
Run `node --test tests/balance.test.mjs` using Node 20+. Tests extract actual arithmetic methods from the local bundle, not duplicated formulas. Known defects are marked TODO until fixed. Extraction is deliberately limited and depends on current method signatures; replace with direct module imports after modularization. Browser integration, full economy simulation and save migration tests remain outstanding.

## Release gate
No modified game deployment before upstream license and asset permissions are verified. Preserve attribution. No balance constants changed in this commit.

## v0.2.0 rank price numeric limits
For positive base and growth, the rounded price uses base × growth^rank × priceFactor^ascension. An overflowing undiscounted price or an underflowing discount can hide a representable result. Combine exponents in log space in those cases, preserving ordinary price arithmetic elsewhere.

## Prestige production after rank 100

Use the existing compounding curve through rank 100. Each subsequent rank adds the absolute production gain from rank 99 to 100. This keeps the transition increasing, bounds the calculation at 40 iterations, and leaves room for other production modifiers in the game's Number arithmetic. The cutoff is provisional pending economy simulation. Saved ranks retain their value as inputs to this curve.

## v0.3.0 economy simulation

Run `node tools/simulate-economy.mjs`. Each scenario begins at rank zero with one unit of blood per game second, empty storage with unlimited capacity, and a fixed prestige budget spent on Blood Rate. Reported income includes game speed. Combat, storage limits, and other upgrades are excluded. This compares purchasing power and does not predict elapsed playthrough time.

Prior to this adjustment, rounding discounted prices allowed a zero-point budget to buy 3 ranks at ascension 5 and 20 at ascension 10. For positive base prices, charge at least one unit after rounding. Keep deliberately free upgrades free. Keep the early-game growth factor and the speed bonus while removing production gains obtained with an empty wallet.

## Necropolis foundations

The Ossuary costs 50 unspent prestige points and adds 2 base zombie health. The Spirit Well costs 100 and adds 1 base energy per second. Each building can be bought once. Flat bonuses are applied before ordinary upgrades, including after prestige and ascension. Both bonuses default to zero in older saves.

## Factory golem evolution

At level 10, the Earth and Water golems evolve into Guardians (+50% health), while Air and Fire evolve into Ravagers (+50% damage). The bonus multiplies the existing level and golem upgrade factors once. The factory applies it when spawning the unit. A saved golem uses its recorded level. Evolution follows creature levels across resets and requires no extra save fields.

## Dark Realms

A trial restarts the current frontier level with half base zombie damage. The first trial requires frontier level 50. Each seal raises the next threshold by 25 levels and grants 25 spendable prestige points. A clear consumes the active trial before saving. A different level, prestige or ascension ends the trial. Earned seals persist.

## Soul Archive

Lifetime seals unlock three memories at one, two and three seals. One memory can be active at a time. Their flat base bonuses are +5 energy capacity, +50 brain storage or +1 zombie damage before the Dark Realm penalty. Switching is free. Existing seal counts qualify immediately. Only the selected memory ID is stored.

## v1.1.0 campaign pacing

Building access uses the highest frontier reached, including completed levels before prestige. Ossuary starts at 150. Spirit Well and rank-ten factory evolution start at 200. Previously owned buildings, memories, seal counts and identifiable evolved golem types carry forward. An active legacy trial keeps its original damage rule.

Realm thresholds are 500 (half base zombie damage), 900 (double base summoning cost), 1250 (half base zombie health), then 2500 (both cost and health penalties). The first combined clear adds 10 permanent energy capacity. Further combined trials require 250 additional frontier levels each. Existing seals qualify for the same archive memories. Old seals do not skip the first combined trial.

Browser fixtures compare effective base stats at each frontier against its ordinary stats and check the preceding level is locked. These deterministic scenarios measure mechanical difficulty, not real time to progress from a fresh save.
