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
