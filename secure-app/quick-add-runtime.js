/* Montaji AA — Quick Add v2: product architecture, not a decorative grid. */
(() => {
  const wait = (fn, tries = 80) => { if (fn()) return; if (tries > 0) setTimeout(() => wait(fn, tries - 1), 100); };
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const findButton = label => [...document.querySelectorAll('button')].find(b => text(b) === label);
  const icon = name => {
    const paths = {
      plus:'<path d="M12 5v14M5 12h14"/>', crosshair:'<circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
      layers:'<path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 16 8 4 8-4"/>', money:'<path d="M4 7h16v10H4z"/><path d="M8 12h.01M16 12h.01"/><path d="M12 9v6"/>',
      minus:'<path d="M5 12h14"/>', refresh:'<path d="M20 11a8 8 0 0 0-14.9-4L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.9 4L21 15"/><path d="M21 20v-5h-5"/>',
      truck:'<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>', note:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>'
    }; return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.plus}</svg>`;
  };
  const openExisting = btn => { if (typeof btn?.click === 'function') btn.click(); };
  const openService = () => { openExisting(findButton('Монтаж')); setTimeout(() => document.querySelector('#jobModal [data-type="Сервис"]')?.click(), 60); };
  const closeQuick = modal => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.classList.toggle('modal-open', !!document.querySelector('.modal.open')); };
  function build(){
    const modal = document.querySelector('.modal:has(.add-grid)'); if(!modal) return false;
    const addButton=document.querySelector('#addBtn');
    if(addButton && !addButton.dataset.quickV2){ addButton.dataset.quickV2='1'; addButton.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');},true); }
    if(modal.dataset.quickV2==='1') return true; modal.dataset.quickV2='1';
    const original=[...modal.querySelectorAll('[data-add-type]')], byType=type=>original.find(b=>b.dataset.addType===type);
    modal.innerHTML=`<div class="backdrop" data-quick-close></div><div class="sheet quick-add-v2-sheet"><div class="handle"></div><div class="quick-v2-head"><div><div class="quick-v2-kicker">ДОБАВИТЬ</div><h2>Что добавить?</h2></div><button class="quick-v2-close" type="button" aria-label="Закрыть">${icon('close')}</button></div><div class="quick-v2-section"><div class="quick-v2-section-title">РАБОТА</div><div class="quick-v2-list"><button class="quick-v2-row primary" data-action="mount"><span class="quick-v2-icon">${icon('plus')}</span><span><b>Монтаж</b><small>Новый выезд</small></span><i>›</i></button><button class="quick-v2-row primary" data-action="measure"><span class="quick-v2-icon">${icon('crosshair')}</span><span><b>Замер</b><small>Новый замер</small></span><i>›</i></button><button class="quick-v2-row" data-action="service"><span class="quick-v2-icon">${icon('layers')}</span><span><b>Отделка / доп. работа</b><small>Добавить к работе</small></span><i>›</i></button></div></div><div class="quick-v2-section quick-v2-finance"><div class="quick-v2-section-title">ДЕНЬГИ</div><div class="quick-v2-money-grid"><button class="quick-v2-money income" data-action="income"><span class="quick-v2-icon">${icon('money')}</span><b>Доход</b><i>›</i></button><button class="quick-v2-money expense" data-action="expense"><span class="quick-v2-icon">${icon('minus')}</span><b>Расход</b><i>›</i></button></div></div><div class="quick-v2-section quick-v2-secondary"><div class="quick-v2-section-title">СЕРВИС</div><div class="quick-v2-inline"><button data-action="claim"><span>${icon('refresh')}</span>Рекламация</button><button data-action="delivery"><span>${icon('truck')}</span>Доставка</button><button data-action="note"><span>${icon('note')}</span>Заметка</button></div></div></div>`;
    const run=action=>{ closeQuick(modal); if(action==='mount')openExisting(byType('Монтаж')); if(action==='measure')openExisting(byType('Замер')); if(action==='claim')openExisting(byType('Рекламация')); if(action==='delivery')openExisting(byType('Доставка')); if(action==='service')openService(); if(action==='income')findButton('＋ Доход')?.click(); if(action==='expense')findButton('− Расход')?.click(); if(action==='note')findButton('＋ Заметка')?.click(); };
    modal.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>run(btn.dataset.action))); modal.querySelector('[data-quick-close]')?.addEventListener('click',()=>closeQuick(modal)); modal.querySelector('.quick-v2-close')?.addEventListener('click',()=>closeQuick(modal)); return true;
  }
  wait(build);
})();
