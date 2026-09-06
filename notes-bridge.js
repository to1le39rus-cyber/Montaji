(()=>{
  let cache=[];
  let timer=0;
  const box=()=>document.querySelector('#insights');
  const hasUrgent=()=>[...document.querySelectorAll('#activeNotes .note-card')].some(c=>!c.classList.contains('note-done')&&c.querySelector('.note-urgent-badge'));
  const css=`#todayScreen #insights{display:flex!important;flex-direction:column!important;gap:10px!important}#todayScreen #insights .note-insight-urgent,#todayScreen #insights .insight.note-insight-urgent{box-sizing:border-box!important;width:100%!important;min-height:64px!important;margin:0!important;padding:14px 16px!important;display:grid!important;grid-template-columns:30px minmax(0,1fr) 18px!important;align-items:center!important;gap:10px!important;border:1px solid rgba(255,255,255,.10)!important;border-left:3px solid #ef3328!important;border-radius:20px!important;background:#151a17!important;color:#f4f5f1!important;box-shadow:none!important;overflow:hidden!important}#todayScreen #insights .note-insight-flag{width:30px!important;height:30px!important;display:grid!important;place-items:center!important;color:#ef3328!important;font-size:0!important;letter-spacing:0!important;margin:0!important}#todayScreen #insights .note-insight-flag::after{content:'!!'!important;color:#ef3328!important;font-size:22px!important;line-height:1!important;font-weight:850!important;letter-spacing:-3px!important}#todayScreen #insights .note-insight-copy{min-width:0!important;display:grid!important;gap:3px!important}#todayScreen #insights .note-insight-copy strong{color:#f4f5f1!important;font-size:15px!important;line-height:1.3!important;font-weight:650!important}#todayScreen #insights .note-insight-copy small{color:#929993!important;font-size:11px!important;line-height:1.2!important}#todayScreen #insights .note-insight-arrow{color:#929993!important;font-size:25px!important;line-height:1!important;text-align:right!important}`;
  const installStyle=()=>{
    let s=document.getElementById('montaji-notes-final-geometry');
    if(!s){s=document.createElement('style');s.id='montaji-notes-final-geometry'}
    s.textContent=css;
    document.head.appendChild(s);
  };
  const sync=()=>{
    timer=0;
    installStyle();
    const b=box(); if(!b)return;
    const current=[...b.querySelectorAll('.note-insight')];
    if(current.length){cache=current.map(n=>n.cloneNode(true));return;}
    if(!hasUrgent()){cache=[];return;}
    if(cache.length&&!b.querySelector('.note-insight')) b.append(...cache.map(n=>n.cloneNode(true)));
  };
  const start=()=>{
    installStyle();
    const b=box();if(!b)return setTimeout(start,50);
    new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(sync,30)}).observe(b,{childList:true,subtree:true});
    new MutationObserver(()=>installStyle()).observe(document.head,{childList:true});
    sync();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();