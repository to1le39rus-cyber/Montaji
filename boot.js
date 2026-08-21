const APP_URL = new URL('app.js?runtime=20260821-4', location.href);

async function boot(){
  const response = await fetch(APP_URL,{cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  const themeCss=document.querySelector('link[href*="premium-field-tech.css"]');
  if(themeCss)themeCss.href='premium-field-tech.css?v=20260821-4';
  else{const l=document.createElement('link');l.rel='stylesheet';l.href='premium-field-tech.css?v=20260821-4';document.head.appendChild(l)}
  const notesCss=document.createElement('link');notesCss.rel='stylesheet';notesCss.href='notes-ui-fix.css?v=20260821-1';document.head.appendChild(notesCss);

  source = source.replace(
    "function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return activeJobs(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){const used=new Set(activeJobs(d).filter(j=>j.type==='Монтаж').map(j=>String(j.slot)));return ['1','2','3'].find(s=>!used.has(s))||'3';}",
    "function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return jobsForDate(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){return '1';}"
  );
  source = source.replace("const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=editingType==='Монтаж'&&state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===s);","const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=null;");
  source = source.replace("const conflict=state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===$('#jobSlot').value);","const conflict=null;");
  source = source.replace("$('#todayLoad').textContent=`${montageCount(d)}/3`;", "$('#todayLoad').textContent=String(montageCount(d));");
  source = source.replace("$('#todayProgress').style.width=Math.min(100,montageCount(d)/3*100)+'%';", "$('#todayProgress').style.width=montageCount(d)>0?'100%':'0%';");
  source = source.replace("if(tc===3)advice.push('🔥 Завтра 3/3 монтажей — день полностью загружен');else if(tc===2)advice.push('✨ Завтра осталось одно монтажное окно');", "if(tc>0)advice.push(`✨ Завтра запланировано ${tc} монтажей`);");
  source = source.replace('<span>● 3/3</span>','<span>● монтажи</span>');
  source = source.replace("${c>=3?'full':c===2?'busy':c?'partial':''}", "${c>0?'busy':''}");

  source = source.replace(/function bindAuth\(\)\{[\s\S]*?\nfunction currentNotesData/,`function bindAuth(){
      const form=$('#authForm');
      if(form&&!form.dataset.bound){form.dataset.bound='1';form.addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!online)return authMessage('Нет интернета.',true);if(!email||!pass)return authMessage('Введите email и пароль.',true);authMessage('Входим…');const button=form.querySelector('button[type="submit"]');if(button){button.disabled=true;button.textContent='Входим…';}try{await F.authMod.signInWithEmailAndPassword(auth,email,pass)}catch(err){authMessage(authError(err),true)}finally{if(button){button.disabled=false;button.textContent='Войти';}}},{passive:false});}
      $('#signUpBtn')?.addEventListener('click',async()=>{const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!email||!pass)return authMessage('Введите email и пароль.',true);if(pass.length<6)return authMessage('Пароль должен быть не короче 6 символов.',true);try{const c=await F.authMod.createUserWithEmailAndPassword(auth,email,pass);await F.authMod.sendEmailVerification(c.user);await F.authMod.signOut(auth);authMessage('Письмо отправлено. Подтвердите email и войдите.')}catch(err){authMessage(authError(err),true)}});
      $('#resetBtn')?.addEventListener('click',async()=>{const email=$('#authEmail').value.trim();if(!email)return authMessage('Введите email.',true);try{await F.authMod.sendPasswordResetEmail(auth,email);authMessage('Ссылка для сброса отправлена.')}catch(err){authMessage(authError(err),true)}});
    }
function currentNotesData`);

  source = source.replace(/async function loadServer\(\)\{[\s\S]*?\}\nfunction startRealtime/,`async function loadServer(){
      if(!user||!online){serverReady=false;state=emptyState();notes=[];render();status('Нет интернета · данные не загружены','offline');return false;}
      status('Подключаем общую базу…');let sharedSnap=null,notesSnap=null;
      try{sharedSnap=await F.getDocFromServer(F.doc(db,...SHARED_DOC));}catch(err){try{sharedSnap=await F.getDoc(F.doc(db,...SHARED_DOC));}catch(cacheErr){console.warn('Shared data unavailable',cacheErr);}}
      if(!sharedSnap){serverReady=false;state=emptyState();notes=[];render();status('База недоступна','offline');toast('Не удалось получить общую базу.','error');return false;}
      state=sharedSnap.exists()?normalize(sharedSnap.data().data):emptyState();const embedded=sharedSnap.exists()?currentNotesData(sharedSnap):[];
      try{notesSnap=await F.getDocFromServer(F.doc(db,...NOTES_DOC));notes=currentNotesData(notesSnap);if(!notes.length&&embedded.length)notes=embedded;}catch(notesErr){console.warn('Notes document unavailable; using shared fallback.',notesErr);notes=embedded;}
      serverReady=true;render();status('● Общая база · синхронизировано','online');renderNotes();return true;
    }
function startRealtime`);

  source = source.replace(/async function saveNotes\(mutator\)\{[\s\S]*?\}\nfunction jobsForDate/,`async function saveNotes(mutator){
      if(!serverReady||!online||!user)throw new Error('Нет соединения с общей базой');
      const ref=F.doc(db,...NOTES_DOC),sharedRef=F.doc(db,...SHARED_DOC),snap=await F.getDoc(ref).catch(()=>null),cur={notes:currentNotesData(snap)};
      const next=await mutator(JSON.parse(JSON.stringify(cur))),safeNotes=Array.isArray(next?.notes)?next.notes:[];
      try{await F.setDoc(ref,{data:{notes:safeNotes},version:1,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true});}
      catch(primaryErr){console.warn('Primary notes document write failed; saving into shared document.',primaryErr);await F.runTransaction(db,async tx=>{const shared=await tx.get(sharedRef),data=shared.exists()?shared.data()?.data||{}:{};tx.set(sharedRef,{data:{...data,notes:safeNotes},version:5,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true})});}
      notes=safeNotes;renderNotes();
    }
function jobsForDate`);

  source = source.replace(/function startRealtime\(\)\{[\s\S]*?\nasync function saveShared/,`function startRealtime(){unsubscribeShared?.();unsubscribeNotes?.();if(!user||!online)return;unsubscribeShared=F.onSnapshot(F.doc(db,...SHARED_DOC),snap=>{if(!online)return;state=snap.exists()?normalize(snap.data().data):emptyState();serverReady=true;render();status('● Общая база · обновлено','online')},()=>{serverReady=false;status('Нет связи с общей базой','offline');toast('Потеряна связь с общей базой','error')});unsubscribeNotes=F.onSnapshot(F.doc(db,...NOTES_DOC),snap=>{if(!online)return;const remote=currentNotesData(snap);if(remote.length||snap.exists())notes=remote;renderNotes()},()=>{});}
async function saveShared`);

  /* Notes: shared operational reminders with optional due date. */
  source = source.replace(/function renderNotes\(\)\{[\s\S]*?\nfunction bindCards/,`function renderNotes(){const active=$('#activeNotes'),archive=$('#archivedNotes');if(!active||!archive)return;const now=today(),sortNotes=(a,b)=>{const ad=a.dueDate||'9999-12-31',bd=b.dueDate||'9999-12-31';return ad.localeCompare(bd)||(b.updatedAt||'').localeCompare(a.updatedAt||'')};const a=notes.filter(n=>n.archived!==true).slice().sort(sortNotes),ar=notes.filter(n=>n.archived===true).slice().sort(sortNotes);active.innerHTML=a.length?a.map(noteCard).join(''):'<div class="muted">Активных заметок нет</div>';archive.innerHTML=ar.length?ar.map(noteCard).join(''):'<div class="muted">Архив пуст</div>';bindNotes();}
function noteCard(n){const due=n.dueDate?fmtShort(n.dueDate):'';const overdue=n.dueDate&&n.dueDate<today()&&!n.archived;return`<div class="note-card ${n.archived?'archived':''}"><div class="note-top"><div><b>${esc(n.title||'Заметка')}</b>${due?`<div class="note-due ${overdue?'overdue':''}">${overdue?'⚠️ Просрочено':'📅'} ${esc(due)}</div>`:''}</div><div><button class="mini-btn" data-note-edit="${esc(n.id)}">Изм.</button>${n.archived?`<button class="mini-btn" data-note-restore="${esc(n.id)}">Вернуть</button>`:`<button class="mini-btn" data-note-archive="${esc(n.id)}">Архив</button>`}<button class="mini-btn note-delete" data-note-delete="${esc(n.id)}">Удалить</button></div></div>${n.text?`<p>${esc(n.text)}</p>`:''}</div>`;}
function bindNotes(){$$('.mini-btn').forEach(b=>{b.onclick=async()=>{const id=b.dataset.noteEdit||b.dataset.noteArchive||b.dataset.noteRestore||b.dataset.noteDelete,n=notes.find(x=>x.id===id);if(!n)return;if(b.dataset.noteEdit)return openNote(n);if(b.dataset.noteDelete){if(!confirm(`Удалить заметку «${n.title||'Без названия'}» навсегда?`))return;try{await saveNotes(cur=>({...cur,notes:(cur.notes||[]).filter(x=>x.id!==id)}));toast('Заметка удалена','success')}catch(e){toast('Не удалось удалить заметку','error')}return;}return setNoteState(id,!!b.dataset.noteArchive)}});}
function openNote(n=null){const m=document.createElement('div');m.className='modal open';m.innerHTML=`<div class="backdrop"></div><div class="sheet"><div class="sheet-head"><div><div class="eyebrow">Общие заметки</div><h2>${n?'Изменить заметку':'Новая заметка'}</h2></div><button class="circle-btn" data-close>×</button></div><form id="noteForm"><label>Что нужно сделать<input id="nTitle" required placeholder="Например: позвонить по рекламации" value="${esc(n?.title||'')}"></label><label>Подробности<textarea id="nText" rows="4" placeholder="Что именно нужно не забыть?">${esc(n?.text||'')}</textarea></label><label>Когда<input id="nDue" type="date" value="${esc(n?.dueDate||'')}"></label><button class="primary wide" type="submit">Сохранить</button></form></div>`;document.body.append(m);m.querySelector('.backdrop').onclick=()=>m.remove();m.querySelector('[data-close]').onclick=()=>m.remove();$('#noteForm',m).onsubmit=async e=>{e.preventDefault();const item={id:n?.id||uid(),title:$('#nTitle',m).value.trim(),text:$('#nText',m).value.trim(),dueDate:$('#nDue',m).value||'',archived:n?.archived===true,updatedAt:new Date().toISOString()};if(!item.title)return toast('Напишите, что нужно сделать','error');try{await saveNotes(cur=>({...cur,notes:[...(cur.notes||[]).filter(x=>x.id!==item.id),item]}));m.remove();toast('Заметка сохранена','success')}catch(err){toast('Не удалось сохранить заметку','error')}};}
async function setNoteState(id,archived){try{await saveNotes(cur=>({...cur,notes:(cur.notes||[]).map(n=>n.id===id?{...n,archived,updatedAt:new Date().toISOString()}:n)}));toast(archived?'В архив':'Вернули заметку','success')}catch(e){toast('Не удалось изменить заметку','error')}}
function bindCards`);

  source = source.replace("function bindUI(){$('#themeBtn').onclick=()=>document.body.classList.toggle('dark');",`function applyTheme(theme){document.body.classList.toggle('dark',theme==='dark');document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111827':'#f5f7fb');const b=$('#themeBtn');if(b)b.textContent=theme==='dark'?'☀':'☾';try{localStorage.setItem('montaji-theme',theme)}catch(e){}}
function bindUI(){applyTheme((()=>{try{return localStorage.getItem('montaji-theme')}catch(e){return null}})()||'light');$('#themeBtn').onclick=()=>applyTheme(document.body.classList.contains('dark')?'light':'dark');`);

  const blob = new Blob([source],{type:'text/javascript'});
  const url = URL.createObjectURL(blob);
  try { await import(url); }
  finally { URL.revokeObjectURL(url); }
}

boot().catch(error=>{console.error('Montaji boot failed',error);const el=document.querySelector('#syncStatus');if(el){el.textContent='Ошибка запуска';el.dataset.state='offline';}const toast=document.querySelector('#toast');if(toast){toast.textContent='Не удалось запустить рабочее приложение.';toast.dataset.state='error';}});
