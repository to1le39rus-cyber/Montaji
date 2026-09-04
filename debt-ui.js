(() => {
  const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0)) + ' ₽';
  const isDone = j => j?.status === 'Выполнен';
  const isCancelled = j => j?.status === 'Отменён';
  const getState = () => window.state || null;

  function unpaidTotal(){
    const s=getState();
    if(!s?.jobs) return 0;
    return s.jobs.filter(j=>!isCancelled(j)&&isDone(j)&&j.paid===false)
      .reduce((sum,j)=>sum + Number(j.measurePrice||j.price||0),0);
  }

  function findDebtCard(){
    const candidates=[...document.querySelectorAll('section,article,div')].filter(el=>{
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      return /^Долги\b/.test(t) && (t.includes('Долгов нет') || t.includes('выполнено, но не оплачено'));
    });
    return candidates.sort((a,b)=>a.getBoundingClientRect().height-b.getBoundingClientRect().height)[0] || null;
  }

  function styleDebtCard(card){
    if(!card || card.dataset.debtUi==='1') return;
    card.dataset.debtUi='1';
    card.classList.add('debt-minimal');
    const main=document.querySelector('#app') || document.body;
    main.appendChild(card);
    const title=[...card.querySelectorAll('h1,h2,h3,h4,strong,b,div')].find(el=>el.textContent.trim()==='Долги');
    if(title) title.classList.add('debt-minimal-title');
    const zero=[...card.querySelectorAll('*')].find(el=>el.textContent.trim()==='Долгов нет — красота.');
    if(zero) zero.classList.add('debt-minimal-zero');
  }

  function render(){
    const card=findDebtCard();
    if(card) styleDebtCard(card);
    const total=unpaidTotal();
    document.querySelectorAll('[data-debt-total]').forEach(el=>el.textContent=money(total));
  }

  const style=document.createElement('style');
  style.textContent=`
    .debt-minimal{order:9999!important;margin:18px 0 28px!important;padding:14px 18px!important;min-height:0!important;border-radius:18px!important;box-shadow:none!important;background:var(--card,#fff)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;border:1px solid var(--line,rgba(20,25,20,.12))!important;}
    .debt-minimal .debt-minimal-title{font-size:16px!important;margin:0!important;}
    .debt-minimal-zero{margin:0!important;color:var(--muted,#858b83)!important;font-size:13px!important;}
    .debt-minimal .debt-minimal-zero{display:block!important;}
    .debt-minimal .debt-minimal-zero + *{display:none!important;}
    .debt-minimal:has(.debt-minimal-zero){opacity:.86;}
    body.dark .debt-minimal{background:#141715!important;border-color:rgba(244,246,241,.09)!important;}
  `;
  document.head.appendChild(style);

  const observer=new MutationObserver(()=>{clearTimeout(render.t);render.t=setTimeout(render,60)});
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render,{once:true}); else render();
})();