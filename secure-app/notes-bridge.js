(()=>{
  /* Notes are rendered by the stable notes module. This bridge only keeps the visual layer
     and urgent insights alive after the main app re-renders #insights. It does not touch data. */
  const styleId='montaji-notes-final-style';
  const css=`
#todayScreen #activeNotes .note-card,#todayScreen #activeNotes .note-card.notes-v2{background:var(--card)!important;color:var(--ink)!important;border:0!important;border-top:1px solid var(--line)!important;border-radius:0!important;box-shadow:none!important;padding:16px 0!important;margin:0!important;}
#todayScreen #activeNotes .note-card:first-child{border-top:0!important}
#todayScreen #activeNotes .note-v2-top{display:grid!important;grid-template-columns:34px minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important}
#todayScreen #activeNotes .note-v2-open{background:transparent!important;border:0!important;color:var(--ink)!important;padding:0!important;text-align:left!important;min-width:0!important}
#todayScreen #activeNotes .note-v2-title{display:grid!important;gap:3px!important;min-width:0!important}
#todayScreen #activeNotes .note-v2-title b{color:var(--ink)!important;font-size:15px!important;line-height:1.25!important;font-weight:600!important}
#todayScreen #activeNotes .note-v2-title small{color:var(--muted)!important;font-size:11px!important;opacity:1!important}
#todayScreen #activeNotes .notes-v2 p{margin:9px 0 0 44px!important;color:var(--muted)!important;font-size:13px!important;line-height:1.45!important}
#todayScreen #activeNotes .note-v2-actions{display:flex!important;gap:6px!important}
#todayScreen #activeNotes .mini-btn{min-height:34px!important;padding:7px 10px!important;border:0!important;border-radius:10px!important;background:var(--soft)!important;color:var(--muted)!important;font-size:10px!important;font-weight:600!important}
#todayScreen #activeNotes .note-check{width:34px!important;height:34px!important;min-width:34px!important;display:flex!important;align-items:center!important;justify-content:center!important;position:relative!important;cursor:pointer!important;z-index:5!important}
#todayScreen #activeNotes .note-check input[type=checkbox]{position:absolute!important;inset:3px!important;width:28px!important;height:28px!important;margin:0!important;opacity:0!important;display:block!important;z-index:2!important;cursor:pointer!important}
#todayScreen #activeNotes .note-check span{display:block!important;width:22px!important;height:22px!important;border:1.5px solid rgba(255,255,255,.30)!important;border-radius:7px!important;background:transparent!important;box-shadow:none!important;pointer-events:none!important}
#todayScreen #activeNotes .note-check input[type=checkbox]:checked+span{background:var(--olive-dark)!important;border-color:var(--olive-dark)!important}
#todayScreen #activeNotes .note-check input[type=checkbox]:checked+span:after{content:'✓'!important;display:block!important;color:#0d100e!important;text-align:center!important;font-size:14px!important;line-height:19px!important;font-weight:800!important}
#todayScreen #activeNotes .note-urgent-badge{display:inline-flex!important;margin:9px 0 0 44px!important;padding:4px 8px!important;border-radius:8px!important;background:var(--danger-bg)!important;color:var(--danger-ink)!important;font-size:10px!important;font-weight:700!important}
#todayScreen #insights .note-insight-urgent{display:grid!important;grid-template-columns:28px minmax(0,1fr) 18px!important;align-items:center!important;column-gap:10px!important;min-height:56px!important;padding:12px 14px!important;border:1px solid var(--line)!important;border-left:3px solid var(--danger-ink)!important;border-radius:var(--radius-sm)!important;background:var(--danger-bg)!important;color:var(--ink)!important;box-shadow:none!important;text-align:left!important}
#todayScreen #insights .note-insight-flag{display:flex!important;align-items:center!important;justify-content:center!important;color:var(--danger-ink)!important;font-size:20px!important;line-height:1!important}
#todayScreen #insights .note-insight-copy{display:grid!important;gap:2px!important;min-width:0!important}
#todayScreen #insights .note-insight-copy strong{color:var(--ink)!important;font-size:14px!important;line-height:1.25!important;font-weight:600!important}
#todayScreen #insights .note-insight-copy small{color:var(--muted)!important;font-size:11px!important;line-height:1.2!important}
#todayScreen #insights .note-insight-arrow{color:var(--muted)!important;font-size:24px!important}
#todayScreen .archive-details summary{color:var(--muted)!important;background:transparent!important}
`;
  const installStyle=()=>{if(document.getElementById(styleId))return;const s=document.createElement('style');s.id=styleId;s.textContent=css;(document.head||document.documentElement).appendChild(s)};
  let cache=[];let timer=0;
  const box=()=>document.querySelector('#insights');
  const hasUrgent=()=>[...document.querySelectorAll('#activeNotes .note-card')].some(c=>!c.classList.contains('note-done')&&c.querySelector('.note-urgent-badge'));
  const sync=()=>{timer=0;installStyle();const b=box();if(!b)return;const current=[...b.querySelectorAll('.note-insight')];if(current.length){cache=current.map(n=>n.cloneNode(true));return}if(!hasUrgent()){cache=[];return}if(cache.length&&!b.querySelector('.note-insight'))b.append(...cache.map(n=>n.cloneNode(true)))};
  const start=()=>{installStyle();const b=box();if(!b)return setTimeout(start,50);new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(sync,30)}).observe(b,{childList:true,subtree:true});sync()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
