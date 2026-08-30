const APP_URL = new URL('app.js?runtime=20260820-4', location.href);

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

  // IMPORTANT: bind the login form before the rest of the UI. If any
  // non-auth UI binding throws on mobile, the native form submit must never
  // reload the page and erase the entered credentials.
  source = source.replace(
    "(async()=>{try{bindUI();bindAuth();await initFirebase();F.authMod.onAuthStateChanged(auth,onUser)}catch(e){console.error(e);showAuth(true);authMessage('Не удалось запустить приложение. Проверьте Firebase.',true)}})();",
    "(async()=>{try{bindAuth();bindUI();await initFirebase();F.authMod.onAuthStateChanged(auth,onUser)}catch(e){console.error(e);showAuth(true);authMessage('Не удалось запустить приложение: '+(e?.message||'проверьте Firebase.'),true)}})();"
  );

  // Finance history: show 10 rows initially, then expand/collapse without
  // touching Firebase or the rest of the application lifecycle.
  source = source.replace(
    /function renderMoney\(\){[\s\S]*?\}\nfunction bindDebtRows/,
    `let expenseArchiveExpanded=false;
function renderMoney(){const t=totals('day'),w=totals('week'),m=totals('month'),a=totals('all'),current=totals(financePeriod);$('#moneyTotal').textContent=money(current.net);$('#moneyPeriod').textContent={day:'Сегодня',week:'Эта неделя',month:'Этот месяц',all:'Всё время'}[financePeriod];$('#moneyGrid').innerHTML=\`<div><small>Доход</small><b>\${money(current.income)}</b></div><div><small>Расходы</small><b>\${money(current.expenses)}</b></div><div><small>Чистыми</small><b>\${money(current.net)}</b></div><button class="money-debt" data-open-debts="1"><small>Не оплачено</small><b>\${money(current.unpaid)}</b><span>Открыть долги →</span></button>\`;$('#moneyHighlights').innerHTML=\`<button data-fin="day"><span>День</span><b>\${money(t.net)}</b></button><button data-fin="week"><span>Неделя</span><b>\${money(w.net)}</b></button><button data-fin="month"><span>Месяц</span><b>\${money(m.net)}</b></button><button data-fin="all"><span>Всё</span><b>\${money(a.net)}</b></button>\`;$$('#moneyHighlights button').forEach(b=>b.onclick=()=>{financePeriod=b.dataset.fin;expenseArchiveExpanded=false;renderMoney()});const by={};state.jobs.filter(j=>!isCancelled(j)&&isDone(j)).forEach(j=>{const k=j.store||'Без источника';by[k]=(by[k]||0)+effectiveIncome(j)});$('#storeBreakdown').innerHTML=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>\`<div class="store-row"><span>\${esc(k)}</span><b>\${money(v)}</b></div>\`).join('')||'<div class="muted">Доходов пока нет</div>';const debts=state.jobs.filter(j=>!isCancelled(j)&&isDone(j)&&j.paid===false);$('#debtList').innerHTML=debts.sort((a,b)=>activityDate(b).localeCompare(activityDate(a))).map(j=>\`<button class="debt-row" data-debt-id="\${esc(j.id)}"><div><b>\${esc(j.client)}</b><small>\${fmtShort(activityDate(j))} · \${esc(j.type)}</small></div><strong>\${money(effectiveIncome(j))}</strong>›</button>\`).join('')||'<div class="muted">Долгов нет — красота.</div>';$('#expenseArchive').innerHTML=renderExpenseArchiveList();$$('.mini-edit').forEach(b=>{const e=state.expenses.find(x=>x.id===b.dataset.expense);b.onclick=()=>e&&openExpense(e.date,e)});$('#expenseArchiveToggle')?.addEventListener('click',()=>{expenseArchiveExpanded=!expenseArchiveExpanded;renderMoney()});bindDebtRows();}
function renderExpenseArchiveList(){const all=state.expenses.filter(e=>!e.cancelled).slice().sort((a,b)=>b.date.localeCompare(a.date));const visible=expenseArchiveExpanded?all:all.slice(0,10);const rows=visible.map(e=>\`<div class="expense-row"><div><b>\${esc(e.category)}</b><small>\${fmtShort(e.date)}\${e.comment?' · '+esc(e.comment):''}</small></div><strong>− \${money(e.amount)}</strong><button class="mini-edit" data-expense="\${esc(e.id)}">Изм.</button></div>\`).join('')||'<div class="muted">Расходов пока нет</div>';const remaining=all.length-visible.length;const toggle=all.length>10?'<button type="button" id="expenseArchiveToggle" style="display:block;width:100%;padding:12px 0;border:0;background:transparent;font:inherit;font-weight:600;cursor:pointer">'+(expenseArchiveExpanded?'Свернуть':'Показать ещё · '+remaining)+'</button>':'';return rows+toggle;}
function bindDebtRows`
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
