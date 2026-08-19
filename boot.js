const APP_URL = new URL(`app.js?runtime=20260819-9`, location.href);
const CONFIG_URL = new URL('firebase-config.js', location.href).href;

async function boot(){
  const response = await fetch(APP_URL,{cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  // The production runtime is loaded as a blob, so keep Firebase config resolvable.
  source = source.replace(
    /import \{ firebaseConfig \} from '\.\/firebase-config\.js';/,
    `import { firebaseConfig } from '${CONFIG_URL}';`
  );

  // Montage count is informational. There is deliberately NO daily capacity limit.
  // Slots 1–3 are convenient presets, not a business rule.
  const oldCapacity = "function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return activeJobs(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){const used=new Set(activeJobs(d).filter(j=>j.type==='Монтаж').map(j=>String(j.slot)));return ['1','2','3'].find(s=>!used.has(s))||'3';}";
  const newCapacity = "function jobsForDate(d){return state.jobs.filter(j=>!isCancelled(j)&&j.date===d);} function activeJobs(d){return jobsForDate(d).filter(j=>!isDone(j));} function montageCount(d){return jobsForDate(d).filter(j=>j.type==='Монтаж').length;} function freeSlot(d){return String(montageCount(d)+1);}";
  if(!source.includes(oldCapacity)) throw new Error('CAPACITY_SOURCE_NOT_FOUND');
  source = source.replace(oldCapacity,newCapacity);

  // Never reject a montage because another montage uses the same preset slot.
  source = source.replace(
    /const d=\$\('#jobDate'\)\.value,s=\$\('#jobSlot'\)\.value,id=\$\('#jobId'\)\.value,conflict=editingType==='Монтаж'&&state\.jobs\.find\(j=>j\.id!==id&&!isCancelled\(j\)&&!isDone\(j\)&&j\.type==='Монтаж'&&j\.date===d&&String\(j\.slot\)===s\);/,
    `const d=$('#jobDate').value,s=$('#jobSlot').value,id=$('#jobId').value,conflict=null;`
  );
  source = source.replace(
    /const conflict=state\.jobs\.find\(j=>j\.id!==id&&!isCancelled\(j\)&&!isDone\(j\)&&j\.type==='Монтаж'&&j\.date===d&&String\(j\.slot\)===$\('#jobSlot'\)\.value\);/,
    `const conflict=null;`
  );

  // The dashboard shows the actual number of montage jobs, not a fake 3-job cap.
  source = source.replace(/\$\('#todayLoad'\)\.textContent=`\$\{montageCount\(d\)\}\/3`;/,
    `$('#todayLoad').textContent=String(montageCount(d));`);
  source = source.replace(/\$\('#todayProgress'\)\.style\.width=Math\.min\(100,montageCount\(d\)\/3\*100\)+'%';/,
    `$('#todayProgress').style.width=montageCount(d)>0?'100%':'0%';`);

  // Avoid claiming a day is "full" at three jobs.
  source = source.replace(/if\(tc===3\)advice\.push\('🔥 Завтра 3\/3 монтажей — день полностью загружен'\);else if\(tc===2\)advice\.push\('✨ Завтра осталось одно монтажное окно'\);/,
    `if(tc>0)advice.push(\`✨ Завтра запланировано \${tc} монтажей\`);`);

  // Calendar must not mark 3 jobs as a hard maximum.
  source = source.replace(/<span>● 3\/3<\/span>/g,'<span>● монтажи</span>');
  source = source.replace(/\$\{c>=3\?'full':c>0\?'busy':''\}/g,`\${c>0?'busy':''}`);

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
