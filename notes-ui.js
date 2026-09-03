import { firebaseConfig } from './firebase-config.js';

const FIREBASE_VERSION = '10.14.1';
const NOTES_DOC = ['appData', 'notes'];
const $ = (s, root = document) => root.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmtDate = d => d ? new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${d}T12:00:00`)) : '';
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

let F, auth, db, currentUser = null, notes = [], unsubscribe = null;

function toast(text, kind='normal') {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.append(el); }
  el.textContent = text;
  el.dataset.state = kind;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.remove(), 3400);
}

function dataFromSnap(snap) {
  const data = snap?.exists() ? snap.data()?.data || {} : {};
  return Array.isArray(data.notes) ? data.notes : [];
}

async function readNotes() {
  if (!currentUser) return;
  try {
    const snap = await F.getDoc(F.doc(db, ...NOTES_DOC));
    notes = dataFromSnap(snap);
    render();
  } catch (e) {
    console.warn('Notes read skipped', e);
  }
}

function render() {
  const active = $('#activeNotes'), archive = $('#archivedNotes');
  if (!active || !archive) return;
  const open = notes.filter(n => n.archived !== true);
  const old = notes.filter(n => n.archived === true);
  active.innerHTML = open.length ? open.map(card).join('') : '<div class="notes-empty"><strong>Заметок пока нет</strong><span>Сюда можно быстро записать важное для вас обоих.</span></div>';
  archive.innerHTML = old.length ? old.map(card).join('') : '<div class="muted">Архив пуст</div>';
}

function card(n) {
  const meta = [n.authorName || n.authorEmail, n.dueDate ? `до ${fmtDate(n.dueDate)}` : '', n.done ? '✓ выполнено' : ''].filter(Boolean).join(' · ');
  return `<article class="note-card notes-v2 ${n.archived ? 'archived' : ''} ${n.done ? 'note-done' : ''}" data-note-id="${esc(n.id)}">
    <div class="note-v2-top">
      <label class="note-check"><input type="checkbox" data-note-done="${esc(n.id)}" ${n.done ? 'checked' : ''}><span></span></label>
      <div class="note-v2-title"><b>${esc(n.title || 'Заметка')}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</div>
      <div class="note-v2-actions"><button class="mini-btn" data-note-edit-v2="${esc(n.id)}">Изм.</button>${n.archived ? `<button class="mini-btn" data-note-restore-v2="${esc(n.id)}">Вернуть</button>` : `<button class="mini-btn" data-note-archive-v2="${esc(n.id)}">Архив</button>`}</div>
    </div>
    ${n.text ? `<p>${esc(n.text)}</p>` : ''}
  </article>`;
}

function closeModal(m) { m?.remove(); document.body.classList.remove('modal-open'); }

function openNote(note = null) {
  const m = document.createElement('div');
  m.className = 'modal open notes-v2-modal';
  m.innerHTML = `<div class="backdrop"></div><div class="sheet"><div class="handle"></div><div class="sheet-head"><div><div class="eyebrow">Общие заметки</div><h2>${note ? 'Изменить заметку' : 'Новая заметка'}</h2></div><button class="circle-btn" data-note-close>×</button></div>
    <form id="notesV2Form"><label>Заголовок<input id="notesV2Title" required maxlength="120" value="${esc(note?.title || '')}" placeholder="Например: купить расходники"></label>
    <label>Текст<textarea id="notesV2Text" rows="5" maxlength="2000" placeholder="Что важно не забыть…">${esc(note?.text || '')}</textarea></label>
    <div class="form-row"><label>Сделать до<input id="notesV2Due" type="date" value="${esc(note?.dueDate || '')}"></label><label class="check-label"><input id="notesV2Done" type="checkbox" ${note?.done ? 'checked' : ''}> Сделано</label></div>
    <button class="primary wide" type="submit">${note ? 'Сохранить' : 'Добавить заметку'}</button></form></div>`;
  document.body.append(m);
  m.querySelector('.backdrop').onclick = () => closeModal(m);
  m.querySelector('[data-note-close]').onclick = () => closeModal(m);
  $('#notesV2Form', m).onsubmit = async e => {
    e.preventDefault();
    const title = $('#notesV2Title', m).value.trim();
    const text = $('#notesV2Text', m).value.trim();
    if (!title) return;
    const item = { id: note?.id || uid(), title, text, dueDate: $('#notesV2Due', m).value || '', done: $('#notesV2Done', m).checked, archived: note?.archived === true, authorUid: note?.authorUid || currentUser.uid, authorName: note?.authorName || currentUser.displayName || currentUser.email || 'Пользователь', authorEmail: note?.authorEmail || currentUser.email || '', createdAt: note?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      await writeNotes(cur => ({ notes: [...cur.notes.filter(x => x.id !== item.id), item] }));
      closeModal(m); toast('Заметка сохранена', 'success');
    } catch (err) { console.error(err); toast('Не удалось сохранить заметку', 'error'); }
  };
  setTimeout(() => $('#notesV2Title', m)?.focus(), 0);
}

async function writeNotes(mutator) {
  if (!currentUser) throw new Error('AUTH_REQUIRED');
  const ref = F.doc(db, ...NOTES_DOC);
  await F.runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const next = await mutator({ notes: dataFromSnap(snap) });
    tx.set(ref, { data: { notes: Array.isArray(next.notes) ? next.notes : [] }, version: 2, updatedAt: F.serverTimestamp(), updatedBy: currentUser.uid }, { merge: true });
  });
}

async function patchNote(id, patch) {
  try {
    await writeNotes(cur => ({ notes: cur.notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n) }));
    toast(patch.archived === true ? 'Заметка в архиве' : patch.done === true ? 'Отмечено как сделанное' : 'Заметка обновлена', 'success');
  } catch (e) { console.error(e); toast('Не удалось обновить заметку', 'error'); }
}

function bindEvents() {
  document.addEventListener('click', e => {
    const add = e.target.closest('#todayNoteBtn,[data-add-type="Заметка"],[data-note-open-v2]');
    if (add) { e.preventDefault(); e.stopPropagation(); openNote(); return; }
    const edit = e.target.closest('[data-note-edit-v2]');
    if (edit) { e.preventDefault(); e.stopPropagation(); const n = notes.find(x => x.id === edit.dataset.noteEditV2); if (n) openNote(n); return; }
    const archive = e.target.closest('[data-note-archive-v2]');
    if (archive) { e.preventDefault(); e.stopPropagation(); patchNote(archive.dataset.noteArchiveV2, { archived: true }); return; }
    const restore = e.target.closest('[data-note-restore-v2]');
    if (restore) { e.preventDefault(); e.stopPropagation(); patchNote(restore.dataset.noteRestoreV2, { archived: false }); return; }
  }, true);
  document.addEventListener('change', e => {
    const done = e.target.closest('[data-note-done]');
    if (done) patchNote(done.dataset.noteDone, { done: done.checked });
  });
}

async function start() {
  try {
    const [appMod, authMod, fs] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);
    const app = appMod.getApps().find(x => x.name === 'montaji-aa-production');
    if (!app) return;
    auth = authMod.getAuth(app); db = fs.getFirestore(app); F = fs;
    authMod.onAuthStateChanged(auth, u => {
      unsubscribe?.(); unsubscribe = null; currentUser = u;
      if (!u || !u.emailVerified) { notes = []; render(); return; }
      unsubscribe = F.onSnapshot(F.doc(db, ...NOTES_DOC), snap => { notes = dataFromSnap(snap); render(); }, err => console.warn('Notes realtime', err));
      readNotes();
    });
  } catch (e) { console.error('Notes UI failed', e); }
}

const style = document.createElement('style');
style.textContent = `
.notes-v2{padding:14px 0;border-bottom:1px solid var(--line)}
.notes-v2:last-child{border-bottom:0}
.note-v2-top{display:grid;grid-template-columns:28px 1fr auto;gap:9px;align-items:start}
.note-v2-title{min-width:0;display:grid;gap:4px}
.note-v2-title b{font-size:15px;line-height:1.25}
.note-v2-title small{font-size:11px;opacity:.58}
.note-v2-actions{display:flex;gap:4px}
.note-v2-actions .mini-btn{padding:4px 7px}
.notes-v2 p{margin:9px 0 0 37px;white-space:pre-wrap;line-height:1.45;font-size:14px}
.note-check{width:24px;height:24px;display:block;position:relative;cursor:pointer}
.note-check input{position:absolute;opacity:0}
.note-check span{display:block;width:22px;height:22px;border:1.5px solid var(--line);border-radius:7px;background:var(--card,#fff)}
.note-check input:checked+span:after{content:'✓';display:block;text-align:center;line-height:20px;font-size:14px}
.notes-v2.note-done .note-v2-title b,.notes-v2.note-done p{text-decoration:line-through;opacity:.48}
.notes-v2.archived{opacity:.62}
.notes-empty{display:grid;gap:5px;padding:12px 0 6px}
.notes-empty strong{font-size:14px}
.notes-empty span{font-size:12px;opacity:.58}
.notes-v2-modal .sheet{max-height:90vh;overflow:auto}
`;
document.head.append(style);
bindEvents();
start();
