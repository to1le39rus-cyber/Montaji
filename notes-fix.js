/* MONТАЖИ — operational shared notes */
(async()=>{
  const FIREBASE_VERSION='10.14.1';
  try{
    const [appMod,authMod,fs]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);
    const app=appMod.getApp('montaji-aa-production'),auth=authMod.getAuth(app),db=fs.getFirestore(app),ref=fs.doc(db,'appData','notes');
    const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
    const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
    const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
    const fmtDate=d=>d?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${d}T12:00:00`)):'';
    const toast=(text,kind='normal')=>{let el=document.querySelector('#toast');if(!el){el=document.createElement('div');el.id='toast';document.body.append(el)}el.textContent=text;el.dataset.state=kind;clearTimeout(window.__notesToastTimer);window.__notesToastTimer=setTimeout(()=>el.remove(),3400)};
    const readNotes=async()=>{const snap=await fs.getDoc(ref);const data=snap.exists()?snap.data()?.data||{}:{};return Array.isArray(data.notes)?data.notes:[]};
    const writeNotes=async notes=>{const user=auth.currentUser;if(!user)throw new Error('NO_AUTH');await fs.setDoc(ref,{data:{notes},version:2,updatedAt:fs.serverTimestamp(),updatedBy:user.uid},{merge:true});};
    const getNotes=async()=>{try{return await readNotes()}catch(e){console.error(e);return[]}};

    function renderCustomNotes(list){
      const active=document.querySelector('#activeNotes'),archive=document.querySelector('#archivedNotes');if(!active||!archive)return;
      const sort=(a,b)=>(a.dueDate||'9999-12-31').localeCompare(b.dueDate||'9999-12-31')||(b.updatedAt||'').localeCompare(a.updatedAt||'');
      const a=list.filter(n=>n.archived!==true).slice().sort(sort),ar=list.filter(n=>n.archived===true).slice().sort(sort);
      const card=n=>{const due=n.dueDate?fmtDate(n.dueDate):'';const overdue=n.dueDate&&n.dueDate<today()&&!n.archived;return `<div class="note-card ${n.archived?'archived':''}" data-note-id="${esc(n.id)}" data-note-title="${esc(n.title)}"><div class="note-top"><div><strong>${esc(n.title||'Заметка')}</strong>${due?`<div class="note-due ${overdue?'overdue':''}">${overdue?'⚠️ Просрочено':'📅'} ${esc(due)}</div>`:''}</div><div class="note-actions"><button type="button" class="mini-btn" data-note-edit="${esc(n.id)}">Изм.</button>${n.archived?`<button type="button" class="mini-btn" data-note-restore="${esc(n.id)}">Вернуть</button>`:`<button type="button" class="mini-btn" data-note-archive="${esc(n.id)}">Архив</button>`}<button type="button" class="mini-btn note-delete" data-note-delete="${esc(n.id)}">Удалить</button></div></div>${n.text?`<p>${esc(n.text)}</p>`:''}</div>`};
      active.innerHTML=a.length?a.map(card).join(''):'<div class="muted">Активных заметок нет</div>';
      archive.innerHTML=ar.length?ar.map(card).join(''):'<div class="muted">Архив пуст</div>';
    }
    const refresh=async()=>renderCustomNotes(await getNotes());

    const openNote=(n=null)=>{const m=document.createElement('div');m.className='modal open';m.innerHTML=`<div class="backdrop"></div><div class="sheet"><div class="sheet-head"><div><div class="eyebrow">Общие заметки</div><h2>${n?'Изменить заметку':'Новая заметка'}</h2></div><button class="circle-btn" data-close>×</button></div><form id="noteForm"><label>Что нужно сделать<input id="nTitle" required placeholder="Например: позвонить по рекламации" value="${esc(n?.title||'')}"></label><label>Подробности<textarea id="nText" rows="4" placeholder="Что именно нужно не забыть?">${esc(n?.text||'')}</textarea></label><label>Когда<input id="nDue" type="date" value="${esc(n?.dueDate||'')}"></label><button class="primary wide" type="submit">Сохранить</button></form></div>`;document.body.append(m);m.querySelector('.backdrop').onclick=()=>m.remove();m.querySelector('[data-close]').onclick=()=>m.remove();};

    document.addEventListener('submit',async e=>{
      const form=e.target;if(!(form instanceof HTMLFormElement)||form.id!=='noteForm')return;e.preventDefault();e.stopImmediatePropagation();
      const modal=form.closest('.modal'),id=modal?.dataset?.noteId||'',title=form.querySelector('#nTitle')?.value.trim()||'',text=form.querySelector('#nText')?.value.trim()||'',dueDate=form.querySelector('#nDue')?.value||'';
      if(!title)return toast('Напишите, что нужно сделать','error');
      const button=form.querySelector('button[type=submit]');if(button){button.disabled=true;button.textContent='Сохраняем…'}
      try{const notes=await readNotes(),editingId=modal?.dataset?.noteId||'',old=notes.find(n=>n.id===editingId),item={id:editingId||uid(),title,text,dueDate,archived:old?.archived===true,updatedAt:new Date().toISOString()};await writeNotes([...notes.filter(n=>n.id!==item.id),item]);modal?.remove();await refresh();toast('Заметка сохранена','success')}catch(err){console.error(err);toast('Не удалось сохранить заметку','error');if(button){button.disabled=false;button.textContent='Сохранить'}}
    },true);

    document.addEventListener('click',async e=>{
      const add=e.target.closest?.('[data-note-add]');if(add){e.preventDefault();e.stopImmediatePropagation();openNote();return;}
      const edit=e.target.closest?.('[data-note-edit]');if(edit){e.preventDefault();e.stopImmediatePropagation();const n=(await getNotes()).find(x=>x.id===edit.dataset.noteEdit);if(n){const m=document.querySelector('.modal.open');if(m)m.remove();const x=document.createElement('div');x.className='modal open';x.dataset.noteId=n.id;x.innerHTML=`<div class="backdrop"></div><div class="sheet"><div class="sheet-head"><div><div class="eyebrow">Общие заметки</div><h2>Изменить заметку</h2></div><button class="circle-btn" data-close>×</button></div><form id="noteForm"><label>Что нужно сделать<input id="nTitle" required value="${esc(n.title||'')}"></label><label>Подробности<textarea id="nText" rows="4">${esc(n.text||'')}</textarea></label><label>Когда<input id="nDue" type="date" value="${esc(n.dueDate||'')}"></label><button class="primary wide" type="submit">Сохранить</button></form></div>`;document.body.append(x);x.querySelector('.backdrop').onclick=()=>x.remove();x.querySelector('[data-close]').onclick=()=>x.remove();}return;}
      const archive=e.target.closest?.('[data-note-archive]');if(archive){e.preventDefault();e.stopImmediatePropagation();const id=archive.dataset.noteArchive;try{const notes=await readNotes();await writeNotes(notes.map(n=>n.id===id?{...n,archived:true,updatedAt:new Date().toISOString()}:n));await refresh();toast('Заметка отправлена в архив','success')}catch(err){toast('Не удалось архивировать','error')}return;}
      const restore=e.target.closest?.('[data-note-restore]');if(restore){e.preventDefault();e.stopImmediatePropagation();const id=restore.dataset.noteRestore;try{const notes=await readNotes();await writeNotes(notes.map(n=>n.id===id?{...n,archived:false,updatedAt:new Date().toISOString()}:n));await refresh();toast('Заметка возвращена','success')}catch(err){toast('Не удалось вернуть заметку','error')}return;}
      const del=e.target.closest?.('[data-note-delete]');if(del){e.preventDefault();e.stopImmediatePropagation();const id=del.dataset.noteDelete,n=(await getNotes()).find(x=>x.id===id);if(!n)return;if(!confirm(`Удалить заметку «${n.title||'Без названия'}» навсегда?`))return;try{const notes=await readNotes();await writeNotes(notes.filter(x=>x.id!==id));await refresh();toast('Заметка удалена','success')}catch(err){toast('Не удалось удалить заметку','error')}return;}
    },true);

    const observer=new MutationObserver(()=>{const active=document.querySelector('#activeNotes');if(active&&!active.dataset.customNotesReady){active.dataset.customNotesReady='1';refresh()}});observer.observe(document.body,{subtree:true,childList:true});
    const notesSnap=fs.onSnapshot(ref,snap=>{const data=snap.exists()?snap.data()?.data||{}:{};renderCustomNotes(Array.isArray(data.notes)?data.notes:[])},()=>{});
    setTimeout(refresh,300);
    window.addEventListener('beforeunload',()=>notesSnap?.());
  }catch(err){console.error('notes runtime init failed',err)}
})();
