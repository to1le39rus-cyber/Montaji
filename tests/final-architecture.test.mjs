import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const index=fs.readFileSync('index.html','utf8');
const v9=fs.readFileSync('v9.js','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');

test('production entry is deterministic and cache-busted',()=>{assert.match(index,/app\.js\?v=9-core-20260818/);assert.match(index,/v9\.js\?v=20260818-1/);assert.equal((index.match(/<script[^>]+type=["']module["']/g)||[]).length,1);assert.doesNotMatch(index,/enhancement-v8\.js|app-v[0-9]|firebase-sync|archive\.js/)});
test('v9 JavaScript is a standalone browser-safe layer',()=>{assert.match(v9,/^\(\(\) => \{/);assert.match(v9,/document\.readyState/);assert.match(v9,/DOMContentLoaded/);assert.match(v9,/import\(`https:\/\/www\.gstatic\.com\/firebase/)});
test('v9 preserves the existing shared database contract',()=>{assert.match(v9,/const DOC=\['appData','shared'\]/);assert.match(v9,/expenses:\[\.\.\.\(cur\.expenses\|\|\[\]\),item\]/);assert.match(v9,/F\.runTransaction\(db/);assert.match(v9,/updatedBy:user\.uid/)});
test('v9 isolates notes into a separate document so legacy writes cannot erase them',()=>{assert.match(v9,/const NOTES_DOC=\['appData','notes'\]/);assert.match(v9,/async function noteSave/);assert.match(v9,/notes:\[\.\.\.\(Array\.isArray\(cur\.notes\)\?cur\.notes:\[\]\)/)});
test('home has daily expenses plus active and archived notes',()=>{assert.match(v9,/Расходы сегодня/);assert.match(v9,/Сохранить расход/);assert.match(v9,/Архив заметок/);assert.match(v9,/data-note-archive/);assert.match(v9,/data-note-restore/)});
test('expense form accepts any positive decimal amount and explicit date',()=>{assert.match(v9,/id="v9ExpDate" type="date"/);assert.match(v9,/type="number" min="0\.01" step="0\.01"/);assert.match(v9,/const amount=Number\(\$\('#v9ExpAmount'\)\.value\)/)});
test('calendar archive exposes jobs, income, expenses and net for the selected day',()=>{assert.match(v9,/observeCalendar/);assert.match(v9,/Архив дня/);assert.match(v9,/Открыть весь день/);assert.match(v9,/Монтажи и выезды/);assert.match(v9,/Расходы/);assert.match(v9,/net:income-exp/)});
test('calendar archive can add an expense for the exact selected date',()=>{assert.match(v9,/openExpense\(d\)/);assert.match(v9,/id="v9ArcExp"/);assert.match(v9,/value="\$\{esc\(d\)\}"/)});
test('authentication security rules remain required',()=>{assert.match(rules,/email_verified == true/);assert.match(rules,/sign_in_provider != 'anonymous'/)});
