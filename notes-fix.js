/* MONТАЖИ — reliable notes save + delete */
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
    const toast=(text,kind='normal')=>{let el=document.querySelector('#toast');if(!el){el=document.createElement('div');el.id='toast';document.body.append(el)}el.textContent=text;el.dataset.state=kind;clearTimeout(window.__notesToastTimer);window.__notesToastTimer=setTimeout(()=>el.remove(),3400)};
    const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
    const readNotes=async()=>{const snap=await fs.getDoc(ref);const data=snap.exists()?snap.data()?.data||{}:{};return Array.isArray(data.notes)?data.notes:[]};
    const writeNotes=async notes=>{const user=auth.currentUser;if(!user)throw new Error('NO_AUTH');await fs.setDoc(ref,{data:{notes},version:1,updatedAt:fs.serverTimestamp(),updatedBy:user.uid},{merge:true});document.dispatchEvent(new CustomEvent('montaji-notes-updated'))};

    document.addEventListener('submit',async e=>{
      const form=e.target;if(!(form instanceof HTMLFormElement)||form.id!=='noteForm')return;
      e.preventDefault();e.stopImmediatePropagation();
      const modal=form.closest('.modal'),title=form.querySelector('#nTitle')?.value.trim()||'',text=form.querySelector('#nText')?.value.trim()||'';
      if(!title||!text)return;const user=auth.currentUser;if(!user){toast('Нет авторизации для сохранения','error');return}
      const button=form.querySelector('button[type=submit]');if(button){button.disabled=true;button.textContent='Сохраняем…'}
      try{const notes=await readNotes(),editing=modal?.querySelector('h2')?.textContent?.includes('Изменить'),existing=editing?notes.find(n=>n.title===title):null,item={id:existing?.id||uid(),title,text,archived:existing?.archived===true,updatedAt:new Date().toISOString()},next=[...notes.filter(n=>n.id!==item.id),item];await writeNotes(next);modal?.remove();toast('Заметка сохранена','success')}catch(err){console.error('notes save failed',err);toast('Не удалось сохранить заметку','error');if(button){button.disabled=false;button.textContent='Сохранить'}}
    },true);

    const getNoteId=card=>card?.dataset?.noteId||card?.querySelector('[data-note-id]')?.dataset?.noteId||'';
    const getNoteTitle=card=>{const explicit=card?.dataset?.noteTitle||card?.querySelector('[data-note-title]')?.dataset?.noteTitle;if(explicit)return explicit;return card?.querySelector('strong')?.textContent?.trim()||''};
    const ensureDeleteButtons=()=>{
      ['#activeNotes','#archivedNotes'].forEach(sel=>document.querySelectorAll(`${sel} > *`).forEach(card=>{
        if(!(card instanceof HTMLElement)||card.dataset.noteDeleteReady)return;const title=getNoteTitle(card);if(!title)return;card.dataset.noteDeleteReady='1';
        const actions=card.querySelector('.note-actions')||card.querySelector('.actions')||card;const btn=document.createElement('button');btn.type='button';btn.className='note-delete-btn';btn.dataset.noteDelete='1';btn.dataset.noteId=getNoteId(card);btn.dataset.noteTitle=title;btn.textContent='Удалить';actions.appendChild(btn);
      }));
    };
    document.addEventListener('click',async e=>{
      const btn=e.target.closest?.('[data-note-delete]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();
      const title=btn.dataset.noteTitle||'',id=btn.dataset.noteId||'';if(!title&&!id)return;
      if(!window.confirm(`Удалить заметку «${title}» навсегда?`))return;btn.disabled=true;btn.textContent='Удаляем…';
      try{const notes=await readNotes(),next=notes.filter(n=>id?n.id!==id:n.title!==title);if(next.length===notes.length){toast('Заметка уже удалена');return}await writeNotes(next);toast('Заметка удалена','success')}catch(err){console.error('notes delete failed',err);toast('Не удалось удалить заметку','error');btn.disabled=false;btn.textContent='Удалить'}
    },true);
    new MutationObserver(ensureDeleteButtons).observe(document.body,{subtree:true,childList:true});ensureDeleteButtons();
  }catch(err){console.error('notes fix init failed',err)}
})();
