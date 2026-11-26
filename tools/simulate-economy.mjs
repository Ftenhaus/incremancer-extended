import {balance, extract} from './balance-runtime.mjs';

const quote = extract('function extendedBulkQuote(base, growth, rank, ascension, budget, limit) {', 'base,growth,rank,ascension,budget,limit');
const production = extract('calculateWithPrestigeRankBonus(e, t) {', 'e,t');
const {costGrowth, resourceEffect} = balance.prestige;

// Start with one unit per game second and spend only on the Blood Rate upgrade.
console.log('ascension,prestige_budget,ranks_bought,cost,units_per_real_second');
for (const ascension of [0, 1, 5, 10]) {
  for (const budget of [0, 10, 1000, 1000000]) {
    const {count, total} = quote(10, costGrowth, 0, ascension, budget, Infinity);
    const rate = production({effect: resourceEffect}, count) * balance.ascension.speedFactor ** ascension;
    console.log([ascension, budget, count, total, rate.toPrecision(6)].join(','));
  }
}
