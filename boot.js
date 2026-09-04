const APP_URL = new URL('app.js?runtime=20260904-notes-4', location.href);
const NOTES_URL = new URL('https://raw.githubusercontent.com/to1le39rus-cyber/Montaji/Astera-smart/notes-ui.js?runtime=20260904-notes-4');
const MONEY_UI_URL = new URL('money-ui.js?runtime=20260904-money-1', location.href);

async function boot(){
  const response = await fetch(APP_URL, {cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  const calendarStart = source.indexOf('function renderCalendar(){');
  const calendarEnd = source.indexOf('function openDay', calendarStart);
  if(calendarStart !== -1 && calendarEnd !== -1){
    const calendarFix = `function renderCalendar(){const y=month.getFullYear(),m=month.getMonth(),start=(new Date(y,m,1).getDay()+6)%7,last=new Date(y,m+1,0).getDate();let h='';for(let i=0;i<start;i++)h+='<div class="day blank"></div>';const montageWord=n=>n===1?'монтаж':(n>=2&&n<=4?'монтажа':'монтажей');for(let n=1;n<=last;n++){const k=dateKey(new Date(y,m,n)),js=jobsForDate(k),montages=js.filter(j=>j.type==='Монтаж'),c=montages.length,hasMeasure=js.some(isMeasure);h+=\`<button class="day \${c>=3?'full':c===2?'busy':c?'partial':''} \${hasMeasure?'has-measure':''} \${k===today()?'today':''}" data-date="\${k}"><b>\${n}</b><span>\${c} \${montageWord(c)}</span><i>\${c}/3\${hasMeasure?' · замер':''}</i></button>\`; }$('#scheduleMonth').textContent=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(month);$('#calendar').innerHTML=h;$$('.day[data-date]').forEach(b=>b.onclick=()=>openDay(b.dataset.date));}`;
    source = source.slice(0, calendarStart) + calendarFix + source.slice(calendarEnd);
  }

  const loadStart = source.indexOf('async function loadServer(){');
  const realtimeStart = source.indexOf('function startRealtime(){', loadStart);
  if(loadStart !== -1 && realtimeStart !== -1){
    const loadFix = `async function loadServer(){if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}status('Подключаем общую базу…');try{const sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();serverReady=true;notes=[];render();status('● Общая база · синхронизировано','online');}catch(err){console.error(err);serverReady=false;state=emptyState();notes=[];render();status('База недоступна','offline');toast('Не удалось получить данные с сервера.','error');return false;}try{const notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));notes=currentNotesData(notesSnap);}catch(err){console.warn('Notes load skipped',err);notes=[];}renderNotes();return true;}`;
    source = source.slice(0, loadStart) + loadFix + source.slice(realtimeStart);
  }

  const calendarContrast=document.createElement('style');
  calendarContrast.textContent=`
    .calendar .day.partial,.calendar .day.busy,.calendar .day.full{color:#172019!important;-webkit-text-fill-color:#172019!important;}
    .calendar .day.partial b,.calendar .day.partial span,.calendar .day.partial i,
    .calendar .day.busy b,.calendar .day.busy span,.calendar .day.busy i,
    .calendar .day.full b,.calendar .day.full span,.calendar .day.full i{color:#172019!important;-webkit-text-fill-color:#172019!important;opacity:1!important;}
  `;
  document.head.appendChild(calendarContrast);
  const blob = new Blob([source], {type:'text/javascript'});
  const url = URL.createObjectURL(blob);
  try {
    await import(url);
    await new Promise(resolve=>setTimeout(resolve,1500));
    const notesResponse = await fetch(NOTES_URL, {cache:'no-store'});
    if(!notesResponse.ok) throw new Error(`NOTES_LOAD_${notesResponse.status}`);
    const notesSource = await notesResponse.text();
    const notesBlob = new Blob([notesSource], {type:'text/javascript'});
    const notesModuleUrl = URL.createObjectURL(notesBlob);
    try { await import(notesModuleUrl); }
    finally { URL.revokeObjectURL(notesModuleUrl); }
    const moneyResponse = await fetch(MONEY_UI_URL, {cache:'no-store'});
    if(!moneyResponse.ok) throw new Error(`MONEY_UI_LOAD_${moneyResponse.status}`);
    const moneySource = await moneyResponse.text();
    const moneyBlob = new Blob([moneySource], {type:'text/javascript'});
    const moneyModuleUrl = URL.createObjectURL(moneyBlob);
    try { await import(moneyModuleUrl); }
    finally { URL.revokeObjectURL(moneyModuleUrl); }
  } finally { URL.revokeObjectURL(url); }
}
boot().catch(error=>{console.error('Montaji boot failed',error);const el=document.querySelector('#syncStatus');if(el){el.textContent='Ошибка запуска';el.dataset.state='offline'}const toast=document.querySelector('#toast');if(toast){toast.textContent=`Не удалось запустить приложение: ${error?.message||'ошибка'}`;toast.dataset.state='error'}});