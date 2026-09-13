(() => {
  const STYLE = `
    #moneyScreen .debt-minimal{box-sizing:border-box!important;width:100%!important;min-height:0!important;height:auto!important;}
    #moneyScreen .debt-minimal .section-head{margin:0!important;}
    #moneyScreen .debt-minimal .section-head h2{margin:0!important;}
    #moneyScreen .debt-minimal .section-head small{color:#899088!important;}
    #moneyScreen .debt-minimal #debtList{padding:0!important;}
    #moneyScreen .debt-minimal #debtList .muted{padding:0!important;font-size:10px!important;color:#858b83!important;}
  `;
  const style=document.createElement('style');style.textContent=STYLE;document.head.appendChild(style);
  function apply(){
    const list=document.querySelector('#debtList');
    const card=list?.closest('.chart-card');
    if(!card)return;
    card.classList.add('debt-minimal');
    const muted=list.querySelector('.muted');
    if(muted&&muted.textContent.includes('Долгов нет'))muted.textContent='Нет долгов';
  }
  let timer=0;
  const run=()=>{clearTimeout(timer);timer=setTimeout(apply,40)};
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  run();
})();
