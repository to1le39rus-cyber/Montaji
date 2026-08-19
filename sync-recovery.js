(function(){
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
