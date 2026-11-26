import {extract, source} from '../tools/balance-runtime.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const hp=extract('getMaxHealth(e) {','e');
const prestige=extract('calculateWithPrestigeRankBonus(e, t) {','e,t');
const bulk=extract('function l(e, t, s, i) {','e,t,s,i');
const affordable=extract('function h(e, t, s, i) {','e,t,s,i');
const price=extract('purchasePrice(e) {','e');
const xp=extract('xpForNextLevel() {','');
test('enemy health positive and finite through level 10000',()=>{for(let n=1;n<=10000;n++)assert.ok(Number.isFinite(hp(n))&&hp(n)>0);});
test('prestige baseline ranks 0 and 60',()=>{assert.equal(prestige({effect:.2},0),1);assert.equal(prestige({effect:.2},60),1.2**60);});
test('bulk geometric cost matches unrounded sum',()=>{for(const m of [1,1.1,1.225,2]){const expected=Array.from({length:10},(_,i)=>10*m**(5+i)).reduce((a,b)=>a+b,0);assert.ok(Math.abs(bulk(10,m,5,10)/expected-1)<1e-10);}});
test('bulk affordability away from rounding boundaries',()=>{assert.equal(affordable(10,1.225,5,bulk(10,1.225,5,10)*1.001),10);});
test('skeleton XP baseline',()=>{assert.equal(xp.call({persistent:{level:1}}),800);assert.ok(xp.call({persistent:{level:100}})>xp.call({persistent:{level:99}}));});
test('enemy health must not decrease at level 2300',()=>assert.ok(hp(2300)>=hp(2299)));
test('prestige keeps the original curve through rank 100 and then grows linearly', () => {
  const upgrade = {effect: 0.2};
  let expected = 1.2 ** 60;
  for (let rank = 61; rank <= 100; rank++) {
    expected *= 1 + upgrade.effect * 1.05 ** (rank - 60);
    assert.equal(prestige(upgrade, rank), expected);
  }
  const gain = expected - prestige(upgrade, 99);
  for (const rank of [101, 300, Number.MAX_SAFE_INTEGER]) {
    assert.equal(prestige(upgrade, rank), expected + (rank - 100) * gain);
    assert.ok(Number.isFinite(prestige(upgrade, rank) * 1e100));
  }
});
test('bulk cost must honor ascension',()=>{const ctx={currentRank:()=>0,gameModel:{persistentData:{ascensionLevel:1}}};assert.equal(extract('upgradeMaxPrice(e, t) {','e,t').call(ctx,{basePrice:10,multi:1.225},1),price.call(ctx,{basePrice:10,multi:1.225}));});
test('brain prestige condition must match other resources',()=>assert.ok(!source.includes('brainsPCMod *= t > e.costType == this.costs.prestigePoints')));

test('Extended storage names are unique and legacy keys are not assigned',()=>{const keys=vm.runInNewContext(source.slice(0,source.indexOf('const FORK_VERSION'))+'\nObject.values(EXTENDED_STORAGE)');assert.equal(new Set(keys).size,3);for(const key of keys)assert.ok(key.startsWith('incremancer-extended:'));for(const key of ['ZombieData','incremancerskele','incremancertalents'])assert.ok(!source.includes('StorageName = "'+key+'"')&&!source.includes('storageName = "'+key+'"'));});
test('upstream cloud login disabled',()=>assert.ok(source.includes('if (false && window.kongregate) try {')));

test('enemy late curve monotonic',()=>{for(let n=85;n<=10000;n++)assert.ok(hp(n)>=hp(n-1),'level '+n);});
test('rounded bulk quote matches individual prices and budget',()=>{const q=extract('function extendedBulkQuote(base, growth, rank, ascension, budget, limit) {','base,growth,rank,ascension,budget,limit');for(const a of [0,1,5,20]){const total=Array.from({length:10},(_,i)=>Math.max(1,Math.round(10*1.225**(5+i)*.5**a))).reduce((x,y)=>x+y,0);assert.equal(q(10,1.225,5,a,total,10).total,total);assert.equal(q(10,1.225,5,a,total,10).count,10);}assert.equal(q(10,1,0,100,0,Infinity).count,0);assert.equal(q(10,1,0,100,3,Infinity).count,3);assert.equal(q(0,1,0,100,0,Infinity).count,1000);});

test('ascension discount offsets overflow in single and bulk rank prices', () => {
  const upgrade = extract('upgradePrice(e) {', 'e');
  const quote = extract('function extendedBulkQuote(base, growth, rank, ascension, budget, limit) {', 'base,growth,rank,ascension,budget,limit');
  for (const rank of [1024, 1100]) {
    const context = {currentRank: () => rank, gameModel: {persistentData: {ascensionLevel: rank}}};
    assert.equal(price.call(context, {basePrice: 10, multi: 2}), 10);
    assert.equal(upgrade.call(context, {basePrice: 10, multiplier: 2}), 10);
    const result = quote(10, 2, rank, rank, 30, 3);
    assert.equal(result.count, 2);
    assert.equal(result.total, 30);
  }
});

test('shop automation preserves selections on pause and counts only successful purchases', () => {
  const buy = extract('buySelectedUpgrades(upgrades) {', 'upgrades');
  const data = {};
  const attempts = [];
  const context = {
    gameModel: {persistentData: data},
    purchaseUpgrade(upgrade, save) {
      assert.equal(save, false);
      attempts.push(upgrade.id);
      return upgrade.id === 2;
    }
  };
  const upgrades = [{id: 1, auto: false}, {id: 2, auto: true}, {id: 3, auto: true}];
  buy.call(context, upgrades);
  data.pauseShopAutomation = true;
  buy.call(context, upgrades);
  data.pauseShopAutomation = false;
  buy.call(context, upgrades);
  assert.deepEqual(attempts, [2, 3, 2, 3]);
  assert.equal(data.automaticUpgradeRanks, 2);
});

test('equipment salvage quotes match XP awards and protect equipped and legendary items', () => {
  const items = [{r: 1, l: 2}, {r: 2, l: 3, q: true}, {r: 4, l: 5}];
  const champion = {
    persistent: {items}, rarity: {common: 1, rare: 2, epic: 3, legendary: 4},
    salvageXp: extract('salvageXp(item) {', 'item'),
    canBulkSalvage: extract('canBulkSalvage(item) {', 'item'),
    xpTotal: extract('xpTotal() {', ''),
    addXp(amount, equipment) { assert.equal(amount, 120); assert.equal(equipment, true); }
  };
  assert.equal(champion.xpTotal(), 120);
  extract('destroyAllItems() {', '').call(champion);
  assert.deepEqual(champion.persistent.items, items.slice(1));
});

test('equipment XP grants multiple exact-threshold levels while the champion is down', () => {
  const gain = extract('addXp(amount, fromEquipment = false) {', 'amount,fromEquipment,document');
  const champion = {
    persistent: {level: 1, xp: 0, xpRate: 2},
    xpForNextLevel() { return this.persistent.level * 100; },
    isAlive: () => false, upgrades: {applyUpgrades() {}}, model: {sendMessage() {}}
  };
  const document = {getElementById: () => null};
  gain.call(champion, 150, false, document);
  assert.equal(champion.persistent.xp, 0);
  gain.call(champion, 150, true, document);
  assert.equal(champion.persistent.level, 3);
  assert.equal(champion.persistent.xp, 0);
});

test('necropolis purchases validate the building, budget and ownership on legacy saves', () => {
  const build = extract('buildNecropolis(id) {', 'id');
  let saves = 0;
  const context = {persistentData: {prestigePointsToSpend: 50}, upgrades: {applyUpgrades() {}}, saveData() { saves++; }};
  for (const id of ['unknown', 'spiritWell', 'ossuary', 'ossuary']) build.call(context, id);
  assert.equal(context.persistentData.prestigePointsToSpend, 0);
  assert.equal(context.persistentData.necropolis.ossuary, true);
  assert.equal(saves, 1);
});

test('factory evolution applies the appropriate bonus once at and above level ten', () => {
  const stats = extract('statsAtLevel(creature, level) {', 'creature,level');
  const factory = {
    creatureScaling: 1.75, gameModel: {golemHealthPCMod: 2, golemDamagePCMod: 3},
    types: {earthGolem: 1, waterGolem: 4}, evolution: extract('evolution(creature) {', 'creature'),
    purchasePrice: creature => creature.level * 10
  };
  for (const type of [1, 2, 3, 4]) {
    const guardian = [1, 4].includes(type);
    for (const level of [9, 10, 11]) {
      const result = stats.call(factory, {type, baseHealth: 100, baseDamage: 20}, level);
      const scale = 1.75 ** (level - 1);
      assert.equal(result.health, 100 * scale * 2 * (guardian && level >= 10 ? 1.5 : 1));
      assert.equal(result.damage, 20 * scale * 3 * (!guardian && level >= 10 ? 1.5 : 1));
      assert.equal(result.cost, level * 10);
    }
  }
});

test('dark realm requires the frontier, persists entry and rewards each clear once', () => {
  const enter = extract('enterDarkRealm() {', '');
  const finish = extract('finishDarkRealm() {', '');
  const data = {levelUnlocked: 50};
  let saves = 0;
  const model = {persistentData: data, level: 49, nextRealmLevel: 50,
    startLevel(level) { assert.equal(level, 50); }, saveData() { saves++; }, sendMessage() {}};
  enter.call(model);
  assert.equal(data.realmTrial, undefined);
  model.level = 50;
  enter.call(model);
  enter.call(model);
  assert.equal(data.realmTrial, 50);
  finish.call(model);
  finish.call(model);
  assert.equal(data.realmSeals, 1);
  assert.equal(data.prestigePointsToSpend, 25);
  assert.equal(data.realmTrial, undefined);
  assert.equal(saves, 2);
});

test('soul archive honors existing seals and only persists eligible changes', () => {
  const attune = extract('attuneMemory(id) {', 'id');
  const data = {realmSeals: 2, brains: 90};
  let saves = 0;
  const model = {persistentData: data, energy: 15, energyMax: 10, brainsMax: 50,
    upgrades: {applyUpgrades() {}}, saveData() { saves++; }};
  for (const id of ['unknown', 'hunter', 'scholar', 'scholar', 'spark']) attune.call(model, id);
  assert.equal(data.soulMemory, 'spark');
  assert.equal(data.realmSeals, 2);
  assert.equal(model.energy, 10);
  assert.equal(data.brains, 50);
  assert.equal(saves, 2);
});
