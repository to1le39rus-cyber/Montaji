import { firebaseConfig } from './firebase-config.js';

const FIREBASE_VERSION = '10.14.1';
const PROFILE_APP = 'montaji-aa-profile-ui';
let auth = null;
let db = null;
let user = null;
let lastShared = null;
let unsubscribe = null;

const css = `
.profile-greeting{display:flex;align-items:center;gap:10px;min-width:0}
.profile-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;flex:0 0 42px;background:linear-gradient(145deg,#687458,#30382d);color:#fff;font-weight:800;font-size:14px;letter-spacing:.02em;box-shadow:0 5px 16px rgba(25,31,24,.16);border:2px solid rgba(255,255,255,.82);cursor:pointer;overflow:hidden}
.profile-avatar img{width:100%;height:100%;object-fit:cover}
.profile-copy{min-width:0}
.profile-hello{font-size:15px;font-weight:800;line-height:1.1;color:var(--ui-text,#182019);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.profile-sub{font-size:11px;color:var(--ui-muted,#858c85);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.profile-actions{display:flex;align-items:center;gap:8px;margin-left:auto}
.profile-bell{position:relative;width:40px;height:40px;border:1px solid var(--ui-border,#dfe3dc);background:rgba(255,255,255,.78);border-radius:50%;display:grid;place-items:center;cursor:pointer;color:var(--ui-text,#182019);box-shadow:0 5px 16px rgba(25,31,24,.06)}
.profile-bell svg{width:19px;height:19px}
.profile-bell-dot{position:absolute;right:8px;top:7px;width:8px;height:8px;border-radius:50%;background:#c84c43;border:2px solid #fff;display:none}
.profile-bell.has-new .profile-bell-dot{display:block}
.profile-header{display:flex!important;align-items:center;gap:12px}
.profile-sheet{position:fixed;inset:0;z-index:1000;pointer-events:none;opacity:0;transition:opacity .18s ease}
.profile-sheet.open{pointer-events:auto;opacity:1}
.profile-sheet .profile-backdrop{position:absolute;inset:0;background:rgba(10,15,11,.42);backdrop-filter:blur(5px)}
.profile-panel{position:absolute;left:12px;right:12px;bottom:12px;max-height:min(82vh,720px);overflow:auto;background:#f7f8f4;border:1px solid rgba(255,255,255,.9);border-radius:28px;padding:10px 16px 22px;box-shadow:0 24px 70px rgba(10,15,11,.28);transform:translateY(24px);transition:transform .24s ease}
.profile-sheet.open .profile-panel{transform:translateY(0)}
.profile-handle{width:42px;height:4px;border-radius:99px;background:#cfd4cb;margin:4px auto 18px}
.profile-panel-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.profile-panel-avatar{width:58px;height:58px;border-radius:20px;background:#59654e;color:#fff;display:grid;place-items:center;font-size:20px;font-weight:800;overflow:hidden}
.profile-panel-avatar img{width:100%;height:100%;object-fit:cover}
.profile-panel-name{font-size:22px;font-weight:850;letter-spacing:-.03em}
.profile-panel-role{font-size:13px;color:#7c847c;margin-top:3px}
.profile-section{background:#fff;border:1px solid #e0e3dc;border-radius:20px;overflow:hidden;margin-top:12px}
.profile-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 15px;background:none;border:0;border-bottom:1px solid #eceee9;text-align:left;color:#182019;font:inherit}
.profile-row:last-child{border-bottom:0}
.profile-row strong{font-size:14px}.profile-row small{display:block;color:#8a918a;font-size:11px;margin-top:3px}.profile-row b{color:#637054;font-size:13px}
.profile-disabled{opacity:.55}
.profile-close{position:absolute;right:15px;top:18px;width:36px;height:36px;border:0;border-radius:50%;background:#e8ebe5;font-size:23px;color:#4f574e}
.notice-sheet .profile-panel{padding-bottom:18px}
.notice-empty{padding:26px 18px;text-align:center;color:#858c85;font-size:14px}
.notice-item{padding:15px;border-bottom:1px solid #eceee9;background:#fff}.notice-item:last-child{border-bottom:0}.notice-item strong{display:block;font-size:14px}.notice-item span{display:block;font-size:12px;color:#7d847d;margin-top:5px;line-height:1.35}
@media (max-width:390px){.profile-avatar{width:38px;height:38px;flex-basis:38px}.profile-hello{font-size:14px}}
@media (prefers-reduced-motion:reduce){.profile-sheet,.profile-panel{transition:none}}
`;

function injectStyle(){
  if(document.getElementById('profile-ui-style')) return;
  const style=document.createElement('style');style.id='profile-ui-style';style.textContent=css;document.head.append(style);
}

function initials(name='А'){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'А';}
function displayName(u){
  if(u?.displayName?.trim()) return u.displayName.trim().split(/\s+/)[0];
  const email=u?.email||'';
  if(/tkrp/i.test(email)) return 'Анатолий';
  if(/titoworld/i.test(email)) return 'Анатолий';
  return 'Анатолий';
}
function roleLabel(){return 'Монтажник';}
function avatarMarkup(u, large=false){
  const name=displayName(u);
  const size=large?'profile-panel-avatar':'profile-avatar';
  return `<div class="${size}" aria-hidden="true">${u?.photoURL?`<img src="${escapeAttr(u.photoURL)}" alt="">`:initials(name)}</div>`;
}
function escapeAttr(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function todayHeader(){
  const header=document.querySelector('.topbar');
  if(!header || header.dataset.profileReady==='1') return;
  header.dataset.profileReady='1';
  const right=header.querySelector('.top-actions');
  const left=header.firstElementChild;
  if(!left) return;
  const greeting=document.createElement('div');
  greeting.className='profile-greeting';
  greeting.innerHTML=`${avatarMarkup(user)}<div class="profile-copy"><div class="profile-hello">Привет, ${escapeAttr(displayName(user))}! 👋</div><div class="profile-sub" id="profileTodaySub">Сегодня · ${roleLabel()}</div></div>`;
  greeting.querySelector('.profile-avatar').addEventListener('click',openProfile);
  left.replaceWith(greeting);
  if(right){
    right.classList.add('profile-actions');
    const bell=document.createElement('button');
    bell.className='profile-bell';bell.type='button';bell.id='profileBell';bell.setAttribute('aria-label','Уведомления');
    bell.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg><span class="profile-bell-dot"></span>';
    bell.addEventListener('click',openNotifications);
    right.prepend(bell);
  }
}

function buildSheets(){
  if(document.getElementById('profileSheet')) return;
  const root=document.createElement('div');
  root.innerHTML=`
  <section class="profile-sheet" id="profileSheet" aria-hidden="true">
    <div class="profile-backdrop" data-profile-close="profileSheet"></div>
    <div class="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profileTitle">
      <div class="profile-handle"></div><button class="profile-close" data-profile-close="profileSheet" aria-label="Закрыть">×</button>
      <div class="profile-panel-head">${avatarMarkup(user,true)}<div><div class="profile-panel-name" id="profileTitle">${escapeAttr(displayName(user))}</div><div class="profile-panel-role">${roleLabel()} · ${escapeAttr(user?.email||'')}</div></div></div>
      <div class="profile-section">
        <button class="profile-row" type="button"><span><strong>Профиль</strong><small>Имя и фотография</small></span><b>Скоро ›</b></button>
        <button class="profile-row" type="button"><span><strong>Уведомления</strong><small>Выезды и изменения базы</small></span><b>Включены</b></button>
        <button class="profile-row profile-disabled" type="button" disabled><span><strong>Мои заметки</strong><small>Личные заметки и списки</small></span><b>Следующий этап</b></button>
      </div>
      <div class="profile-section">
        <button class="profile-row" type="button" id="profileAccountEmail"><span><strong>Аккаунт</strong><small>${escapeAttr(user?.email||'')}</small></span><b>Firebase</b></button>
      </div>
    </div>
  </section>
  <section class="profile-sheet notice-sheet" id="noticeSheet" aria-hidden="true">
    <div class="profile-backdrop" data-profile-close="noticeSheet"></div>
    <div class="profile-panel" role="dialog" aria-modal="true" aria-labelledby="noticeTitle">
      <div class="profile-handle"></div><button class="profile-close" data-profile-close="noticeSheet" aria-label="Закрыть">×</button>
      <div class="profile-panel-head"><div class="profile-panel-avatar">🔔</div><div><div class="profile-panel-name" id="noticeTitle">Уведомления</div><div class="profile-panel-role">Всё важное по работе</div></div></div>
      <div class="profile-section" id="noticeList"></div>
    </div>
  </section>`;
  document.body.append(root);
  document.querySelectorAll('[data-profile-close]').forEach(el=>el.addEventListener('click',()=>closeSheet(el.dataset.profileClose)));
}

function openSheet(id){const el=document.getElementById(id);if(!el)return;el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');}
function closeSheet(id){const el=document.getElementById(id);if(!el)return;el.classList.remove('open');el.setAttribute('aria-hidden','true');if(!document.querySelector('.profile-sheet.open'))document.body.classList.remove('modal-open');}
function openProfile(){openSheet('profileSheet');}
function openNotifications(){renderNotices();openSheet('noticeSheet');document.getElementById('profileBell')?.classList.remove('has-new');}

function renderNotices(){
  const list=document.getElementById('noticeList');if(!list)return;
  const jobs=Array.isArray(lastShared?.jobs)?lastShared.jobs.filter(j=>j?.status!=='Отменён'):[];
  const today=new Date();const key=today.toISOString().slice(0,10);
  const todayJobs=jobs.filter(j=>j.date===key);
  const upcoming=jobs.filter(j=>j.date>key).sort((a,b)=>`${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`)).slice(0,2);
  const items=[];
  if(todayJobs.length) items.push({title:`Сегодня ${todayJobs.length} ${todayJobs.length===1?'выезд':'выезда'}`,text:'Все актуальные выезды собраны на экране «Сегодня».'});
  upcoming.forEach(j=>items.push({title:`Новый фокус · ${j.client||'Выезд'}`,text:`${j.date} · ${j.time || (j.slot==='1'?'10:00–12:00':j.slot==='2'?'14:00–16:00':'третий слот')}`}));
  if(lastShared?.__updated) items.unshift({title:'Общая база обновлена',text:'Данные синхронизированы между телефонами.'});
  list.innerHTML=items.length?items.map(x=>`<div class="notice-item"><strong>${escapeAttr(x.title)}</strong><span>${escapeAttr(x.text)}</span></div>`).join(''):'<div class="notice-empty">Пока всё спокойно.<br>Новых уведомлений нет.</div>';
}

async function initFirebase(){
  try{
    const [appMod,authMod,fs]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);
    const app=appMod.initializeApp(firebaseConfig,PROFILE_APP);
    auth=authMod.getAuth(app);db=fs.getFirestore(app);
    authMod.onAuthStateChanged(auth,u=>{user=u;if(user) startRealtime(fs);});
  }catch(e){console.warn('[profile-ui]',e);}
}
function startRealtime(fs){
  unsubscribe?.();
  unsubscribe=fs.onSnapshot(fs.doc(db,'appData','shared'),snap=>{
    const data=snap.exists()?snap.data()?.data||{}:{};
    const next={...data,__updated:true};
    const changed=lastShared && JSON.stringify(lastShared.jobs||[])!==JSON.stringify(next.jobs||[]);
    lastShared=next;
    if(changed){document.getElementById('profileBell')?.classList.add('has-new');}
    renderNotices();
  },()=>{});
}

function watchApp(){
  const ensure=()=>{if(user)todayHeader();};
  ensure();
  const observer=new MutationObserver(()=>ensure());
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const nav=e.target.closest('.nav');
    if(nav){setTimeout(()=>ensure(),0);}
    if(e.key==='Escape')closeSheet('profileSheet');
  });
}

injectStyle();
buildSheets();
watchApp();
initFirebase();
