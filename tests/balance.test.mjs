import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/bundle.js',import.meta.url),'utf8');
// Extract only pure arithmetic methods from the trusted local bundle.
function extract(signature,args){
 const start=source.indexOf(signature);
 assert.ok(start>=0,'Missing formula: '+signature);
 const open=source.indexOf('{',start);
 let depth=1,end=open+1;
 while(depth && end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}
 assert.equal(depth,0);
 return vm.runInNewContext(source.slice(0,source.indexOf('const FORK_VERSION'))+'\n(function('+args+'){'+source.slice(open+1,end-1)+'})');
}
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
test('enemy health must not decrease at level 2300',{todo:'Known upstream defect'},()=>assert.ok(hp(2300)>=hp(2299)));
test('prestige must remain finite at rank 300',{todo:'Numeric architecture required'},()=>assert.ok(Number.isFinite(prestige({effect:.2},300))));
test('bulk cost must honor ascension',{todo:'Known mismatch; unrounded bulk pricing also needs review'},()=>{const ctx={currentRank:()=>0,gameModel:{persistentData:{ascensionLevel:1}}};assert.equal(bulk(10,1.225,0,1),price.call(ctx,{basePrice:10,multi:1.225}));});
test('brain prestige condition must match other resources',{todo:'Review actual upgrade application before fixing'},()=>assert.ok(!source.includes('brainsPCMod *= t > e.costType == this.costs.prestigePoints')));
