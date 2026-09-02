const APP_URL = new URL('app.js?runtime=20260901-overdue-fix', location.href);

async function boot(){
  const response = await fetch(APP_URL, {cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  source = source.replace(
    "import { firebaseConfig } from './firebase-config.js';",
    `import { firebaseConfig } from '${new URL('firebase-config.js', location.href).href}';`
  );

  source = source.replace(
    "auth=authMod.getAuth(app);db=fs.getFirestore(app);F={...fs,authMod};",
    "auth=authMod.getAuth(app);await authMod.setPersistence(auth,authMod.browserLocalPersistence).catch(err=>console.warn('Auth persistence setup failed',err));db=fs.getFirestore(app);F={...fs,authMod};"
  );
  source = source.replace(
    "function bindAuth(){$('#authForm').onsubmit=",
    "function bindAuth(){const form=$('#authForm');if(form&&!form.dataset.bound){form.dataset.bound='1';form.addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!online)return authMessage('Нет интернета.',true);if(!email||!pass)return authMessage('Введите email и пароль.',true);authMessage('Входим…');try{await F.authMod.signInWithEmailAndPassword(auth,email,pass)}catch(err){authMessage(authError(err),true)}});};$('#authForm').onsubmit="
  );

  // Calendar only: count every scheduled montage in history, including completed ones.
  // This is deliberately applied to the app source before it is evaluated, so it
  // uses the app's existing state/jobsForDate and does not open another Firebase listener.
  const calendarStart = source.indexOf('function renderCalendar(){');
  const calendarEnd = source.indexOf('function openDay', calendarStart);
  if(calendarStart !== -1 && calendarEnd !== -1){
    const calendarFix = `function renderCalendar(){const y=month.getFullYear(),m=month.getMonth(),start=(new Date(y,m,1).getDay()+6)%7,last=new Date(y,m+1,0).getDate();let h='';for(let i=0;i<start;i++)h+='<div class="day blank"></div>';const montageWord=n=>n===1?'монтаж':(n>=2&&n<=4?'монтажа':'монтажей');for(let n=1;n<=last;n++){const k=dateKey(new Date(y,m,n)),js=jobsForDate(k),montages=js.filter(j=>j.type==='Монтаж'),c=montages.length,hasMeasure=js.some(isMeasure);h+=\`<button class="day \${c>=3?'full':c===2?'busy':c?'partial':''} \${hasMeasure?'has-measure':''} \${k===today()?'today':''}" data-date="\${k}"><b>\${n}</b><span>\${c} \${montageWord(c)}</span><i>\${c}/3\${hasMeasure?' · замер':''}</i></button>\`;}$('#scheduleMonth').textContent=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(month);$('#calendar').innerHTML=h;$$('.day[data-date]').forEach(b=>b.onclick=()=>openDay(b.dataset.date));}`;
    source = source.slice(0, calendarStart) + calendarFix + source.slice(calendarEnd);
  }

  const blob = new Blob([source], {type:'text/javascript'});
  const url = URL.createObjectURL(blob);
  try {
    await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

boot().catch(error=>{
  console.error('Montaji boot failed', error);
  const el=document.querySelector('#syncStatus');
  if(el){el.textContent='Ошибка запуска';el.dataset.state='offline';}
  const toast=document.querySelector('#toast');
  if(toast){toast.textContent=`Не удалось запустить приложение: ${error?.message||'ошибка'}`;toast.dataset.state='error';}
});
