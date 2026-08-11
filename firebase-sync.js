import { firebaseConfig } from './firebase-config.js';
const DATA_KEY='montaji-aa-data-v4';
const SYNC_KEY='montaji-aa-sync-at';
const CLIENT_KEY='montaji-aa-client';
const clientId=localStorage.getItem(CLIENT_KEY)||crypto.randomUUID();localStorage.setItem(CLIENT_KEY,clientId);
let ready=false,applying=false,lastJson='';
const status=t=>{const e=document.querySelector('#syncStatus');if(e)e.textContent=t};
const read=()=>{try{return JSON.parse(localStorage.getItem(DATA_KEY)||'null')}catch{return null}};
const stamp=()=>Number(localStorage.getItem(SYNC_KEY)||0);
async function start(){
 try{
  const [appMod,authMod,fsMod]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')]);
  const cfg=firebaseConfig||{};
  if(!cfg.apiKey||!cfg.projectId){status('Локально · резервная копия доступна');return}
  const app=appMod.initializeApp(cfg,'montaji-aa-sync');const auth=authMod.getAuth(app);const db=fsMod.getFirestore(app);await authMod.signInAnonymously(auth);ready=true;
  const ref=fsMod.doc(db,'appData','shared');status('Firebase · подключение…');
  const snap=await fsMod.getDoc(ref);const local=read(),localAt=stamp();
  if(snap.exists()){
   const remote=snap.data(),remoteAt=Number(remote.updatedAt||0);
   if(remoteAt>localAt&&remote.data?.jobs){applying=true;localStorage.setItem(DATA_KEY,JSON.stringify(remote.data));localStorage.setItem(SYNC_KEY,String(remoteAt));applying=false;location.reload();return}
   if(local?.jobs&&localAt>remoteAt)await fsMod.setDoc(ref,{data:local,updatedAt:localAt,updatedBy:clientId});
  }else if(local?.jobs){const at=Math.max(Date.now(),localAt+1);localStorage.setItem(SYNC_KEY,String(at));await fsMod.setDoc(ref,{data:local,updatedAt:at,updatedBy:clientId})}
  fsMod.onSnapshot(ref,s=>{if(!s.exists()||applying)return;const r=s.data(),remoteAt=Number(r.updatedAt||0),localAt2=stamp();if(remoteAt>localAt2&&r.data?.jobs){applying=true;localStorage.setItem(DATA_KEY,JSON.stringify(r.data));localStorage.setItem(SYNC_KEY,String(remoteAt));applying=false;location.reload()}});
  lastJson=localStorage.getItem(DATA_KEY)||'';status('Firebase · синхронизация включена');
  setInterval(async()=>{if(!ready||applying)return;const json=localStorage.getItem(DATA_KEY)||'';if(json===lastJson)return;lastJson=json;try{const data=JSON.parse(json),at=Date.now();localStorage.setItem(SYNC_KEY,String(at));await fsMod.setDoc(ref,{data,updatedAt:at,updatedBy:clientId});status('Firebase · сохранено')}catch(e){status('Офлайн · данные сохранены на телефоне')}},500);
 }catch(e){console.warn('sync',e);status('Офлайн · данные сохранены на телефоне')}
}
start();
