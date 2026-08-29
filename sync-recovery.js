(function(){
  const script=document.querySelector('script[type="module"][src*="app.js"]');
  if(script && !script.dataset.finalBoot){
    script.dataset.finalBoot='1';
    script.src='boot.js?v=2';
  }

  let tries=0;
  const max=6;
  function retry(){
    const s=document.querySelector('#syncStatus');
    if(!s || tries>=max) return;
    const text=s.textContent||'';
    if(text.includes('База недоступна') || text.includes('Нет связи')){
      tries++;
      window.dispatchEvent(new Event('online'));
      setTimeout(retry,2500);
    }
  }
  setTimeout(retry,1200);
})();