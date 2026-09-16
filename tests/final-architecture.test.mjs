import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const boot = fs.readFileSync(path.join(root, 'boot.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const designCss = fs.readFileSync(path.join(root, 'montaji-design-v3.css'), 'utf8');
const uxCss = fs.readFileSync(path.join(root, 'modules/ux-style.css'), 'utf8');
const uxJs = fs.readFileSync(path.join(root, 'modules/ux-style.js'), 'utf8');

function has(pattern, source = app) { assert.match(source, pattern); }

test('production entry is deterministic', () => {
  assert.match(index, /boot\.js\?v=/);
  assert.equal((index.match(/type="module"/g) || []).length, 1);
  assert.ok(fs.existsSync(path.join(root, 'firebase-config.js')));
  assert.ok(fs.existsSync(path.join(root, 'firestore.rules')));
});

test('boot is only a thin canonical entrypoint', () => {
  assert.match(boot, /import ['"]\.\/app\.js(?:\?[^'"]+)?['"];?/);
  assert.doesNotMatch(boot, /source\.replace|new Blob|cdn\.jsdelivr|raw\.githubusercontent/);
});

test('shared and notes use Firestore as source of truth', () => {
  has(/SHARED_DOC\s*=\s*\['appData',\s*'shared'\]/);
  has(/NOTES_DOC\s*=\s*\['appData',\s*'notes'\]/);
  has(/getDocFromServer\(/);
  has(/onSnapshot/);
  has(/runTransaction/);
  assert.doesNotMatch(app, /localStorage|sessionStorage/);
});

test('shared realtime starts only after a successful bootstrap', () => {
  assert.match(app, /function startRealtime\(\)/);
  assert.match(app, /const ok=await loadServer\(\);if\(ok\)startRealtime\(\)/);
  assert.match(app, /function loadServer\(\)/);
  assert.match(app, /Shared base read failed/);
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
  assert.match(app, /unsubscribeNotes\?\.\(\)/);
});

test('two operator accounts are enforced for legacy production data', () => {
  assert.match(rules, /function isOperator\(\)/);
  assert.match(rules, /'tkrp@bk\.ru'/);
  assert.match(rules, /'titoworld@bk\.ru'/);
  assert.match(rules, /match \/appData\/shared/);
  assert.match(rules, /match \/appData\/notes/);
  assert.match(rules, /allow read, write: if signedIn\(\) && isOperator\(\)/);
});

test('removed production patch files stay removed', () => {
  for (const file of ['notes-fix.js', 'control-fix.js', 'sync-recovery.js', 'boot-calendar-20260902.js']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `${file} should stay removed`);
  }
});

test('canonical visual layers are static and linked', () => {
  assert.match(index, /montaji-design-v3\.css/);
  assert.match(designCss, /@import url\(['"]\.\/modules\/profile-ui\.css/);
  assert.match(uxCss, /\.job-detail-sheet/);
  assert.match(designCss, /modules\/profile-ui\.css/);
  assert.match(uxJs, /Presentation lives in modules\/ux-style\.css/);
  assert.doesNotMatch(uxJs, /document\.createElement\(['"]style['"]\)/);
  assert.doesNotMatch(uxJs, /\.textContent\s*=\s*`[\s\S]*!important/);
});

test('maps use Russian providers', () => {
  has(/yandex\.ru\/maps/);
  has(/2gis\.ru\/search/);
  assert.doesNotMatch(app, /google\.com\/maps/);
});

test('canonical planning model is integrated into the runtime', () => {
  assert.match(app, /planning-view\.js/);
  assert.match(app, /planningViewModel\(state\.jobs/);
  assert.doesNotMatch(app, /день полностью загружен/i);
  assert.doesNotMatch(app, /c>=3/);
  assert.doesNotMatch(app, /\$\('[^']*todayLoad[^']*'\)\.textContent=`\$\{montageCount\(d\)\}\/3`/);
});

test('three planning windows are presets, not a daily montage limit', () => {
  assert.match(app, /\['1','2','3'\]/);
  has(/montageCount/);
  has(/freeSlot/);
  assert.doesNotMatch(app, /max.*3.*монтаж|лимит.*3.*монтаж/i);
  assert.doesNotMatch(app, /c>=3/);
});

test('financial semantics preserve future jobs and history', () => {
  has(/periodBounds/);
  has(/totals/);
  assert.ok(/isDone/.test(app));
});

test('main shared data load is server-forced and independent from notes', () => {
  assert.match(app, /getDocFromServer\(F\.doc\(db,\.\.\.SHARED_DOC\)/);
  assert.match(app, /getDocFromServer\(F\.doc\(db,\.\.\.NOTES_DOC\)/);
  assert.doesNotMatch(app, /Promise\.all\(\[\s*F\.getDoc/);
  assert.match(app, /try\{const notesSnap=/);
  assert.match(app, /Shared base read failed/);
});

test('Firebase read, data normalization and render have separate failure boundaries', () => {
  assert.match(app, /Shared base read failed/);
  assert.match(app, /Shared data normalization failed/);
  assert.match(app, /Render after shared bootstrap failed/);
  assert.match(app, /getIdToken\(user,true\)/);
});
