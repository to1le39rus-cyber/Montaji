/* МОНТАЖИ — operational control queue */
(async()=>{
  const V='10.14.1';
  try{
    const [appMod,authMod,fs]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    const app=appMod.getApp('montaji-aa-production'),auth=authMod.getAuth(app),db=fs.getFirestore(app);
    const ref=fs.doc(db,'appData','control');
    const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
    const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
    const shiftDate=(days=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
    const today=()=>shiftDate(0);
    const fmt=d=>d?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date(`${d}T12:00:00`)):'';
    const due=n=>n.checkDate&&n.checkDate<=today();
    const toast=(text,kind='normal')=>{let el=document.querySelector('#toast');if(!el){el=document.createElement('div');el.id='toast';document.body.append(el)}el.textContent=text;el.dataset.state=kind;clearTimeout(window.__controlToast);window.__controlToast=setTimeout(()=>el.remove(),3400)};
    const read=async()=>{const s=await fs.getDoc(ref);const d=s.exists()?s.data()?.data||{}:{};return Array.isArray(d.controls)?d.controls:[]};
    const write=async controls=>{const u=auth.currentUser;if(!u)throw Error('NO_AUTH');await fs.setDoc(ref,{data:{controls},version:2,updatedAt:fs.serverTimestamp(),updatedBy:u.uid},{merge:true})};
    const getJobs=async()=>{const s=await fs.getDoc(fs.doc(db,'appData','shared'));return s.exists()?s.data()?.data?.jobs||[]:[]};

    const setFollowUp=async(id,date,lastResult='')=>{
      const cs=await read(),n=cs.find(x=>x.id===id);if(!n)return;
      await write(cs.map(x=>x.id===id?{...x,lastResult,checkDate:date,archived:false,updatedAt:new Date().toISOString()}:x));
      await render();toast(date===today()?'Контроль поставлен на сегодня':`Следующая проверка — ${fmt(date)}`,'success');
    };

    const render=async()=>{
      const controls=(await read()).filter(x=>x.archived!==true).sort((a,b)=>(a.checkDate||'9999').localeCompare(b.checkDate||'9999'));
      let sec=document.querySelector('#controlSection');
      if(!sec){
        const anchor=document.querySelector('#insights')?.parentElement;if(!anchor)return;
        sec=document.createElement('section');sec.id='controlSection';sec.className='control-section';
        sec.innerHTML='<div class="section-head"><div><h2>На контроле</h2><small>То, что нельзя потерять</small></div><button class="text-btn" id="addControlBtn">＋ Добавить</button></div><div id="controlList" class="control-list"></div>';
        anchor.insertAdjacentElement('afterend',sec);
      }
      sec.hidden=!controls.length;
      const list=sec.querySelector('#controlList');if(!list)return;
      list.innerHTML=controls.map(n=>`<article class="control-card ${due(n)?'is-due':''}">
        <div class="control-main">
          <div class="control-title">${esc(n.title||n.client||'Контроль')}</div>
          <div class="control-meta">${n.checkDate?(due(n)?'⚠️ Проверить сегодня':'Проверить '+esc(fmt(n.checkDate))):'Дата проверки не задана'}</div>
          ${n.text?`<div class="control-text">${esc(n.text)}</div>`:''}
          ${n.lastResult?`<div class="control-result">Последний результат: ${esc(n.lastResult)}</div>`:''}
        </div>
        <div class="control-actions">
          ${n.phone?`<button data-control-call="${esc(n.phone)}">Позвонить</button>`:''}
          <button data-control-check="${esc(n.id)}">Проверено</button>
          ${n.jobId?`<button data-control-job="${esc(n.id)}">Назначить дату</button>`:''}
        </div>
      </article>`).join('');
      bind();
      const add=sec.querySelector('#addControlBtn');if(add&&!add.dataset.bound){add.dataset.bound='1';add.onclick=()=>openControl();}
    };

    const bind=()=>{
      document.querySelectorAll('[data-control-call]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.onclick=()=>{const p=(b.dataset.controlCall||'').replace(/[^\d+]/g,'');if(p)location.href=`tel:${p}`}});
      document.querySelectorAll('[data-control-check]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.onclick=async()=>{
        const id=b.dataset.controlCheck,cs=await read(),n=cs.find(x=>x.id===id);if(!n)return;
        const result=prompt('Что выяснили?',n.lastResult||'');if(result===null)return;
        const ready=confirm('Дверь уже готова и можно назначать дату?');
        if(ready&&n.jobId){await openJobForControl(n);return}
        const choice=await openFollowUpChoice(n);
        if(choice){await setFollowUp(id,choice,result)}
      }});
      document.querySelectorAll('[data-control-job]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.onclick=async()=>{const cs=await read(),n=cs.find(x=>x.id===b.dataset.controlJob);if(n)openJobForControl(n)}});
    };

    const openFollowUpChoice=async n=>new Promise(resolve=>{
      const m=document.createElement('div');m.className='modal open control-choice-modal';
      m.innerHTML=`<div class="backdrop"></div><div class="sheet"><div class="sheet-head"><div><div class="eyebrow">Контроль</div><h2>Когда проверить снова?</h2></div><button class="circle-btn" data-close>×</button></div>
        <div class="control-choice-body"><div class="control-choice-title">${esc(n.title||'Контроль')}</div><div class="control-choice-grid">
          <button type="button" data-follow="${today()}"><strong>Сегодня</strong><span>вернуться к вопросу сейчас</span></button>
          <button type="button" data-follow="${shiftDate(1)}"><strong>Завтра</strong><span>проверить на следующий день</span></button>
          <button type="button" data-follow="${shiftDate(3)}"><strong>Через 3 дня</strong><span>если производство ещё в работе</span></button>
          <button type="button" data-follow="${shiftDate(7)}"><strong>Через неделю</strong><span>для более длинного ожидания</span></button>
        </div><label class="control-custom-date">Или выбрать дату<input id="controlChoiceDate" type="date" value="${esc(n.checkDate||shiftDate(1))}"></label><button type="button" class="primary wide" id="saveCustomFollow">Выбрать дату</button></div></div>`;
      document.body.append(m);
      const finish=v=>{m.remove();resolve(v)};
      m.querySelector('.backdrop').onclick=()=>finish(null);m.querySelector('[data-close]').onclick=()=>finish(null);
      m.querySelectorAll('[data-follow]').forEach(b=>b.onclick=()=>finish(b.dataset.follow));
      m.querySelector('#saveCustomFollow').onclick=()=>finish(m.querySelector('#controlChoiceDate').value||null);
    });

    const openControl=async preset=>{
      const defaultDate=preset?.checkDate||shiftDate(1);
      const m=document.createElement('div');m.className='modal open control-form-modal';
      m.innerHTML=`<div class="backdrop"></div><div class="sheet"><div class="sheet-head"><div><div class="eyebrow">Контроль</div><h2>${preset?'Поставить на контроль':'Новый контроль'}</h2></div><button class="circle-btn" data-close>×</button></div>
        <form id="controlForm"><label>Что нужно держать на контроле<input id="cTitle" required placeholder="Например: дверь не готова — уточнить готовность" value="${esc(preset?.title||'')}"></label>
        <label>Подробности<textarea id="cText" rows="4" placeholder="Что именно нужно выяснить?">${esc(preset?.text||'')}</textarea></label>
        <div class="form-row"><label>Когда проверить<input id="cDate" type="date" value="${esc(defaultDate)}" required></label><label>Телефон<input id="cPhone" type="tel" value="${esc(preset?.phone||'')}"></label></div>
        <div class="control-quick-label">Быстро выбрать</div><div class="control-quick-row">
          <button type="button" data-qdate="${shiftDate(1)}">Завтра</button><button type="button" data-qdate="${shiftDate(3)}">3 дня</button><button type="button" data-qdate="${shiftDate(7)}">Неделя</button><button type="button" data-qdate="custom">Дата</button>
        </div><button class="primary wide" type="submit">Поставить на контроль</button></form></div>`;
      document.body.append(m);
      m.querySelector('.backdrop').onclick=()=>m.remove();m.querySelector('[data-close]').onclick=()=>m.remove();
      m.querySelectorAll('[data-qdate]').forEach(b=>b.onclick=()=>{const d=b.dataset.qdate==='custom'?null:b.dataset.qdate;if(d)m.querySelector('#cDate').value=d;else m.querySelector('#cDate').showPicker?.()||m.querySelector('#cDate').focus()});
      m.querySelector('#controlForm').onsubmit=async e=>{e.preventDefault();const cs=await read(),item={id:preset?.id||uid(),jobId:preset?.jobId||'',title:m.querySelector('#cTitle').value.trim(),text:m.querySelector('#cText').value.trim(),checkDate:m.querySelector('#cDate').value,phone:m.querySelector('#cPhone').value.trim(),client:preset?.client||'',address:preset?.address||'',store:preset?.store||'',archived:false,lastResult:preset?.lastResult||'',createdAt:preset?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};await write([...cs.filter(x=>x.id!==item.id),item]);m.remove();await render();toast('Поставили на контроль','success')};
    };

    const openJobForControl=async n=>{
      const jobs=await getJobs(),j=jobs.find(x=>x.id===n.jobId);if(!j){toast('Исходный выезд не найден','error');return}
      const modal=document.querySelector('#jobModal');if(!modal)return;
      const set=(id,v)=>{const el=document.querySelector(id);if(el)el.value=v??''};
      set('#jobId',j.id);set('#jobDate',j.date||today());set('#jobSlot',j.slot||'1');set('#jobTime',j.time||'');set('#jobClient',j.client||'');set('#jobPhone',j.phone||'');set('#jobPrice',j.price??'');set('#jobAddress',j.address||'');set('#jobStore',j.store||'');set('#jobStatus','Запланирован');set('#jobCompletedDate',j.completedDate||j.date||today());set('#jobPaid',j.paid===false?'no':'yes');set('#jobComment',j.comment||'');
      modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
      try{const cs=await read();await write(cs.map(x=>x.id===n.id?{...x,archived:true,resolvedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:x));await render();}catch(e){console.error(e)}
      toast('Назначьте новую дату и сохраните выезд','success');
    };

    const addControlButton=()=>{
      const status=document.querySelector('#jobStatus');if(!status)return;
      let wrap=document.querySelector('#controlFromJob');
      if(!wrap){wrap=document.createElement('div');wrap.id='controlFromJob';wrap.className='control-from-job';status.closest('label')?.insertAdjacentElement('afterend',wrap)}
      const active=status.value==='Отменён'&&document.querySelector('#jobId')?.value;
      wrap.hidden=!active;
      if(active&&!wrap.dataset.bound){wrap.dataset.bound='1';wrap.innerHTML='<div>Если дверь не готова и новой даты пока нет — не оставляйте выезд просто отменённым.</div><button type="button" id="putControlBtn">＋ Поставить на контроль</button>';wrap.querySelector('#putControlBtn').onclick=async()=>{const j={jobId:document.querySelector('#jobId').value,title:`${document.querySelector('#jobClient').value||'Клиент'} — узнать готовность двери`,text:document.querySelector('#jobComment').value||'Уточнить готовность двери и после этого назначить новую дату.',checkDate:shiftDate(1),phone:document.querySelector('#jobPhone').value||'',client:document.querySelector('#jobClient').value||'',address:document.querySelector('#jobAddress').value||'',store:document.querySelector('#jobStore').value||''};openControl(j)}};
    };

    document.addEventListener('change',e=>{if(e.target?.id==='jobStatus')addControlButton()});
    document.addEventListener('click',e=>{if(e.target.closest?.('#todayNoteBtn'))setTimeout(render,250);if(e.target.closest?.('.edit'))setTimeout(addControlButton,200)});
    const observer=new MutationObserver(()=>{addControlButton();const a=document.querySelector('#activeNotes');if(a&&document.querySelector('#controlSection')==null)render()});observer.observe(document.body,{subtree:true,childList:true});
    const snap=fs.onSnapshot(ref,()=>render(),()=>{});
    setTimeout(render,700);
    window.addEventListener('beforeunload',()=>snap?.());
  }catch(e){console.error('control runtime init failed',e)}
})();
