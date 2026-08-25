import { firebaseConfig } from './firebase-config.js';

const V='10.14.1';
const APP='montaji-aa-production';

(async()=>{
  if(!location.hostname.includes('git-dev-safe')) return;
  try{
    const [appMod,authMod,fs]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    const app=appMod.getApps().find(a=>a.name===APP)||appMod.initializeApp(firebaseConfig,APP);
    const auth=authMod.getAuth(app);
    const db=fs.getFirestore(app);
    const user=auth.currentUser;
    if(user?.emailVerified){
      await fs.deleteDoc(fs.doc(db,'appData','notesSandbox')).catch(()=>{});
      try{localStorage.removeItem('montaji-mega-notes');}catch(e){}
      console.info('[sandbox] legacy notesSandbox cleared');
    }
  }catch(e){console.warn('[sandbox] legacy notes cleanup skipped',e)}
})();
