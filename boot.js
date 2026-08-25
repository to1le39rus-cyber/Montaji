const APP_URL = new URL('app.js?runtime=20260825-sandbox-clean', location.href);

async function boot(){
  const response=await fetch(APP_URL,{cache:'no-store'});
  if(!response.ok)throw new Error(`APP_LOAD_${response.status}`);
  let source=await response.text();
  source=source.replace("const NOTES_DOC = ['appData', 'notes'];\n",'');
  source=source.replace(/let F, auth, db, user, unsubscribeShared=null, unsubscribeNotes=null; let state=emptyState\(\), notes=\[\], serverReady=false, online=navigator\.onLine;/,"let F, auth, db, user, unsubscribeShared=null; let state=emptyState(), serverReady=false, online=navigator.onLine;");
  source=source.replace(/function currentNotesData\([\s\S]*?\nasync function loadServer/,`async function loadServer(){if(!user||!online){serverReady=false;state=emptyState();render();status('Нет интернета · данные не загружены','offline');return false;}status('Подключаем общую базу…');try{const snap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));state=snap.exists()?normalize(snap.data().data):emptyState();serverReady=true;render();status('● Общая база · синхронизировано','online');return true;}catch(err){console.error(err);serverReady=false;state=emptyState();render();status('База недоступна','offline');toast('Не удалось получить данные с сервера.','error');return false;}}\nasync function startRealtime`);
  source=source.replace(/function startRealtime\(\)\{[\s\S]*?\nasync function saveShared/,`function startRealtime(){unsubscribeShared?.();if(!user||!online)return;unsubscribeShared=F.onSnapshot(F.doc(db,...SHARED_DOC),snap=>{if(!online)return;state=snap.exists()?normalize(snap.data().data):emptyState();serverReady=true;render();status('● Общая база · обновлено','online')},()=>{serverReady=false;status('Нет связи с общей базой','offline');toast('Потеряна связь с общей базой','error')});}\nasync function saveShared`);
  source=source.replace(/async function saveNotes\([\s\S]*?\nfunction jobsForDate/,'function jobsForDate');
  source=source.replace(/function renderNotes\(\)[\s\S]*?\nfunction bindCards/,'function renderNotes(){}\nfunction bindCards');
  source=source.replace(/function openNote\([\s\S]*?\nasync function setNoteState[\s\S]*?\nfunction bindCards/,'function bindCards');
  source=source.replaceAll('renderNotes();','');
  source=source.replace("<button id=\"dayNote\">＋ Заметка</button>",'');
  source=source.replace("m.querySelector('#dayNote').onclick=()=>{m.remove();openNote()};",'');
  source=source.replace("$('#todayNoteBtn').onclick=()=>openNote();",'');
  source=source.replace("['Монтаж','🛠'],['Замер','⌖'],['Рекламация','↺'],['Доставка','▣'],['Расход','−'],['Заметка','✦']","['Монтаж','🛠'],['Замер','⌖'],['Рекламация','↺'],['Доставка','▣'],['Расход','−']");
  source=source.replace("else if(t==='Заметка')openNote();else openJob",'else openJob');
  source=source.replace(/,notes\}/g,'}').replace(/notes\],/g,'],');
  source=source.replace(/if\(Array\.isArray\(parsed\?\.notes\)\)await saveNotes\([\s\S]*?\);/,'');
  source=source.replaceAll('notes=[];','');
  source=source.replaceAll('unsubscribeNotes?.();','');
  const themeCss=document.querySelector('link[href*="premium-field-tech.css"]');
  if(themeCss)themeCss.href='premium-field-tech.css?v=20260825-sandbox';
  else{const l=document.createElement('link');l.rel='stylesheet';l.href='premium-field-tech.css?v=20260825-sandbox';document.head.appendChild(l)}
  document.querySelector('#megaNotes')?.remove();
  document.querySelector('#todayNoteBtn')?.remove();
  const cleanup=document.createElement('style');cleanup.textContent='.sandbox-notes-old,.mega-notes,#controlSection{display:none!important}';document.head.appendChild(cleanup);
  source=source.replace("function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return activeJobs(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){const used=new Set(activeJobs(d).filter(j=>j.type==='Монтаж').map(j=>String(j.slot)));return ['1','2','3'].find(s=>!used.has(s))||'3';}","function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return jobsForDate(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){return '1';}");
  source=source.replace("const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=editingType==='Монтаж'&&state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===s);","const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=null;");
  source=source.replace("const conflict=state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===$('#jobSlot').value);","const conflict=null;");
  source=source.replace("$('#todayLoad').textContent=`${montageCount(d)}/3`;","$('#todayLoad').textContent=String(montageCount(d));");
  source=source.replace("$('#todayProgress').style.width=Math.min(100,montageCount(d)/3*100)+'%';","$('#todayProgress').style.width=montageCount(d)>0?'100%':'0%';");
  source=source.replace("if(tc===3)advice.push('🔥 Завтра 3/3 монтажей — день полностью загружен');else if(tc===2)advice.push('✨ Завтра осталось одно монтажное окно');","if(tc>0)advice.push(`✨ Завтра запланировано ${tc} монтажей`);");
  source=source.replace('<span>● 3/3</span>','<span>● монтажи</span>');
  source=source.replace("${c>=3?'full':c===2?'busy':c?'partial':''}","${c>0?'busy':''}");
  source=source.replace("function bindUI(){$('#themeBtn').onclick=()=>document.body.classList.toggle('dark');",`function applyTheme(theme){document.body.classList.toggle('dark',theme==='dark');document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111827':'#f5f7fb');const b=$('#themeBtn');if(b)b.textContent=theme==='dark'?'☀':'☾';try{localStorage.setItem('montaji-theme',theme)}catch(e){}}\nfunction bindUI(){applyTheme((()=>{try{return localStorage.getItem('montaji-theme')}catch(e){return null}})()||'light');$('#themeBtn').onclick=()=>applyTheme(document.body.classList.contains('dark')?'light':'dark');`);
  const blob=new Blob([source],{type:'text/javascript'});const url=URL.createObjectURL(blob);try{await import(url)}finally{URL.revokeObjectURL(url)}
  import('./sandbox-reset.js?v=20260825-1').catch(e=>console.warn('[sandbox] reset module failed',e));
}
boot().catch(error=>{console.error('Montaji boot failed',error);const el=document.querySelector('#syncStatus');if(el){el.textContent='Ошибка запуска';el.dataset.state='offline';}const toast=document.querySelector('#toast');if(toast){toast.textContent='Не удалось запустить приложение.';toast.dataset.state='error';}});
