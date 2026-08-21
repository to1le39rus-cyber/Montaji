import { firebaseConfig } from './firebase-config.js';

const FIREBASE_VERSION = '10.14.1';
const NOTES_DOC = ['appData', 'notes'];
const $ = (s, root = document) => root.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

let db = null;
let fs = null;
let notes = [];
let modal = null;
let observer = null;
let renderTimer = null;

function toast(text, kind='normal') {
  let el = $('#notesToast');
  if (!el) { el = document.createElement('div'); el.id = 'notesToast'; document.body.append(el); }
  el.textContent = text;
  el.dataset.state = kind;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.remove(), 2800);
}

async function init() {
  const appMod = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
  fs = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);
  let app;
  try { app = appMod.getApp('montaji-aa-production'); }
  catch { app = appMod.initializeApp(firebaseConfig, 'montaji-aa-notes-v2'); }
  db = fs.getFirestore(app);
  await load();
  installStyles();
  installModal();
  bind();
  startObserver();
  render();
}

async function load() {
  try {
    const snap = await fs.getDocFromServer(fs.doc(db, ...NOTES_DOC));
    const data = snap.exists() ? snap.data()?.data : null;
    notes = Array.isArray(data?.notes) ? data.notes.map(normalize) : [];
  } catch (e) {
    console.warn('Notes v2 load failed', e);
    notes = [];
  }
}

function normalize(n) {
  return {
    id: n.id || uid(),
    text: String(n.text ?? n.body ?? n.content ?? '').trim(),
    title: String(n.title ?? '').trim(),
    archived: n.archived === true,
    createdAt: n.createdAt || null,
    updatedAt: n.updatedAt || null,
    archivedAt: n.archivedAt || null,
    author: n.author || ''
  };
}

async function save(mutator) {
  const ref = fs.doc(db, ...NOTES_DOC);
  await fs.runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const current = snap.exists() && Array.isArray(snap.data()?.data?.notes)
      ? snap.data().data.notes.map(normalize)
      : [];
    const next = mutator(current);
    tx.set(ref, {
      data: { notes: next },
      version: 2,
      updatedAt: fs.serverTimestamp()
    }, { merge: true });
    notes = next;
  });
  render();
}

function formatDate(value) {
  if (!value) return '';
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(d);
}

function activeNotes() { return notes.filter(n => !n.archived); }
function archivedNotes() { return notes.filter(n => n.archived); }

function render() {
  const active = $('#activeNotes');
  const archived = $('#archivedNotes');
  if (!active || !archived) return;
  active.innerHTML = activeNotes().length ? activeNotes().map(card).join('') : '<div class="notes-empty">Нет активных заметок</div>';
  archived.innerHTML = archivedNotes().length ? archivedNotes().map(card).join('') : '<div class="notes-empty">Архив пуст</div>';
  bindCards();
}

function card(n) {
  const isArchived = n.archived;
  return `<article class="note-v2 ${isArchived ? 'is-archived' : ''}" data-note-id="${esc(n.id)}">
    <div class="note-v2-main">
      <div class="note-v2-title">${esc(n.title || 'Без заголовка')}</div>
      <div class="note-v2-text">${esc(n.text)}</div>
      <div class="note-v2-meta">${isArchived ? 'В архиве' : 'Активная'}${formatDate(n.updatedAt || n.createdAt) ? ' · ' + esc(formatDate(n.updatedAt || n.createdAt)) : ''}</div>
    </div>
    <div class="note-v2-actions">
      <button data-note-action="edit" data-id="${esc(n.id)}">Изменить</button>
      ${isArchived ? `<button data-note-action="restore" data-id="${esc(n.id)}">Вернуть</button>` : `<button data-note-action="archive" data-id="${esc(n.id)}">В архив</button>`}
      <button class="delete-note" data-note-action="delete" data-id="${esc(n.id)}">Удалить</button>
    </div>
  </article>`;
}

function openEditor(note = null) {
  modal?.classList.add('open');
  $('#noteV2Id').value = note?.id || '';
  $('#noteV2Title').value = note?.title || '';
  $('#noteV2Text').value = note?.text || '';
  $('#noteV2Title').focus();
}

function closeEditor() { modal?.classList.remove('open'); }

async function submitEditor(e) {
  e.preventDefault();
  const id = $('#noteV2Id').value;
  const title = $('#noteV2Title').value.trim();
  const text = $('#noteV2Text').value.trim();
  if (!text) return toast('Напиши текст заметки', 'error');
  const now = new Date().toISOString();
  try {
    await save(current => {
      if (id) return current.map(n => n.id === id ? { ...n, title, text, updatedAt: now } : n);
      return [{ id: uid(), title, text, archived:false, createdAt:now, updatedAt:now, archivedAt:null }, ...current];
    });
    closeEditor();
    toast(id ? 'Заметка обновлена' : 'Заметка сохранена', 'ok');
  } catch (e) { console.error(e); toast('Не удалось сохранить заметку', 'error'); }
}

async function action(action, id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  try {
    if (action === 'delete') {
      if (!confirm('Удалить заметку без возможности восстановления?')) return;
      await save(current => current.filter(n => n.id !== id));
      toast('Заметка удалена', 'ok');
    } else if (action === 'archive') {
      await save(current => current.map(n => n.id === id ? { ...n, archived:true, archivedAt:new Date().toISOString(), updatedAt:new Date().toISOString() } : n));
      toast('Заметка отправлена в архив', 'ok');
    } else if (action === 'restore') {
      await save(current => current.map(n => n.id === id ? { ...n, archived:false, archivedAt:null, updatedAt:new Date().toISOString() } : n));
      toast('Заметка возвращена', 'ok');
    } else if (action === 'edit') {
      openEditor(note);
    }
  } catch (e) { console.error(e); toast('Не удалось выполнить действие', 'error'); }
}

function bind() {
  document.addEventListener('click', e => {
    const add = e.target.closest('#todayNoteBtn');
    if (add) { e.preventDefault(); e.stopImmediatePropagation(); openEditor(); return; }
    const actionBtn = e.target.closest('[data-note-action]');
    if (actionBtn) { e.preventDefault(); e.stopPropagation(); action(actionBtn.dataset.noteAction, actionBtn.dataset.id); }
    if (e.target.closest('#noteV2Close, #noteV2Cancel')) closeEditor();
  }, true);
  document.addEventListener('submit', e => {
    if (e.target.id === 'noteV2Form') { e.preventDefault(); e.stopPropagation(); submitEditor(e); }
  }, true);
}

function bindCards() {
  // Buttons are delegated; this is intentionally a no-op after each render.
}

function startObserver() {
  observer = new MutationObserver(() => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      const active = $('#activeNotes');
      if (active && !active.dataset.notesV2) {
        active.dataset.notesV2 = '1';
        render();
      }
    }, 80);
  });
  observer.observe(document.body, { childList:true, subtree:true });
}

function installModal() {
  if ($('#noteV2Modal')) return;
  const el = document.createElement('div');
  el.id = 'noteV2Modal';
  el.className = 'notes-v2-modal';
  el.innerHTML = `<div class="notes-v2-backdrop" id="noteV2Close"></div><div class="notes-v2-sheet"><div class="notes-v2-head"><div><div class="notes-v2-kicker">Заметка</div><h3>Новая заметка</h3></div><button type="button" id="noteV2Cancel">×</button></div><form id="noteV2Form"><input id="noteV2Id" type="hidden"><label>Заголовок<input id="noteV2Title" maxlength="80" placeholder="Например: Клиенту перезвонить"></label><label>Текст<textarea id="noteV2Text" rows="6" maxlength="2000" placeholder="Что нужно запомнить…" required></textarea></label><div class="notes-v2-form-actions"><button type="button" class="secondary" id="noteV2Cancel2">Отмена</button><button type="submit" class="primary">Сохранить</button></div></form></div>`;
  document.body.append(el);
  modal = el;
  $('#noteV2Cancel2').onclick = closeEditor;
}

function installStyles() {
  if ($('#notesV2Styles')) return;
  const style = document.createElement('style');
  style.id = 'notesV2Styles';
  style.textContent = `
    .note-v2{display:flex;gap:14px;align-items:flex-start;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.08)}
    .note-v2-main{min-width:0;flex:1}.note-v2-title{font-weight:750;font-size:15px;color:inherit}.note-v2-text{margin-top:6px;white-space:pre-wrap;line-height:1.45;color:inherit;opacity:.92;overflow-wrap:anywhere}.note-v2-meta{margin-top:8px;font-size:11px;opacity:.5}
    .note-v2-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.note-v2-actions button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:inherit;border-radius:10px;padding:7px 9px;font:inherit;font-size:11px}.note-v2-actions .delete-note{color:#ff8d8d}.note-v2.is-archived{opacity:.65}.notes-empty{padding:14px 0;opacity:.5;font-size:13px}
    .notes-v2-modal{position:fixed;inset:0;z-index:9999;display:none}.notes-v2-modal.open{display:block}.notes-v2-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.58);backdrop-filter:blur(5px)}.notes-v2-sheet{position:absolute;left:0;right:0;bottom:0;background:#171f2d;border:1px solid rgba(255,255,255,.1);border-radius:24px 24px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(0,0,0,.35)}.notes-v2-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}.notes-v2-head h3{margin:4px 0 0;font-size:22px}.notes-v2-kicker{font-size:11px;opacity:.55;text-transform:uppercase;letter-spacing:.08em}.notes-v2-head button{width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.07);color:inherit;font-size:24px}.notes-v2-sheet label{display:block;margin:12px 0;font-size:12px;opacity:.75}.notes-v2-sheet input,.notes-v2-sheet textarea{display:block;width:100%;box-sizing:border-box;margin-top:7px;border:1px solid rgba(255,255,255,.12);border-radius:13px;background:rgba(255,255,255,.05);color:inherit;padding:12px;font:inherit;font-size:15px;outline:none}.notes-v2-sheet textarea{resize:vertical;min-height:120px}.notes-v2-form-actions{display:flex;gap:10px;margin-top:18px}.notes-v2-form-actions button{flex:1}
    #notesToast{position:fixed;left:16px;right:16px;bottom:90px;z-index:10000;padding:12px 14px;border-radius:13px;background:#202a3b;color:#fff;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.3)}#notesToast[data-state="error"]{background:#54262b}
    @media (min-width:700px){.notes-v2-sheet{left:50%;right:auto;bottom:50%;transform:translate(-50%,50%);width:min(520px,calc(100vw - 40px));border-radius:24px}}
  `;
  document.head.append(style);
}

init().catch(e => { console.error('Notes v2 failed', e); toast('Раздел заметок не удалось запустить', 'error'); });
