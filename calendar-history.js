(async()=>{
  const V='10.14.1';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    const [appMod,authMod,fs]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    let app;
    for(let i=0;i<100;i++){
      try{app=appMod.getApp('montaji-aa-production');break}catch(e){await sleep(100)}
    }
    if(!app)return;
    const auth=authMod.getAuth(app),db=fs.getFirestore(app),ref=fs.doc(db,'appData','shared');
    let jobs=[];
    const countWord=n=>n===1?'монтаж':(n>=2&&n<=4?'монтажа':'монтажей');
    const render=()=>{
      const map=new Map();
      for(const j of jobs){
        if(j?.status==='Отменён')continue;
        const d=j?.date;if(!d)continue;
        const item=map.get(d)||{all:0,montages:0,measure:0};
        item.all++;
        if(j.type==='Монтаж')item.montages++;
        if(j.type==='Замер')item.measure++;
        map.set(d,item);
      }
      document.querySelectorAll('.day[data-date]').forEach(day=>{
        const d=map.get(day.dataset.date)||{all:0,montages:0,measure:0};
        const span=day.querySelector('span'),i=day.querySelector('i');
        if(span)span.textContent=`${d.montages} ${countWord(d.montages)}`;
        if(i)i.textContent=`${d.montages}/3${d.measure?' · замер':''}`;
        day.classList.toggle('partial',d.montages===1);
        day.classList.toggle('busy',d.montages===2);
        day.classList.toggle('full',d.montages>=3);
        day.classList.toggle('has-measure',d.measure>0);
      });
    };
    const css=document.createElement('style');
    css.textContent=`
      .day.partial,.day.busy,.day.full{color:#172019!important;-webkit-text-fill-color:#172019!important;}
      .day.partial span,.day.partial i,.day.busy span,.day.busy i,.day.full span,.day.full i{color:#68715f!important;-webkit-text-fill-color:#68715f!important;opacity:1!important;}
      .day.partial{background:#eef2ea!important;box-shadow:inset 0 -5px 0 #d5ddcc!important;border-color:#d4dacd!important;}
      .day.busy{background:#e3e9dd!important;box-shadow:inset 0 -5px 0 #c4cfb9!important;border-color:#cfd8c7!important;}
      .day.full{background:#d7dfcf!important;box-shadow:inset 0 -5px 0 #aebca3!important;border-color:#c4cfbc!important;}
      .day.full b{color:#172019!important;-webkit-text-fill-color:#172019!important;}
    `;
    document.head.appendChild(css);
    const start=()=>{
      render();
      const cal=document.querySelector('#calendar');
      if(cal)new MutationObserver(render).observe(cal,{childList:true,subtree:true});
    };
    authMod.onAuthStateChanged(auth,u=>{
      if(!u){jobs=[];render();return;}
      fs.onSnapshot(ref,s=>{jobs=s.exists()?(s.data()?.data?.jobs||[]):[];render()},()=>{});
      start();
    });
  }catch(e){console.error('calendar history runtime failed',e)}
})();
