const BASE = 'https://raw.githubusercontent.com/to1le39rus-cyber/Montaji/dev-safe/';
const FIREBASE_VERSION = '10.14.1';

function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(document.querySelector(`script[data-firebase-sdk="${src}"]`)) return resolve();
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.dataset.firebaseSdk=src;
    s.onload=resolve;
    s.onerror=()=>reject(new Error(`Не удалось загрузить Firebase SDK: ${src}`));
    document.head.appendChild(s);
  });
}

async function boot(){
  try{
    const [appResponse,configResponse]=await Promise.all([
      fetch(`${BASE}app.js`,{cache:'no-store'}),
      fetch(`${BASE}firebase-config.js`,{cache:'no-store'})
    ]);
    if(!appResponse.ok) throw new Error(`app.js HTTP ${appResponse.status}`);
    if(!configResponse.ok) throw new Error(`firebase-config.js HTTP ${configResponse.status}`);

    await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/firebase/${FIREBASE_VERSION}/firebase-app-compat.js`);
    await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/firebase/${FIREBASE_VERSION}/firebase-auth-compat.js`);
    await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/firebase/${FIREBASE_VERSION}/firebase-firestore-compat.js`);

    let source=await appResponse.text();
    const configSource=await configResponse.text();
    source=source.replace("import { firebaseConfig } from './firebase-config.js';",configSource);
    source=source.replace(/async function initFirebase\(\)\{[\s\S]*?\n\}/,`async function initFirebase(){
      if(!window.firebase) throw new Error('Firebase SDK не загрузился.');
      const existing=firebase.apps.find(a=>a.name==='montaji-aa-production');
      const app=existing||firebase.initializeApp(firebaseConfig,'montaji-aa-production');
      auth=firebase.auth(app);
      db=firebase.firestore(app);
      F={
        authMod:{
          signInWithEmailAndPassword:(a,e,p)=>a.signInWithEmailAndPassword(e,p),
          createUserWithEmailAndPassword:(a,e,p)=>a.createUserWithEmailAndPassword(e,p),
          sendEmailVerification:u=>u.sendEmailVerification(),
          signOut:a=>a.signOut(),
          sendPasswordResetEmail:(a,e)=>a.sendPasswordResetEmail(e),
          onAuthStateChanged:(a,cb)=>a.onAuthStateChanged(cb)
        },
        doc:(d,...parts)=>d.doc(parts.join('/')),
        getDocFromServer:ref=>ref.get({source:'server'}),
        onSnapshot:(ref,...args)=>ref.onSnapshot(...args),
        runTransaction:(d,cb)=>d.runTransaction(tx=>cb(tx)),
        serverTimestamp:()=>firebase.firestore.FieldValue.serverTimestamp()
      };
    }`);

    const blob=new Blob([source],{type:'text/javascript'});
    const url=URL.createObjectURL(blob);
    await import(url);
    URL.revokeObjectURL(url);
  }catch(error){
    console.error('Montaji sandbox boot failed',error);
    const el=document.querySelector('#syncStatus');
    if(el){el.textContent='Ошибка запуска';el.dataset.state='offline';}
    const message=error?.message||String(error);
    const authMessage=document.querySelector('#authMessage');
    if(authMessage){authMessage.textContent=`Не удалось запустить приложение. ${message}`;authMessage.className='auth-message auth-message--error';}
    const toast=document.querySelector('#toast');
    if(toast){toast.textContent='Не удалось запустить приложение.';toast.dataset.state='error';}
  }
}

boot();
