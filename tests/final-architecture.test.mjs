import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const boot=fs.readFileSync('boot.js','utf8');
const recovery=fs.readFileSync('sync-recovery.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');

test('production entry is deterministic and uses the safe bootloader',()=>{
  assert.equal((index.match(/<script[^>]+type=["']module["']/g)||[]).length,1);
  assert.match(index,/app\.js\?v=12-20260819/);
  assert.match(recovery,/boot\.js/);
  assert.match(boot,/PRODUCTION_PATCH_NOT_APPLIED/);
  assert.doesNotMatch(index,/v9\.js|v9-compat|app-v[0-9]|firebase-sync|archive\.js/);
});

test('working database contract is preserved',()=>{
  assert.match(app,/const SHARED_DOC = \['appData', 'shared'\]/);
  assert.match(app,/getDocFromServer/);
  assert.match(app,/onSnapshot/);
  assert.match(app,/runTransaction/);
  assert.doesNotMatch(app,/localStorage|sessionStorage/);
});

test('safe bootloader isolates shared database loading from notes permissions',()=>{
  assert.match(boot,/sharedSnap=await F\.getDocFromServer/);
  assert.match(boot,/const notesSnap=await F\.getDocFromServer/);
  assert.match(boot,/Notes unavailable; shared database remains usable/);
  assert.match(boot,/serverReady=true/);
  assert.match(boot,/await F\.getDoc\(F\.doc\(db,\.\.\.SHARED_DOC\)\)/);
});

test('notes remain isolated from legacy shared writes',()=>{
  assert.match(app,/const NOTES_DOC = \['appData', 'notes'\]/);
  assert.match(app,/saveNotes/);
  assert.match(app,/renderNotes/);
});

test('installer workflow contains specialized measure flow',()=>{
  assert.match(index,/data-type="Замер"/);
  assert.match(index,/id="timeWrap"/);
  assert.match(index,/id="measureWrap"/);
  assert.match(index,/id="convertMeasureBtn"/);
  assert.match(app,/convertedFromMeasureId/);
  assert.match(app,/convertedToJobId/);
});

test('financial semantics distinguish completed income, expenses and debt',()=>{
  assert.match(app,/function effectiveIncome/);
  assert.match(app,/const unpaid=jobs\.filter\(j=>j\.paid===false\)/);
  assert.match(app,/net:income-expenses/);
  assert.match(app,/data-open-debts/);
});

test('history is preserved instead of destructive job deletion',()=>{
  assert.match(app,/status:'Отменён'/);
  assert.match(app,/cancelledAt/);
  assert.doesNotMatch(app,/jobs:cur\.jobs\.filter\(j=>j\.id!==id\)/);
});

test('expenses are independent entities and can be archived safely',()=>{
  assert.match(app,/expenses: Array\.isArray/);
  assert.match(app,/cancelled:e\.cancelled === true/);
  assert.match(app,/cancelExpense/);
});

test('mobile UX guards against horizontal overflow',()=>{
  assert.match(css,/overflow-x:hidden/);
  assert.match(index,/viewport-fit=cover/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/max-width:100%/);
});

test('security requires authenticated verified accounts and protects both documents',()=>{
  assert.match(rules,/request\.auth != null/);
  assert.match(rules,/sign_in_provider != 'anonymous'/);
  assert.match(rules,/request\.auth\.token\.email_verified == true/);
  assert.match(rules,/match \/appData\/shared/);
  assert.match(rules,/match \/appData\/notes/);
});

test('new installer shortcuts are wired',()=>{
  assert.match(app,/data-quick="route"/);
  assert.match(app,/data-quick="done"/);
  assert.match(app,/navigator\.share/);
  assert.match(index,/Расходы сегодня/);
  assert.match(index,/Архив заметок/);
});
