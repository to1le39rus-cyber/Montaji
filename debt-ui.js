(() => {
  const STYLE = `
    .debt-minimal{box-sizing:border-box!important;width:100%!important;margin:10px 0 8px!important;padding:10px 16px!important;min-height:0!important;height:auto!important;border-radius:14px!important;box-shadow:none!important;background:var(--card,#fff)!important;border:1px solid rgba(20,25,20,.10)!important;overflow:hidden!important}
    .debt-minimal-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;min-height:22px!important}
    .debt-minimal-row strong{font-size:14px!important;line-height:20px!important;margin:0!important}
    .debt-minimal-row span{font-size:13px!important;line-height:20px!important;color:#858b83!important;margin:0!important}
    body.dark .debt-minimal{background:#141715!important;border-color:rgba(244,246,241,.09)!important}
  `;
  const style=document.createElement('style');style.textContent=STYLE;document.head.appendChild(style);
  function candidates(){return [...document.querySelectorAll('section,article,div')].filter(el=>{const t=(el.textContent||'').replace(/\s+/g,' ').trim();return /^Долги\b/.test(t)&&t.includes('выполнено, но не оплачено')}).sort((a,b)=>a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height)}
  function findNav(){return [...document.querySelectorAll('nav,footer,div')].find(el=>{const t=(el.textContent||'').replace(/\s+/g,' ').trim(),r=el.getBoundingClientRect();return t.includes('Сегодня')&&t.includes('График')&&t.includes('Деньги')&&t.includes('Клиенты')&&t.includes('Ещё')&&r.height<180})}
  function apply(){const card=candidates()[0];if(!card)return;card.classList.add('debt-minimal');const t=(card.textContent||'').replace(/\s+/g,' ').trim();if(t.includes('Долгов нет')){if(card.dataset.debtMinimal==='1')return;card.dataset.debtMinimal='1';card.innerHTML='<div class="debt-minimal-row"><strong>Долги</strong><span>Нет долгов</span></div>'}const nav=findNav();if(nav){const target=nav.parentElement;if(target)target.insertBefore(card,nav)}}
  let timer=0;const run=()=>{clearTimeout(timer);timer=setTimeout(apply,30)};new MutationObserver(run).observe(document.body,{childList:true,subtree:true});run();
})();
