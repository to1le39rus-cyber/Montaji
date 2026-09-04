(() => {
  function findDebtCard(){
    const nodes=[...document.querySelectorAll('section,article,div')];
    return nodes
      .filter(el=>{
        const t=(el.textContent||'').replace(/\s+/g,' ').trim();
        return /^Долги\b/.test(t) && (t.includes('Долгов нет') || t.includes('выполнено, но не оплачено'));
      })
      .sort((a,b)=>a.getBoundingClientRect().height-b.getBoundingClientRect().height)[0]||null;
  }

  function findBottomNav(){
    return [...document.querySelectorAll('nav,footer,div')].find(el=>{
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      return t.includes('Сегодня')&&t.includes('График')&&t.includes('Деньги')&&t.includes('Клиенты')&&t.includes('Ещё') && el.getBoundingClientRect().height<180;
    })||null;
  }

  function makeMinimal(card){
    if(!card) return;
    card.classList.add('debt-minimal');
    const text=(card.textContent||'').replace(/\s+/g,' ').trim();
    const isZero=text.includes('Долгов нет');
    if(isZero && card.dataset.debtZero!=='1'){
      card.dataset.debtZero='1';
      card.innerHTML='<div class="debt-minimal-row"><strong>Долги</strong><span>Нет долгов</span></div>';
    }
    const nav=findBottomNav();
    const parent=nav?.parentElement;
    if(parent && card.parentElement===parent){
      parent.insertBefore(card,nav);
    } else if(parent && card.parentElement!==parent){
      parent.insertBefore(card,nav);
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    .debt-minimal{
      box-sizing:border-box!important;
      width:100%!important;
      margin:12px 0 10px!important;
      padding:11px 16px!important;
      min-height:0!important;
      height:auto!important;
      border-radius:16px!important;
      box-shadow:none!important;
      background:var(--card,#fff)!important;
      border:1px solid rgba(20,25,20,.10)!important;
      overflow:hidden!important;
    }
    .debt-minimal .debt-minimal-row{
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:16px!important;
      min-height:22px!important;
    }
    .debt-minimal .debt-minimal-row strong{
      font-size:14px!important;
      line-height:20px!important;
      margin:0!important;
    }
    .debt-minimal .debt-minimal-row span{
      font-size:13px!important;
      line-height:20px!important;
      color:#858b83!important;
      margin:0!important;
    }
    body.dark .debt-minimal{background:#141715!important;border-color:rgba(244,246,241,.09)!important;}
  `;
  document.head.appendChild(style);

  function render(){
    const card=findDebtCard();
    if(card) makeMinimal(card);
  }

  const observer=new MutationObserver(()=>{clearTimeout(render.t);render.t=setTimeout(render,80)});
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render,{once:true});
  render();
})();
