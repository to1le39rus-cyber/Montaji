const APP_URL = new URL(`app.js?runtime=20260820-1`, location.href);
const CONFIG_URL = new URL('firebase-config.js', location.href).href;

async function boot(){
  const response = await fetch(APP_URL,{cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  source = source.replace(
    /import \{ firebaseConfig \} from '\.\/firebase-config\.js';/,
    `import { firebaseConfig } from '${CONFIG_URL}';`
  );

  // Business rule: there is NO daily montage limit. The three slots are only presets.
  source = source.replace(
    /function jobsForDate\(d\)\{[\s\S]*?\nfunction periodBounds/,
    `function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return jobsForDate(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){return '1';}
function periodBounds`
  );

  // Multiple montages may use the same preset slot; a slot is not a uniqueness constraint.
  source = source.replace(
    /const d=\$\('#jobDate'\)\.value,s=\$\('#jobSlot'\)\.value,id=\$\('#jobId'\)\.value,conflict=editingType==='Монтаж'&&state\.jobs\.find\([\s\S]*?\);/,
    `const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=null;`
  );
  source = source.replace(
    /const conflict=state\.jobs\.find\([\s\S]*?\);/,
    `const conflict=null;`
  );

  source = source.replace(/\$\('#todayLoad'\)\.textContent=`\$\{montageCount\(d\)\}\/3`;/,
    `$('#todayLoad').textContent=String(montageCount(d));`);
  source = source.replace(/\$\('#todayProgress'\)\.style\.width=Math\.min\(100,montageCount\(d\)\/3\*100\)+'%';/,
    `$('#todayProgress').style.width=montageCount(d)>0?'100%':'0%';`);
  source = source.replace(/if\(tc===3\)advice\.push\('🔥 Завтра 3\/3 монтажей — день полностью загружен'\);else if\(tc===2\)advice\.push\('✨ Завтра осталось одно монтажное окно'\);/,
    `if(tc>0)advice.push(\`✨ Завтра запланировано \${tc} монтажей\`);`);
  source = source.replace(/<span>● 3\/3<\/span>/g,'<span>● монтажи</span>');
  source = source.replace(/\$\{c>=3\?'full':c>0\?'busy':''\}/g,`\${c>0?'busy':''}`);

  // A notes problem must never take the shared working database down with it.
  source = source.replace(
    /async function loadServer\(\)\{[\s\S]*?\}\nfunction startRealtime/,
    `async function loadServer(){
      if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}
      status('Подключаем общую базу…');
      let sharedSnap=null,lastErr=null;
      for(let attempt=0;attempt<2&&!sharedSnap;attempt++){
        try{sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));}
        catch(err){lastErr=err;if(attempt===0)await new Promise(r=>setTimeout(r,400));}
      }
      if(!sharedSnap){
        try{sharedSnap=await F.getDoc(F.doc(db,...SHARED_DOC));}
        catch(err){lastErr=err;}
      }
      if(!sharedSnap){
        console.error('Shared database load failed',lastErr);
        serverReady=false;state=emptyState();notes=[];render();
        const code=lastErr?.code ? ' ['+lastErr.code+']' : '';
        status('База недоступна','offline');
        toast('Не удалось получить общую базу.'+code,'error');
        return false;
      }
      state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();
      serverReady=true;render();status('● Общая база · синхронизировано','online');
      try{const notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));notes=currentNotesData(notesSnap);}
      catch(notesErr){console.warn('Notes unavailable; shared database remains usable.',notesErr);notes=[];}
      renderNotes();
      return true;
    }
function startRealtime`
  );

  const blob = new Blob([source],{type:'text/javascript'});
  const url = URL.createObjectURL(blob);
  try { await import(url); }
  finally { URL.revokeObjectURL(url); }
}

boot().catch(error=>{
  console.error('Montaji boot failed',error);
  const el=document.querySelector('#syncStatus');
  if(el){el.textContent='Ошибка запуска';el.dataset.state='offline';}
  const toast=document.querySelector('#toast');
  if(toast){toast.textContent='Не удалось запустить рабочее приложение.';toast.dataset.state='error';}
});
