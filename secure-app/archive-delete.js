/* Montaji AA — permanently delete archived notes from the existing notes document. */
(() => {
  const VERSION = '2026-09-11.3';
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const toast = (message, state='normal') => {
    let el = document.querySelector('#toast');
    if (!el) { el = document.createElement('div'); document.body.append(el); }
    el.textContent = message;
    el.dataset.state = state;
    clearTimeout(el.__timer);
    el.__timer = setTimeout(() => el.remove(), 3000);
  };
  const getFirebase = async () => {
    const [appMod, authMod, fs] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);
    const app = appMod.getApps().find(x => x.name === 'montaji-aa-production') || appMod.getApps()[0];
    if (!app) throw new Error('FIREBASE_APP_NOT_FOUND');
    const auth = authMod.getAuth(app);
    if (!auth.currentUser) throw new Error('Нет авторизации');
    return { auth, db: fs.getFirestore(app), fs };
  };
  const findNoteId = button => {
    const card = button.closest('.note-card, [data-note-id]');
    return button.dataset.noteDelete || card?.dataset.noteId || card?.querySelector('[data-note-restore-v2]')?.dataset.noteRestoreV2 || '';
  };
  const permanentlyDelete = async (id, card) => {
    const { auth, db, fs } = await getFirebase();
    const ref = fs.doc(db, 'appData', 'notes');
    await fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('NOTES_DOC_NOT_FOUND');
      const data = snap.data()?.data || {};
      const notes = Array.isArray(data.notes) ? data.notes : [];
      const target = notes.find(n => n?.id === id);
      if (!target) throw new Error('NOTE_NOT_FOUND');
      if (!target.archived && !target.done) throw new Error('NOTE_NOT_ARCHIVED');
      const next = notes.filter(n => n?.id !== id);
      tx.set(ref, { data: { notes: next }, version: 2, updatedAt: fs.serverTimestamp(), updatedBy: auth.currentUser.uid }, { merge: true });
    });
    card?.remove();
  };
  const enhance = root => {
    (root || document).querySelectorAll?.('[data-note-restore-v2]').forEach(restoreButton => {
      if (restoreButton.dataset.deleteReady === '1') return;
      if (text(restoreButton) !== 'Вернуть') return;
      const card = restoreButton.closest('.note-card, [data-note-id]') || restoreButton.parentElement;
      if (!card || card.querySelector('.note-archive-delete')) return;
      const actions = restoreButton.closest('.note-v2-actions') || restoreButton.parentElement;
      if (!actions) return;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'mini-btn note-archive-delete';
      del.textContent = 'Удалить';
      del.setAttribute('aria-label', 'Удалить заметку навсегда');
      del.dataset.noteDelete = restoreButton.dataset.noteRestoreV2 || '';
      del.dataset.archiveDeleteVersion = VERSION;
      del.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        const id = findNoteId(del);
        if (!id) { toast('Не удалось определить заметку','error'); return; }
        if (!window.confirm('Удалить эту заметку навсегда?\nВосстановить её будет нельзя.')) return;
        del.disabled = true;
        del.textContent = '…';
        try {
          await permanentlyDelete(id, card);
          toast('Заметка удалена','success');
        } catch (err) {
          console.error('[archive-delete]', err);
          del.disabled = false;
          del.textContent = 'Удалить';
          toast('Не удалось удалить заметку','error');
        }
      });
      actions.appendChild(del);
      restoreButton.dataset.deleteReady = '1';
    });
  };
  const boot = () => {
    enhance(document);
    document.addEventListener('click', e => {
      const b = e.target.closest?.('[data-note-restore-v2]');
      if (b) setTimeout(() => enhance(document), 50);
    }, true);
    setInterval(() => enhance(document), 700);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();

/* Montaji AA — product intelligence preview. Read-only UX layer; no writes. */
(() => {
  const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0)) + ' ₽';
  const esc = s => String(s ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const dateKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  const today = () => dateKey(new Date());
  const isDone = j => j?.status === 'Выполнен';
  const isCancelled = j => j?.status === 'Отменён';
  const amount = j => Number(j?.measurePrice || j?.price || 0) || 0;
  const activityDate = j => isDone(j) ? (j.completedDate || j.date) : j.date;
  const monday = d => { const x = new Date(`${d}T12:00:00`); const day = (x.getDay()+6)%7; x.setDate(x.getDate()-day); return dateKey(x); };
  const addDays = (d,n) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate()+n); return dateKey(x); };
  const weekBounds = (d,offset=0) => { const s=addDays(monday(d),offset*7); return [s,addDays(s,6)]; };
  const inRange = (d,a,b) => d>=a && d<=b;
  const readState = async () => {
    const [appMod,authMod,fs] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);
    const app = appMod.getApps().find(x=>x.name==='montaji-aa-production') || appMod.getApps()[0];
    if(!app) throw Error('FIREBASE_APP_NOT_FOUND');
    const auth=authMod.getAuth(app); if(!auth.currentUser) return null;
    const snap=await fs.getDoc(fs.doc(fs.getFirestore(app),'appData','shared'));
    const data=snap.exists()?snap.data()?.data||{}:{};
    return {jobs:Array.isArray(data.jobs)?data.jobs:[],expenses:Array.isArray(data.expenses)?data.expenses:[]};
  };
  const calc = (state,a,b) => {
    const jobs=state.jobs.filter(j=>!isCancelled(j)&&isDone(j)&&inRange(activityDate(j),a,b));
    const income=jobs.reduce((s,j)=>s+amount(j),0);
    const expenses=state.expenses.filter(e=>e?.cancelled!==true&&inRange(e.date,a,b)).reduce((s,e)=>s+(Number(e.amount)||0),0);
    const unpaid=jobs.filter(j=>j.paid===false).reduce((s,j)=>s+amount(j),0);
    const measures=jobs.filter(j=>j.type==='Замер');
    const work=jobs.filter(j=>j.type!=='Замер');
    const days={};
    jobs.forEach(j=>{const d=activityDate(j);days[d]=(days[d]||0)+amount(j)});
    const best=Object.entries(days).sort((a,b)=>b[1]-a[1])[0];
    return {income,expenses,net:income-expenses,unpaid,done:jobs.length,measures:measures.length,work:work.length,avg:work.length?income/measures.length?income/work.length:0:0,bestDay:best?.[0]||'',bestIncome:best?.[1]||0};
  };
  const fmtDay=d=>d?new Intl.DateTimeFormat('ru-RU',{weekday:'long'}).format(new Date(`${d}T12:00:00`)).replace(/^./,m=>m.toUpperCase()):'—';
  const style=()=>{
    if(document.getElementById('montaji-product-intel-style'))return;
    const s=document.createElement('style');s.id='montaji-product-intel-style';s.textContent=`
      .mpi-card{margin:10px 0 0;padding:16px;border:1px solid #dedfd8;border-radius:18px;background:#fff;box-shadow:none}
      .mpi-kicker{font-size:9px;letter-spacing:.12em;font-weight:800;color:#788071;margin-bottom:6px}
      .mpi-title{font-size:20px;font-weight:800;letter-spacing:-.04em;margin:0 0 13px}
      .mpi-main{font-size:30px;font-weight:820;letter-spacing:-.05em;line-height:1.05}
      .mpi-muted{font-size:10px;color:#7b827a}
      .mpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:13px}
      .mpi-metric{padding:10px 11px;border-radius:13px;background:#f5f6f1}
      .mpi-metric b{display:block;font-size:14px;margin-bottom:2px}
      .mpi-metric span{font-size:9px;color:#7b827a}
      .mpi-trend{margin-top:12px;padding:10px 11px;border-radius:13px;background:#eef3e9;color:#526149;font-size:11px;font-weight:700}
      .mpi-address{position:relative;cursor:pointer;touch-action:pan-y;-webkit-user-select:none;user-select:none}
      .mpi-address:after{content:'⋯';margin-left:5px;color:#7b827a;font-weight:800}
      .mpi-actions{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:10001;padding:8px;border-radius:22px;background:rgba(250,250,247,.97);border:1px solid #dedfd8;box-shadow:0 18px 48px rgba(20,25,20,.2);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
      .mpi-actions-head{padding:7px 9px 10px;font-size:11px;color:#777d76;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mpi-action{display:flex;align-items:center;gap:11px;width:100%;border:0;background:#fff;padding:14px 12px;border-radius:14px;text-align:left;font:inherit;color:#171a17;font-weight:700}
      .mpi-action:active{background:#f0f2ec}
      .mpi-action small{display:block;color:#777d76;font-size:9px;font-weight:500;margin-top:2px}
      .mpi-client-sheet{max-height:88svh;overflow:auto}
      .mpi-client-hero{padding:3px 0 15px;border-bottom:1px solid #e2e3dd;margin-bottom:13px}
      .mpi-client-name{font-size:27px;font-weight:820;letter-spacing:-.05em}
      .mpi-client-line{font-size:11px;color:#777d76;margin-top:5px}
      .mpi-client-section{margin-top:17px}.mpi-client-section h3{font-size:10px;letter-spacing:.08em;color:#777d76;margin:0 0 8px;text-transform:uppercase}
      .mpi-history-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #ecece7;font-size:11px}.mpi-history-row b{font-size:11px}.mpi-history-row span{color:#777d76;text-align:right}
      .mpi-finance{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.mpi-finance>div{padding:11px 8px;border-radius:13px;background:#f5f6f1}.mpi-finance b{display:block;font-size:13px}.mpi-finance span{display:block;font-size:8px;color:#777d76;margin-top:3px}
      .mpi-client-note{padding:11px 12px;border-radius:13px;background:#f5f6f1;font-size:11px;line-height:1.4}
      .mpi-client-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:17px}.mpi-client-actions a,.mpi-client-actions button{display:grid;place-items:center;min-height:45px;border-radius:12px;text-decoration:none;border:1px solid #dedfd8;background:#fff;color:#171a17;font:inherit;font-size:11px;font-weight:750}.mpi-client-actions .primary{background:#59644d;color:#fff;border-color:#59644d}
    `;document.head.appendChild(s);
  };
  const closeActions=()=>document.querySelector('.mpi-actions')?.remove();
  const openAddressActions=address=>{
    closeActions();
    const wrap=document.createElement('div');wrap.className='mpi-actions';
    wrap.innerHTML=`<div class="mpi-actions-head">${esc(address)}</div><button class="mpi-action" data-mpi="route">📍 <span>Построить маршрут<small>Открыть карты</small></span></button><button class="mpi-action" data-mpi="copy">📋 <span>Скопировать адрес<small>Адрес попадёт в буфер обмена</small></span></button><button class="mpi-action" data-mpi="share">📤 <span>Отправить адрес<small>Поделиться через iPhone</small></span></button>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',async e=>{
      const b=e.target.closest('[data-mpi]');if(!b)return;const a=b.dataset.mpi;
      if(a==='route')window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(address)}`,'_blank','noopener');
      if(a==='copy'){try{await navigator.clipboard.writeText(address);window.__montajiProductToast?.('Адрес скопирован','success')}catch{window.__montajiProductToast?.('Не удалось скопировать','error')}}
      if(a==='share'){if(navigator.share){try{await navigator.share({text:address})}catch{}}else{try{await navigator.clipboard.writeText(address);window.__montajiProductToast?.('Адрес скопирован','success')}catch{}}}
      if(a!=='share'||!navigator.share)closeActions();
    });
  };
  const bindLongPress=()=>{
    document.querySelectorAll('.job-card .detail-line').forEach(el=>{
      if(!el.textContent.trim().startsWith('📍')||el.dataset.mpiBound==='1')return;el.dataset.mpiBound='1';
      let timer=0,startX=0,startY=0;
      const start=e=>{if(e.touches?.length!==1)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY;timer=setTimeout(()=>{const address=el.textContent.replace(/^📍\s*/,'').trim();if(address)openAddressActions(address)},430)};
      const cancel=e=>{if(timer){if(e.touches?.length){const t=e.touches[0];if(Math.abs(t.clientX-startX)>8||Math.abs(t.clientY-startY)>8)clearTimeout(timer)}else clearTimeout(timer);timer=0}};
      el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchmove',cancel,{passive:true});el.addEventListener('touchend',cancel,{passive:true});el.addEventListener('touchcancel',cancel,{passive:true});
    });
  };
  const injectWeekly=async()=>{
    const moneyScreen=document.querySelector('#moneyScreen');if(!moneyScreen||moneyScreen.dataset.mpiWeekly==='1')return;
    try{const state=await readState();if(!state)return;const [a,b]=weekBounds(today(),0),[pa,pb]=weekBounds(today(),-1);const cur=calc(state,a,b),prev=calc(state,pa,pb);const delta=prev.income?Math.round((cur.income-prev.income)/prev.income*100):null;const card=document.createElement('section');card.className='mpi-card';card.innerHTML=`<div class="mpi-kicker">РАБОЧАЯ НЕДЕЛЯ</div><h2 class="mpi-title">Montaji знает твой день</h2><div class="mpi-main">${money(cur.net)} <span class="mpi-muted">чистыми</span></div><div class="mpi-grid"><div class="mpi-metric"><b>${money(cur.income)}</b><span>доход</span></div><div class="mpi-metric"><b>${money(cur.expenses)}</b><span>расходы</span></div><div class="mpi-metric"><b>${cur.work}</b><span>выездов</span></div><div class="mpi-metric"><b>${cur.measures}</b><span>замеров</span></div><div class="mpi-metric"><b>${money(cur.unpaid)}</b><span>долги</span></div><div class="mpi-metric"><b>${cur.work?money(cur.income/cur.work):'—'}</b><span>средний выезд</span></div></div>${cur.bestDay?`<div class="mpi-trend">⭐ Самый прибыльный день — ${fmtDay(cur.bestDay)} · ${money(cur.bestIncome)}</div>`:''}${delta!==null?`<div class="mpi-trend">${delta>=0?'↑':'↓'} ${Math.abs(delta)}% к прошлой неделе · ${delta>=0?'выше':'ниже'} на ${money(Math.abs(cur.income-prev.income))}</div>`:''}`;const anchor=moneyScreen.querySelector('.money-highlights');(anchor?.parentElement||moneyScreen).insertBefore(card,anchor?.nextSibling||null);moneyScreen.dataset.mpiWeekly='1'}catch(e){console.warn('[product-intelligence]',e)}};
  const openClient=async name=>{
    try{const state=await readState();if(!state)return;const jobs=state.jobs.filter(j=>!isCancelled(j)&&String(j.client||'').trim()===name);if(!jobs.length)return;const phone=jobs.find(j=>j.phone)?.phone||'';const address=jobs.find(j=>j.address)?.address||'';const earned=jobs.filter(isDone).reduce((s,j)=>s+amount(j),0);const paid=jobs.filter(j=>isDone(j)&&j.paid!==false).reduce((s,j)=>s+amount(j),0);const debt=jobs.filter(j=>isDone(j)&&j.paid===false).reduce((s,j)=>s+amount(j),0);const notes=jobs.map(j=>j.comment).find(Boolean)||'';const sorted=[...jobs].sort((a,b)=>String(activityDate(b)).localeCompare(String(activityDate(a)))).slice(0,8);const m=document.createElement('div');m.className='modal open';m.style.zIndex='9999';m.innerHTML=`<div class="backdrop"></div><div class="sheet mpi-client-sheet"><div class="handle"></div><div class="sheet-head"><div><div class="eyebrow">КЛИЕНТ</div><h2>История клиента</h2></div><button class="circle-btn" data-mpi-close>×</button></div><div class="mpi-client-hero"><div class="mpi-client-name">${esc(name)}</div>${phone?`<div class="mpi-client-line">📞 ${esc(phone)}</div>`:''}${address?`<div class="mpi-client-line">📍 ${esc(address)}</div>`:''}</div><div class="mpi-client-section"><h3>Финансы</h3><div class="mpi-finance"><div><b>${money(earned)}</b><span>заработано</span></div><div><b>${money(paid)}</b><span>получено</span></div><div><b>${money(debt)}</b><span>долг</span></div></div></div><div class="mpi-client-section"><h3>История</h3>${sorted.map(j=>`<div class="mpi-history-row"><b>${esc(activityDate(j)||j.date||'—')}</b><span>${esc(j.type||'Работа')} · ${money(amount(j))}${j.paid===false?' · долг':''}</span></div>`).join('')}</div>${notes?`<div class="mpi-client-section"><h3>Заметка</h3><div class="mpi-client-note">${esc(notes)}</div></div>`:''}<div class="mpi-client-actions">${phone?`<a class="primary" href="tel:${esc(phone.replace(/[^\d+]/g,''))}">Позвонить</a>`:'<span></span>'}${address?`<a href="https://yandex.ru/maps/?text=${encodeURIComponent(address)}" target="_blank" rel="noopener">Маршрут</a>`:'<span></span>'}</div></div>`;document.body.appendChild(m);m.querySelector('[data-mpi-close]').onclick=()=>m.remove();m.querySelector('.backdrop').onclick=()=>m.remove();m.addEventListener('click',e=>{if(e.target.matches('.mpi-client-actions a'))setTimeout(()=>{},0)})}catch(e){console.warn('[client-2]',e)}};
  const bindClients=()=>{
    document.querySelectorAll('.client-card').forEach(card=>{if(card.dataset.mpiClientBound==='1')return;const nameEl=card.querySelector('b,strong,.client-name');const name=(nameEl?.textContent||'').trim();if(!name)return;card.dataset.mpiClientBound='1';card.addEventListener('click',e=>{if(e.target.closest('a,button,input'))return;e.preventDefault();e.stopPropagation();openClient(name)},true)});
  };
  const addTodaySignal=async()=>{
    const host=document.querySelector('#insights');if(!host||host.dataset.mpiSignal==='1')return;try{const state=await readState();if(!state)return;const d=today();const jobs=state.jobs.filter(j=>!isCancelled(j)&&j.date===d);const active=jobs.filter(j=>!isDone(j));const done=jobs.filter(isDone);const unpaid=done.filter(j=>j.paid===false).reduce((s,j)=>s+amount(j),0);const next=active.sort((a,b)=>String(a.slot||'9').localeCompare(String(b.slot||'9')))[0];const b=document.createElement('button');b.className='insight';b.style.background='#eef3e9';b.style.borderColor='#d8e0d0';b.innerHTML=`<span>→</span><span style="flex:1;text-align:left"><b style="display:block;font-size:12px">${next?`Следующее: ${esc(next.client||'выезд')}`:'День под контролем'}</b><small style="display:block;color:#777d76;margin-top:2px">${next?`${esc(next.type||'Монтаж')} · ${esc(next.address||'адрес не указан')}`:`${done.length} выполнено · ${unpaid?money(unpaid)+' не оплачено':''}`}</small></span><span>›</span>`;host.prepend(b);host.dataset.mpiSignal='1'}catch(e){console.warn('[today-signal]',e)}};
  const boot=()=>{style();bindLongPress();bindClients();injectWeekly();addTodaySignal()};
  globalThis.__montajiProductToast=(m,k)=>{let t=document.querySelector('#toast');if(t){t.textContent=m;t.dataset.state=k||'normal'}};
  setTimeout(boot,900);setInterval(()=>{bindLongPress();bindClients()},1000);setTimeout(injectWeekly,2500);setTimeout(addTodaySignal,2500);
})();