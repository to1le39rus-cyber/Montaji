export const buildNotesModel=({notes=[]})=>{
 const list=Array.isArray(notes)?notes:[];
 return {
  notes:list,
  urgent:list.filter(n=>n?.urgent===true&&!n?.done&&!n?.archived),
  active:list.filter(n=>!n?.done&&!n?.archived)
 };
};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
export const renderNotes=({root,model,onOpen=()=>{}})=>{
 if(!root)return;
 root.innerHTML='<section class="notes-header"><h1>Заметки</h1><span>'+model.active.length+'</span></section>';
 const list=document.createElement('section'); list.className='notes-list';
 for(const note of model.notes){
  if(note?.archived)continue;
  const el=document.createElement('button'); el.type='button'; el.className='note-row'+(note.urgent&&!note.done?' is-urgent':'');
  el.innerHTML='<strong>'+esc(note.title||'Без названия')+'</strong><span>'+esc(note.text||'')+'</span>';
  el.addEventListener('click',()=>onOpen(note));
  list.append(el);
 }
 if(!list.children.length)list.innerHTML='<p class="notes-empty">Заметок пока нет.</p>';
 root.append(list);
};
