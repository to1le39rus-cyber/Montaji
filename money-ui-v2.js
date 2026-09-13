(() => {
  const MAX_VISIBLE = 15;
  const PERIODS = [['all','Все'],['week','Неделя'],['month','Месяц']];
  const CATEGORIES = ['Материалы','Топливо','Парковка','Обед','Инструмент','Аренда','Доставка','Связь','Прочее'];
  const LEGACY = {'пена':'Материалы','бауцнтр':'Материалы','бауцентр':'Материалы','випласт':'Материалы'};
  const state = {category:'Все', period:'all', showAll:false};
  let observer;
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const parseDate=t=>{const m=String(t||'').match(/(\d{2})\.(\d{2})\.(\d{4})/);return m?new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`):null};
  const periodStart=p=>{const n=new Date();if(p==='month')return new Date(n.getFullYear(),n.getMonth(),1);if(p==='week'){const d=new Date(n),m=(n.getDay()+6)%7;d.setHours(12,0,0,0);d.setDate(n.getDate()-m);return d}return null};
  const rows=()=>{const b=document.querySelector('#expenseArchive');return b?[...b.querySelectorAll('.expense-row')]:[]};
  const rawCategory=r=>r.querySelector('b')?.textContent?.trim()||'Прочее';
  const category=r=>{const x=rawCategory(r),k=x.toLowerCase().replace(/ё/g,'е').trim();return LEGACY[k]||CATEGORIES.includes(x)?x:'Прочее'};
  const date=r=>parseDate(r.querySelector('small')?.textContent||r.textContent);
  const matches=r=>{if(state.category!=='Все'&&category(r)!==state.category)return false;if(state.period!=='all'){const d=date(r),s=periodStart(state.period);if(!d||!s||d<s||d>new Date())return false}return true};

  function normalizeExpenseSelects(){
    document.querySelectorAll('select').forEach(sel=>{
      const labels=[...sel.options].map(o=>o.textContent.trim());
      const looksExpense=labels.some(x=>/Аренда|Материалы|Топливо|Другое|Прочее|Расход|Обед|Парковка|Инструмент|Доставка|Связь/i.test(x));
      if(!looksExpense)return;
      const current=sel.value||sel.options[sel.selectedIndex]?.textContent||'';
      const mapped=LEGACY[current.toLowerCase().replace(/ё/g,'е').trim()]||current;
      const frag=document.createDocumentFragment();
      CATEGORIES.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;frag.append(o)});
      sel.replaceChildren(frag);
      if(CATEGORIES.includes(mapped))sel.value=mapped;else sel.value='Прочее';
    });
  }

  function makeUI(box){
    if(!box||box.previousElementSibling?.classList.contains('money-ui'))return;
    const w=document.createElement('div');w.className='money-ui';
    w.innerHTML=`<div class="money-ui-toolbar"><div class="money-ui-periods">${PERIODS.map(([v,l])=>`<button type="button" data-money-period="${v}" class="${v==='all'?'selected':''}">${l}</button>`).join('')}</div><button type="button" class="money-ui-reset" hidden>Сбросить</button></div><div class="money-ui-cats"></div><div class="money-ui-summary"></div><button type="button" class="money-ui-more" hidden></button>`;
    box.parentNode.insertBefore(w,box);
    w.addEventListener('click',e=>{
      const p=e.target.closest('[data-money-period]');
      if(p){state.period=p.dataset.moneyPeriod;state.showAll=false;apply();return}
      const c=e.target.closest('[data-money-category]');
      if(c){state.category=c.dataset.moneyCategory;state.showAll=false;apply();return}
      if(e.target.closest('.money-ui-more')){state.showAll=!state.showAll;apply();return}
      if(e.target.closest('.money-ui-reset')){state.category='Все';state.period='all';state.showAll=false;apply()}
    });
  }

  function renderCategories(w,rs){
    const used=new Set(rs.map(category));
    const cats=['Все',...CATEGORIES.filter(c=>used.has(c)||c==='Материалы'||c==='Топливо')];
    w.querySelector('.money-ui-cats').innerHTML=cats.map(c=>`<button type="button" data-money-category="${esc(c)}" class="${state.category===c?'selected':''}">${esc(c)}</button>`).join('');
  }

  function apply(){
    const b=document.querySelector('#expenseArchive'),w=document.querySelector('.money-ui');
    if(!b||!w)return;
    observer?.disconnect();
    try{
      const rs=rows(),f=rs.filter(matches),v=state.showAll?f:f.slice(0,MAX_VISIBLE);
      renderCategories(w,rs);
      rs.forEach(r=>r.style.display='none');
      v.forEach(r=>r.style.display='');
      const total=f.reduce((s,r)=>s+(Number(((r.querySelector('strong')?.textContent||'').match(/[\d\s]+/)||['0'])[0].replace(/\s/g,''))||0),0);
      const pl=PERIODS.find(x=>x[0]===state.period)?.[1]||'Все';
      w.querySelector('.money-ui-summary').textContent=`${state.category==='Все'?'Все категории':state.category} · ${pl} · ${f.length} ${f.length===1?'расход':f.length<5?'расхода':'расходов'}${f.length?' · '+new Intl.NumberFormat('ru-RU').format(total)+' ₽':''}`;
      const more=w.querySelector('.money-ui-more');
      more.hidden=f.length<=MAX_VISIBLE;
      more.textContent=state.showAll?'Скрыть лишнее':`Показать все · ${f.length}`;
      w.querySelector('.money-ui-reset').hidden=state.category==='Все'&&state.period==='all';
    }finally{observer?.observe(document.body,{childList:true,subtree:true})}
  }

  function init(){normalizeExpenseSelects();const b=document.querySelector('#expenseArchive');if(b)makeUI(b);apply()}
  const style=document.createElement('style');
  style.textContent=`
    .money-ui{margin:0!important;padding:0 0 4px!important;border:0!important}
    .money-ui-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 6px!important}
    .money-ui-periods,.money-ui-cats{display:flex;gap:5px;overflow-x:auto;padding:1px 0 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
    .money-ui-periods::-webkit-scrollbar,.money-ui-cats::-webkit-scrollbar{display:none}
    .money-ui-periods button,.money-ui-cats button{flex:0 0 auto;border:1px solid #dedfd8;background:#fff;color:#30362f;border-radius:999px;padding:6px 9px;font-size:8px;font-weight:760;white-space:nowrap}
    .money-ui-periods button.selected,.money-ui-cats button.selected{background:#59664e;color:#fff;border-color:#59664e}
    .money-ui-cats{padding-bottom:6px}
    .money-ui-reset{flex:0 0 auto;border:0;background:#edf1e9;color:#59664e;border-radius:999px;padding:6px 8px;font-size:8px;font-weight:760}
    .money-ui-summary{font-size:8px;color:#858b83;padding:0 0 7px}
    .money-ui-more{width:100%;border:1px solid #d8dfd3;background:#edf1e9;color:#4e5b46;border-radius:11px;padding:9px;font-size:9px;font-weight:760;margin:0 0 8px}
  `;
  document.head.appendChild(style);
  observer=new MutationObserver(m=>{if(m.every(x=>x.target.closest?.('.money-ui')))return;normalizeExpenseSelects();const b=document.querySelector('#expenseArchive');if(b){makeUI(b);apply()}});
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();