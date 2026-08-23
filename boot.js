// Production bootstrap — temporary compatibility layer while app.js is being finalized.
// It keeps the runtime same-origin and applies the Firestore transport fix before app.js executes.
const legacyNoteButton=document.createElement('button');
legacyNoteButton.id='todayNoteBtn';
legacyNoteButton.type='button';
legacyNoteButton.hidden=true;
document.body.appendChild(legacyNoteButton);

const BASE='https://raw.githubusercontent.com/to1le39rus-cyber/Montaji/Astera-smart/';
const APP_URL=BASE+'app.js?runtime=20260823-0205';
const CONFIG_URL=BASE+'firebase-config.js?runtime=20260823-0205';

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
  source=source.replace(
    'db=fs.getFirestore(app);',
    'db=fs.getFirestore(app,{experimentalForceLongPolling:true,useFetchStreams:false});'
  );
  source=source.replace(
    "status('База недоступна','offline');toast('Не удалось получить данные с сервера.','error');",
    "status('База недоступна','offline');toast('Ошибка Firebase: '+(err?.code||err?.message||'unknown'),'error');"
  );
  source=source.replace(
    "$('#todayNoteBtn').onclick=()=>openNote();",
    "if($('#todayNoteBtn'))$('#todayNoteBtn').onclick=()=>openNote();"
  );
  // Notes are a separate bounded dataset. A notes permission/network failure must never hide the shared production database.
  source=source.replace(
    "async function loadServer(){if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}status('Подключаем общую базу…');try{const [sharedSnap,notesSnap]=await Promise.all([F.getDocFromServer(F.doc(db,...SHARED_DOC)),F.getDocFromServer(F.doc(db,...NOTES_DOC))]);state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();notes=currentNotesData(notesSnap);serverReady=true;render();status('● Общая база · синхронизировано','online');return true;}catch(err){console.error(err);serverReady=false;state=emptyState();notes=[];render();status('База недоступна','offline');toast('Ошибка Firebase: '+(err?.code||err?.message||'unknown'),'error');return false;}}",
    "async function loadServer(){if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}status('Подключаем общую базу…');try{const sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();serverReady=true;render();status('● Общая база · синхронизировано','online');try{const notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));notes=currentNotesData(notesSnap);renderNotes()}catch(notesErr){console.warn('notes load failed',notesErr);notes=[];renderNotes()}return true;}catch(err){console.error(err);serverReady=false;state=emptyState();notes=[];render();status('База недоступна','offline');toast('Ошибка Firebase: '+(err?.code||err?.message||'unknown'),'error');return false;}}"
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
