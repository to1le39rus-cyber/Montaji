import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const boot = fs.readFileSync('boot.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const rules = fs.readFileSync('firestore.rules', 'utf8');

test('production entry is deterministic', () => {
  assert.equal((index.match(/<script[^>]+type=["']module["']/g) || []).length, 1);
  assert.match(index, /boot\.js\?v=/);
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

test('database boot uses the canonical Firebase config and resilient shared load', () => {
  assert.match(boot, /CONFIG_URL/);
  assert.match(boot, /firebase-config\.js/);
  assert.match(boot, /Shared data unavailable/);
  assert.doesNotMatch(boot, /signInAnonymously/);
});

test('montage scheduling has no artificial daily capacity limit', () => {
  assert.match(boot, /function montageCount\(d\).*jobsForDate\(d\).*type==='Монтаж'/s);
  assert.match(boot, /conflict=null/);
  assert.match(boot, /todayLoad/);
  assert.doesNotMatch(boot, /Сегодня уже занято 3\/3 монтажных окна/);
  assert.doesNotMatch(boot, /На эту дату уже занято 3\/3 монтажных окна/);
  assert.doesNotMatch(app, /Сегодня уже занято 3\/3 монтажных окна/);
  assert.doesNotMatch(app, /На эту дату уже занято 3\/3 монтажных окна/);
});

test('measure flow has all required DOM fields', () => {
  assert.match(index, /data-type="Замер"/);
  assert.match(index, /id="timeWrap"/);
  assert.match(index, /id="measureWrap"/);
  assert.match(index, /id="measurePrice"/);
  assert.match(index, /id="measurePaid"/);
  assert.match(index, /id="measureCredit"/);
  assert.match(index, /id="convertMeasureBtn"/);
  assert.match(app, /convertedFromMeasureId/);
  assert.match(app, /convertedToJobId/);
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
  assert.match(app, /cancelled:true/);
  assert.match(index, /id="cancelExpense"/);
});

test('mobile UX protects the viewport', () => {
  assert.match(css, /overflow-x:hidden/);
  assert.match(index, /viewport-fit=cover/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /max-width:100%/);
});

test('Firestore security requires authenticated Firebase clients', () => {
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /match \/appData\/shared/);
  assert.match(rules, /match \/appData\/notes/);
});

test('quick actions and daily workflow remain wired', () => {
  assert.match(app, /data-quick="route"/);
  assert.match(app, /data-quick="done"/);
  assert.match(app, /data-quick="paid"/);
  assert.match(app, /navigator\.share/);
  assert.match(index, /Расходы сегодня/);
  assert.match(index, /Архив заметок/);
  assert.match(index, /Ближайшие дни/);
});
