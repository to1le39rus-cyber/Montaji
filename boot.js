// Production bootstrap — compatibility layer for the canonical app.js.
// It keeps runtime config same-origin and adds only safe runtime guards.
const legacyNoteButton=document.createElement('button');
legacyNoteButton.id='todayNoteBtn';
legacyNoteButton.type='button';
legacyNoteButton.hidden=true;
document.body.appendChild(legacyNoteButton);

const BASE='https://raw.githubusercontent.com/to1le39rus-cyber/Montaji/Astera-smart/';
const RUNTIME='20260823-1038';
const APP_URL=BASE+'app.js?runtime='+RUNTIME;
const CONFIG_URL=BASE+'firebase-config.js?runtime='+RUNTIME;

async function start(){
  const [appResponse,configResponse]=await Promise.all([
    fetch(APP_URL,{cache:'no-store'}),
    fetch(CONFIG_URL,{cache:'no-store'})
  ]);
  if(!appResponse.ok)throw new Error(`APP_LOAD_${appResponse.status}`);
  if(!configResponse.ok)throw new Error(`CONFIG_LOAD_${configResponse.status}`);
  let source=await appResponse.text();
  const configSource=await configResponse.text();
  const match=configSource.match(/export\s+const\s+firebaseConfig\s*=\s*([\s\S]*?);\s*$/);
  if(!match)throw new Error('FIREBASE_CONFIG_INVALID');
  source=source.replace(
    "import { firebaseConfig } from './firebase-config.js';",
    `const firebaseConfig=${match[1]};`
  );

  // Never let the optional Work Inbox prevent the primary jobs database from loading.
  source=source.replace(
    "async function loadServer(){if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}status('Подключаем общую базу…');try{const [sharedSnap,notesSnap]=await Promise.all([F.getDocFromServer(F.doc(db,...SHARED_DOC)),F.getDocFromServer(F.doc(db,...NOTES_DOC))]);state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();notes=currentNotesData(notesSnap);serverReady=true;render();status('● Общая база · синхронизировано','online');return true;}catch(err){console.error(err);serverReady=false;state=emptyState();notes=[];render();status('База недоступна','offline');toast('Не удалось получить данные с сервера.','error');return false;}}",
    "async function loadServer(){if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}status('Подключаем общую базу…');try{const sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();serverReady=true;render();status('● Общая база · синхронизировано','online');try{const notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));notes=currentNotesData(notesSnap);renderNotes()}catch(notesErr){console.warn('notes load failed',notesErr);notes=[];renderNotes()}return true;}catch(err){console.error(err);serverReady=false;state=emptyState();notes=[];render();status('База недоступна','offline');toast('Ошибка Firebase: '+(err?.code||err?.message||'unknown'),'error');return false;}}"
  );

  // Firebase Auth can restore a persisted session before the ID token is refreshed.
  // Force one token refresh before the first Firestore request so request.auth is present.
  source=source.replace(
    "async function onUser(u){user=u;unsubscribeShared?.();unsubscribeNotes?.();unsubscribeShared=unsubscribeNotes=null;if(!u){serverReady=false;state=emptyState();notes=[];showAuth(true);render();status('Требуется вход');return}if(!u.emailVerified){await F.authMod.signOut(auth);showAuth(true);authMessage('Подтвердите email по ссылке из письма.',true);return}showAuth(false);if(await loadServer())startRealtime();}",
    "async function onUser(u){user=u;unsubscribeShared?.();unsubscribeNotes?.();unsubscribeShared=unsubscribeNotes=null;if(!u){serverReady=false;state=emptyState();notes=[];showAuth(true);render();status('Требуется вход');return}if(!u.emailVerified){await F.authMod.signOut(auth);showAuth(true);authMessage('Подтвердите email по ссылке из письма.',true);return}showAuth(false);try{await u.getIdToken(true)}catch(tokenErr){console.error('Firebase ID token refresh failed',tokenErr);status('Не удалось подтвердить сессию','offline');toast('Ошибка авторизации: '+(tokenErr?.code||'token-refresh-failed'),'error');return}if(await loadServer())startRealtime();}"
  );

  const blob=new Blob([source],{type:'text/javascript'});
  const url=URL.createObjectURL(blob);
  try{await import(url)}finally{URL.revokeObjectURL(url)}
}

start().catch(error=>{
  console.error('Montaji app startup failed',error);
  const el=document.querySelector('#authMessage');
  if(el){
    el.textContent='Ошибка запуска приложения. Обновите страницу.';
    el.className='auth-message auth-message--error';
  }
  const status=document.querySelector('#syncStatus');
  if(status){status.textContent='Ошибка запуска';status.dataset.state='offline';}
});
