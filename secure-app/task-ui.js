/* Montaji AA — Task UI v4. Tasks are important notes, not a second data model. */
(() => {
  const close = m => { if (!m) return; m.classList.remove('open'); m.setAttribute('aria-hidden','true'); document.body.classList.toggle('modal-open', !!document.querySelector('.modal.open')); };
  const toast = (message, state='normal') => { let el=document.querySelector('#toast'); if(!el){el=document.createElement('div');document.body.append(el);} el.textContent=message; el.dataset.state=state; clearTimeout(el.__timer); el.__timer=setTimeout(()=>el.remove(),3400); };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${name==='close'?'<path d="m6 6 12 12M18 6 6 18"/>':'<path d="m5 12 4 4L19 6"/>'}</svg>`;

  async function getFirebase() {
    const [appMod, authMod, fs] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);
    const app = appMod.getApps().find(x => x.name === 'montaji-aa-production') || appMod.getApps()[0];
    if (!app) throw new Error('FIREBASE_APP_NOT_FOUND');
    const auth = authMod.getAuth(app);
    const db = fs.getFirestore(app);
    if (!auth.currentUser) throw new Error('Нет авторизации');
    return { auth, db, fs };
  }

  async function saveTask(title, details) {
    const { auth, db, fs } = await getFirebase();
    const ref = fs.doc(db, 'appData', 'notes');
    await fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? (snap.data()?.data || {}) : {};
      const notes = Array.isArray(data.notes) ? data.notes : [];
      const item = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        title,
        text: details || title,
        urgent: true,
        done: false,
        archived: false,
        authorUid: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email || 'Пользователь',
        authorEmail: auth.currentUser.email || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      tx.set(ref, { data: { notes: [...notes, item] }, version: 2, updatedAt: fs.serverTimestamp(), updatedBy: auth.currentUser.uid }, { merge: true });
    });
  }

  async function migrateLegacyTasks() {
    try {
      const { auth, db, fs } = await getFirebase();
      const ref = fs.doc(db, 'appData', 'notes');
      await fs.runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data()?.data || {};
        const notes = Array.isArray(data.notes) ? data.notes : [];
        let changed = false;
        const next = notes.map(n => {
          if (typeof n?.title !== 'string' || !n.title.startsWith('☐ ')) return n;
          changed = true;
          return { ...n, title: n.title.replace(/^☐\s*/, ''), urgent: true, done: n.done === true, archived: n.archived === true, authorUid: n.authorUid || auth.currentUser.uid, authorName: n.authorName || auth.currentUser.displayName || auth.currentUser.email || 'Пользователь', authorEmail: n.authorEmail || auth.currentUser.email || '', updatedAt: new Date().toISOString() };
        });
        if (changed) tx.set(ref, { data: { notes: next }, version: 2, updatedAt: fs.serverTimestamp(), updatedBy: auth.currentUser.uid }, { merge: true });
      });
    } catch (err) { console.warn('[task-ui] legacy migration skipped', err); }
  }

  function ensureTaskModal(){
    let modal=document.querySelector('#quickTaskModal'); if(modal)return modal;
    modal=document.createElement('div'); modal.id='quickTaskModal'; modal.className='modal quick-task-modal'; modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="backdrop" data-task-close></div><div class="sheet quick-task-sheet"><div class="handle"></div><div class="quick-task-head"><div><div class="quick-v2-kicker">ЗАДАЧА</div><h2>Новая задача</h2><p>То, что нужно сделать и не забыть.</p></div><button class="quick-v2-close" type="button" data-task-close aria-label="Закрыть">${icon('close')}</button></div><form id="quickTaskForm" class="quick-task-form"><label>Что сделать?<input name="title" type="text" required maxlength="120" autocomplete="off" placeholder="Например, позвонить клиенту"></label><label>Детали <span class="optional">(необязательно)</span><textarea name="details" rows="4" maxlength="500" placeholder="Что важно учесть…"></textarea></label><div class="quick-task-hint"><span>${icon('check')}</span><span>Задача сохранится как важная заметка и появится в «Что важно».</span></div><button class="primary quick-task-save" type="submit">Создать задачу</button></form></div>`;
    document.body.append(modal);
    modal.querySelectorAll('[data-task-close]').forEach(b=>b.addEventListener('click',()=>close(modal)));
    modal.querySelector('#quickTaskForm').addEventListener('submit',async e=>{
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const form=e.currentTarget,save=form.querySelector('.quick-task-save'),title=form.elements.title.value.trim(),details=form.elements.details.value.trim();
      if(!title||save.disabled)return;
      save.disabled=true; save.textContent='Сохраняем…';
      try { await saveTask(title,details); close(modal); toast('Задача сохранена','success'); }
      catch(err) { console.error('[task-ui]',err); save.disabled=false; save.textContent='Создать задачу'; toast('Не удалось сохранить задачу','error'); }
    });
    return modal;
  }
  function openTask(){const modal=ensureTaskModal();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');const form=modal.querySelector('#quickTaskForm');form.reset();const save=form.querySelector('.quick-task-save');save.disabled=false;save.textContent='Создать задачу';requestAnimationFrame(()=>form.elements.title?.focus({preventScroll:true}));}
  document.addEventListener('click',e=>{const button=e.target.closest?.('[data-action="task"]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();openTask();},true);
  const start=()=>{setTimeout(migrateLegacyTasks,1200);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();