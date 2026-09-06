(()=>{
  let cache=[];
  let timer=0;
  const box=()=>document.querySelector('#insights');
  const hasUrgent=()=>[...document.querySelectorAll('#activeNotes .note-card')].some(c=>!c.classList.contains('note-done')&&c.querySelector('.note-urgent-badge'));
  const sync=()=>{
    timer=0;
    const b=box(); if(!b)return;
    const current=[...b.querySelectorAll('.note-insight')];
    if(current.length){cache=current.map(n=>n.cloneNode(true));return;}
    if(!hasUrgent()){cache=[];return;}
    if(cache.length&&!b.querySelector('.note-insight')) b.append(...cache.map(n=>n.cloneNode(true)));
  };
  const start=()=>{const b=box();if(!b)return setTimeout(start,50);new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(sync,30)}).observe(b,{childList:true,subtree:true});sync()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
