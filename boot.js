const APP_URL = new URL(`app.js?runtime=20260819-5`, location.href);
const CONFIG_URL = new URL('firebase-config.js', location.href).href;

async function boot() {
  const response = await fetch(APP_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`APP_LOAD_${response.status}`);

  let source = await response.text();
  source = source.replace(
    /import \{ firebaseConfig \} from '\.\/firebase-config\.js';/,
    `import { firebaseConfig } from '${CONFIG_URL}';`
  );

  // Shared Firestore is authoritative. Notes are deliberately non-blocking.
  // The loader first asks the server, then falls back to the browser cache.
  // A temporary notes failure must never blank the montage database.
  const loadServer = `async function loadServer(){
    if(!user||!online){
      serverReady=false;state=emptyState();notes=[];render();
      status('Нет интернета · данные не загружены','offline');
      return false;
    }
    status('Подключаем общую базу…');
    let sharedSnap;
    let lastErr;
    for(let attempt=0;attempt<2;attempt++){
      try{
        sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));
        break;
      }catch(err){
        lastErr=err;
        if(attempt===0) await new Promise(r=>setTimeout(r,450));
      }
    }
    if(!sharedSnap){
      try{
        sharedSnap=await F.getDoc(F.doc(db,...SHARED_DOC));
      }catch(cacheErr){
        lastErr=cacheErr;
      }
    }
    if(!sharedSnap){
      console.error('Shared database load failed',lastErr);
      serverReady=false;state=emptyState();notes=[];render();
      const code=lastErr?.code?` [${lastErr.code}]`:'';
      status(code.includes('permission-denied')?'Нет доступа к общей базе':'База недоступна','offline');
      toast(`Не удалось получить данные с сервера.${code}`,'error');
      return false;
    }
    state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();
    serverReady=true;
    render();
    status('● Общая база · синхронизировано','online');
    try{
      const notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));
      notes=currentNotesData(notesSnap);
    }catch(notesErr){
      console.warn('Notes unavailable; shared database remains usable.',notesErr);
      notes=[];
    }
    renderNotes();
    return true;
  }`;

  const anonymousAuth = `async function onUser(u){
    user=u;
    unsubscribeShared?.();
    unsubscribeNotes?.();
    unsubscribeShared=unsubscribeNotes=null;
    if(!u){
      serverReady=false;state=emptyState();notes=[];showAuth(false);render();
      status('Подключаем общую базу…');
      try{
        await F.authMod.signInAnonymously(auth);
      }catch(err){
        console.error('Anonymous auth failed',err);
        showAuth(true);
        authMessage('Не удалось подключиться к общей базе.',true);
        status('База недоступна','offline');
      }
      return;
    }
    if(u.isAnonymous){
      showAuth(false);
      if(await loadServer()) startRealtime();
      return;
    }
    if(!u.emailVerified){
      await F.authMod.signOut(auth);
      showAuth(true);
      authMessage('Подтвердите email по ссылке из письма.',true);
      return;
    }
    showAuth(false);
    if(await loadServer()) startRealtime();
  }`;

  let patched = source.replace(
    /async function loadServer\(\)\{[\s\S]*?\}\n?function startRealtime/,
    `${loadServer}\nfunction startRealtime`
  );
  patched = patched.replace(
    /async function onUser\(u\)\{[\s\S]*?\}\n?\(async\(\)=>\{/,
    `${anonymousAuth}\n(async()=>{`
  );

  if (patched === source) throw new Error('PRODUCTION_PATCH_NOT_APPLIED');
  if (!patched.includes('signInAnonymously')) throw new Error('ANONYMOUS_AUTH_PATCH_NOT_APPLIED');
  if (!patched.includes('Notes unavailable; shared database remains usable.')) throw new Error('SHARED_DB_PATCH_NOT_APPLIED');

  const blob = new Blob([patched], { type: 'text/javascript' });
  const moduleUrl = URL.createObjectURL(blob);
  try {
    await import(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

boot().catch(error => {
  console.error('Montaji boot failed', error);
  const el=document.querySelector('#syncStatus');
  if(el){el.textContent='Ошибка запуска';el.dataset.state='offline';}
  const toast=document.querySelector('#toast');
  if(toast){toast.textContent='Не удалось запустить рабочее приложение.';toast.dataset.state='error';}
});
