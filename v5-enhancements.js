import { firebaseConfig } from './firebase-config.js';

const FIREBASE_VERSION='10.14.1';
const DATA_PATH=['appData','shared'];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
const dateKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const todayKey=()=>dateKey(new Date());
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const cancelled=j=>j.status==='Отменён';
const completed=j=>j.status==='Выполнен';
const active=j=>!cancelled(j);
const activityDate=j=>completed(j)?(j.completedDate||j.date):j.date;
let db=null,auth=null,fs=null,unsub=null,state={jobs:[],expenses:[]};

function injectInsights(){
  const hero=$('#todayScreen .hero-card');
  if(!hero||$('#smartInsight'))return;
  hero.insertAdjacentHTML('afterend','<section class="smart-card" id="smartInsight"><div class="smart-card__head"><div><span class="eyebrow">V5 · Умный помощник</span><h2>Что важно сегодня</h2></div><span class="smart-dot">AI</span></div><div id="smartInsightBody"></div></section>');
}
function injectMoneyExtras(){
  const moneyScreen=$('#moneyScreen');
  if(!moneyScreen||$('#moneyForecast'))return;
  const card=document.createElement('section');
  card.className='smart-card money-forecast';
  card.id='moneyForecast';
  card.innerHTML='<div class="smart-card__head"><div><span class="eyebrow">Финансовый радар</span><h2>Подсказки по деньгам</h2></div><span class="smart-dot">₽</span></div><div id="moneyForecastBody"></div>';
  moneyScreen.append(card);
}
function mapUrl(provider,address){
  const q=encodeURIComponent(address);
  return provider==='2gis'?`https://2gis.ru/search/${q}`:`https://yandex.ru/maps/?text=${q}`;
}
function openMapChooser(address){
  let modal=$('#mapChooser');
  if(modal)modal.remove();
  modal=document.createElement('div');
  modal.className='v5-map-modal';
  modal.id='mapChooser';
  modal.innerHTML=`<div class="v5-map-backdrop"></div><div class="v5-map-sheet"><div class="v5-map-handle"></div><div class="smart-card__head"><div><span class="eyebrow">Маршрут</span><h2>Открыть адрес</h2></div><button class="circle-btn" data-map-close>×</button></div><div class="map-address">${esc(address)}</div><div class="map-choice-grid"><a class="map-choice" target="_blank" rel="noopener noreferrer" href="${mapUrl('yandex',address)}"><span class="map-choice__icon">Я</span><span><b>Яндекс Карты</b><small>Открыть адрес</small></span><strong>↗</strong></a><a class="map-choice" target="_blank" rel="noopener noreferrer" href="${mapUrl('2gis',address)}"><span class="map-choice__icon">2Г</span><span><b>2ГИС</b><small>Открыть адрес</small></span><strong>↗</strong></a></div></div>`;
  document.body.append(modal);
  const close=()=>modal.remove();
  modal.querySelector('[data-map-close]').onclick=close;
  modal.querySelector('.v5-map-backdrop').onclick=close;
}
function replaceMapLinks(root=document){
  root.querySelectorAll('a[href*="google.com/maps"]').forEach(a=>{
    const card=a.closest('.job-card');
    const address=card?.querySelector('.job-card__details div')?.textContent?.replace(/^📍\s*/,'').trim();
    if(!address)return;
    a.removeAttribute('href');
    a.href='#';
    a.textContent='Маршрут';
    a.onclick=e=>{e.preventDefault();openMapChooser(address);};
  });
}
function renderInsights(){
  const body=$('#smartInsightBody');
  if(!body)return;
  const today=todayKey();
  const todayJobs=state.jobs.filter(j=>active(j)&&j.date===today&&!completed(j));
  const todayMont=todayJobs.filter(j=>j.type==='Монтаж').length;
  const todayIncome=todayJobs.reduce((s,j)=>s+Number(j.price||0),0);
  const next7=[];
  for(let i=1;i<=7;i++){const d=new Date();d.setDate(d.getDate()+i);const k=dateKey(d);next7.push(state.jobs.filter(j=>active(j)&&j.date===k&&!completed(j)));}
  const booked=next7.flat().filter(j=>j.type==='Монтаж').length;
  const freeDays=next7.filter(x=>x.filter(j=>j.type==='Монтаж').length===0).length;
  const expenses=state.expenses.filter(e=>e.date===today).reduce((s,e)=>s+Number(e.amount||0),0);
  let title='День под контролем',text=`Сегодня ${todayMont}/3 монтажей`;
  if(todayMont>=3){title='Сегодня максимум';text='Все 3 монтажных слота заняты. Не добавляй четвёртый выезд — лучше оставь время на дорогу и форс-мажор.';}
  else if(todayMont===2){title='Остался 1 слот';text='Сегодня ещё можно взять один монтаж. Если клиент рядом с текущими адресами — это самый простой способ добрать выручку.';}
  else if(todayMont===0){title='Сегодня свободно';text='Монтажей пока нет. Проверь ближайшие заявки и попробуй закрыть свободный слот.';}
  else if(expenses>todayIncome&&todayIncome>0){title='Расходы съели день';text=`Сегодня расходы ${money(expenses)} выше текущего дохода ${money(todayIncome)}. Проверь топливо, парковку и дополнительные траты.`;}
  else if(freeDays>=3){title='На неделе есть пустоты';text=`В ближайшие 7 дней ${freeDays} свободных дней. Хороший момент связаться с магазинами и добрать график.`;}
  else {title='График выглядит ровно';text=`На ближайшие 7 дней запланировано ${booked} монтаж${booked===1?'':'ей'}. Следи за свободными слотами и не перегружай один день.`;}
  body.innerHTML=`<div class="smart-main"><b>${title}</b><span>${text}</span></div><div class="smart-chips"><span>${todayMont}/3 сегодня</span><span>${booked} монтажей на 7 дней</span><span>${money(todayIncome)} план</span></div>`;
}
function renderMoneyForecast(){
  const body=$('#moneyForecastBody');
  if(!body)return;
  const now=new Date();
  const end=new Date();end.setDate(end.getDate()+6);
  const jobs=state.jobs.filter(j=>active(j)&&activityDate(j)>=todayKey()&&activityDate(j)<=dateKey(end)&&Number(j.price||0)>0);
  const income=jobs.reduce((s,j)=>s+Number(j.price||0),0);
  const expenses=state.expenses.filter(e=>e.date>=todayKey()&&e.date<=dateKey(end)).reduce((s,e)=>s+Number(e.amount||0),0);
  const completedIncome=state.jobs.filter(j=>active(j)&&completed(j)&&activityDate(j).slice(0,7)===todayKey().slice(0,7)).reduce((s,j)=>s+Number(j.price||0),0);
  const topStore={};state.jobs.filter(j=>active(j)&&Number(j.price||0)>0).forEach(j=>{const k=j.store||'Без магазина';topStore[k]=(topStore[k]||0)+Number(j.price||0);});
  const best=Object.entries(topStore).sort((a,b)=>b[1]-a[1])[0];
  const net=income-expenses;
  const note=income===0?'Нет запланированной выручки на 7 дней. Стоит открыть график и добрать заявки.':expenses>income&&income>0?'Запланированные расходы выше выручки — проверь будущие траты.':`Плановая выручка на 7 дней: ${money(income)}. После известных расходов: ${money(net)}.`;
  body.innerHTML=`<div class="finance-radar"><div><span>7 дней</span><b>${money(income)}</b></div><div><span>Расходы</span><b>${money(expenses)}</b></div><div><span>Выполнено в этом месяце</span><b>${money(completedIncome)}</b></div></div><p class="smart-note">${esc(note)}</p>${best?`<div class="smart-tip">Сильнее всего по выручке сейчас: <b>${esc(best[0])}</b> · ${money(best[1])}</div>`:''}`;
}
async function connect(){
  const [appMod,authMod,storeMod]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
  ]);
  const app=appMod.getApps().find(x=>x.name==='montaji-aa-final')||appMod.initializeApp(firebaseConfig,'montaji-aa-final');
  auth=authMod.getAuth(app);db=storeMod.getFirestore(app);fs=storeMod;
  auth.onAuthStateChanged(async u=>{
    if(unsub){unsub();unsub=null;}
    if(!u||!u.emailVerified)return;
    const ref=fs.doc(db,...DATA_PATH);
    const snap=await fs.getDocFromServer(ref).catch(()=>null);
    if(snap?.exists())state=snap.data()?.data||state;
    renderInsights();renderMoneyForecast();
    unsub=fs.onSnapshot(ref,s=>{if(!navigator.onLine)return;state=s.exists()?s.data()?.data||state:state;renderInsights();renderMoneyForecast();replaceMapLinks();});
  });
}
function bootV5(){
  injectInsights();injectMoneyExtras();
  replaceMapLinks();
  const observer=new MutationObserver(()=>replaceMapLinks());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>connect().catch(console.error),300);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootV5,{once:true});else bootV5();
