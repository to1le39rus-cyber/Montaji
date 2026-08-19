const RAW_BASE='https://raw.githubusercontent.com/to1le39rus-cyber/Montaji/qa-gate-20260820/';
const APP_URL=RAW_BASE+'app.js?runtime=20260820-4';

async function boot(){
  const response=await fetch(APP_URL,{cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source=await response.text();

  source=source.replace(
    "function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return activeJobs(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){const used=new Set(activeJobs(d).filter(j=>j.type==='Монтаж').map(j=>String(j.slot)));return ['1','2','3'].find(s=>!used.has(s))||'3';}",
    "function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return jobsForDate(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){return '1';}"
  );
  source=source.replace(
    "const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=editingType==='Монтаж'&&state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===s);",
    "const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=null;"
  );
  source=source.replace(
    "const conflict=state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===$('#jobSlot').value);",
    "const conflict=null;"
  );
  source=source.replace("$('#todayLoad').textContent=`${montageCount(d)}/3`;","$('#todayLoad').textContent=String(montageCount(d));");
  source=source.replace("$('#todayProgress').style.width=Math.min(100,montageCount(d)/3*100)+'%';","$('#todayProgress').style.width=montageCount(d)>0?'100%':'0%';");
  source=source.replace("if(tc===3)advice.push('🔥 Завтра 3/3 монтажей — день полностью загружен');else if(tc===2)advice.push('✨ Завтра осталось одно монтажное окно');","if(tc>0)advice.push(`✨ Завтра запланировано ${tc} монтажей`);");
  source=source.replace('<span>● 3/3</span>','<span>● монтажи</span>');
  source=source.replace("${c>=3?'full':c===2?'busy':c?'partial':''}","${c>0?'busy':''}");

  source=source.replace(
    /async function loadServer\(\)\{[\s\S]*?\}\nfunction startRealtime/,
    `async function loadServer(){
      if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}
      status('Подключаем общую базу…');
      let sharedSnap=null,lastErr=null;
      try{sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC))}
      catch(err){lastErr=err;try{sharedSnap=await F.getDoc(F.doc(db,...SHARED_DOC))}catch(cacheErr){lastErr=cacheErr}}
      if(!sharedSnap){console.error('Shared database load failed',lastErr);serverReady=false;state=emptyState();notes=[];render();const code=lastErr?.code?' ['+lastErr.code+']':'';status('База недоступна','offline');toast('Не удалось получить общую базу.'+code,'error');return false}
      state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();serverReady=true;render();status('● Общая база · синхронизировано','online');
      try{const notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));notes=currentNotesData(notesSnap)}catch(notesErr){console.warn('Notes unavailable; shared database remains usable.',notesErr);notes=[]}renderNotes();return true;
    }
function startRealtime`
  );

  // Make authentication failures impossible to miss on a phone.
  source=source.replace(
    /function bindAuth\(\)\{[\s\S]*?\}\nfunction currentNotesData/,
    `function bindAuth(){
      const form=$('#authForm'), submit=$('.auth-submit'), message=$('#authMessage');
      if(form)form.onsubmit=async e=>{e.preventDefault();const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!online)return authMessage('Нет интернета.',true);if(!email||!pass)return authMessage('Введите email и пароль.',true);if(submit){submit.disabled=true;submit.textContent='Входим…'}authMessage('Проверяем данные…');try{await F.authMod.signInWithEmailAndPassword(auth,email,pass)}catch(err){console.error('AUTH_LOGIN_FAILED',err);authMessage(authError(err),true)}finally{if(submit){submit.disabled=false;submit.textContent='Войти'}}};
      $('#signUpBtn').onclick=async()=>{const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!email||!pass)return authMessage('Введите email и пароль.',true);if(pass.length<6)return authMessage('Пароль должен быть не короче 6 символов.',true);try{const c=await F.authMod.createUserWithEmailAndPassword(auth,email,pass);await F.authMod.sendEmailVerification(c.user);await F.authMod.signOut(auth);authMessage('Письмо отправлено. Подтвердите email и войдите.')}catch(err){console.error('AUTH_SIGNUP_FAILED',err);authMessage(authError(err),true)}};
      $('#resetBtn').onclick=async()=>{const email=$('#authEmail').value.trim();if(!email)return authMessage('Введите email.',true);try{await F.authMod.sendPasswordResetEmail(auth,email);authMessage('Ссылка для сброса отправлена.')}catch(err){console.error('AUTH_RESET_FAILED',err);authMessage(authError(err),true)}};
      if(message){message.style.minHeight='24px';message.style.marginTop='14px';message.style.fontWeight='700';message.style.fontSize='14px';message.style.lineHeight='1.35'}
    }
function currentNotesData`
  );

  const blob=new Blob([source],{type:'text/javascript'});
  const url=URL.createObjectURL(blob);
  try{await import(url)}finally{URL.revokeObjectURL(url)}
}

boot().catch(error=>{
  console.error('Montaji boot failed',error);
  const el=document.querySelector('#syncStatus');
  if(el){el.textContent='Ошибка запуска';el.dataset.state='offline'}
  const toast=document.querySelector('#toast');
  if(toast){toast.textContent='Не удалось запустить рабочее приложение.';toast.dataset.state='error'}
});