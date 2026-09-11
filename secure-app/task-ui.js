/* Montaji AA — Task UI v2 */
(() => {
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const close = m => { if (!m) return; m.classList.remove('open'); m.setAttribute('aria-hidden','true'); document.body.classList.toggle('modal-open', !!document.querySelector('.modal.open')); };
  const toast = (message, state='normal') => { let el=document.querySelector('#toast'); if(!el){el=document.createElement('div');el.id='toast';document.body.append(el);} el.textContent=message;el.dataset.state=state;clearTimeout(el.__timer);el.__timer=setTimeout(()=>el.remove(),3400); };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${name==='close'?'<path d="m6 6 12 12M18 6 6 18"/>':'<path d="m5 12 4 4L19 6"/>'}</svg>`;
  const findNoteButton = () => [...document.querySelectorAll('button')].find(b => { const t=text(b); return t==='＋ Заметка'||t==='+ Заметка'; });

  async function persistTask(title, details) {
    const noteBtn=findNoteButton();
    if(!noteBtn) throw new Error('Trusted note action unavailable');
    noteBtn.click();
    const started=Date.now(); let noteModal=null;
    while(!noteModal && Date.now()-started<1200){
      noteModal=[...document.querySelectorAll('.modal.open')].find(m=>m.querySelector('#noteForm'));
      if(!noteModal) await new Promise(r=>setTimeout(r,20));
    }
    if(!noteModal) throw new Error('Trusted note form unavailable');
    noteModal.style.visibility='hidden'; noteModal.style.pointerEvents='none'; noteModal.setAttribute('aria-hidden','true');
    const form=noteModal.querySelector('#noteForm'), titleField=noteModal.querySelector('#nTitle'), bodyField=noteModal.querySelector('#nText');
    if(!form||!titleField||!bodyField||typeof form.onsubmit!=='function'){noteModal.remove();throw new Error('Trusted note submit handler unavailable');}
    titleField.value=`☐ ${title}`; bodyField.value=details||title;
    titleField.dispatchEvent(new Event('input',{bubbles:true})); bodyField.dispatchEvent(new Event('input',{bubbles:true}));
    try { await form.onsubmit({preventDefault(){},currentTarget:form}); }
    finally { if(noteModal.isConnected) noteModal.remove(); }
  }

  function ensureTaskModal(){
    let modal=document.querySelector('#quickTaskModal'); if(modal)return modal;
    modal=document.createElement('div'); modal.id='quickTaskModal'; modal.className='modal quick-task-modal'; modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="backdrop" data-task-close></div><div class="sheet quick-task-sheet"><div class="handle"></div><div class="quick-task-head"><div><div class="quick-v2-kicker">ЗАДАЧА</div><h2>Новая задача</h2><p>То, что нужно сделать и не забыть.</p></div><button class="quick-v2-close" type="button" data-task-close aria-label="Закрыть">${icon('close')}</button></div><form id="quickTaskForm" class="quick-task-form"><label>Что сделать?<input name="title" type="text" required maxlength="120" autocomplete="off" placeholder="Например, позвонить клиенту"></label><label>Детали <span class="optional">(необязательно)</span><textarea name="details" rows="4" maxlength="500" placeholder="Что важно учесть…"></textarea></label><div class="quick-task-hint"><span>${icon('check')}</span><span>После сохранения задача появится в «Что важно».</span></div><button class="primary quick-task-save" type="submit">Создать задачу</button></form></div>`;
    document.body.append(modal);
    modal.querySelectorAll('[data-task-close]').forEach(b=>b.addEventListener('click',()=>close(modal)));
    modal.querySelector('#quickTaskForm').addEventListener('submit',async e=>{
      e.preventDefault(); e.stopPropagation();
      const form=e.currentTarget,save=form.querySelector('.quick-task-save'),title=form.elements.title.value.trim(),details=form.elements.details.value.trim();
      if(!title||save.disabled)return; save.disabled=true; save.textContent='Сохраняем…';
      try{await persistTask(title,details);close(modal);toast('Задача сохранена','success');}
      catch(err){console.error('[task-ui]',err);save.disabled=false;save.textContent='Создать задачу';toast('Не удалось сохранить задачу','error');}
    });
    return modal;
  }

  function openTask(){const modal=ensureTaskModal();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');const form=modal.querySelector('#quickTaskForm');form.reset();const save=form.querySelector('.quick-task-save');save.disabled=false;save.textContent='Создать задачу';requestAnimationFrame(()=>form.elements.title?.focus({preventScroll:true}));}

  // Capture phase intentionally intercepts the Quick Add task button before quick-add-runtime's onclick.
  document.addEventListener('click',e=>{const button=e.target.closest?.('[data-action="task"]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();openTask();},true);
})();
