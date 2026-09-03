const FIREBASE_VERSION = '10.14.1';
const NOTES_DOC = ['appData', 'notes'];
const $ = (s, root = document) => root.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
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
function urgentNotes() { return notes.filter(n => n.archived !== true && n.urgent === true && n.done !== true); }

function render() {
  const active = $('#activeNotes'), archive = $('#archivedNotes');
  if (active && archive) {
    const open = notes.filter(n => n.archived !== true);
    const old = notes.filter(n => n.archived === true);
    active.innerHTML = open.length ? open.map(card).join('') : '<div class="notes-empty"><strong>Заметок пока нет</strong><span>Сюда можно быстро записать важное для вас обоих.</span></div>';
    archive.innerHTML = old.length ? old.map(card).join('') : '<div class="muted">Архив пуст</div>';
  }
  renderUrgentInsights();
}

function renderUrgentInsights() {
  const box = $('#insights');
  if (!box) return;
  box.querySelectorAll('.note-insight').forEach(el => el.remove());
  urgentNotes().slice(0, 4).reverse().forEach(n => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'insight note-insight note-insight-urgent';
    el.dataset.noteOpenUrgent = n.id;
    el.innerHTML = `<span class="note-insight-flag" aria-hidden="true">⚑</span><span class="note-insight-copy"><strong>${esc(n.title || 'Срочная заметка')}</strong>${n.dueDate ? `<small>до ${esc(fmtDate(n.dueDate))}</small>` : ''}</span><span class="note-insight-arrow" aria-hidden="true">›</span>`;
    box.appendChild(el);
  });
}

function card(n) {
  const meta = [n.authorName || n.authorEmail, n.dueDate ? `до ${fmtDate(n.dueDate)}` : '', n.done ? '✓ выполнено' : ''].filter(Boolean).join(' · ');
  return `<article class="note-card notes-v2 ${n.archived ? 'archived' : ''} ${n.done ? 'note-done' : ''}" data-note-id="${esc(n.id)}">
    <div class="note-v2-top">
      <label class="note-check" aria-label="Отметить выполненной"><input type="checkbox" data-note-done="${esc(n.id)}" ${n.done ? 'checked' : ''}><span></span></label>
      <button type="button" class="note-v2-open" data-note-open="${esc(n.id)}"><span class="note-v2-title"><b>${esc(n.title || 'Заметка')}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</span></button>
      <div class="note-v2-actions"><button type="button" class="mini-btn" data-note-edit-v2="${esc(n.id)}">Изм.</button>${n.archived ? `<button type="button" class="mini-btn" data-note-restore-v2="${esc(n.id)}">Вернуть</button>` : `<button type="button" class="mini-btn" data-note-archive-v2="${esc(n.id)}">Архив</button>`}</div>
    </div>
    ${n.urgent ? '<div class="note-urgent-badge">⚑ Срочная</div>' : ''}
    ${n.text ? `<p>${esc(n.text)}</p>` : ''}
  </article>`;
}

function closeModal(m) { m?.remove(); document.body.classList.remove('modal-open'); }

function openNote(note = null, viewOnly = false) {
  const m = document.createElement('div');
  m.className = 'modal open notes-v2-modal';
  if (viewOnly && note) {
    m.innerHTML = `<div class="backdrop"></div><div class="sheet"><div class="handle"></div><div class="sheet-head"><div><div class="eyebrow">${note.urgent ? '⚑ СРОЧНАЯ ЗАМЕТКА' : 'ЗАМЕТКА'}</div><h2>${esc(note.title || 'Заметка')}</h2></div><button class="circle-btn" data-note-close>×</button></div>
      <div class="note-detail-meta"><span>${esc(note.authorName || note.authorEmail || 'Пользователь')}</span>${note.dueDate ? `<span>до ${esc(fmtDate(note.dueDate))}</span>` : ''}${note.done ? '<span>✓ Сделано</span>' : ''}${note.urgent ? '<span class="note-detail-urgent">⚑ Срочная</span>' : ''}</div>
      <div class="note-detail-text">${esc(note.text || 'Без текста')}</div>
      <div class="note-detail-actions"><button type="button" class="mini-btn" data-note-edit-detail="${esc(note.id)}">Редактировать</button>${!note.archived ? `<button type="button" class="mini-btn" data-note-archive-detail="${esc(note.id)}">В архив</button>` : ''}</div>
    </div>`;
  } else {
    const priority = note?.urgent === true ? 'urgent' : 'normal';
    m.innerHTML = `<div class="backdrop"></div><div class="sheet"><div class="handle"></div><div class="sheet-head"><div><div class="eyebrow">Общие заметки</div><h2>${note ? 'Изменить заметку' : 'Новая заметка'}</h2></div><button class="circle-btn" data-note-close>×</button></div>
      <form id="notesV2Form">
        <label>Заголовок<input id="notesV2Title" required maxlength="120" value="${esc(note?.title || '')}" placeholder="Например: купить расходники"></label>
        <label>Текст<textarea id="notesV2Text" rows="5" maxlength="2000" placeholder="Что важно не забыть…">${esc(note?.text || '')}</textarea></label>
        <label class="notes-v2-field-label">Сделать до<input id="notesV2Due" type="date" value="${esc(note?.dueDate || '')}"></label>
        <div class="notes-v2-option-group">
          <div class="notes-v2-option-title">Состояние</div>
          <button type="button" class="notes-v2-switch ${note?.done ? 'is-on' : ''}" id="notesV2Done" aria-pressed="${note?.done ? 'true' : 'false'}"><span class="notes-v2-switch-mark">✓</span><span><b>Сделано</b><small>${note?.done ? 'Задача завершена' : 'Оставить открытой'}</small></span></button>
        </div>
        <div class="notes-v2-option-group">
          <div class="notes-v2-option-title">Приоритет</div>
          <div class="notes-v2-priority" role="group" aria-label="Приоритет заметки">
            <button type="button" class="notes-v2-priority-btn ${priority === 'normal' ? 'selected' : ''}" data-note-priority="normal"><span>○</span><b>Обычная</b><small>Просто важное</small></button>
            <button type="button" class="notes-v2-priority-btn urgent ${priority === 'urgent' ? 'selected' : ''}" data-note-priority="urgent"><span>⚑</span><b>Срочная</b><small>Показывать в «Что важно»</small></button>
          </div>
        </div>
        <button class="primary wide" type="submit">${note ? 'Сохранить изменения' : 'Добавить заметку'}</button>
      </form></div>`;
    let done = note?.done === true;
    let urgent = note?.urgent === true;
    const doneBtn = $('#notesV2Done', m);
    const priorityButtons = $$('[data-note-priority]', m);
    doneBtn.onclick = () => { done = !done; doneBtn.classList.toggle('is-on', done); doneBtn.setAttribute('aria-pressed', String(done)); doneBtn.querySelector('small').textContent = done ? 'Задача завершена' : 'Оставить открытой'; };
    priorityButtons.forEach(b => b.onclick = () => { urgent = b.dataset.notePriority === 'urgent'; priorityButtons.forEach(x => x.classList.toggle('selected', x === b)); });
    const form = $('#notesV2Form', m);
    form.onsubmit = async e => {
      e.preventDefault();
      const title = $('#notesV2Title', m).value.trim();
      const text = $('#notesV2Text', m).value.trim();
      if (!title) return;
      const item = { id: note?.id || uid(), title, text, dueDate: $('#notesV2Due', m).value || '', done, urgent, archived: note?.archived === true, authorUid: note?.authorUid || currentUser.uid, authorName: note?.authorName || currentUser.displayName || currentUser.email || 'Пользователь', authorEmail: note?.authorEmail || currentUser.email || '', createdAt: note?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      try { await writeNotes(cur => ({ notes: [...cur.notes.filter(x => x.id !== item.id), item] })); closeModal(m); toast('Заметка сохранена', 'success'); }
      catch (err) { console.error(err); toast('Не удалось сохранить заметку', 'error'); }
    };
  }
  document.body.append(m);
  m.querySelector('.backdrop').onclick = () => closeModal(m);
  m.querySelector('[data-note-close]').onclick = () => closeModal(m);
  const editDetail = m.querySelector('[data-note-edit-detail]');
  if (editDetail) editDetail.onclick = () => { closeModal(m); const n = notes.find(x => x.id === editDetail.dataset.noteEditDetail); if (n) openNote(n); };
  const archiveDetail = m.querySelector('[data-note-archive-detail]');
  if (archiveDetail) archiveDetail.onclick = () => { patchNote(archiveDetail.dataset.noteArchiveDetail, { archived: true }); closeModal(m); };
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
  try { await writeNotes(cur => ({ notes: cur.notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n) })); toast(patch.archived === true ? 'Заметка в архиве' : patch.done === true ? 'Отмечено как сделанное' : 'Заметка обновлена', 'success'); }
  catch (e) { console.error(e); toast('Не удалось обновить заметку', 'error'); }
}
function bindEvents() {
  document.addEventListener('click', e => {
    const add = e.target.closest('#todayNoteBtn,[data-add-type="Заметка"],[data-note-open-v2]');
    if (add) { e.preventDefault(); e.stopPropagation(); openNote(); return; }
    const urgentOpen = e.target.closest('[data-note-open-urgent]');
    if (urgentOpen) { e.preventDefault(); e.stopPropagation(); const n = notes.find(x => x.id === urgentOpen.dataset.noteOpenUrgent); if (n) openNote(n, true); return; }
    const open = e.target.closest('[data-note-open]');
    if (open) { e.preventDefault(); e.stopPropagation(); const n = notes.find(x => x.id === open.dataset.noteOpen); if (n) openNote(n, true); return; }
    const edit = e.target.closest('[data-note-edit-v2]');
    if (edit) { e.preventDefault(); e.stopPropagation(); const n = notes.find(x => x.id === edit.dataset.noteEditV2); if (n) openNote(n); return; }
    const archive = e.target.closest('[data-note-archive-v2]');
    if (archive) { e.preventDefault(); e.stopPropagation(); patchNote(archive.dataset.noteArchiveV2, { archived: true }); return; }
    const restore = e.target.closest('[data-note-restore-v2]');
    if (restore) { e.preventDefault(); e.stopPropagation(); patchNote(restore.dataset.noteRestoreV2, { archived: false }); return; }
  }, true);
  document.addEventListener('change', e => { const done = e.target.closest('[data-note-done]'); if (done) patchNote(done.dataset.noteDone, { done: done.checked }); });
}
async function start() {
  try {
    const [appMod, authMod, fs] = await Promise.all([import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`), import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`), import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)]);
    const app = appMod.getApps().find(x => x.name === 'montaji-aa-production');
    if (!app) return;
    auth = authMod.getAuth(app); db = fs.getFirestore(app); F = fs;
    authMod.onAuthStateChanged(auth, u => { unsubscribe?.(); unsubscribe = null; currentUser = u; if (!u || !u.emailVerified) { notes = []; render(); return; } unsubscribe = F.onSnapshot(F.doc(db, ...NOTES_DOC), snap => { notes = dataFromSnap(snap); render(); }, err => console.warn('Notes realtime', err)); });
  } catch (e) { console.error('Notes UI failed', e); }
}
const style = document.createElement('style');
style.textContent = `
.notes-v2{padding:14px 0;border-bottom:1px solid var(--line)} .notes-v2:last-child{border-bottom:0}
.note-v2-top{display:grid;grid-template-columns:28px 1fr auto;gap:9px;align-items:start}.note-v2-title{min-width:0;display:grid;gap:4px;text-align:left}.note-v2-title b{font-size:15px;line-height:1.25}.note-v2-title small{font-size:11px;opacity:.58}
.note-v2-open{border:0;background:none;padding:0;min-width:0;text-align:left;color:inherit;font:inherit;cursor:pointer}.note-v2-actions{display:flex;gap:4px}.note-v2-actions .mini-btn{padding:4px 7px}.notes-v2 p{margin:9px 0 0 37px;white-space:pre-wrap;line-height:1.45;font-size:14px}
.note-check{width:24px;height:24px;display:block;position:relative;cursor:pointer;margin:0}.note-check input{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;opacity:0!important;clip:rect(0,0,0,0)!important}.note-check span{display:block;width:22px;height:22px;border:1.5px solid #d8d9d3;border-radius:7px;background:#fff;box-sizing:border-box}.note-check input:checked+span{border-color:#5b63d9;background:#5b63d9}.note-check input:checked+span:after{content:'✓';display:block;text-align:center;line-height:20px;font-size:14px;color:#fff;font-weight:700}
.notes-v2.note-done .note-v2-title b,.notes-v2.note-done p{text-decoration:line-through;opacity:.48}.notes-v2.archived{opacity:.62}.note-urgent-badge{display:inline-flex;margin:8px 0 0 37px;padding:4px 8px;border-radius:8px;background:#fff1f1;color:#c94242;font-size:11px;font-weight:700}
.notes-empty{display:grid;gap:5px;padding:12px 0 6px}.notes-empty strong{font-size:14px}.notes-empty span{font-size:12px;opacity:.58}
.notes-v2-modal .sheet{max-height:92vh;overflow:auto;padding-bottom:28px}.notes-v2-modal form{display:grid;gap:16px}.notes-v2-modal label{display:grid;gap:7px}.notes-v2-modal .notes-v2-field-label{font-weight:650;color:#72766f}.notes-v2-modal input[type=date]{width:100%;min-height:52px;box-sizing:border-box}.notes-v2-option-group{display:grid;gap:8px}.notes-v2-option-title{font-size:14px;font-weight:700;color:#72766f}.notes-v2-switch{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:1px solid #e1e2de;border-radius:14px;background:#fff;text-align:left;color:#72766f;font:inherit;cursor:pointer}.notes-v2-switch-mark{width:26px;height:26px;border:1.5px solid #a9aaa7;border-radius:8px;display:grid;place-items:center;box-sizing:border-box;color:transparent;font-weight:800}.notes-v2-switch.is-on{border-color:#5b63d9;background:#f4f5ff}.notes-v2-switch.is-on .notes-v2-switch-mark{background:#5b63d9;border-color:#5b63d9;color:#fff}.notes-v2-switch b{display:block;color:#30332f}.notes-v2-switch small{display:block;margin-top:2px;font-size:11px;opacity:.6}.notes-v2-priority{display:grid;grid-template-columns:1fr 1fr;gap:9px}.notes-v2-priority-btn{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;padding:12px;border:1.5px solid #dedfdb;border-radius:14px;background:#fff;text-align:left;color:#60645e;font:inherit;cursor:pointer}.notes-v2-priority-btn>span{grid-row:1/3;font-size:19px}.notes-v2-priority-btn b{font-size:13px}.notes-v2-priority-btn small{font-size:10px;opacity:.55}.notes-v2-priority-btn.selected{border-color:#5b63d9;background:#f4f5ff;box-shadow:0 0 0 2px rgba(91,99,217,.08)}.notes-v2-priority-btn.urgent.selected{border-color:#c94242;background:#fff5f5;box-shadow:0 0 0 2px rgba(201,66,66,.08)}.notes-v2-priority-btn.urgent>span,.notes-v2-priority-btn.urgent b{color:#c94242}
.note-insight{width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer}.note-insight-urgent{border-color:#ead1d1!important;background:#fff8f8!important}.note-insight-flag{color:#c94242;font-size:18px;line-height:1}.note-insight-copy{display:grid;gap:2px;flex:1;min-width:0}.note-insight-copy strong{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.note-insight-copy small{font-size:11px;opacity:.6}.note-insight-arrow{font-size:23px;opacity:.5}
.note-detail-meta{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 16px;color:#777b74;font-size:12px}.note-detail-meta span{padding:6px 9px;background:#f3f4f0;border-radius:9px}.note-detail-urgent{background:#fff0f0!important;color:#c94242!important;font-weight:700}.note-detail-text{padding:16px;border:1px solid #e2e3df;border-radius:14px;white-space:pre-wrap;line-height:1.5;font-size:15px;background:#fff}.note-detail-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:14px}
`;
document.head.append(style); bindEvents(); start();
