(()=>{
  const css=`
#todayScreen #insights{display:flex!important;flex-direction:column!important;gap:10px!important;width:100%!important;margin:0!important}
#todayScreen #insights .note-insight-urgent{box-sizing:border-box!important;display:grid!important;grid-template-columns:28px minmax(0,1fr) 18px!important;align-items:center!important;gap:10px!important;width:100%!important;min-height:64px!important;padding:13px 14px!important;margin:0!important;border:1px solid rgba(239,109,99,.16)!important;border-left:3px solid #ef6d63!important;border-radius:20px!important;background:#2c1614!important;color:#f3f5f1!important;box-shadow:none!important;text-align:left!important}
#todayScreen #insights .note-insight-urgent .note-insight-copy{min-width:0!important;display:grid!important;gap:2px!important}
#todayScreen #insights .note-insight-urgent .note-insight-copy strong{display:block!important;color:#f3f5f1!important;font-size:15px!important;line-height:1.25!important;font-weight:650!important}
#todayScreen #insights .note-insight-urgent .note-insight-copy small{display:block!important;color:#9aa197!important;font-size:11px!important;line-height:1.25!important}
#todayScreen #insights .note-insight-urgent .note-insight-flag{color:#ef3328!important;font-size:22px!important;line-height:1!important;letter-spacing:-3px!important;display:block!important;margin:0!important}
#todayScreen #insights .note-insight-urgent .note-insight-arrow{color:#9aa197!important;font-size:25px!important;line-height:1!important}
#todayScreen .inline-card:has(#activeNotes){background:#171b18!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:22px!important;overflow:hidden!important;padding:16px!important}
#todayScreen #activeNotes .note-card{background:transparent!important;color:#f3f5f1!important;border:0!important;border-top:1px solid rgba(255,255,255,.08)!important;border-radius:0!important;padding:16px 0!important;margin:0!important;box-shadow:none!important}
#todayScreen #activeNotes .note-v2-top{display:grid!important;grid-template-columns:34px minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important}
#todayScreen #activeNotes .note-v2-title b{color:#f3f5f1!important;font-size:15px!important;font-weight:600!important}
#todayScreen #activeNotes .note-v2-title small{color:#8b9389!important;opacity:1!important}
#todayScreen #activeNotes .notes-v2 p{margin:9px 0 0 44px!important;color:#8b9389!important}
#todayScreen #activeNotes .mini-btn{min-height:36px!important;padding:7px 10px!important;border:0!important;border-radius:11px!important;background:#202821!important;color:#8b9389!important}
#todayScreen #activeNotes .note-check{width:34px!important;height:34px!important;min-width:34px!important;display:flex!important;align-items:center!important;justify-content:center!important;position:relative!important;z-index:20!important;overflow:visible!important}
#todayScreen #activeNotes .note-check span{display:block!important;visibility:visible!important;opacity:1!important;width:22px!important;height:22px!important;border:1.5px solid rgba(255,255,255,.45)!important;border-radius:7px!important;background:#1e231f!important;pointer-events:none!important}
#todayScreen #activeNotes .note-check input{position:absolute!important;inset:0!important;width:34px!important;height:34px!important;display:block!important;opacity:0!important;z-index:30!important}
#todayScreen #activeNotes .note-check input:checked+span{background:#a8c294!important;border-color:#a8c294!important}
#todayScreen #activeNotes .note-check input:checked+span:after{content:'✓'!important;display:block!important;color:#0d100e!important;text-align:center!important;font-size:14px!important;line-height:19px!important;font-weight:800!important}
#todayScreen .archive-details{margin-top:8px!important;border-top:1px solid rgba(255,255,255,.08)!important;background:transparent!important;border-radius:0!important;overflow:hidden!important}
#todayScreen .archive-details summary{padding:14px 0!important;color:#8b9389!important;background:transparent!important;border:0!important}
#todayScreen #archivedNotes{background:transparent!important;color:#8b9389!important;padding:0!important}
#todayScreen #archivedNotes .note-card{background:#1e231f!important;color:#f3f5f1!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:16px!important;padding:14px!important;margin:8px 0!important;opacity:.72!important}
#todayScreen #archivedNotes .note-v2-title b{color:#f3f5f1!important}
#todayScreen #archivedNotes .notes-v2 p{color:#8b9389!important}
#todayScreen #archivedNotes .mini-btn{background:#202821!important;color:#8b9389!important;border-radius:10px!important}
#todayScreen #archivedNotes .note-check{width:34px!important;height:34px!important;display:flex!important;align-items:center!important;justify-content:center!important}
#todayScreen #archivedNotes .note-check span{display:block!important;width:22px!important;height:22px!important;border:1.5px solid rgba(255,255,255,.28)!important;border-radius:7px!important;background:transparent!important;opacity:1!important}
`;
  let styleTimer=0;
  const install=()=>{
    let s=document.getElementById('montaji-notes-final-style');
    if(!s){s=document.createElement('style');s.id='montaji-notes-final-style';document.head.appendChild(s)}
    s.textContent=css;
    if(s!==document.head.lastElementChild) document.head.appendChild(s);
  };
  let cache=[];
  let syncTimer=0;
  const box=()=>document.querySelector('#insights');
  const hasUrgent=()=>[...document.querySelectorAll('#activeNotes .note-card')].some(c=>!c.classList.contains('note-done')&&c.querySelector('.note-urgent-badge'));
  const sync=()=>{
    syncTimer=0;
    install();
    const b=box();
    if(!b)return;
    const currentUrgent=[...b.querySelectorAll('.note-insight-urgent')];
    if(currentUrgent.length){
      cache=currentUrgent.map(x=>x.cloneNode(true));
      return;
    }
    if(!hasUrgent()){cache=[];return;}
    if(cache.length && !b.querySelector('.note-insight-urgent')){
      b.append(...cache.map(x=>x.cloneNode(true)));
    }
  };
  const schedule=()=>{clearTimeout(syncTimer);syncTimer=setTimeout(sync,20)};
  const start=()=>{
    install();
    const b=box();
    if(!b)return setTimeout(start,50);
    new MutationObserver(schedule).observe(b,{childList:true,subtree:true,characterData:true});
    const active=document.querySelector('#activeNotes');
    if(active)new MutationObserver(schedule).observe(active,{childList:true,subtree:true,characterData:true});
    new MutationObserver(()=>{clearTimeout(styleTimer);styleTimer=setTimeout(install,0)}).observe(document.head,{childList:true,subtree:true,characterData:true});
    sync();
    setTimeout(sync,100);
    setTimeout(sync,300);
    setTimeout(sync,700);
    setTimeout(sync,1500);
    setTimeout(sync,3000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
