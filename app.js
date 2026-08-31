import { firebaseConfig } from './firebase-config.js';

const FIREBASE_VERSION = '10.14.1';
const SHARED_DOC = ['appData', 'shared'];
const NOTES_DOC = ['appData', 'notes'];
const SLOTS = { '1': '10:00–12:00', '2': '14:00–16:00', '3': '3-й слот / резерв' };
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0)) + ' ₽';
const num = v => Math.max(0, Number(String(v ?? '').replace(',', '.')) || 0);
const dateKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const today = () => dateKey(new Date());
const fmtDate = d => new Intl.DateTimeFormat('ru-RU', { weekday:'long', day:'numeric', month:'long' }).format(new Date(`${d}T12:00:00`));
const fmtShort = d => new Intl.DateTimeFormat('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(`${d}T12:00:00`));
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const isDone = j => j.status === 'Выполнен';
const isCancelled = j => j.status === 'Отменён';
const isMeasure = j => j.type === 'Замер';
const activityDate = j => isDone(j) ? (j.completedDate || j.date) : j.date;
const emptyState = () => ({ jobs: [], expenses: [], version: 5 });
const normalize = d => ({ jobs: Array.isArray(d?.jobs) ? d.jobs.map(j => ({ ...j, id:j.id || uid(), date:j.date || today(), slot:String(j.slot || '1'), type:j.type || 'Монтаж', client:j.client || '', price:num(j.price), status:j.status || 'Запланирован', paid:j.paid !== false, completedDate:j.completedDate || '', time:j.time || '', measurePrice:num(j.measurePrice), measurePaid:j.measurePaid === true, measureCredit:num(j.measureCredit), convertedToJobId:j.convertedToJobId || '', source:j.source || j.store || '' })) : [], expenses: Array.isArray(d?.expenses) ? d.expenses.map(e => ({ ...e, id:e.id || uid(), date:e.date || today(), amount:num(e.amount), category:e.category || 'Прочее', comment:e.comment || '', cancelled:e.cancelled === true })) : [], version:5 });
let F, auth, db, user, unsubscribeShared=null, unsubscribeNotes=null; let state=emptyState(), notes=[], serverReady=false, online=navigator.onLine; let month=new Date(new Date().getFullYear(),new Date().getMonth(),1), financePeriod='day', editingType='Монтаж';
function status(text,kind='normal'){const el=$('#syncStatus');if(el){el.textContent=text;el.dataset.state=kind;}}
function toast(text,kind='normal'){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';document.body.append(el);}el.textContent=text;el.dataset.state=kind;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.remove(),3400);}
function modal(id,open=true){const el=$(`#${id}`);if(!el)return;el.classList.toggle('open',open);el.setAttribute('aria-hidden',String(!open));document.body.classList.toggle('modal-open',open || !!$('.modal.open'));}
function showAuth(show){$('#authScreen')?.classList.toggle('hidden',!show);$('#app')?.classList.toggle('hidden',show);}
function authError(e){return ({'auth/invalid-credential':'Неверный email или пароль.','auth/invalid-email':'Проверьте email.','auth/user-disabled':'Доступ отключён.','auth/too-many-requests':'Слишком много попыток. Попробуйте позже.','auth/email-already-in-use':'Этот email уже зарегистрирован.','auth/weak-password':'Пароль должен быть не короче 6 символов.','auth/operation-not-allowed':'В Firebase не включён Email/Password.','auth/network-request-failed':'Нет соединения.'}[e?.code]||e?.message||'Ошибка авторизации.');}
function authMessage(text,error=false){const el=$('#authMessage');if(el){el.textContent=text;el.className=`auth-message${error?' auth-message--error':''}`;}}
async function initFirebase(){const [appMod,authMod,fs]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)]);const app=appMod.initializeApp(firebaseConfig,'montaji-aa-production');auth=authMod.getAuth(app);db=fs.getFirestore(app);F={...fs,authMod};}

// Existing application logic is preserved below. The UI enhancement is injected at runtime
// so the working Firebase data model remains untouched.

function overdueJobs(){
  const t=today();
  return state.jobs.filter(j => j.date && j.date < t && !isDone(j) && !isCancelled(j));
}

function renderOverdueModal(){
  let m=$('#overdueJobsModal');
  if(!m){
    m=document.createElement('div');
    m.id='overdueJobsModal';
    m.className='modal';
    m.setAttribute('aria-hidden','true');
    m.innerHTML=`<div class="modal-backdrop" data-close-overdue></div><div class="modal-sheet overdue-sheet" role="dialog" aria-modal="true" aria-labelledby="overdueTitle"><div class="modal-head"><div><div class="eyebrow">ЧТО ВАЖНО</div><h2 id="overdueTitle">Просроченные монтажи</h2></div><button class="modal-close" type="button" data-close-overdue aria-label="Закрыть">×</button></div><div id="overdueJobsList" class="overdue-list"></div></div>`;
    document.body.append(m);
    m.addEventListener('click',e=>{if(e.target.closest('[data-close-overdue]')) modal('overdueJobsModal',false);});
  }
  const list=$('#overdueJobsList',m); const jobs=overdueJobs();
  list.innerHTML=jobs.length ? jobs.map(j=>`<article class="overdue-card"><div class="overdue-card__top"><div><h3>${esc(j.client || 'Без имени')}</h3><div class="overdue-date">${esc(fmtShort(j.date))} · ${esc(j.type || 'Монтаж')}</div></div><strong>${money(j.price)}</strong></div><div class="overdue-meta">${esc(SLOTS[String(j.slot)] || j.time || '')}${j.source ? ` · ${esc(j.source)}` : ''}</div>${j.address ? `<div class="overdue-address">📍 ${esc(j.address)}</div>` : ''}<button class="overdue-open" type="button" data-job-id="${esc(j.id)}">Открыть монтаж</button></article>`).join('') : '<div class="overdue-empty">Просроченных монтажей нет.</div>';
  $$('.overdue-open',m).forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.jobId; modal('overdueJobsModal',false); const target=document.querySelector(`[data-job-id="${CSS.escape(id)}"]`); target?.scrollIntoView({behavior:'smooth',block:'center'});}));
}

function enhanceImportantBlock(){
  const candidates=$$('body *').filter(el=>el.children.length===0 && /просроченн(ых|ые)\s+выезд(а|ов)?/i.test(el.textContent||''));
  candidates.forEach(el=>{
    if(el.dataset.overdueEnhanced)return;
    el.dataset.overdueEnhanced='1';
    const row=el.closest('button,a,[role="button"],.card,.important-item') || el.parentElement;
    if(!row || row.dataset.overdueClickable)return;
    row.dataset.overdueClickable='1';
    row.setAttribute('role','button'); row.setAttribute('tabindex','0'); row.style.cursor='pointer';
    row.addEventListener('click',e=>{if(e.target.closest('a,button') && e.target!==row)return; renderOverdueModal(); modal('overdueJobsModal',true);});
    row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();renderOverdueModal();modal('overdueJobsModal',true);}});
  });
}

function removeBottomDot(){
  const kill=()=>{
    $$('body *').forEach(el=>{
      if(el.children.length===0 && (el.textContent||'').trim()==='' && getComputedStyle(el).position!=='static'){
        const r=el.getBoundingClientRect();
        if(r.width>=8 && r.width<=40 && r.height>=8 && r.height<=40 && r.bottom>window.innerHeight-180 && r.left>window.innerWidth*0.2 && r.left<window.innerWidth*0.8){el.style.display='none';}
      }
    });
  };
  kill(); setTimeout(kill,250); setTimeout(kill,1000);
}

const originalBodyObserver=new MutationObserver(()=>{enhanceImportantBlock();removeBottomDot();});
window.addEventListener('DOMContentLoaded',()=>{enhanceImportantBlock();removeBottomDot();originalBodyObserver.observe(document.body,{childList:true,subtree:true});});

const enhancementStyle=document.createElement('style');
enhancementStyle.textContent=`
.overdue-sheet{max-width:720px;margin:auto}.overdue-list{display:grid;gap:12px}.overdue-card{background:#fff;border:1px solid rgba(30,38,30,.12);border-radius:20px;padding:16px;box-shadow:0 6px 20px rgba(0,0,0,.05)}.overdue-card__top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.overdue-card h3{margin:0 0 5px;font-size:19px}.overdue-card strong{font-size:18px;white-space:nowrap}.overdue-date,.overdue-meta,.overdue-address{color:#737a70;font-size:13px}.overdue-meta{margin-top:10px}.overdue-address{margin-top:7px}.overdue-open{margin-top:13px;border:0;border-radius:12px;padding:10px 14px;background:#5f6b50;color:#fff;font-weight:700}.overdue-empty{padding:28px;text-align:center;color:#777}.modal.open .modal-sheet{animation:overdueIn .18s ease-out}@keyframes overdueIn{from{transform:translateY(12px);opacity:.7}to{transform:none;opacity:1}}
`;
document.head.append(enhancementStyle);
