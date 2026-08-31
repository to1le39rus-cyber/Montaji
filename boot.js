const APP_URL = new URL('app.js?runtime=20260831-auth-savefix-3', location.href);

async function boot(){
  const response=await fetch(APP_URL,{cache:'no-store'});
  if(!response.ok)throw new Error(`APP_LOAD_${response.status}`);
  let source=await response.text();

  // Firebase auth: keep the session across Safari reloads and do not kick a
  // valid internal user back to the login screen only because emailVerified
  // is false.
  source=source.replace("auth=authMod.getAuth(app);db=fs.getFirestore(app);F={...fs,authMod};","auth=authMod.getAuth(app);await authMod.setPersistence(auth,authMod.browserLocalPersistence).catch(err=>console.warn('Auth persistence setup failed',err));db=fs.getFirestore(app);F={...fs,authMod};");
  source=source.replace("if(!u.emailVerified){await F.authMod.signOut(auth);showAuth(true);authMessage('Подтвердите email по ссылке из письма.',true);return}","if(false&&u.emailVerified===false){await F.authMod.signOut(auth);showAuth(true);authMessage('Подтвердите email по ссылке из письма.',true);return}");

  // Auth form: prevent any native form navigation/reload.
  source=source.replace(/function bindAuth\(\)\{[\s\S]*?\nfunction currentNotesData/,`function bindAuth(){
    const form=$('#authForm');
    if(form&&!form.dataset.bound){
      form.dataset.bound='1';
      form.addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!online)return authMessage('Нет интернета.',true);if(!email||!pass)return authMessage('Введите email и пароль.',true);authMessage('Входим…');const b=form.querySelector('button[type="submit"]');if(b){b.disabled=true;b.textContent='Входим…'}try{await F.authMod.signInWithEmailAndPassword(auth,email,pass)}catch(err){authMessage(authError(err),true)}finally{if(b){b.disabled=false;b.textContent='Войти'}}},{passive:false});
    }
    $('#signUpBtn')?.addEventListener('click',async()=>{const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!email||!pass)return authMessage('Введите email и пароль.',true);if(pass.length<6)return authMessage('Пароль должен быть не короче 6 символов.');try{const c=await F.authMod.createUserWithEmailAndPassword(auth,email,pass);authMessage('Аккаунт создан. Входим…');}catch(err){authMessage(authError(err),true)}});
    $('#resetBtn')?.addEventListener('click',async()=>{const email=$('#authEmail').value.trim();if(!email)return authMessage('Введите email.',true);try{await F.authMod.sendPasswordResetEmail(auth,email);authMessage('Ссылка для сброса отправлена.')}catch(err){authMessage(authError(err),true)}});
  }
function currentNotesData`);

  // Loading the shared document must not fail the whole app when the notes
  // document is temporarily unavailable.
  source=source.replace(/async function loadServer\(\){[\s\S]*?\}\nfunction startRealtime/,`async function loadServer(){
    if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}
    status('Подключаем общую базу…');let sharedSnap=null,notesSnap=null;
    try{sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));}catch(err){try{sharedSnap=await F.getDoc(F.doc(db,...SHARED_DOC));}catch(cacheErr){console.warn('Shared data unavailable',cacheErr);}}
    if(!sharedSnap){serverReady=false;state=emptyState();notes=[];render();status('База недоступна','offline');toast('Не удалось получить общую базу.','error');return false;}
    state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();const embedded=sharedSnap.exists()?currentNotesData(sharedSnap):[];
    try{notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));notes=currentNotesData(notesSnap);if(!notes.length&&embedded.length)notes=embedded;}catch(err){notes=embedded;console.warn('Notes document unavailable',err)}
    serverReady=true;render();status('● Общая база · синхронизировано','online');return true;
  }
function startRealtime`);

  // Montage/notes writes are direct Firestore writes and do not depend on a
  // realtime listener being ready first.
  source=source.replace(/async function saveShared\(mutator\)\{[\s\S]*?\}\nasync function saveNotes/,`async function saveShared(mutator){
    if(!online||!user)throw new Error('Нет соединения с общей базой');
    const ref=F.doc(db,...SHARED_DOC);let snap;
    try{snap=await F.getDocFromServer(ref)}catch(e){snap=await F.getDoc(ref)}
    const current=snap.exists()?normalize(snap.data().data):emptyState(),next=normalize(await mutator(current));
    try{await F.setDoc(ref,{data:next,version:5,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true});}
    catch(primaryErr){
      try{await F.runTransaction(db,async tx=>{const s=await tx.get(ref),latest=s.exists()?normalize(s.data().data):emptyState(),latestNext=normalize(await mutator(latest));tx.set(ref,{data:latestNext,version:5,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true})})}
      catch(txErr){throw new Error(`Не удалось сохранить [${txErr?.code||primaryErr?.code||'unknown'}]`)}
    }
    state=next;render();
  }
async function saveNotes`);

  source=source.replace(/async function saveNotes\(mutator\)\{[\s\S]*?\}\nfunction jobsForDate/,`async function saveNotes(mutator){
    if(!online||!user)throw new Error('Нет соединения с общей базой');
    const ref=F.doc(db,...NOTES_DOC),sharedRef=F.doc(db,...SHARED_DOC),snap=await F.getDoc(ref).catch(()=>null),cur={notes:currentNotesData(snap)};
    const next=await mutator(JSON.parse(JSON.stringify(cur))),safe=Array.isArray(next?.notes)?next.notes:[];
    try{await F.setDoc(ref,{data:{notes:safe},version:1,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true})}
    catch(e){await F.runTransaction(db,async tx=>{const s=await tx.get(sharedRef),data=s.exists()?s.data()?.data||{}:{};tx.set(sharedRef,{data:{...data,notes:safe},version:5,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true})})}
    notes=safe;renderNotes();
  }
function jobsForDate`);

  source=source.replace("async function saveJob(e){e.preventDefault();if(!serverReady)return toast('Нет соединения с общей базой.','error');","async function saveJob(e){e.preventDefault();if(!online||!user)return toast('Нет соединения с общей базой.','error');");
  source=source.replace("function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return activeJobs(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){const used=new Set(activeJobs(d).filter(j=>j.type==='Монтаж').map(j=>String(j.slot)));return ['1','2','3'].find(s=>!used.has(s))||'3';}","function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return jobsForDate(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){return '1';}");
  source=source.replace("const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=editingType==='Монтаж'&&state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===s);","const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=null;");
  source=source.replace("const conflict=state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===$('#jobSlot').value);","const conflict=null;");

  // Quiet Cupertino shell fixes kept from the previous production repair.
  source=source.replace("$('#todayLoad').textContent=`${montageCount(d)}/3`;","$('#todayLoad').textContent=String(montageCount(d));");
  source=source.replace("$('#todayProgress').style.width=Math.min(100,montageCount(d)/3*100)+'%';","$('#todayProgress').style.width=montageCount(d)>0?'100%':'0%';");
  source=source.replace("if(tc===3)advice.push('🔥 Завтра 3/3 монтажей — день полностью загружен');else if(tc===2)advice.push('✨ Завтра осталось одно монтажное окно');","if(tc>0)advice.push(`✨ Завтра запланировано ${tc} монтажей`);");
  source=source.replace('<span>● 3/3</span>','<span>● монтажи</span>');
  source=source.replace("${c>=3?'full':c===2?'busy':c?'partial':''}","${c>0?'busy':''}");

  const themeCss=document.querySelector('link[href*="premium-field-tech.css"]');
  if(themeCss)themeCss.href='premium-field-tech.css?v=20260821-6';
  else{const l=document.createElement('link');l.rel='stylesheet';l.href='premium-field-tech.css?v=20260821-6';document.head.appendChild(l)}
  for(const href of ['notes-ui-fix.css?v=20260821-1','control-ui-fix.css?v=20260821-1']){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}

  const blob=new Blob([source],{type:'text/javascript'}),url=URL.createObjectURL(blob);
  try{await import(url)}finally{URL.revokeObjectURL(url)}
}
boot().catch(error=>{console.error('Montaji boot failed',error);const el=document.querySelector('#syncStatus');if(el){el.textContent='Ошибка запуска';el.dataset.state='offline'}const toast=document.querySelector('#toast');if(toast){toast.textContent='Не удалось запустить приложение.';toast.dataset.state='error'}});
