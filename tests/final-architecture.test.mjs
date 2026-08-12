import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const rules = fs.readFileSync('firestore.rules', 'utf8');

 test('production page loads exactly one application module', () => {
  const modules = [...index.matchAll(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/g)].map(m => m[1]);
  assert.deepEqual(modules, ['app.js?v=20260812-final1']);
});

test('production app never uses localStorage', () => {
  assert.equal(app.includes('localStorage'), false);
  assert.equal(app.includes('sessionStorage'), false);
});

test('production app uses Firestore server reads, realtime listener and transactions', () => {
  assert.match(app, /getDocFromServer/);
  assert.match(app, /onSnapshot/);
  assert.match(app, /runTransaction/);
});

test('offline state clears working data instead of serving a browser cache', () => {
  assert.match(app, /Нет интернета · данные не загружены/);
  assert.match(app, /state=emptyData\(\)/);
});

test('Firestore rules require verified non-anonymous users', () => {
  assert.match(rules, /request\.auth\.token\.firebase\.sign_in_provider != 'anonymous'/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
});

test('legacy sync modules are not wired into the production page', () => {
  assert.equal(index.includes('firebase-sync.js'), false);
  assert.equal(index.includes('archive.js'), false);
  assert.equal(index.includes('app-v4.js'), false);
  assert.equal(index.includes('app-v3.js'), false);
});
