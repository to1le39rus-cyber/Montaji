/* МОНТАЖИ — operational control queue */
(async()=>{
  const V='10.14.1';
  try{
    const [appMod,authMod,fs]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)]);
    const app=appMod.getApp('montaji-aa-production'),auth=authMod.getAuth(app),db=fs.getFirestore(app);
    const ref=fs.doc(db,'appData','control');
    document.addEventListener('submit',e=>{if(e.target?.id==='authForm'){e.preventDefault();e.stopImmediatePropagation();}},true);
  }catch(e){console.error('control runtime init failed',e)}
})();
