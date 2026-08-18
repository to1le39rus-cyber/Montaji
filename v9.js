(() => {
  const FIREBASE_VERSION = '10.14.1';
  const DOC = ['appData', 'shared'];
  const NOTES_DOC = ['appData', 'notes'];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0)) + ' ₽';
  const dateKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  const today = () => dateKey(new Date());
  const fmt = d => new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${d}T12:00:00`));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  let F, db, auth, user = null, ready = false, shared = {jobs:[], expenses:[]}, notes = [], stopShared = null, stopNotes = null;

  const style = `
  <style id="v9-style">
    .v9-card{background:var(--card,#fff);border:1px solid rgba(30,45,34,.08);border-radius:22px;padding:16px;margin:14px 0;box-shadow:0 10px 30px rgba(20,35,25,.06)}
    body.dark .v9-card{background:#18201a;border-color:rgba(255,255,255,.08)}
    .v9-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.v9-head h2{margin:0;font-size:18px}.v9-head small{opacity:.55}
    .v9-actions{display:flex;gap:8px;flex-wrap:wrap}.v9-btn{border:0;border-radius:13px;padding:9px 12px;font:inherit;cursor:pointer;background:#edf2ec;color:inherit}.v9-btn.primary{background:#27392a;color:#fff}.v9-btn.danger{background:#f7e9e7;color:#8b3026}
    .v9-expense{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid rgba(30,45,34,.08)}.v9-expense:first-child{border-top:0}.v9-expense small{display:block;opacity:.55;margin-top:3px}.v9-total{display:flex;justify-content:space-between;margin-top:10px;padding-top:11px;border-top:1px solid rgba(30,45,34,.1);font-weight:700}
    .v9-note{padding:12px;border-radius:16px;background:rgba(111,126,84,.09);margin-top:9px}.v9-note-top{display:flex;justify-content:space-between;gap:10px}.v9-note p{margin:7px 0 0;white-space:pre-wrap;line-height:1.4}.v9-note.arch{opacity:.68}.v9-empty{opacity:.52;padding:7px 0}.v9-badge{display:inline-block;padding:4px 8px;border-radius:999px;background:rgba(111,126,84,.12);font-size:11px;margin-left:6px}
    .v9-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,10,6,.48);padding:16px}.v9-sheet{width:min(560px,100%);max-height:92vh;overflow:auto;background:var(--card,#fff);border-radius:28px;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.28)}body.dark .v9-sheet{background:#172019}.v9-sheet h2{margin:0 0 16px}.v9-field{display:block;margin:10px 0}.v9-field span{display:block;font-size:12px;opacity:.62;margin-bottom:6px}.v9-field input,.v9-field textarea,.v9-field select{box-sizing:border-box;width:100%;border:1px solid rgba(30,45,34,.14);border-radius:13px;padding:11px 12px;background:transparent;color:inherit;font:inherit}.v9-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v9-day-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.v9-stat{padding:11px;border-radius:15px;background:rgba(111,126,84,.09)}.v9-stat small{display:block;opacity:.55}.v9-stat b{display:block;margin-top:4px}.v9-archive-item{padding:11px 0;border-top:1px solid rgba(30,45,34,.08)}
    @media(max-width:700px){.v9-grid{grid-template-columns:1fr}.v9-modal{padding:8px}.v9-sheet{border-radius:24px 24px 0 0}}
  </style>`;

  function injectStyle(){ if(!$('#v9-style')) document.head.insertAdjacentHTML('beforeend', style); }
  function currentData(snap){ const d=snap?.exists()?snap.data()?.data||{}:{}; return {jobs:Array.isArray(d.jobs)?d.jobs:[],expenses:Array.isArray(d.expenses)?d.expenses:[]}; }
  function currentNotes(snap){ const d=snap?.exists()?snap.data()?.data||{}:{}; return Array.isArray(d.notes)?d.notes:[]; }

  async function initFirebase(){
    const [appMod,authMod,fs] = await Promise.all([
      import(`https://www.gstatic.com/firebase/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebase/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebase/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);
    const cfg = await import('./firebase-config.js');
    const app = appMod.initializeApp(cfg.firebaseConfig, 'montaji-aa-v9');
    auth = authMod.getAuth(app); db = fs.getFirestore(app); F = {...fs, authMod};
    authMod.onAuthStateChanged(auth, async u => {
      user = u;
      if(!u || !u.emailVerified){ ready=false; stopShared?.(); stopNotes?.(); return; }
      ready=true;
      observeShared(); observeNotes();
      renderAll();
    });
  }

  function observeShared(){
    stopShared?.();
    stopShared = F.onSnapshot(F.doc(db,...DOC), snap => { shared=currentData(snap); renderAll(); });
  }
  function observeNotes(){
    stopNotes?.();
    stopNotes = F.onSnapshot(F.doc(db,...NOTES_DOC), snap => { notes=currentNotes(snap); renderAll(); });
  }
  function jobsForDate(d){ return shared.jobs.filter(j=>j.date===d && j.status!=='Отменён'); }
  function doneJobsForDate(d){ return jobsForDate(d).filter(j=>j.status==='Выполнен'); }
  function expensesForDate(d){ return shared.expenses.filter(e=>e.date===d); }

  function insertHome(){
    const list = $('#todayList'); if(!list) return;
    if(!$('#v9TodayExpenses')){
      const exp=document.createElement('section'); exp.id='v9TodayExpenses'; exp.className='v9-card';
      exp.innerHTML='<div class="v9-head"><h2>Расходы сегодня</h2><button class="v9-btn" id="v9AddExpense">＋ Добавить</button></div><div id="v9ExpenseList"></div>';
      list.insertAdjacentElement('afterend',exp);
    }
    if(!$('#v9Notes')){
      const up=$('#upcoming'); const notesCard=document.createElement('section'); notesCard.id='v9Notes'; notesCard.className='v9-card';
      notesCard.innerHTML='<div class="v9-head"><div><h2>Заметки</h2><small>Общие для телефонов</small></div><button class="v9-btn" id="v9AddNote">＋ Заметка</button></div><div id="v9ActiveNotes"></div><details><summary>Архив заметок</summary><div id="v9ArchivedNotes"></div></details>';
      (up ? up.parentElement : list.parentElement).appendChild(notesCard);
    }
    $('#v9AddExpense').onclick=()=>openExpense(today());
    $('#v9AddNote').onclick=()=>openNote();
  }

  function renderExpenses(){
    const host=$('#v9ExpenseList'); if(!host) return;
    const ex=expensesForDate(today());
    host.innerHTML=ex.length ? ex.map(e=>`<div class="v9-expense"><div><b>${esc(e.category||'Прочее')}</b><small>${esc(e.comment||'Без комментария')}</small></div><strong>− ${money(e.amount)}</strong></div>`).join('') : '<div class="v9-empty">Сегодня расходов ещё нет.</div>';
    if(ex.length) host.insertAdjacentHTML('beforeend',`<div class="v9-total"><span>Итого</span><span>− ${money(ex.reduce((s,e)=>s+Number(e.amount||0),0))}</span></div>`);
  }

  function noteCard(n){return `<div class="v9-note ${n.archived?'arch':''}"><div class="v9-note-top"><div><b>${esc(n.title||'Заметка')}</b>${n.archived?'<span class="v9-badge">архив</span>':''}</div><div class="v9-actions"><button class="v9-btn" data-note-edit="${esc(n.id)}">Изм.</button>${n.archived?`<button class="v9-btn" data-note-restore="${esc(n.id)}">Вернуть</button>`:`<button class="v9-btn" data-note-archive="${esc(n.id)}">Архив</button>`}</div></div><p>${esc(n.text||'')}</p></div>`;}
  function renderNotes(){
    const a=$('#v9ActiveNotes'), ar=$('#v9ArchivedNotes'); if(!a||!ar)return;
    const active=notes.filter(n=>n.archived!==true), archived=notes.filter(n=>n.archived===true);
    a.innerHTML=active.length?active.map(noteCard).join(''):'<div class="v9-empty">Активных заметок нет.</div>';
    ar.innerHTML=archived.length?archived.map(noteCard).join(''):'<div class="v9-empty">Архив пуст.</div>';
    $$('[data-note-edit]').forEach(b=>b.onclick=()=>openNote(notes.find(n=>n.id===b.dataset.noteEdit)));
    $$('[data-note-archive]').forEach(b=>b.onclick=()=>setNoteState(b.dataset.noteArchive,true));
    $$('[data-note-restore]').forEach(b=>b.onclick=()=>setNoteState(b.dataset.noteRestore,false));
  }
  function renderAll(){ if(!document.body)return; injectStyle(); insertHome(); renderExpenses(); renderNotes(); observeCalendar(); }

  function modal(html){const m=document.createElement('div');m.className='v9-modal';m.innerHTML=`<div class="v9-sheet">${html}</div>`;document.body.append(m);m.addEventListener('click',e=>{if(e.target===m)m.remove()});return m;}

  async function saveShared(mut){
    if(!ready||!user) throw Error('Нет соединения с общей базой');
    const ref=F.doc(db,...DOC);
    await F.runTransaction(db,async tx=>{const s=await tx.get(ref),cur=s.exists()?s.data()?.data||{}:{};const next=await mut(JSON.parse(JSON.stringify(cur)));tx.set(ref,{data:next,version:9,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true});});
  }
  async function saveNotes(mut){
    if(!ready||!user) throw Error('Нет соединения с общей базой');
    const ref=F.doc(db,...NOTES_DOC);
    await F.runTransaction(db,async tx=>{const s=await tx.get(ref),cur=s.exists()?s.data()?.data||{}:{};const next=await mut(JSON.parse(JSON.stringify(cur)));tx.set(ref,{data:next,version:9,updatedAt:F.serverTimestamp(),updatedBy:user.uid},{merge:true});});
  }

  function openNote(n=null){
    const m=modal(`<div class="v9-head"><h2>${n?'Изменить заметку':'Новая заметка'}</h2><button class="v9-btn" data-x>×</button></div><form id="v9NoteForm"><label class="v9-field"><span>Заголовок</span><input id="v9NoteTitle" required value="${esc(n?.title||'')}"></label><label class="v9-field"><span>Текст</span><textarea id="v9NoteText" rows="5" required>${esc(n?.text||'')}</textarea></label><div class="v9-actions"><button class="v9-btn primary">Сохранить</button>${n?'<button type="button" class="v9-btn danger" id="v9DeleteNote">Удалить</button>':''}</div></form>`);
    $('[data-x]',m).onclick=()=>m.remove();
    $('#v9NoteForm',m).onsubmit=async e=>{e.preventDefault();const item={id:n?.id||uid(),title:$('#v9NoteTitle',m).value.trim(),text:$('#v9NoteText',m).value.trim(),archived:n?.archived===true,updatedAt:new Date().toISOString()};if(!item.title||!item.text)return;try{await saveNotes(cur=>({...cur,notes:[...(Array.isArray(cur.notes)?cur.notes:[]).filter(x=>x.id!==item.id),item]}));m.remove();}catch(err){alert(err.message)}};
    $('#v9DeleteNote',m)?.addEventListener('click',async()=>{try{await saveNotes(cur=>({...cur,notes:(cur.notes||[]).filter(x=>x.id!==n.id)}));m.remove();}catch(err){alert(err.message)}});
  }
  async function setNoteState(id,arch){try{await saveNotes(cur=>({...cur,notes:(Array.isArray(cur.notes)?cur.notes:[]).map(n=>n.id===id?{...n,archived:arch,updatedAt:new Date().toISOString()}:n)}));}catch(e){alert(e.message)}}

  function openExpense(d){
    const m=modal(`<div class="v9-head"><h2>Расход · ${esc(fmt(d))}</h2><button class="v9-btn" data-x>×</button></div><form id="v9ExpenseForm"><div class="v9-grid"><label class="v9-field"><span>Дата</span><input id="v9ExpDate" type="date" required value="${esc(d)}"></label><label class="v9-field"><span>Сумма, ₽</span><input id="v9ExpAmount" type="number" min="0.01" step="0.01" required></label></div><label class="v9-field"><span>Категория</span><select id="v9ExpCat"><option>Топливо</option><option>Аренда</option><option>Парковка</option><option>Материалы</option><option>Инструмент</option><option>Прочее</option></select></label><label class="v9-field"><span>Комментарий</span><textarea id="v9ExpComment" rows="3" placeholder="Что оплатили?"></textarea></label><div class="v9-actions"><button class="v9-btn primary">Сохранить расход</button></div></form>`);
    $('[data-x]',m).onclick=()=>m.remove();
    $('#v9ExpenseForm',m).onsubmit=async e=>{e.preventDefault();const amount=Number($('#v9ExpAmount',m).value);if(!(amount>0))return;const item={id:uid(),date:$('#v9ExpDate',m).value,amount,category:$('#v9ExpCat',m).value,comment:$('#v9ExpComment',m).value.trim()};try{await saveShared(cur=>({...cur,expenses:[...(cur.expenses||[]),item]}));m.remove();}catch(err){alert(err.message)}};
  }

  function dayArchive(d){
    const jobs=jobsForDate(d), expenses=expensesForDate(d), income=doneJobsForDate(d).reduce((s,j)=>s+Number(j.price||0),0), exp=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    return {jobs,expenses,income,exp,net:income-exp};
  }
  function showArchive(d){
    const x=dayArchive(d);
    const m=modal(`<div class="v9-head"><div><small>Архив дня</small><h2>${esc(fmt(d))}</h2></div><button class="v9-btn" data-x>×</button></div><div class="v9-day-summary"><div class="v9-stat"><small>Доход</small><b>${money(x.income)}</b></div><div class="v9-stat"><small>Расход</small><b>− ${money(x.exp)}</b></div><div class="v9-stat"><small>Чистыми</small><b>${money(x.net)}</b></div></div><div class="v9-actions"><button class="v9-btn primary" id="v9ArcExp">＋ Расход</button></div><h3>Монтажи и выезды</h3>${x.jobs.length?x.jobs.map(j=>`<div class="v9-archive-item"><b>${esc(j.client||'Без клиента')}</b><div>${esc(j.type||'Выезд')} · ${money(j.price||0)} · ${esc(j.status||'')}</div></div>`).join(''):'<div class="v9-empty">Записей нет.</div>'}<h3>Расходы</h3>${x.expenses.length?x.expenses.map(e=>`<div class="v9-archive-item"><b>${esc(e.category||'Прочее')}</b><div>− ${money(e.amount)} · ${esc(e.comment||'')}</div></div>`).join(''):'<div class="v9-empty">Расходов нет.</div>'}`);
    $('[data-x]',m).onclick=()=>m.remove(); $('#v9ArcExp',m).onclick=()=>{m.remove();openExpense(d)};
  }

  function observeCalendar(){
    const cal=$('#calendar'); if(!cal || cal.dataset.v9Bound==='1')return;
    cal.dataset.v9Bound='1';
    cal.addEventListener('click',e=>{const day=e.target.closest('.day[data-date]');if(!day)return;setTimeout(()=>{const legacy=document.querySelector('.modal.open');if(legacy&&legacy.querySelector('.sheet')&&!legacy.querySelector('.v9-open-archive')){const b=document.createElement('button');b.className='v9-open-archive';b.textContent='Открыть весь день';b.onclick=()=>{legacy.remove();showArchive(day.dataset.date)};const actions=legacy.querySelector('.day-actions');actions?.appendChild(b);}},0);});
  }

  function patchCalendarButtons(){ $$('.day[data-date]').forEach(day=>{if(day.dataset.v9Direct==='1')return;day.dataset.v9Direct='1';day.addEventListener('dblclick',()=>showArchive(day.dataset.date));}); }

  function boot(){
    injectStyle();
    const run=()=>{initFirebase().catch(err=>console.error('[v9]',err));};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
    new MutationObserver(()=>{insertHome();renderExpenses();renderNotes();patchCalendarButtons();}).observe(document.body,{childList:true,subtree:true});
  }
  boot();
})();
