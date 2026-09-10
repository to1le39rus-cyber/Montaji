/* Montaji AA — Quick Add v7.
   UX layer only. Existing Firebase/job/expense handlers remain the source of truth. */
(() => {
  const text=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
  const findButton=label=>[...document.querySelectorAll('button')].find(b=>text(b)===label);
  const icon=name=>{const p={plus:'<path d="M12 5v14M5 12h14"/>',crosshair:'<circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',layers:'<path d="m4 8 8-4 8 4-8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 16 8 4 8-4"/>',money:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 9h.01M17 15h.01"/>',minus:'<path d="M5 12h14"/>',refresh:'<path d="M20 11a8 8 0 0 0-14.9-4L3 9"/><path d="M3 4v5h5M4 13a8 8 0 0 0 14.9 4L21 15"/><path d="M21 20v-5h-5"/>',truck:'<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',note:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.7 7.7 0 0 0 0-3l2-1.2-2-3.4-2.2.9a7.7 7.7 0 0 0-2.6-1.5L14 3h-4l-.3 2.3a7.7 7.7 0 0 0-2.6 1.5L4.9 6l-2 3.4 2 1.2a7.7 7.7 0 0 0 0 3l-2 1.2 2 3.4 2.2-.9a7.7 7.7 0 0 0 2.6 1.5L10 21h4l.3-2.3a7.7 7.7 0 0 0 2.6-1.5l2.2.9 2-3.4-2.1-1.2Z"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name]||p.plus}</svg>`};
  const close=m=>{m?.classList.remove('open');m?.setAttribute('aria-hidden','true');document.body.classList.toggle('modal-open',!!document.querySelector('.modal.open'))};
  const openNativeType=type=>{const add=document.querySelector('#addBtn');if(!add)return;add.dataset.qaBypass='1';add.click();setTimeout(()=>{const b=[...document.querySelectorAll('.modal.open [data-add-type]')].find(x=>x.dataset.addType===type);if(b)b.click();delete add.dataset.qaBypass},100)};
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const contextDate=()=>{
    const sheet=document.querySelector('.day-sheet-final');
    const h=text(sheet?.querySelector('.sheet-head h2'));
    if(!h)return today();
    const months={января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
    const m=h.match(/(\d{1,2})\s+([а-яё]+)/i);
    if(!m||months[m[2].toLowerCase()]===undefined)return today();
    const y=new Date().getFullYear(),d=new Date(y,months[m[2].toLowerCase()],Number(m[1]));
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const setField=(root,id,v)=>{const el=root.querySelector(id);if(el){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}};

  function financeIncome(date=today()){
    let m=document.querySelector('#quickIncomeModal');
    if(!m){
      m=document.createElement('div');m.id='quickIncomeModal';m.className='modal quick-finance-modal';m.setAttribute('aria-hidden','true');
      m.innerHTML=`<div class="backdrop" data-fin-close></div><div class="sheet quick-finance-sheet"><div class="handle"></div><div class="quick-finance-head"><div><div class="quick-v2-kicker">ДЕНЬГИ</div><h2>Новый доход</h2><p>Дата, сумма и комментарий — без выезда.</p></div><button class="quick-v2-close" type="button" data-fin-close aria-label="Закрыть">${icon('close')}</button></div><form id="quickIncomeForm"><label>Дата<input name="date" type="date" required></label><label>Сумма<input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required placeholder="15 000"></label><label>Источник<select name="store"><option value="">Выберите источник</option><option>ASTERA / LAVETRA DOORS</option><option>Другой источник</option></select></label><label>За что<input name="purpose" placeholder="Доплата, услуга, премия…"></label><label class="quick-finance-check"><input name="paid" type="checkbox" checked> <span>Оплачено</span></label><label>Комментарий <span class="optional">(необязательно)</span><textarea name="comment" rows="3" placeholder="Комментарий…"></textarea></label><button class="primary quick-finance-save" type="submit">Сохранить доход</button></form></div>`;
      document.body.append(m);
      m.querySelectorAll('[data-fin-close]').forEach(b=>b.onclick=()=>close(m));
      m.querySelector('#quickIncomeForm').onsubmit=e=>{
        e.preventDefault();
        const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries());
        const existing=document.querySelector('#jobModal');
        if(!existing)return;
        close(m);existing.classList.add('finance-income-bridge');existing.style.visibility='hidden';existing.classList.add('open');existing.setAttribute('aria-hidden','false');
        setField(existing,'#jobDate',d.date);setField(existing,'#jobClient',d.purpose||'Доход');setField(existing,'#jobPrice',d.amount);setField(existing,'#jobStore',d.store||'');setField(existing,'#jobStatus','Выполнен');setField(existing,'#jobCompletedDate',d.date);setField(existing,'#jobPaid',f.querySelector('[name=paid]').checked?'yes':'no');setField(existing,'#jobComment',d.comment||'');
        existing.querySelector('#typeTabs [data-type="Доп. доход"]')?.click();
        setTimeout(()=>{existing.querySelector('#jobForm button[type="submit"]')?.click();setTimeout(()=>{existing.classList.remove('finance-income-bridge');existing.style.visibility=''},450)},120);
      };
    }
    m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');m.querySelector('[name=date]').value=date;
    requestAnimationFrame(()=>m.querySelector('[name=amount]')?.focus({preventScroll:true}));
  }

  function showQuick(){
    let m=document.querySelector('#quickAddV4');
    if(!m){
      m=document.createElement('div');m.id='quickAddV4';m.className='modal';m.setAttribute('aria-hidden','true');
      m.innerHTML=`<div class="backdrop" data-quick-close></div><div class="sheet quick-add-v2-sheet"><div class="handle"></div><div class="quick-v2-head"><div><div class="quick-v2-kicker">ДОБАВИТЬ</div><h2>Что добавить?</h2><p class="quick-v2-subtitle">Выберите действие</p></div><button class="quick-v2-close" type="button" data-quick-close aria-label="Закрыть">${icon('close')}</button></div><div class="quick-v2-section"><div class="quick-v2-section-title">РАБОТА</div><div class="quick-v2-list"><button class="quick-v2-row" data-action="mount"><span class="quick-v2-icon">${icon('plus')}</span><span><b>Монтаж</b><small>Новый выезд</small></span><i>›</i></button><button class="quick-v2-row" data-action="measure"><span class="quick-v2-icon">${icon('crosshair')}</span><span><b>Замер</b><small>Новый замер</small></span><i>›</i></button><button class="quick-v2-row" data-action="claim"><span class="quick-v2-icon">${icon('refresh')}</span><span><b>Рекламация</b><small>Обращение</small></span><i>›</i></button><button class="quick-v2-row" data-action="delivery"><span class="quick-v2-icon">${icon('truck')}</span><span><b>Доставка</b><small>Доставка / материалы</small></span><i>›</i></button><button class="quick-v2-row" data-action="service"><span class="quick-v2-icon">${icon('gear')}</span><span><b>Сервис</b><small>Обслуживание</small></span><i>›</i></button><button class="quick-v2-row" data-action="finish"><span class="quick-v2-icon">${icon('layers')}</span><span><b>Отделка</b><small>Доп. работа</small></span><i>›</i></button></div></div><div class="quick-v2-section quick-v2-finance"><div class="quick-v2-section-title">ДЕНЬГИ</div><div class="quick-v2-money-grid"><button class="quick-v2-money income" data-action="income"><span class="quick-v2-icon">${icon('money')}</span><b>Доход</b><i>›</i></button><button class="quick-v2-money expense" data-action="expense"><span class="quick-v2-icon">${icon('minus')}</span><b>Расход</b><i>›</i></button></div></div><div class="quick-v2-section quick-v2-secondary"><div class="quick-v2-section-title">ЕЩЁ</div><div class="quick-v2-inline"><button data-action="note"><span>${icon('note')}</span>Заметка</button><button data-action="task"><span>${icon('note')}</span>Задача</button><button data-action="client"><span>${icon('plus')}</span>Клиент</button></div></div></div>`;
      document.body.append(m);
      m.querySelectorAll('[data-quick-close]').forEach(b=>b.onclick=()=>close(m));
      m.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
        const a=b.dataset.action;close(m);
        if(a==='income')financeIncome(contextDate());
        else if(a==='expense')findButton('− Расход')?.click();
        else if(a==='note')findButton('＋ Заметка')?.click();
        else if(a==='task')findButton('＋ Задача')?.click();
        else if(a==='client')findButton('＋ Клиент')?.click();
        else if(a==='finish'||a==='service')openNativeType('Сервис');
        else openNativeType(a==='mount'?'Монтаж':a==='measure'?'Замер':a==='claim'?'Рекламация':'Доставка');
      });
    }
    m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
  }

  function build(){
    const add=document.querySelector('#addBtn');if(!add)return false;
    if(!add.dataset.quickV7){add.dataset.quickV7='1';add.addEventListener('click',e=>{if(add.dataset.qaBypass==='1')return;e.preventDefault();e.stopImmediatePropagation();showQuick()},true)}
    document.querySelectorAll('button').forEach(b=>{
      const t=text(b);
      if((t==='＋ Доход'||t==='+ Доход')&&!b.dataset.quickIncomeV7){b.dataset.quickIncomeV7='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();financeIncome(contextDate())},true)}
    });
    return true;
  }
  globalThis.__montajiQuickIncome=financeIncome;
  const boot=setInterval(()=>{if(build())clearInterval(boot)},100);
})();
