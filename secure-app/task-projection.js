/* Montaji AA — urgent task projection. Reads the existing notes document; creates no second data model. */
(async()=>{
  const FIREBASE='https://www.gstatic.com/firebasejs/10.14.1/';
  let stop=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  const render=tasks=>{
    const host=document.querySelector('#insights');
    if(!host)return;
    host.querySelectorAll('.aa-task-insight').forEach(x=>x.remove());
    const urgent=tasks.filter(t=>t?.kind==='task'&&t?.priority==='urgent'&&!t?.done&&!t?.archived).slice(0,5);
    urgent.forEach(t=>{
      const b=document.createElement('button');
      b.className='insight aa-task-insight';
      b.dataset.taskId=t.id;
      b.innerHTML=`<span class="aa-task-check">${icon}</span><span class="aa-task-title">${esc(t.title)}</span><span class="aa-task-arrow">›</span>`;
      b.addEventListener('click',()=>completeTask(t.id),{once:true});
      host.appendChild(b);
    });
    const hideUrgent=()=>urgent.forEach(t=>document.querySelector(`[data-note-archive="${CSS.escape(t.id)}"]`)?.closest('.note-card')?.classList.add('note-task-hidden'));
    requestAnimationFrame(hideUrgent);
  };
  const completeTask=async id=>{
    try{
      const [appMod,authMod,fs]=await Promise.all([
        import(FIREBASE+'firebase-app.js'),
        import(FIREBASE+'firebase-auth.js'),
        import(FIREBASE+'firebase-firestore.js')
      ]);
      const app=appMod.getApps().find(x=>x.name==='montaji-aa-production')||appMod.getApps()[0];
      const auth=authMod.getAuth(app); const db=fs.getFirestore(app);
      if(!auth.currentUser)return;
      const ref=fs.doc(db,'appData','notes');
      await fs.runTransaction(db,async tx=>{
        const snap=await tx.get(ref); if(!snap.exists())return;
        const data=snap.data()?.data||{}; const notes=Array.isArray(data.notes)?data.notes:[];
        const next=notes.map(n=>n?.id===id?{...n,done:true,archived:true,updatedAt:new Date().toISOString()}:n);
        tx.set(ref,{data:{notes:next},version:2,updatedAt:fs.serverTimestamp(),updatedBy:auth.currentUser.uid},{merge:true});
      });
    }catch(err){console.error('[task-projection]',err);}
  };
  const start=async()=>{
    try{
      const [appMod,authMod,fs]=await Promise.all([
        import(FIREBASE+'firebase-app.js'),
        import(FIREBASE+'firebase-auth.js'),
        import(FIREBASE+'firebase-firestore.js')
      ]);
      const app=appMod.getApps().find(x=>x.name==='montaji-aa-production')||appMod.getApps()[0];
      const auth=authMod.getAuth(app); const db=fs.getFirestore(app);
      auth.onAuthStateChanged(user=>{
        stop?.(); stop=null;
        if(!user)return;
        stop=fs.onSnapshot(fs.doc(db,'appData','notes'),snap=>render(Array.isArray(snap.data()?.data?.notes)?snap.data().data.notes:[]),()=>{});
      });
    }catch(err){console.warn('[task-projection] init skipped',err);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
