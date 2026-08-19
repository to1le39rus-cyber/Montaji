import { firebaseConfig } from './firebase-config.js';

const FIREBASE_VERSION = '10.14.1';
const SHARED_DOC = ['appData', 'shared'];
const esc = s => String(s ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0)) + ' ₽';
const dateKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const today = () => dateKey(new Date());
const SLOTS = {'1':'10:00–12:00','2':'14:00–16:00','3':'3-й слот / резерв'};
let fs, db, auth, state = {jobs:[], expenses:[]}, user, unsubscribe;
let observerStarted = false;

async function init(){
  const [appMod, authMod, firestore] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
  ]);
  const app = appMod.initializeApp(firebaseConfig, 'montaji-aa-ux');
  auth = authMod.getAuth(app);
  db = firestore.getFirestore(app);
  fs = firestore;
  authMod.onAuthStateChanged(auth, u => {
    user = u;
    unsubscribe?.();
    if (!u || !u.emailVerified) return;
    unsubscribe = fs.onSnapshot(fs.doc(db, ...SHARED_DOC), snap => {
      state = snap.exists() ? (snap.data()?.data || {jobs:[], expenses:[]}) : {jobs:[], expenses:[]};
      queueEnhance();
    });
  });
}
function activeJobs(d=today()) { return (Array.isArray(state.jobs) ? state.jobs : []).filter(j => j && j.status !== 'Отменён' && j.date === d); }
function montageJobs(d=today()) { return activeJobs(d).filter(j => j.type === 'Монтаж' && j.status !== 'Выполнен').sort((a,b)=>String(a.slot).localeCompare(String(b.slot))); }
function toast(text){ const el=document.querySelector('#toast') || (()=>{const x=document.createElement('div');x.id='toast';document.body.append(x);return x})(); el.textContent=text;el.dataset.state='success';clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),2600); }
function queueEnhance(){ requestAnimationFrame(()=>requestAnimationFrame(enhance)); }
function enhance(){
  if(!document.querySelector('#app') || document.querySelector('#app.hidden')) return;
  enhanceNext(); enhanceCards(); enhanceClients(); enhanceWarnings();
  if(!observerStarted){ observerStarted=true; const mo=new MutationObserver(()=>queueEnhance()); mo.observe(document.querySelector('#app'),{subtree:true,childList:true}); }
}
function enhanceNext(){
  const period=document.querySelector('.period-strip'); if(!period) return;
  let card=document.querySelector('#aaNextJob');
  if(!card){card=document.createElement('section');card.id='aaNextJob';card.className='aa-next-card';period.insertAdjacentElement('afterend',card);}
  const next=montageJobs(); const j=next[0];
  card.innerHTML=j?`<div class="aa-next-kicker">СЛЕДУЮЩИЙ ВЫЕЗД</div><div class="aa-next-main"><div><strong>${esc(j.client||'Без клиента')}</strong><span>${esc(SLOTS[j.slot]||j.time||'Время не указано')}</span></div><b>${money(j.price)}</b></div><div class="aa-next-address">${j.address?'📍 '+esc(j.address):'⚠️ Адрес не указан'}</div><div class="aa-next-actions">${j.address?`<button data-aa-route="${esc(j.id)}">Маршрут</button>`:''}<button data-aa-day="1">Рабочий день</button><button class="aa-dark" data-aa-check="${esc(j.id)}">Чек-лист</button></div>`:`<div class="aa-next-kicker">СЕГОДНЯ</div><div class="aa-next-empty"><strong>Все монтажи на сегодня свободны</strong><span>Добавь выезд через ＋ — приложение само подхватит свободное окно.</span></div>`;
  card.querySelector('[data-aa-route]')?.addEventListener('click',()=>routeForJobs([j]));
  card.querySelector('[data-aa-day]')?.addEventListener('click',openWorkday);
  card.querySelector('[data-aa-check]')?.addEventListener('click',()=>openChecklist(j.id));
}
function enhanceCards(){
  document.querySelectorAll('.job-card[data-job-card]').forEach(card=>{
    const id=card.dataset.jobCard,j=state.jobs.find(x=>x.id===id); if(!j)return;
    const actions=card.querySelector('.actions'); if(!actions || card.querySelector('[data-aa-check]'))return;
    const btn=document.createElement('button');btn.className='action-chip aa-check-btn';btn.dataset.aaCheck=id;btn.textContent='Чек-лист';actions.insertBefore(btn,actions.lastElementChild);btn.addEventListener('click',()=>openChecklist(id));
  });
}
function enhanceClients(){
  document.querySelectorAll('.client-card').forEach(card=>{
    const edit=card.querySelector('.edit');if(!edit||card.querySelector('.aa-client-meta'))return;
    const id=edit.dataset.id,j=state.jobs.find(x=>x.id===id);if(!j)return;
    const name=(j.client||'').trim().toLowerCase();
    const related=(state.jobs||[]).filter(x=>x.status!=='Отменён'&&((x.phone&&j.phone&&x.phone===j.phone)||(name&&(x.client||'').trim().toLowerCase()===name)));
    const total=related.filter(x=>x.status==='Выполнен').reduce((s,x)=>s+Number(x.price||x.measurePrice||0),0);
    const meta=document.createElement('div');meta.className='aa-client-meta';meta.textContent=`${related.length} выезд${related.length===1?'':'ов'} · ${money(total)} выполнено`;card.querySelector('.job-meta')?.insertAdjacentElement('afterend',meta);
  });
}
function enhanceWarnings(){
  const host=document.querySelector('#insights');if(!host)return;const d=today(),jobs=activeJobs(d),warnings=[];
  jobs.forEach(j=>{if(j.type==='Монтаж'&&!j.phone)warnings.push(`⚠️ ${j.client||'Клиент'} — нет телефона`);if(!j.address)warnings.push(`⚠️ ${j.client||'Выезд'} — нет адреса`);});
  const overdue=(state.jobs||[]).filter(j=>j.status!=='Отменён'&&j.status!=='Выполнен'&&j.date<d).length;if(overdue)warnings.unshift(`⚠️ Просроченных выездов: ${overdue}`);
  warnings.slice(0,2).forEach(text=>{if([...host.children].some(x=>x.textContent?.includes(text)))return;const b=document.createElement('div');b.className='insight aa-warning';b.textContent=text;host.prepend(b);});
}
function routeForJobs(jobs){const addresses=jobs.map(j=>j.address).filter(Boolean);if(!addresses.length){toast('У выездов нет адресов');return;}window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(addresses.join(' → '))}`,'_blank','noopener');}
function openWorkday(){
  const d=today(),jobs=activeJobs(d),mounts=montageJobs(d),m=document.createElement('div');m.className='modal open aa-modal';
  const income=jobs.filter(j=>j.status==='Выполнен').reduce((s,j)=>s+Number(j.price||j.measurePrice||0),0);
  m.innerHTML=`<div class="backdrop"></div><div class="sheet"><div class="handle"></div><div class="sheet-head"><div><div class="eyebrow">Рабочий режим</div><h2>Сегодня</h2></div><button class="circle-btn" data-close>×</button></div><div class="aa-work-summary"><div><small>Монтажи</small><b>${mounts.length}/3</b></div><div><small>Выездов</small><b>${jobs.length}</b></div><div><small>Выполнено</small><b>${money(income)}</b></div></div><div class="aa-route-all"><button id="aaRouteAll">🚗 Маршрут дня</button></div><h3 class="sheet-section">План дня</h3>${jobs.length?jobs.map(j=>`<button class="aa-work-row" data-aa-check="${esc(j.id)}"><span class="aa-work-time">${esc(j.type==='Замер'?(j.time||'Замер'):SLOTS[j.slot]||j.time||'—')}</span><span><b>${esc(j.client||j.type)}</b><small>${j.address?'📍 '+esc(j.address):'⚠️ адрес не указан'}</small></span><strong>${j.status==='Выполнен'?'✓':j.price?money(j.price):'›'}</strong></button>`).join(''):'<div class="empty-card"><strong>Сегодня выездов нет</strong><span>Можно спокойно планировать день.</span></div>'}<div class="aa-day-footer">${jobs.some(j=>j.status==='Выполнен')?'День уже начат — часть работ выполнена.':'Когда закончишь работу, отмечай её «Выполнено» прямо в карточке.'}</div></div>`;
  document.body.append(m);m.querySelector('.backdrop').onclick=()=>m.remove();m.querySelector('[data-close]').onclick=()=>m.remove();m.querySelector('#aaRouteAll')?.addEventListener('click',()=>routeForJobs(jobs));m.querySelectorAll('[data-aa-check]').forEach(b=>b.addEventListener('click',()=>{m.remove();openChecklist(b.dataset.aaCheck)}));
}
const CHECKS=['Полотно','Коробка','Доборы','Наличники','Ручка / фурнитура','Петли','Расходники','Инструмент','Фото после монтажа'];
function openChecklist(id){
  const j=state.jobs.find(x=>x.id===id);if(!j)return;const checks=Array.isArray(j.checklist)?j.checklist:[],m=document.createElement('div');m.className='modal open aa-modal';
  m.innerHTML=`<div class="backdrop"></div><div class="sheet"><div class="handle"></div><div class="sheet-head"><div><div class="eyebrow">Монтаж</div><h2>Чек-лист</h2><small>${esc(j.client||'')}</small></div><button class="circle-btn" data-close>×</button></div><div class="aa-checklist">${CHECKS.map((x,i)=>`<label class="aa-check-row"><input type="checkbox" data-check-index="${i}" ${checks.includes(x)?'checked':''}><span>${x}</span></label>`).join('')}</div><div class="aa-check-progress"><span id="aaCheckProgress"></span></div><button class="secondary wide" id="aaVoice">🎙 Добавить голосовую заметку</button><button class="primary wide" id="aaSaveChecks">Сохранить чек-лист</button></div>`;
  document.body.append(m);const updateProgress=()=>{const n=m.querySelectorAll('input:checked').length;m.querySelector('#aaCheckProgress').textContent=`Готово ${n}/${CHECKS.length}`};updateProgress();m.querySelectorAll('input').forEach(x=>x.addEventListener('change',updateProgress));m.querySelector('.backdrop').onclick=()=>m.remove();m.querySelector('[data-close]').onclick=()=>m.remove();
  m.querySelector('#aaSaveChecks').onclick=async()=>{const selected=[...m.querySelectorAll('input:checked')].map(x=>CHECKS[Number(x.dataset.checkIndex)]);try{await patchJob(id,{checklist:selected});m.remove();toast('Чек-лист сохранён')}catch(e){toast('Не удалось сохранить чек-лист')}};m.querySelector('#aaVoice').onclick=()=>voiceNote(id,m);
}
function voiceNote(id,m){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){toast('Голосовые заметки не поддерживаются этим браузером');return;}
  const r=new Recognition();r.lang='ru-RU';r.interimResults=false;r.maxAlternatives=1;const b=m.querySelector('#aaVoice');b.textContent='🎙 Слушаю…';b.disabled=true;
  r.onresult=async e=>{const text=e.results?.[0]?.[0]?.transcript?.trim();if(text){try{await patchJob(id,{comment:[state.jobs.find(x=>x.id===id)?.comment,text].filter(Boolean).join(' — ')});toast('Голосовая заметка сохранена')}catch(_){toast('Не удалось сохранить заметку')}}};r.onerror=()=>toast('Не удалось распознать речь');r.onend=()=>{b.textContent='🎙 Добавить голосовую заметку';b.disabled=false};r.start();
}
async function patchJob(id,patch){
  if(!user||!user.emailVerified)throw new Error('auth');const ref=fs.doc(db,...SHARED_DOC);
  await fs.runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('shared-missing');const data=snap.data()?.data||{},jobs=Array.isArray(data.jobs)?data.jobs:[],idx=jobs.findIndex(j=>j.id===id);if(idx<0)throw new Error('job-missing');jobs[idx]={...jobs[idx],...patch};tx.set(ref,{data:{...data,jobs},version:snap.data()?.version||5,updatedAt:fs.serverTimestamp(),updatedBy:user.uid},{merge:true});});
}
init().catch(e=>console.error('Montaji AA UX',e));
