const APP_URL = new URL('app.js?runtime=20260821-7', location.href);
const CONFIG_URL = new URL('firebase-config.js?runtime=20260821-7', location.href).href;

async function boot(){
  const response = await fetch(APP_URL,{cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  const themeCss=document.querySelector('link[href*="premium-field-tech.css"]');
  if(themeCss)themeCss.href='premium-field-tech.css?v=20260821-7';
  else{const l=document.createElement('link');l.rel='stylesheet';l.href='premium-field-tech.css?v=20260821-7';document.head.appendChild(l)}
  const notesCss=document.createElement('link');notesCss.rel='stylesheet';notesCss.href='notes-ui-fix.css?v=20260821-1';document.head.appendChild(notesCss);
  const controlCss=document.createElement('link');controlCss.rel='stylesheet';controlCss.href='control-ui-fix.css?v=20260821-1';document.head.appendChild(controlCss);

  source = source.replace("import { firebaseConfig } from './firebase-config.js';",`const { firebaseConfig } = await import(${JSON.stringify(CONFIG_URL)});`);
  source = source.replace("function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return activeJobs(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){const used=new Set(activeJobs(d).filter(j=>j.type==='Монтаж').map(j=>String(j.slot)));return ['1','2','3'].find(s=>!used.has(s))||'3';}","function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return jobsForDate(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){return '1';}");
  source = source.replace("const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=editingType==='Монтаж'&&state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===s);","const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=null;");
  source = source.replace("const conflict=state.jobs.find(j=>j.id!==id&&!isCancelled(j)&&!isDone(j)&&j.type==='Монтаж'&&j.date===d&&String(j.slot)===$('#jobSlot').value);","const conflict=null;");
  source = source.replace("$('#todayLoad').textContent=`${montageCount(d)}/3`;","$('#todayLoad').textContent=String(montageCount(d));");
  source = source.replace("$('#todayProgress').style.width=Math.min(100,montageCount(d)/3*100)+'%';","$('#todayProgress').style.width=montageCount(d)>0?'100%':'0%';");
  source = source.replace("if(tc===3)advice.push('🔥 Завтра 3/3 монтажей — день полностью загружен');else if(tc===2)advice.push('✨ Завтра осталось одно монтажное окно');","if(tc>0)advice.push(`✨ Завтра запланировано ${tc} монтажей`);");
  source = source.replace('<span>● 3/3</span>','<span>● монтажи</span>');
  source = source.replace("${c>=3?'full':c===2?'busy':c?'partial':''}","${c>0?'busy':''}");

  source = source.replace(/function bindAuth\(\)\{[\s\S]*?\nfunction currentNotesData/,`function bindAuth(){
      const form=$('#authForm');
      if(form&&!form.dataset.bound){form.dataset.bound='1';form.addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!online)return authMessage('Нет интернета.',true);if(!email||!pass)return authMessage('Введите email и пароль.',true);authMessage('Входим…');const button=form.querySelector('button[type="submit"]');if(button){button.disabled=true;button.textContent='Входим…';}try{await F.authMod.signInWithEmailAndPassword(auth,email,pass)}catch(err){authMessage(authError(err),true)}finally{if(button){button.disabled=false;button.textContent='Войти';}}},{passive:false});}
      $('#signUpBtn')?.addEventListener('click',async()=>{const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!email||!pass)return authMessage('Введите email или пароль.',true);if(pass.length<6)return authMessage('Пароль должен быть не короче 6 символов.');try{const c=await F.authMod.createUserWithEmailAndPassword(auth,email,pass);await F.authMod.sendEmailVerification(c.user);await F.authMod.signOut(auth);authMessage('Письмо отправлено. Подтвердите email и войдите.')}catch(err){authMessage(authError(err),true)}});
      $('#resetBtn')?.addEventListener('click',async()=>{const email=$('#authEmail').value.trim();if(!email)return authMessage('Введите email.',true);try{await F.authMod.sendPasswordResetEmail(auth,email);authMessage('Ссылка для сброса отправлена.')}catch(err){authMessage(authError(err),true)}});
    }
function currentNotesData`);

  source = source.replace(/async function loadServer\(\){[\s\S]*?\}\nfunction startRealtime/,`async function loadServer(){
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
      try{await F.setDoc(ref,{data:{notes:safeNotes},version:1,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true});}catch(primaryErr){console.warn('Primary notes document write failed; saving into shared document.',primaryErr);await F.runTransaction(db,async tx=>{const shared=await tx.get(sharedRef),data=shared.exists()?shared.data()?.data||{}:{};tx.set(sharedRef,{data:{...data,notes:safeNotes},version:5,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true})});}
      notes=safeNotes;renderNotes();
    }
function jobsForDate`);

  source = source.replace(/function startRealtime\(\)\{[\s\S]*?\nasync function saveShared/,`function startRealtime(){unsubscribeShared?.();unsubscribeNotes?.();if(!user||!online)return;unsubscribeShared=F.onSnapshot(F.doc(db,...SHARED_DOC),snap=>{if(!online)return;state=snap.exists()?normalize(snap.data().data):emptyState();serverReady=true;render();status('● Общая база · обновлено','online')},()=>{serverReady=false;status('Нет связи с общей базой','offline');toast('Потеряна связь с общей базой','error')});unsubscribeNotes=F.onSnapshot(F.doc(db,...NOTES_DOC),snap=>{if(!online)return;const remote=currentNotesData(snap);if(remote.length||snap.exists())notes=remote;renderNotes()},()=>{});}
async function saveShared`);

  source = source.replace(/function renderMoney\(\)\{[\s\S]*?\}function bindDebtRows/,`let expenseArchiveExpanded=false;
function renderMoney(){const t=totals('day'),w=totals('week'),m=totals('month'),a=totals('all'),current=totals(financePeriod);$('#moneyTotal').textContent=money(current.net);$('#moneyPeriod').textContent={day:'Сегодня',week:'Эта неделя',month:'Этот месяц',all:'Всё время'}[financePeriod];$('#moneyGrid').innerHTML=\`<div><small>Доход</small><b>\${money(current.income)}</b></div><div><small>Расходы</small><b>\${money(current.expenses)}</b></div><div><small>Чистыми</small><b>\${money(current.net)}</b></div><button class="money-debt" data-open-debts="1"><small>Не оплачено</small><b>\${money(current.unpaid)}</b><span>Открыть долги →</span></button>\`;$('#moneyHighlights').innerHTML=\`<button data-fin="day"><span>День</span><b>\${money(t.net)}</b></button><button data-fin="week"><span>Неделя</span><b>\${money(w.net)}</b></button><button data-fin="month"><span>Месяц</span><b>\${money(m.net)}</b></button><button data-fin="all"><span>Всё</span><b>\${money(a.net)}</b></button>\`;
$$('#moneyHighlights button').forEach(b=>b.onclick=()=>{financePeriod=b.dataset.fin;expenseArchiveExpanded=false;renderMoney()});
const by={};state.jobs.filter(j=>!isCancelled(j)&&isDone(j)).forEach(j=>{const k=j.store||'Без источника';by[k]=(by[k]||0)+effectiveIncome(j)});$('#storeBreakdown').innerHTML=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>\`<div class="store-row"><span>\${esc(k)}</span><b>\${money(v)}</b></div>\`).join('')||'<div class="muted">Доходов пока нет</div>';
const debts=state.jobs.filter(j=>!isCancelled(j)&&isDone(j)&&j.paid===false);$('#debtList').innerHTML=debts.sort((a,b)=>activityDate(b).localeCompare(activityDate(a))).map(j=>\`<button class="debt-row" data-debt-id="\${esc(j.id)}"><div><b>\${esc(j.client)}</b><small>\${fmtShort(activityDate(j))} · \${esc(j.type)}</small></div><strong>\${money(effectiveIncome(j))}</strong>›</button>\`).join('')||'<div class="muted">Долгов нет — красота.</div>';
$('#expenseArchive').innerHTML=renderExpenseArchiveList();$$('.mini-edit').forEach(b=>{const e=state.expenses.find(x=>x.id===b.dataset.expense);b.onclick=()=>e&&openExpense(e.date,e)});$('#expenseArchiveToggle')?.addEventListener('click',()=>{expenseArchiveExpanded=!expenseArchiveExpanded;renderMoney()});bindDebtRows();}
function renderExpenseArchiveList(){const all=state.expenses.filter(e=>!e.cancelled).slice().sort((a,b)=>b.date.localeCompare(a.date));const visible=expenseArchiveExpanded?all:all.slice(0,10);const rows=visible.map(e=>\`<div class="expense-row"><div><b>\${esc(e.category)}</b><small>\${fmtShort(e.date)}\${e.comment?' · '+esc(e.comment):''}</small></div><strong>− \${money(e.amount)}</strong><button class="mini-edit" data-expense="\${esc(e.id)}">Изм.</button></div>\`).join('')||'<div class="muted">Расходов пока нет</div>';const remaining=all.length-visible.length;const toggle=all.length>10?\`<button type="button" id="expenseArchiveToggle" style="display:block;width:100%;padding:12px 0;border:0;background:transparent;font:inherit;font-weight:600;cursor:pointer">\${expenseArchiveExpanded?'Свернуть':'Показать ещё'}\${expenseArchiveExpanded?'':` · \${remaining}`}</button>\`:'';return rows+toggle;}
function bindDebtRows`);

  source = source.replace("function bindUI(){$('#themeBtn').onclick=()=>document.body.classList.toggle('dark');",`function applyTheme(theme){document.body.classList.toggle('dark',theme==='dark');document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111827':'#f5f7fb');const b=$('#themeBtn');if(b)b.textContent=theme==='dark'?'☀':'☾';try{localStorage.setItem('montaji-theme',theme)}catch(e){}}
function bindUI(){applyTheme((()=>{try{return localStorage.getItem('montaji-theme')}catch(e){return null}})()||'light');$('#themeBtn').onclick=()=>applyTheme(document.body.classList.contains('dark')?'light':'dark');`);

  const blob=new Blob([source],{type:'text/javascript'});const url=URL.createObjectURL(blob);try{await import(url)}finally{URL.revokeObjectURL(url)}
  setTimeout(()=>Promise.all([
    import('./notes-fix.js?v=20260821-4').catch(err=>console.error('notes fix load failed',err)),
    import('./control-fix.js?v=20260821-2').catch(err=>console.error('control fix load failed',err))
  ]),900);
}

boot().catch(error=>{console.error('Montaji boot failed',error);const el=document.querySelector('#syncStatus');if(el){el.textContent='Ошибка запуска';el.dataset.state='offline';}const toast=document.querySelector('#toast');if(toast){toast.textContent='Не удалось запустить приложение.';toast.dataset.state='error';}});
