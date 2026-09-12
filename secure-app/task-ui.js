/* Montaji AA — Task UI v5. Tasks are important notes, not a second data model. */
(() => {
  const close = m => { if (!m) return; m.classList.remove('open'); m.setAttribute('aria-hidden','true'); document.body.classList.toggle('modal-open', !!document.querySelector('.modal.open')); };
  const toast = (message, state='normal') => { let el=document.querySelector('#toast'); if(!el){el=document.createElement('div');document.body.append(el);} el.textContent=message; el.dataset.state=state; clearTimeout(el.__timer); el.__timer=setTimeout(()=>el.remove(),3400); };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${name==='close'?'<path d="m6 6 12 12M18 6 6 18"/>':name==='bell'?'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>':name==='calendar'?'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 9h18"/>':'<path d="m5 12 4 4L19 6"/>'}</svg>`;

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

  const localDateTime = value => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  async function saveTask(payload) {
    const { auth, db, fs } = await getFirebase();
    const ref = fs.doc(db, 'appData', 'notes');
    await fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? (snap.data()?.data || {}) : {};
      const notes = Array.isArray(data.notes) ? data.notes : [];
      const now = new Date().toISOString();
      const item = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        title: payload.title,
        text: payload.details || payload.title,
        kind: 'task',
        priority: payload.priority,
        urgent: payload.priority === 'urgent',
        done: false,
        archived: false,
        dueAt: localDateTime(payload.dueAt),
        repeat: payload.repeat || 'none',
        reminderEnabled: !!payload.reminderEnabled,
        reminderAt: payload.reminderEnabled ? localDateTime(payload.dueAt) : null,
        reminderStatus: payload.reminderEnabled && payload.dueAt ? 'pending_push' : 'none',
        authorUid: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email || 'Пользователь',
        authorEmail: auth.currentUser.email || '',
        createdAt: now,
        updatedAt: now
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
          return { ...n, title: n.title.replace(/^☐\s*/, ''), kind: 'task', priority: 'urgent', urgent: true, done: n.done === true, archived: n.archived === true, authorUid: n.authorUid || auth.currentUser.uid, authorName: n.authorName || auth.currentUser.displayName || auth.currentUser.email || 'Пользователь', authorEmail: n.authorEmail || auth.currentUser.email || '', updatedAt: new Date().toISOString() };
        });
        if (changed) tx.set(ref, { data: { notes: next }, version: 2, updatedAt: fs.serverTimestamp(), updatedBy: auth.currentUser.uid }, { merge: true });
      });
    } catch (err) { console.warn('[task-ui] legacy migration skipped', err); }
  }

  function ensureTaskModal(){
    let modal=document.querySelector('#quickTaskModal'); if(modal)return modal;
    modal=document.createElement('div'); modal.id='quickTaskModal'; modal.className='modal quick-task-modal'; modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="backdrop" data-task-close></div><div class="sheet quick-task-sheet"><div class="handle"></div><div class="quick-task-head"><div><div class="quick-v2-kicker">ЗАДАЧА</div><h2>Новая задача</h2><p>То, что нужно сделать и не забыть.</p></div><button class="quick-v2-close" type="button" data-task-close aria-label="Закрыть">${icon('close')}</button></div><form id="quickTaskForm" class="quick-task-form"><label><span class="quick-task-label-title">Что сделать?</span><input name="title" type="text" required maxlength="120" autocomplete="off" placeholder="Например, позвонить клиенту"></label><label><span class="quick-task-label-title">Детали <span class="optional">(необязательно)</span></span><textarea name="details" rows="4" maxlength="500" placeholder="Что важно учесть…"></textarea><span class="quick-task-count">0/500</span></label><div class="quick-task-grid"><label><span>Дата и время</span><div class="quick-task-field"><span class="quick-task-field-icon">${icon('calendar')}</span><input name="dueAt" type="datetime-local"></div></label><label><span>Приоритет</span><div class="quick-task-segment" role="group" aria-label="Приоритет"><button type="button" data-priority="normal" class="active">Обычный</button><button type="button" data-priority="urgent">Срочный</button></div></label></div><label><span>Повторять</span><select name="repeat"><option value="none">Не повторять</option><option value="daily">Каждый день</option><option value="weekly">Каждую неделю</option><option value="monthly">Каждый месяц</option></select></label><div class="quick-task-reminder"><div class="quick-task-reminder-icon">${icon('bell')}</div><div class="quick-task-reminder-copy"><b>Напоминание</b><span>Получить уведомление в нужное время</span></div><label class="quick-task-switch"><input name="reminder" type="checkbox" aria-label="Включить напоминание"><span></span></label></div><div class="quick-task-reminder-note" hidden>🔔 Напоминание будет подготовлено для push-уведомления.</div><div class="quick-task-hint"><span>${icon('check')}</span><span>Срочная задача появится в «Что важно». Обычная останется среди заметок.</span></div><button class="primary quick-task-save" type="submit">Создать задачу</button></form></div>`;
    document.body.append(modal);
    modal.querySelectorAll('[data-task-close]').forEach(b=>b.addEventListener('click',()=>close(modal)));
    const form=modal.querySelector('#quickTaskForm');
    form.querySelectorAll('[data-priority]').forEach(b=>b.addEventListener('click',()=>{form.querySelectorAll('[data-priority]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
    const details=form.elements.details,count=form.querySelector('.quick-task-count');
    details.addEventListener('input',()=>{count.textContent=`${details.value.length}/500`;});
    const reminder=form.elements.reminder, reminderNote=form.querySelector('.quick-task-reminder-note');
    reminder.addEventListener('change',()=>{reminderNote.hidden=!reminder.checked;});
    form.addEventListener('submit',async e=>{
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const save=form.querySelector('.quick-task-save'), title=form.elements.title.value.trim(), detailsValue=details.value.trim();
      if(!title||save.disabled)return;
      const priority=form.querySelector('[data-priority].active')?.dataset.priority||'normal';
      const dueAt=form.elements.dueAt.value||'';
      if(reminder.checked&&!dueAt){toast('Для напоминания выберите дату и время','error');form.elements.dueAt.focus();return;}
      save.disabled=true; save.textContent='Сохраняем…';
      try { await saveTask({title,details:detailsValue,priority,dueAt,repeat:form.elements.repeat.value,reminderEnabled:reminder.checked}); close(modal); toast(reminder.checked?'Задача сохранена · напоминание подготовлено':'Задача сохранена','success'); }
      catch(err) { console.error('[task-ui]',err); save.disabled=false; save.textContent='Создать задачу'; toast('Не удалось сохранить задачу','error'); }
    });
    return modal;
  }
  function openTask(){const modal=ensureTaskModal();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');const form=modal.querySelector('#quickTaskForm');form.reset();form.querySelectorAll('[data-priority]').forEach(x=>x.classList.toggle('active',x.dataset.priority==='normal'));form.querySelector('.quick-task-count').textContent='0/500';form.querySelector('.quick-task-reminder-note').hidden=true;const save=form.querySelector('.quick-task-save');save.disabled=false;save.textContent='Создать задачу';requestAnimationFrame(()=>form.elements.title?.focus({preventScroll:true}));}
  document.addEventListener('click',e=>{const button=e.target.closest?.('[data-action="task"]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();openTask();},true);
  const start=()=>{setTimeout(migrateLegacyTasks,1200);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
