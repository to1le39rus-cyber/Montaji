// Production bootstrap.
// Vercel serves this shell, while the production source lives on GitHub.
// Fetch app.js as text, inject the Firebase config, then evaluate it as a
// same-origin Blob module. This avoids raw.githubusercontent.com module MIME
// restrictions and keeps Firebase initialization deterministic.
const legacyNoteButton=document.createElement('button');
legacyNoteButton.id='todayNoteBtn';
legacyNoteButton.type='button';
legacyNoteButton.hidden=true;
document.body.appendChild(legacyNoteButton);

const BASE='https://raw.githubusercontent.com/to1le39rus-cyber/Montaji/Astera-smart/';
const APP_URL=BASE+'app.js?runtime=20260822-7';
const CONFIG_URL=BASE+'firebase-config.js?runtime=20260822-7';

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
