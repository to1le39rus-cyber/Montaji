/* Montaji AA — Quick Add launcher. Keeps existing action handlers, replaces only presentation. */
(()=>{
  const ICONS={
    'Монтаж':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.8-10.8a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/><path d="M4 20h5"/></svg>',
    'Замер':'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><path d="M12 2v20M2 12h20"/></svg>',
    'Рекламация':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0 1 4"/><path d="M20 4v7h-7"/></svg>',
    'Доставка':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    'Расход':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
    'Заметка':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6L12 3Z"/></svg>'
  };
  const ORDER=['Монтаж','Замер','Рекламация','Доставка','Расход','Заметка'];
  const PRIMARY=new Set(['Монтаж','Замер']);
  let legacyAdd=null;
  let armed=false;

  function enhance(){
    const add=document.getElementById('addBtn');
    if(!add || armed) return false;
    const original=add.onclick;
    if(typeof original!=='function') return false;
    legacyAdd=original;
    add.onclick=(e)=>{
      legacyAdd.call(add,e);
      requestAnimationFrame(()=>upgradeLatest());
    };
    armed=true;
    return true;
  }

  function upgradeLatest(){
    const modal=[...document.querySelectorAll('.modal.open')].find(m=>m.querySelector('.add-grid'));
    if(!modal) return;
    const sheet=modal.querySelector('.sheet');
    const grid=modal.querySelector('.add-grid');
    if(!sheet || !grid || modal.dataset.quickUpgraded==='1') return;

    const handlers={};
    grid.querySelectorAll('[data-add-type]').forEach(btn=>{
      handlers[btn.dataset.addType]=btn.onclick;
    });
    const backdrop=modal.querySelector('.backdrop');
    const close=sheet.querySelector('[data-close]');
    const closeHandler=close?.onclick;

    modal.dataset.quickUpgraded='1';
    modal.classList.add('quick-add-launcher');
    sheet.innerHTML=`
      <div class="qa-handle" aria-hidden="true"></div>
      <div class="qa-head">
        <div>
          <div class="qa-kicker">Добавить</div>
          <h2>Что добавить?</h2>
        </div>
        <button class="qa-close" type="button" aria-label="Закрыть">×</button>
      </div>
      <div class="qa-primary" role="group" aria-label="Основные действия"></div>
      <div class="qa-secondary" role="group" aria-label="Дополнительные действия"></div>`;

    const primary=sheet.querySelector('.qa-primary');
    const secondary=sheet.querySelector('.qa-secondary');
    ORDER.forEach(type=>{
      const b=document.createElement('button');
      b.type='button';
      b.className=PRIMARY.has(type)?'qa-action qa-action-primary':'qa-action qa-action-secondary';
      b.dataset.addType=type;
      b.setAttribute('aria-label',type);
      b.innerHTML=`<span class="qa-icon">${ICONS[type]}</span><span class="qa-label">${type}</span>${PRIMARY.has(type)?'<span class="qa-arrow" aria-hidden="true">›</span>':''}`;
      b.onclick=(e)=>{
        const fn=handlers[type];
        if(typeof fn==='function') fn.call(b,e);
      };
      (PRIMARY.has(type)?primary:secondary).appendChild(b);
    });

    sheet.querySelector('.qa-close').onclick=()=>{
      if(typeof closeHandler==='function') closeHandler(); else modal.remove();
    };
    if(backdrop){
      /* Preserve the existing backdrop listener; no new document-level listener is added. */
    }
  }

  const timer=setInterval(()=>{ if(enhance()) clearInterval(timer); },80);
  setTimeout(()=>clearInterval(timer),15000);
})();
