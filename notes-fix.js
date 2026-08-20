/* MONТАЖИ — reliable notes save + quiet-luxury visual layer */
(async()=>{
  const FIREBASE_VERSION='10.14.1';
  try{
    const [appMod,authMod,fs]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);
    const app=appMod.getApp('montaji-aa-production');
    const auth=authMod.getAuth(app);
    const db=fs.getFirestore(app);
    const ref=fs.doc(db,'appData','notes');
    const toast=(text,kind='normal')=>{
      let el=document.querySelector('#toast');
      if(!el){el=document.createElement('div');el.id='toast';document.body.append(el)}
      el.textContent=text;el.dataset.state=kind;clearTimeout(window.__notesToastTimer);
      window.__notesToastTimer=setTimeout(()=>el.remove(),3400);
    };
    const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
    const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
    const readNotes=async()=>{const snap=await fs.getDoc(ref);const data=snap.exists()?snap.data()?.data||{}:{};return Array.isArray(data.notes)?data.notes:[]};
    document.addEventListener('submit',async e=>{
      const form=e.target;
      if(!(form instanceof HTMLFormElement)||form.id!=='noteForm')return;
      e.preventDefault();e.stopImmediatePropagation();
      const modal=form.closest('.modal');
      const title=form.querySelector('#nTitle')?.value.trim()||'';
      const text=form.querySelector('#nText')?.value.trim()||'';
      if(!title||!text)return;
      const user=auth.currentUser;
      if(!user){toast('Нет авторизации для сохранения','error');return;}
      const button=form.querySelector('button[type=submit]');
      if(button){button.disabled=true;button.textContent='Сохраняем…'}
      try{
        const notes=await readNotes();
        const editing=modal?.querySelector('h2')?.textContent?.includes('Изменить');
        const existing=editing?notes.find(n=>n.title===title):null;
        const item={id:existing?.id||uid(),title,text,archived:existing?.archived===true,updatedAt:new Date().toISOString()};
        const next=[...notes.filter(n=>n.id!==item.id),item];
        await fs.setDoc(ref,{data:{notes:next},version:1,updatedAt:fs.serverTimestamp(),updatedBy:user.uid},{merge:true});
        modal?.remove();
        toast('Заметка сохранена','success');
        document.dispatchEvent(new CustomEvent('montaji-notes-updated'));
      }catch(err){
        console.error('notes save failed',err);
        toast('Не удалось сохранить заметку','error');
        if(button){button.disabled=false;button.textContent='Сохранить'}
      }
    },true);
  }catch(err){console.error('notes fix init failed',err)}
})();
