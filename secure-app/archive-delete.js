/* Montaji AA — permanently delete archived notes from the existing notes document. */
(() => {
  const VERSION = '2026-09-11.3';
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const toast = (message, state='normal') => {
    let el = document.querySelector('#toast');
    if (!el) { el = document.createElement('div'); document.body.append(el); }
    el.textContent = message;
    el.dataset.state = state;
    clearTimeout(el.__timer);
    el.__timer = setTimeout(() => el.remove(), 3000);
  };
  const getFirebase = async () => {
    const [appMod, authMod, fs] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);
    const app = appMod.getApps().find(x => x.name === 'montaji-aa-production') || appMod.getApps()[0];
    if (!app) throw new Error('FIREBASE_APP_NOT_FOUND');
    const auth = authMod.getAuth(app);
    if (!auth.currentUser) throw new Error('Нет авторизации');
    return { auth, db: fs.getFirestore(app), fs };
  };
  const findNoteId = button => {
    const card = button.closest('.note-card, [data-note-id]');
    return button.dataset.noteDelete || card?.dataset.noteId || card?.querySelector('[data-note-restore-v2]')?.dataset.noteRestoreV2 || '';
  };
  const permanentlyDelete = async (id, card) => {
    const { auth, db, fs } = await getFirebase();
    const ref = fs.doc(db, 'appData', 'notes');
    await fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('NOTES_DOC_NOT_FOUND');
      const data = snap.data()?.data || {};
      const notes = Array.isArray(data.notes) ? data.notes : [];
      const target = notes.find(n => n?.id === id);
      if (!target) throw new Error('NOTE_NOT_FOUND');
      if (!target.archived && !target.done) throw new Error('NOTE_NOT_ARCHIVED');
      const next = notes.filter(n => n?.id !== id);
      tx.set(ref, { data: { notes: next }, version: 2, updatedAt: fs.serverTimestamp(), updatedBy: auth.currentUser.uid }, { merge: true });
    });
    card?.remove();
  };
  const enhance = root => {
    (root || document).querySelectorAll?.('[data-note-restore-v2]').forEach(restoreButton => {
      if (restoreButton.dataset.deleteReady === '1') return;
      if (text(restoreButton) !== 'Вернуть') return;
      const card = restoreButton.closest('.note-card, [data-note-id]') || restoreButton.parentElement;
      if (!card || card.querySelector('.note-archive-delete')) return;
      const actions = restoreButton.closest('.note-v2-actions') || restoreButton.parentElement;
      if (!actions) return;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'mini-btn note-archive-delete';
      del.textContent = 'Удалить';
      del.setAttribute('aria-label', 'Удалить заметку навсегда');
      del.dataset.noteDelete = restoreButton.dataset.noteRestoreV2 || '';
      del.dataset.archiveDeleteVersion = VERSION;
      del.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        const id = findNoteId(del);
        if (!id) { toast('Не удалось определить заметку','error'); return; }
        if (!window.confirm('Удалить эту заметку навсегда?\nВосстановить её будет нельзя.')) return;
        del.disabled = true;
        del.textContent = '…';
        try {
          await permanentlyDelete(id, card);
          toast('Заметка удалена','success');
        } catch (err) {
          console.error('[archive-delete]', err);
          del.disabled = false;
          del.textContent = 'Удалить';
          toast('Не удалось удалить заметку','error');
        }
      });
      actions.appendChild(del);
      restoreButton.dataset.deleteReady = '1';
    });
  };
  const boot = () => {
    enhance(document);
    document.addEventListener('click', e => {
      const b = e.target.closest?.('[data-note-restore-v2]');
      if (b) setTimeout(() => enhance(document), 50);
    }, true);
    setInterval(() => enhance(document), 700);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();