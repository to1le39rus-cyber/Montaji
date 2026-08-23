import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const secure=fs.readFileSync('secure-app/index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const notes=fs.readFileSync('notes.js','utf8');
const config=fs.readFileSync('firebase-config.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');
const workflow=fs.readFileSync('.github/workflows/apply-calendar-notes-fix.yml','utf8');

test('production loader is single-entry and has no document replacement or legacy script loading',()=>{
  assert.match(secure,/20260823-canonical-2/);
  assert.doesNotMatch(secure,/document\.write/);
  assert.doesNotMatch(secure,/document\.open/);
  assert.doesNotMatch(secure,/notes\.js/);
  assert.match(secure,/firebase-config\.js/);
  assert.match(secure,/initializeAuth/);
});

test('Firebase project identity remains the production project',()=>{
  assert.match(config,/projectId:\s*["']montaj-39["']/);
  assert.match(config,/authDomain:\s*["']montaj-39\.firebaseapp\.com["']/);
  assert.doesNotMatch(config,/globalThis\.Blob/);
});

test('Firestore data contract remains shared + notes and is transaction based',()=>{
  assert.match(app,/const SHARED_DOC = \['appData', 'shared'\]/);
  assert.match(app,/const NOTES_DOC = \['appData', 'notes'\]/);
  assert.match(app,/getDocFromServer/);
  assert.match(app,/onSnapshot/);
  assert.match(app,/runTransaction/);
  assert.match(notes,/const NOTES_DOC=\['appData','notes'\]/);
  assert.match(notes,/runTransaction/);
});

test('Auth persistence is explicitly hardened in production',()=>{
  assert.match(secure,/initializeAuth\(app,\{persistence:\[authMod\.indexedDBLocalPersistence,authMod\.browserLocalPersistence,authMod\.browserSessionPersistence\]\}/);
  assert.match(secure,/getIdToken\(true\)/);
});

test('Shared read failure cannot write an empty replacement database',()=>{
  assert.match(secure,/Общая база недоступна/);
  assert.match(secure,/Данные не изменялись/);
  assert.doesNotMatch(secure,/setDoc\(.*SHARED_DOC/);
});

test('Notes are allowed to be created independently and use a transaction',()=>{
  assert.match(app,/async function saveNotes/);
  assert.match(app,/runTransaction\(db/);
  assert.match(app,/NOTES_DOC/);
  assert.match(notes,/async function write/);
  assert.match(notes,/runTransaction\(db/);
});

test('Calendar history is rendered from real jobs instead of artificial 0/3',()=>{
  assert.match(secure,/historyStart='2026-08-10'/);
  assert.match(secure,/done\.length/);
  assert.match(secure,/montages\.length/);
  assert.match(secure,/has-measure/);
});

test('Weekend dashboard uses existing next-week jobs and prices',()=>{
  assert.match(secure,/weekend=dow===0\|\|dow===6/);
  assert.match(secure,/nextWeekJobs=state\.jobs\.filter/);
  assert.match(secure,/nextWeekIncome=nextWeekJobs\.reduce/);
});

test('Financial semantics remain completed-income based',()=>{
  assert.match(app,/function effectiveIncome/);
  assert.match(app,/if\(isCancelled\(j\)\|\|!isDone\(j\)\)return 0/);
  assert.match(app,/net:income-expenses/);
});

test('Existing shared fields are preserved by normalization',()=>{
  assert.match(app,/\.\.\.j/);
  assert.match(app,/\.\.\.e/);
  assert.match(secure,/\.\.\.\(d && typeof d === 'object' \? d : \{\}\)/);
});

test('Firestore rules still require authentication for both documents',()=>{
  assert.match(rules,/request\.auth != null/);
  assert.match(rules,/match \/appData\/shared/);
  assert.match(rules,/match \/appData\/notes/);
});

test('Legacy runtime rewrite workflow is disabled',()=>{
  assert.doesNotMatch(workflow,/push:/);
  assert.match(workflow,/workflow_dispatch/);
});

test('Mobile shell keeps the existing UI and safe-area behavior',()=>{
  assert.match(index,/viewport-fit=cover/);
  assert.match(css,/overflow-x:hidden/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
});
