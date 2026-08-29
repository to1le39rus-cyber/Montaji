// notes-v3.js
// Единая система заметок. Заменяет три параллельные реализации, найденные в аудите
// (встроенные notes в app.js, notes-fix.js, notes-v2.js).
// Никаких runtime string-patches — обычный ES-модуль, подключается один раз в index.html:
//   <script type="module" src="notes-v3.js"></script>
//
// Зависит от window.MontajiFirebase = { app, auth, db, fs-хелперы } — единая точка
// доступа к уже инициализированному Firebase App (без повторного initializeApp).

const COLLECTION = 'notes';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[m]));
}

function uid() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class NotesModule {
  /**
   * @param {object} ctx
   * @param {import('firebase/firestore')} ctx.fs  - firestore functions namespace
   * @param {import('firebase/firestore').Firestore} ctx.db
   * @param {{uid:string, role:string, storeId?:string}} ctx.me - текущий пользователь + роль
   * @param {(text:string, kind?:string)=>void} ctx.toast
   * @param {(payload:{title,body,jobId,noteId})=>void} [ctx.notify] - хук на FCM/локальный push
   */
  constructor({ fs, db, me, toast, notify }) {
    this.fs = fs;
    this.db = db;
    this.me = me;
    this.toast = toast;
    this.notify = notify || (() => {});
    this.unsub = null;
    this.cache = [];
  }

  col() {
    return this.fs.collection(this.db, COLLECTION);
  }

  // ---------- запись ----------

  async create({ title, text, visibility = 'private', targetUids = [], dueDate = null,
                 priority = 'normal', linkedJobId = null, linkedStoreId = null }) {
    if (!title?.trim()) throw new Error('Название обязательно');
    const ref = this.fs.doc(this.db, COLLECTION, uid());
    const note = {
      id: ref.id,
      ownerUid: this.me.uid,
      visibility,
      targetUids: visibility === 'urgent' ? targetUids : [],
      title: title.trim(),
      text: text?.trim() || '',
      dueDate,
      priority,
      linkedJobId,
      linkedStoreId,
      status: 'open',
      reassignedTo: null,
      reassignHistory: [],
      archived: false,
      createdAt: this.fs.serverTimestamp(),
      updatedAt: this.fs.serverTimestamp(),
    };
    await this.fs.setDoc(ref, note);

    if (visibility === 'urgent') {
      this.notify({
        title: 'Срочная заметка',
        body: title,
        jobId: linkedJobId,
        noteId: ref.id,
      });
    }
    this.toast('Заметка сохранена', 'success');
    return ref.id;
  }

  async update(id, patch) {
    await this.fs.updateDoc(this.fs.doc(this.db, COLLECTION, id), {
      ...patch,
      updatedAt: this.fs.serverTimestamp(),
    });
  }

  async archive(id) {
    await this.update(id, { archived: true, status: 'done' });
    this.toast('Заметка в архиве', 'success');
  }

  async restore(id) {
    await this.update(id, { archived: false, status: 'open' });
  }

  async reassign(id, toUid, comment = '') {
    const note = this.cache.find(n => n.id === id);
    const entry = { from: note?.reassignedTo || note?.ownerUid || this.me.uid, to: toUid, at: new Date().toISOString(), comment };
    await this.update(id, {
      reassignedTo: toUid,
      status: 'reassigned',
      reassignHistory: this.fs.arrayUnion ? this.fs.arrayUnion(entry) : [...(note?.reassignHistory || []), entry],
    });
    this.notify({ title: 'Вам передали задачу', body: note?.title || '', jobId: note?.linkedJobId, noteId: id });
    this.toast('Задача переадресована', 'success');
  }

  // ---------- чтение / realtime ----------

  /**
   * Правила видимости зеркалят firestore.rules.v2 — фильтрация здесь нужна только
   * для UI-удобства (сортировка/группировка), реальную защиту обеспечивают Firestore rules,
   * не этот код.
   */
  visible(note) {
    const { uid: myUid, role, storeId } = this.me;
    if (note.ownerUid === myUid) return true;
    if (role === 'manager') return true;
    if (note.visibility === 'public' && (role === 'installer' || role === 'manager')) return true;
    if (note.visibility === 'urgent') {
      if (role === 'installer' || role === 'manager') return true;
      if (role === 'store' && note.linkedStoreId === storeId) return true;
    }
    return false;
  }

  startRealtime(onChange) {
    this.unsub?.();
    this.unsub = this.fs.onSnapshot(this.col(), snap => {
      this.cache = snap.docs.map(d => d.data()).filter(n => this.visible(n));
      onChange(this.cache);
    }, err => {
      console.error('notes realtime error', err);
      this.toast('Нет связи с заметками', 'error');
    });
    return this.unsub;
  }

  stop() {
    this.unsub?.();
    this.unsub = null;
  }

  // ---------- рендер (пример, замените под свою дизайн-систему) ----------

  renderList(container, notes, { includeArchived = false } = {}) {
    if (!container) return;
    const list = notes.filter(n => includeArchived || !n.archived)
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

    if (!list.length) {
      container.innerHTML = '<div class="empty-card"><strong>Заметок нет</strong></div>';
      return;
    }

    container.innerHTML = list.map(n => {
      const overdue = n.dueDate && n.dueDate < today() && !n.archived;
      const badge = n.visibility === 'urgent' ? '⚠️ Срочно' : n.visibility === 'private' ? '🔒 Личная' : '👥 Общая';
      return `<div class="note-card ${n.archived ? 'archived' : ''}" data-note-id="${esc(n.id)}">
        <div class="note-top">
          <div>
            <span class="note-badge">${badge}</span>
            <strong>${esc(n.title)}</strong>
            ${n.dueDate ? `<div class="note-due ${overdue ? 'overdue' : ''}">${overdue ? '⚠️ Просрочено' : '📅'} ${esc(n.dueDate)}</div>` : ''}
          </div>
          <div class="note-actions">
            <button type="button" data-note-edit="${esc(n.id)}">Изм.</button>
            ${n.archived ? `<button type="button" data-note-restore="${esc(n.id)}">Вернуть</button>`
                         : `<button type="button" data-note-archive="${esc(n.id)}">Архив</button>`}
          </div>
        </div>
        ${n.text ? `<p>${esc(n.text)}</p>` : ''}
        ${n.reassignedTo ? `<div class="note-reassigned">Передано: ${esc(n.reassignedTo)}</div>` : ''}
      </div>`;
    }).join('');
  }
}
