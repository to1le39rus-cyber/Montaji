import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function has(pattern, source = app) { assert.match(source, pattern); }

// Production entry remains deterministic and single-module.
test('production entry is deterministic', () => {
  assert.match(index, /boot\.js\?v=/);
  assert.equal((index.match(/type="module"/g) || []).length, 1);
  assert.ok(fs.existsSync(path.join(root, 'firebase-config.js')));
  assert.ok(fs.existsSync(path.join(root, 'firestore.rules')));
});

test('shared and notes use Firestore as source of truth', () => {
  has(/SHARED_DOC\s*=\s*\['appData',\s*'shared'\]/);
  has(/NOTES_DOC\s*=\s*\['appData',\s*'notes'\]/);
  has(/getDocFromServer/);
  has(/onSnapshot/);
  has(/runTransaction/);
  assert.doesNotMatch(app, /localStorage|sessionStorage/);
});

test('notes are integrated in app.js without runtime patch hacks', () => {
  has(/function saveNotes\s*\(/);
  has(/function renderNotes\s*\(/);
  has(/NOTES_DOC/);
  has(/unsubscribeNotes/);
  assert.doesNotMatch(app, /MutationObserver/);
  assert.doesNotMatch(index, /notes-fix\.js|control-fix\.js|sync-recovery\.js/);
});

test('notes realtime failures do not replace shared state', () => {
  assert.match(app, /unsubscribeNotes=F\.onSnapshot\(F\.doc\(db,\.\.\.NOTES_DOC\)/);
  assert.match(app, /unsubscribeNotes=.*?\(\)=>\{\}/);
});

test('two operator accounts are enforced for legacy production data', () => {
  assert.match(rules, /function isOperator\(\)/);
  assert.match(rules, /'tkrp@bk\.ru'/);
  assert.match(rules, /'titoworld@bk\.ru'/);
  assert.match(rules, /match \/appData\/shared/);
  assert.match(rules, /match \/appData\/notes/);
  assert.match(rules, /allow read, write: if signedIn\(\) && isOperator\(\)/);
});

test('no legacy production patch files are required', () => {
  for (const file of ['notes-fix.js', 'control-fix.js', 'sync-recovery.js', 'montaji-design-v3.css', 'boot-calendar-20260902.js']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `${file} should stay removed`);
  }
});

test('maps use Russian providers', () => {
  has(/yandex\.ru\/maps/);
  has(/2gis\.ru\/search/);
  assert.doesNotMatch(app, /google\.com\/maps/);
});

test('daily capacity stays at three montage windows', () => {
  assert.match(app, /\['1','2','3'\]/);
  has(/montageCount/);
  has(/freeSlot/);
});

test('financial semantics preserve future jobs and history', () => {
  has(/periodBounds/);
  has(/totals/);
  assert.ok(/isDone/.test(app));
});

test('main data load is independent from notes', () => {
  assert.match(app, /getDocFromServer\(F\.doc\(db,\.\.\.SHARED_DOC\)\)/);
  assert.match(app, /getDocFromServer\(F\.doc\(db,\.\.\.NOTES_DOC\)\)/);
  assert.match(app, /Promise\.all\(\[/);
});
