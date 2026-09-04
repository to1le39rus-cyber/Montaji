(() => {
  const STYLE = `
    #moneyScreen .debt-minimal{
      box-sizing:border-box!important;
      width:100%!important;
      margin:14px 0 0!important;
      padding:0!important;
      min-height:0!important;
      height:auto!important;
      border:0!important;
      border-radius:0!important;
      box-shadow:none!important;
      background:transparent!important;
      overflow:visible!important;
    }
    #moneyScreen .debt-minimal .section-head{margin:0!important;padding:10px 0!important;border-top:1px solid var(--line,rgba(20,25,20,.1))!important;}
    #moneyScreen .debt-minimal .section-head h2{font-size:14px!important;font-weight:600!important;margin:0!important;}
    #moneyScreen .debt-minimal .section-head small{font-size:12px!important;color:#8a9089!important;}
    #moneyScreen .debt-minimal #debtList{padding:0!important;}
    #moneyScreen .debt-minimal #debtList .muted{padding:0 0 8px!important;font-size:13px!important;color:#8a9089!important;}
    #moneyScreen .debt-minimal:has(#debtList .debt-row) .section-head{border-top-color:rgba(190,70,70,.22)!important;}
    #moneyScreen .debt-minimal:has(#debtList .debt-row) .section-head h2{color:#b54b4b!important;}
  `;
  const style=document.createElement('style');style.textContent=STYLE;document.head.appendChild(style);

  function debtCard(){
    const list=document.querySelector('#debtList');
    return list?.closest('.chart-card') || null;
  }
  function storeCard(){
    const el=document.querySelector('#storeBreakdown');
    return el?.closest('.chart-card') || null;
  }
  function financeScreen(){return document.querySelector('#moneyScreen');}

  function apply(){
    const screen=financeScreen(), card=debtCard();
    if(!screen||!card)return;
    card.classList.add('debt-minimal');

    // Keep the debt block at the very bottom of the finance content,
    // immediately after the income-by-source block.
    const store=storeCard();
    if(store && store.parentElement===screen && store.nextElementSibling!==card){
      store.insertAdjacentElement('afterend',card);
    }else if(!store && card.parentElement===screen && card!==screen.lastElementChild){
      screen.appendChild(card);
    }

    const list=document.querySelector('#debtList');
    if(!list)return;
    const hasDebt=list.querySelector('.debt-row');
    const muted=list.querySelector('.muted');
    if(!hasDebt && muted && muted.textContent.includes('Долгов нет')){
      muted.textContent='Нет долгов';
    }
  }

  let timer=0;
  const run=()=>{clearTimeout(timer);timer=setTimeout(apply,40)};
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  run();
})();
