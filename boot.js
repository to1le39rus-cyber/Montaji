const APP_URL = new URL(`app.js?runtime=20260819-2`, location.href);
const CONFIG_URL = new URL('firebase-config.js', location.href).href;

async function boot() {
  const response = await fetch(APP_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`APP_LOAD_${response.status}`);

  let source = await response.text();
  source = source.replace(
    /import \{ firebaseConfig \} from '\.\/firebase-config\.js';/,
    `import { firebaseConfig } from '${CONFIG_URL}';`
  );

  const loadServer = `async function loadServer(){
    if(!user||!online){
      serverReady=false;state=emptyState();notes=[];render();
      status('Нет интернета · данные не загружены','offline');
      return false;
    }
    status('Подключаем общую базу…');
    try{
      const sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));
      state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();
      serverReady=true;
      render();
      status('● Общая база · синхронизировано','online');
      try{
        const notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));
        notes=currentNotesData(notesSnap);
        renderNotes();
      }catch(notesErr){
        console.warn('Notes document unavailable; shared database remains usable.',notesErr);
        notes=[];
        renderNotes();
      }
      return true;
    }catch(err){
      console.error('Shared database load failed',err);
      serverReady=false;state=emptyState();notes=[];render();
      status('База недоступна','offline');
      toast('Не удалось получить данные с сервера.','error');
      return false;
    }
  }`;

  const patched = source.replace(
    /async function loadServer\(\)\{[\s\S]*?\}\n?function startRealtime/,
    `${loadServer}\nfunction startRealtime`
  );

  if (patched === source) throw new Error('LOAD_SERVER_PATCH_NOT_FOUND');

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
