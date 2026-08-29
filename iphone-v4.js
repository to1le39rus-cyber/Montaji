/* Montaji iPhone V4 — product layer, not a visual copy.
   Additive runtime: keeps the existing Firebase source of truth and business logic,
   but turns the phone into an action-first field-service tool. */
(() => {
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const refresh = () => {
    // Remove the misleading capacity impression. Three presets are time presets, not a daily cap.
    const load=$('#todayLoad');
    if(load && /\//.test(load.textContent)) load.textContent=load.textContent.split('/')[0];
    const progress=$('#todayProgress');
    if(progress) progress.style.width='100%';
    // Give the user a clearer operational label without changing stored data.
    const hero=$('.hero-card');
    if(hero && !$('.v4-hero-note',hero)){
      const n=document.createElement('div'); n.className='v4-hero-note';
      n.textContent='План на сегодня'; hero.prepend(n);
    }
    // Make long job descriptions progressively disclosed rather than a wall of text.
    $$('.job-card').forEach(card=>{
      const details=$('.job-details',card), note=$('.note-line',card);
      if(details && note && !$('.v4-more',card)){
        const b=document.createElement('button'); b.className='v4-more'; b.type='button'; b.textContent='Подробнее о выезде';
        b.addEventListener('click',()=>{card.classList.toggle('v4-expanded');b.textContent=card.classList.contains('v4-expanded')?'Свернуть':'Подробнее о выезде'});
        details.appendChild(b);
      }
    });
    // Surface a single next-action strip above today's list.
    const list=$('#todayList');
    if(list && !$('#v4-next-action')){
      const first=$('.job-card',list); if(first){
        const client=$('.job-client',first)?.textContent?.trim()||'следующий выезд';
        const meta=$('.job-meta',first)?.textContent?.trim()||'';
        const a=document.createElement('div'); a.id='v4-next-action'; a.className='v4-next-action';
        a.innerHTML=`<div><span>Ближайшее действие</span><strong>${client}</strong><small>${meta}</small></div><button type="button">Открыть</button>`;
        a.querySelector('button').onclick=()=>$('.edit',first)?.click();
        list.parentNode.insertBefore(a,list);
      }
    }
  };
  const style=document.createElement('style'); style.textContent=`
    .v4-hero-note{font-size:9px;text-transform:uppercase;letter-spacing:.16em;color:#aeb3aa;margin-bottom:7px;font-weight:800}
    .v4-next-action{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;margin:0 0 9px;border:1px solid #d9ddd3;border-radius:16px;background:#eef1e9}
    .v4-next-action div{min-width:0}.v4-next-action span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#73786d;margin-bottom:3px}.v4-next-action strong{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v4-next-action small{display:block;color:#777c73;font-size:10px;margin-top:3px}.v4-next-action button{border:0;border-radius:10px;padding:9px 12px;background:#66715a;color:white;font-weight:800;white-space:nowrap}
    .v4-more{display:block;margin-top:7px;border:0;background:none;color:#66715a;font-size:11px;font-weight:800;padding:4px 0}.job-card:not(.v4-expanded) .note-line{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden}.job-card.v4-expanded .note-line{display:block!important;-webkit-line-clamp:unset!important}
  `; document.head.appendChild(style);
  const observer=new MutationObserver(()=>{if($('#todayList')) refresh()}); observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,700)); else setTimeout(refresh,700);
  window.addEventListener('load',()=>setTimeout(refresh,500));
})();
