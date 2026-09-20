export const buildNotesModel=({notes=[]})=>{
 const list=Array.isArray(notes)?notes:[];
 return {
  notes:list,
  urgent:list.filter(n=>n?.urgent===true&&!n?.done&&!n?.archived),
  active:list.filter(n=>!n?.done&&!n?.archived)
 };
};

import { esc } from '../ui/format.js';
import { icon } from '../ui/icons.js';

export const renderNotes = ({root,model,onOpen=()=>{},onAdd}) => {
  if(!root)return;
  root.innerHTML='<header class="screen-heading"><div><h1>Заметки</h1><p>Под рукой. На обоих телефонах.</p></div>'+(onAdd?'<button type="button" class="icon-button" aria-label="Добавить заметку">'+icon('plus')+'</button>':'')+'</header>';
  root.querySelector('header button')?.addEventListener('click',onAdd);
  const list=document.createElement('section');list.className='notes-list';
  const row=note=>{
    const button=document.createElement('button');button.type='button';button.className='note-row'+(note.urgent&&!note.done?' is-urgent':'');
    button.innerHTML='<span class="note-row-kind">'+icon(note.urgent?'spark':'note')+(note.urgent?'Срочная задача':'Заметка')+'</span><strong>'+esc(note.title||'Без названия')+'</strong><span>'+esc(note.text||'')+'</span>';button.onclick=()=>onOpen(note);return button;
  };
  model.active.forEach(note=>list.append(row(note)));
  if(!model.active.length)list.innerHTML='<div class="empty-state">'+icon('note')+'<h3>Всё записано и сделано</h3><p>Здесь появятся ваши новые заметки.</p></div>';
  root.append(list);
  const archived=model.notes.filter(n=>n.done||n.archived);
  if(archived.length){const archive=document.createElement('details');archive.className='notes-archive';archive.innerHTML='<summary>Выполненные и архив · '+archived.length+'</summary>';archived.forEach(note=>archive.append(row(note)));root.append(archive)}
};
