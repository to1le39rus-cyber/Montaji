import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');

test('v5 page loads one application module',()=>{const m=[...index.matchAll(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/g)].map(x=>x[1]);assert.deepEqual(m,['app.js?v=20260812-v5'])});
test('no browser database/cache is used',()=>{assert.equal(app.includes('localStorage'),false);assert.equal(app.includes('sessionStorage'),false);assert.match(app,/state=empty\(\)/)});
test('Firestore architecture is server-first and realtime',()=>{assert.match(app,/getDocFromServer/);assert.match(app,/onSnapshot/);assert.match(app,/runTransaction/);assert.match(app,/serverTimestamp/)});
test('Firebase auth uses verified email/password',()=>{assert.match(app,/signInWithEmailAndPassword/);assert.match(app,/createUserWithEmailAndPassword/);assert.match(app,/sendEmailVerification/);assert.match(rules,/email_verified == true/);assert.match(rules,/sign_in_provider != 'anonymous'/)});
test('map routing is Russian-first',()=>{assert.match(app,/yandex\.ru\/maps/);assert.match(app,/2gis\.ru\/search/);assert.equal(app.includes('google.com/maps'),false)});
test('finance and debt controls exist',()=>{assert.match(index,/jobPaid/);assert.match(app,/paid===false/);assert.match(app,/Не оплачено/);assert.match(app,/Долги/)});
test('smart operational insights exist',()=>{assert.match(app,/Просрочено выездов/);assert.match(app,/полностью загружен/);assert.match(app,/неоплаченных работ/)});
test('v5 visual system has modern responsive light/dark themes',()=>{assert.match(css,/linear-gradient/);assert.match(css,/body\.dark/);assert.match(css,/backdrop-filter/);assert.match(css,/@media\(max-width:560px\)/)});
test('legacy modules are not wired into production',()=>{for(const x of ['firebase-sync.js','archive.js','app-v4.js','app-v3.js'])assert.equal(index.includes(x),false)});
