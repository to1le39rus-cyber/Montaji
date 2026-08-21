const APP_URL = new URL('app.js?runtime=20260821-1', location.href);

async function boot(){
  const response = await fetch(APP_URL,{cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  // Keep QA/runtime compatibility patches in the loader so the canonical
  // application source stays intact.
  source = source.replace(
    "function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return activeJobs(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){const used=new Set(activeJobs(d).filter(j=>j.type==='Монтаж').map(j=>String(j.slot)));return ['1','2','3'].find(s=>!used.has(s))||'3';}",
    "function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return jobsForDate(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){return '1';}"
  );
  source = source.replace(
    "const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=editingType==='Монтаж'&&state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===s);",
    "const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=null;"
  );
  source = source.replace(
    "const conflict=state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===$('#jobSlot').value);",
    "const conflict=null;"
  );
  source = source.replace("$('#todayLoad').textContent=`${montageCount(d)}/3`;", "$('#todayLoad').textContent=String(montageCount(d));");
  source = source.replace("$('#todayProgress').style.width=Math.min(100,montageCount(d)/3*100)+'%';", "$('#todayProgress').style.width=montageCount(d)>0?'100%':'0%';");
  source = source.replace("if(tc===3)advice.push('🔥 Завтра 3/3 монтажей — день полностью загружен');else if(tc===2)advice.push('✨ Завтра осталось одно монтажное окно');", "if(tc>0)advice.push(`✨ Завтра запланировано ${tc} монтажей`);");
  source = source.replace('<span>● 3/3</span>','<span>● монтажи</span>');
  source = source.replace("${c>=3?'full':c===2?'busy':c?'partial':''}", "${c>0?'busy':''}");

  // Bind authentication before the rest of the UI so a UI error cannot
  // trigger a native form reload on mobile Safari.
  source = source.replace(
    "(async()=>{try{bindUI();bindAuth();await initFirebase();F.authMod.onAuthStateChanged(auth,onUser)}catch(e){console.error(e);showAuth(true);authMessage('Не удалось запустить приложение. Проверьте Firebase.',true)}})();",
    "(async()=>{try{bindAuth();bindUI();await initFirebase();F.authMod.onAuthStateChanged(auth,onUser)}catch(e){console.error(e);showAuth(true);authMessage('Не удалось запустить приложение: '+(e?.message||'проверьте Firebase.'),true)}})();"
  );

  source = source.replace(
    /async function loadServer\(\){[\s\S]*?\}\nfunction startRealtime/,
    `async function loadServer(){
      if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}
      status('Подключаем общую базу…');
      let sharedSnap=null,lastErr=null;
      try{sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));}
      catch(err){lastErr=err;try{sharedSnap=await F.getDoc(F.doc(db,...SHARED_DOC));}catch(cacheErr){lastErr=cacheErr;}}
      if(!sharedSnap){
        console.error('Shared database load failed',lastErr);
        serverReady=false;state=emptyState();notes=[];render();
        const code=lastErr?.code?' ['+lastErr.code+']':'';
        status('База недоступна','offline');
        toast('Не удалось получить общую базу.'+code,'error');
        return false;
      }
      state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();
      serverReady=true;render();status('● Общая база · синхронизировано','online');
      try{const notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));notes=currentNotesData(notesSnap);}
      catch(notesErr){console.warn('Notes unavailable; shared database remains usable.',notesErr);notes=[];}
      renderNotes();return true;
    }
function startRealtime`
  );

  // Notes are a small shared dataset. Avoid the previous transaction path:
  // it could fail on mobile even though the authenticated shared database
  // was available. Use a normal Firestore read + set and surface the real
  // Firebase error code if something still blocks the write.
  source = source.replace(
    /async function saveNotes\(mutator\)\{[\s\S]*?\}\nfunction jobsForDate/,
    `async function saveNotes(mutator){
      if(!serverReady||!online||!user)throw new Error('Нет соединения с общей базой');
      const ref=F.doc(db,...NOTES_DOC);
      const snap=await F.getDoc(ref);
      const cur={notes:currentNotesData(snap)};
      const next=await mutator(JSON.parse(JSON.stringify(cur)));
      const safeNotes=Array.isArray(next?.notes)?next.notes:[];
      await F.setDoc(ref,{data:{notes:safeNotes},version:1,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true});
      notes=safeNotes;
      renderNotes();
    }
function jobsForDate`
  );

  // Persist a simple two-state theme. Dark remains the default; light is
  // intentionally quieter and warm enough for daytime work.
  source = source.replace(
    "function bindUI(){$('#themeBtn').onclick=()=>document.body.classList.toggle('dark');",
    `function applyTheme(theme){document.body.classList.toggle('light-theme',theme==='light');document.body.classList.toggle('dark',theme!=='light');const b=$('#themeBtn');if(b)b.textContent=theme==='light'?'☾':'☼';localStorage.setItem('montaji-theme',theme);}
function bindUI(){applyTheme(localStorage.getItem('montaji-theme')||'dark');$('#themeBtn').onclick=()=>applyTheme(document.body.classList.contains('light-theme')?'dark':'light');`
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