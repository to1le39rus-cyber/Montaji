import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const live=fs.readFileSync(path.join(root,'canonical-live.html'),'utf8');
const more=fs.readFileSync(path.join(root,'src/screens/more.js'),'utf8');
const cache=fs.readFileSync(path.join(root,'src/data/local-cache.js'),'utf8');

test('canonical cache is versioned and never a source of truth',()=>{
 assert.match(cache,/CANONICAL_RUNTIME_VERSION/);
 assert.match(cache,/indexedDB.open/);
 assert.match(cache,/runtimeVersion!==CANONICAL_RUNTIME_VERSION/);
 assert.match(cache,/saveLocalSnapshot/);
 assert.doesNotMatch(cache,/localStorage|sessionStorage/);
});

test('canonical live starts from cache and refreshes from Firestore',()=>{
 assert.match(live,/loadLocalSnapshot/);
 assert.match(live,/shared.load()/);
 assert.match(live,/saveLocalSnapshot/);
 assert.match(live,/shared.subscribe/);
 assert.match(live,/clearLocalCache/);
 assert.match(live,/Firestore пока недоступен/);
});

test('settings expose an explicit local cache reset',()=>{
 assert.match(more,/Очистить локальные данные \/ кэш/);
 assert.match(more,/data-action="clear-cache"/);
});
