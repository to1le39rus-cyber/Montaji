/* Montaji AA — Quick Add v9.
   UX layer only. Existing Firebase/job/expense/note handlers remain the source of truth. */
(() => {
  const text=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
  const findButton=label=>[...document.querySelectorAll('button')].find(b=>text(b)===label);
  const icon=name=>{const p={plus:'<path d="M12 5v14M5 12h14"/>',crosshair:'<circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',layers:'<path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/>',money:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 9h.01M17 15h.01"/>',minus:'<path d="M5 12h14"/>',refresh:'<path d="M20 11a8 8 0 0 0-14.9-4L3 9"/><path d="M3 4v5h5M4 13a8 8 0 0 0 14.9 4L21 15"/><path d="M21 20v-5h-5"/>',truck:'<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',note:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.7 7.7 0 0 0 0-3l2-1.2-2-3.4-2.2.9a7.7 7.7 0 0 0-2.6-1.5L14 3h-4l-.3 2.3a7.7 7.7 0 0 0-2.6 1.5L4.9 6l-2 3.4 2 1.2a7.7 7.7 0 0 0 0 3l-2 1.2 2 3.4 2.2-.9a7.7 7.7 0 0 0 2.6 1.5L10 21h4l.3-2.3a7.7 7.7 0 0 0 2.6-1.5l2.2.9 2.2.9 2-3.4-2.1-1.2Z"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',check:'<path d="m5 12 4 4L19 6"/>'};return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name]||p.plus}</svg>`};
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

  function taskViaNote(){
    const noteBtn=findButton('＋ Заметка')||findButton('+ Заметка');
    if(!noteBtn)return;
    noteBtn.click();
    setTimeout(()=>{
      const modal=[...document.querySelectorAll('.modal.open')].find(x=>x.querySelector('#noteForm'));
      const form=modal?.querySelector('#noteForm');
      if(!modal||!form)return;
      modal.querySelector('.eyebrow')&&(modal.querySelector('.eyebrow').textContent='ЗАДАЧА');
      const heading=modal.querySelector('.sheet-head h2'); if(heading)heading.textContent='Новая задача';
      const title=modal.querySelector('#nTitle'), body=modal.querySelector('#nText');
      const titleLabel=title?.closest('label'), bodyLabel=body?.closest('label');
      if(titleLabel)titleLabel.firstChild.textContent='Название';
      if(bodyLabel)bodyLabel.firstChild.textContent='Что нужно сделать';
      if(title){title.placeholder='Например, позвонить клиенту';title.value='';}
      if(body){body.placeholder='Детали задачи (необязательно)';body.required=false;}
      const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Сохранить задачу';
      if(form.dataset.taskPrepared)return;
      form.dataset.taskPrepared='1';
      form.addEventListener('submit',()=>{
        if(title && !title.value.trim())return;
        if(title && !title.value.trim().startsWith('☐ ')) title.value='☐ '+title.value.trim();
        if(body && !body.value.trim()) body.value=title?.value.trim()||'☐ Задача';
      },true);
    },60);
  }

  function projectTasks(){
    const host=document.querySelector('#insights');
    const cards=[...document.querySelectorAll('#activeNotes .note-card')];
    const tasks=[];
    cards.forEach(card=>{
      const title=card.querySelector('.note-top b');
      const archive=card.querySelector('[data-note-archive]');
      if(!title||!archive)return;
      const raw=text(title);
      if(!raw.startsWith('☐ '))return;
      card.classList.add('note-task-hidden');
      tasks.push({id:archive.dataset.noteArchive,title:raw.replace(/^☐\s*/,'')});
    });
    if(!host)return;
    host.querySelectorAll('.task-insight').forEach(x=>x.remove());
    tasks.slice(0,5).forEach(t=>{
      const b=document.createElement('button');
      b.className='insight task-insight'; b.dataset.taskId=t.id; b.innerHTML=`<span class="task-check">${icon('check')}</span><span>${t.title}</span><span>›</span>`;
      b.onclick=()=>document.querySelector(`[data-note-archive="${CSS.escape(t.id)}"]`)?.click();
      host.appendChild(b);
    });
  }

  function showQuick(){
    let m=document.querySelector('#quickAddV4');
    if(!m){
      m=document.createElement('div');m.id='quickAddV4';m.className='modal';m.setAttribute('aria-hidden','true');
      m.innerHTML=`<div class="backdrop" data-quick-close></div><div class="sheet quick-add-v2-sheet"><div class="handle"></div><div class="quick-v2-head"><div><div class="quick-v2-kicker">ДОБАВИТЬ</div><h2>Что добавить?</h2><p class="quick-v2-subtitle">Выберите действие</p></div><button class="quick-v2-close" type="button" data-quick-close aria-label="Закрыть">${icon('close')}</button></div><div class="quick-v2-section"><div class="quick-v2-section-title">РАБОТА</div><div class="quick-v2-list"><button class="quick-v2-row" data-action="mount">${iconBox('plus','Монтаж','Новый выезд')}</button><button class="quick-v2-row" data-action="measure">${iconBox('crosshair','Замер','Новый замер')}</button><button class="quick-v2-row" data-action="claim">${iconBox('refresh','Рекламация','Обращение')}</button><button class="quick-v2-row" data-action="delivery">${iconBox('truck','Доставка','Доставка / материалы')}</button><button class="quick-v2-row" data-action="service">${iconBox('gear','Сервис','Обслуживание')}</button><button class="quick-v2-row" data-action="finish">${iconBox('layers','Отделка','Доп. работа')}</button></div></div><div class="quick-v2-section quick-v2-finance"><div class="quick-v2-section-title">ДЕНЬГИ</div><div class="quick-v2-money-grid"><button class="quick-v2-money income" data-action="income">${moneyBox('money','Доход')}</button><button class="quick-v2-money expense" data-action="expense">${moneyBox('minus','Расход')}</button></div></div><div class="quick-v2-section quick-v2-secondary"><div class="quick-v2-section-title">ЕЩЁ</div><div class="quick-v2-inline"><button data-action="note"><span>${icon('note')}</span>Заметка</button><button data-action="task"><span>${icon('check')}</span>Задача</button><button data-action="client"><span>${icon('plus')}</span>Клиент</button></div></div></div>`;
      document.body.append(m);
      m.querySelectorAll('[data-quick-close]').forEach(b=>b.onclick=()=>close(m));
      m.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
        const a=b.dataset.action;
        if(a==='task'){
          // Keep the parent action sheet open. The task form is a child modal.
          taskViaNote();
          return;
        }
        close(m);
        if(a==='income')financeIncome(contextDate());
        else if(a==='expense')findButton('− Расход')?.click();
        else if(a==='note')findButton('＋ Заметка')?.click();
        else if(a==='client')findButton('＋ Клиент')?.click();
        else if(a==='finish'||a==='service')openNativeType('Сервис');
        else openNativeType(a==='mount'?'Монтаж':a==='measure'?'Замер':a==='claim'?'Рекламация':'Доставка');
      });
    }
    m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
  }

  function iconBox(name,title,sub){return `<span class="quick-v2-icon">${icon(name)}</span><span><b>${title}</b><small>${sub}</small></span><i>›</i>`}
  function moneyBox(name,title){return `<span class="quick-v2-icon">${icon(name)}</span><b>${title}</b><i>›</i>`}
  function build(){
    const add=document.querySelector('#addBtn');if(!add)return false;
    if(!add.dataset.quickV8){add.dataset.quickV8='1';add.addEventListener('click',e=>{if(add.dataset.qaBypass==='1')return;e.preventDefault();e.stopImmediatePropagation();showQuick()},true)}
    document.querySelectorAll('button').forEach(b=>{
      const t=text(b);
      if((t==='＋ Доход'||t==='+ Доход')&&!b.dataset.quickIncomeV8){b.dataset.quickIncomeV8='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();financeIncome(contextDate())},true)}
    });
    return true;
  }
  globalThis.__montajiQuickIncome=financeIncome;
  const boot=setInterval(()=>{if(build())clearInterval(boot)},100);
  setInterval(projectTasks,500);
  setTimeout(projectTasks,250);
})();
