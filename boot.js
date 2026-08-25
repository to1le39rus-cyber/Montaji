const BASE = './';
const FIREBASE_VERSION = '10.14.1';

function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(document.querySelector(`script[data-firebase-sdk="${src}"]`)) return resolve();
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.dataset.firebaseSdk=src;
    const timer=setTimeout(()=>reject(new Error(`Таймаут загрузки Firebase SDK: ${src}`)),15000);
    s.onload=()=>{clearTimeout(timer);resolve();};
    s.onerror=()=>{clearTimeout(timer);reject(new Error(`Не удалось загрузить Firebase SDK: ${src}`));};
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

    // Use the official Firebase CDN. The compat bundles are intentionally loaded
    // as classic scripts because this is more reliable on iOS/Safari than
    // dynamic ESM imports from a Blob URL.
    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore-compat.js`);

    let source=await appResponse.text();
    const configSource=await configResponse.text();
    source=source.replace("import { firebaseConfig } from './firebase-config.js';",configSource);
    const oldInit="async function initFirebase(){const [appMod,authMod,fs]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)]);const app=appMod.initializeApp(firebaseConfig,'montaji-aa-production');auth=authMod.getAuth(app);db=fs.getFirestore(app);F={...fs,authMod};}";
    const newInit=`async function initFirebase(){
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
    }`;
    if(!source.includes(oldInit)) throw new Error('Не найден блок инициализации Firebase в app.js.');
    source=source.replace(oldInit,newInit);

    // Execute the transformed application as an inline module. This avoids the
    // Safari/iOS failure mode of importing a Blob URL.
    const script=document.createElement('script');
    script.type='module';
    script.textContent=source;
    document.head.appendChild(script);
  }catch(error){
    console.error('Montaji boot failed',error);
    const message=error?.message||String(error);
    const authMessage=document.querySelector('#authMessage');
    if(authMessage){
      authMessage.textContent=`Не удалось запустить приложение. ${message}`;
      authMessage.className='auth-message auth-message--error';
    }
    const toast=document.querySelector('#toast');
    if(toast){toast.textContent=`Ошибка запуска: ${message}`;toast.dataset.state='error';}
  }
}

boot();
