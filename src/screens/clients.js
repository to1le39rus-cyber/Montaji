import { projectClients } from '../domain/clients.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';

export const buildClientsModel=({state})=>{
 const clients=projectClients(state?.jobs||[]);
 return {clients,count:clients.length};
};

export const renderClients=({root,model,onOpen=()=>{}})=>{
 if(!root)return;
 root.innerHTML='<section class="clients-header"><h1>Клиенты</h1><span>'+model.count+'</span></section>';
 const list=document.createElement('section'); list.className='clients-list';
 for(const client of model.clients){
  const el=document.createElement('button'); el.type='button'; el.className='client-row';
  const total=client.jobs.reduce((sum,j)=>sum+(Number(j.price)||0),0);
  el.innerHTML='<strong>'+esc(client.client||'Без имени')+'</strong><span>'+esc(client.phone||'')+'</span><span>'+client.jobs.length+' заявок · '+money(total)+'</span>';
  el.addEventListener('click',()=>onOpen(client));
  list.append(el);
 }
 if(!model.clients.length)list.innerHTML='<p class="clients-empty">Клиентов пока нет.</p>';
 root.append(list);
};
