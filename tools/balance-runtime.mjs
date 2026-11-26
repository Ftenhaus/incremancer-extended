import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
export const source=readFileSync(new URL('../dist/bundle.js',import.meta.url),'utf8');
// Extract only pure arithmetic methods from the trusted local bundle.
export function extract(signature,args){
 const start=source.indexOf(signature);
 assert.ok(start>=0,'Missing formula: '+signature);
 const open=source.indexOf('{',start);
 let depth=1,end=open+1;
 while(depth && end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}
 assert.equal(depth,0);
 return vm.runInNewContext(source.slice(0,source.indexOf('const FORK_VERSION'))+'\n(function('+args+'){'+source.slice(open+1,end-1)+'})');
}
export const balance = vm.runInNewContext(source.slice(0, source.indexOf('const FORK_VERSION')) + '\nEXTENDED_BALANCE');
