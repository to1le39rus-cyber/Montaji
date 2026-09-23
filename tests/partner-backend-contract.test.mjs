import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('partner backend uses isolated collections',()=>{
 const repo=fs.readFileSync(new URL('../src/data/partner-request-repository.js',import.meta.url),'utf8');
 assert.match(repo,/storeRequests/);
 assert.doesNotMatch(repo,/appData\/shared/);
});

test('rules isolate partner requests behind membership',()=>{
 const rules=fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
 assert.match(rules,/storeMemberships/);
 assert.match(rules,/isStoreMember/);
 assert.match(rules,/match \/storeRequests\/\{requestId\}/);
 assert.match(rules,/match \/events\/\{eventId\}/);
});
