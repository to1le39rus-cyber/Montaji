import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const rules = fs.readFileSync('firestore.rules', 'utf8');

// Production contract: index.html is the single browser entry point.
test('production entry is deterministic', () => {
  assert.equal((index.match(/<script[^>]+type=["']module["']/g) || []).length, 1);
  assert.match(index, /app\.js\?v=/);
  assert.doesNotMatch(index, /v9\.js|v9-compat|app-v[0-9]|firebase-sync|archive\.js/);
});

test('working Firestore database contract is preserved', () => {
  assert.match(app, /const SHARED_DOC = \['appData', 'shared'\]/);
  assert.match(app, /const NOTES_DOC = \['appData', 'notes'\]/);
  assert.match(app, /getDocFromServer/);
  assert.match(app, /onSnapshot/);
  assert.match(app, /runTransaction/);
  assert.doesNotMatch(app, /localStorage|sessionStorage/);
});

test('database loading keeps shared data independent from notes', () => {
  assert.match(app, /sharedSnap=await F\.getDocFromServer/);
  assert.match(app, /notesSnap=await F\.getDocFromServer/);
  assert.match(app, /serverReady=true/);
});

test('authentication and database access are wired together', () => {
  assert.match(app, /signInWithEmailAndPassword/);
  assert.match(app, /onAuthStateChanged/);
  assert.match(app, /onUser/);
  assert.match(app, /emailVerified/);
});

test('measure flow is preserved', () => {
  assert.match(index, /data-type="Замер"/);
  assert.match(index, /id="timeWrap"/);
  assert.match(index, /id="measureWrap"/);
  assert.match(index, /id="convertMeasureBtn"/);
  assert.match(app, /convertedFromMeasureId/);
  assert.match(app, /convertedToMeasureId|convertedToJobId/);
});

test('financial semantics distinguish completed income, expenses and debt', () => {
  assert.match(app, /function effectiveIncome/);
  assert.match(app, /j\.paid===false/);
  assert.match(app, /net:income-expenses/);
  assert.match(app, /data-open-debts/);
});

test('future jobs never become debt or income before completion', () => {
  assert.match(app, /if\(isCancelled\(j\)\|\|!isDone\(j\)\)return 0/);
  assert.match(app, /const debts=state\.jobs\.filter\(j=>!isCancelled\(j\)&&isDone\(j\)&&j\.paid===false\)/);
});

test('history is preserved instead of destructive deletion', () => {
  assert.match(app, /status:'Отменён'/);
  assert.match(app, /cancelledAt/);
  assert.doesNotMatch(app, /jobs:cur\.jobs\.filter\(j=>j\.id!==id\)/);
});

test('expenses are independent and archivable', () => {
  assert.match(app, /expenses: Array\.isArray/);
  assert.match(app, /cancelled:e\.cancelled === true/);
  assert.match(app, /cancelExpense/);
});

test('mobile UX protects the viewport', () => {
  assert.match(css, /overflow-x:hidden/);
  assert.match(index, /viewport-fit=cover/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /max-width:100%/);
});

test('Firestore security protects shared data and notes', () => {
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /sign_in_provider != 'anonymous'/);
  assert.match(rules, /email_verified == true/);
  assert.match(rules, /match \/appData\/shared/);
  assert.match(rules, /match \/appData\/notes/);
});

test('quick actions and daily workflow remain wired', () => {
  assert.match(app, /data-quick="route"/);
  assert.match(app, /data-quick="done"/);
  assert.match(app, /navigator\.share/);
  assert.match(index, /Расходы сегодня/);
  assert.match(index, /Архив заметок/);
  assert.match(index, /Ближайшие дни/);
});
