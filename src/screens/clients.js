import { projectClients } from '../domain/clients.js';
import { effectiveIncome, isIncomeEligible } from '../domain/jobs.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
const date=d=>d?new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00')):'—';

export const buildClientsModel=({state})=>{
 const clients=projectClients(state?.jobs||[]).map(c=>{
  const income=c.jobs.filter(isIncomeEligible).reduce((s,j)=>s+effectiveIncome(j),0);
  const debt=c.jobs.filter(j=>isIncomeEligible(j)&&j.paid===false).reduce((s,j)=>s+effectiveIncome(j),0);
  return {...c,totalIncome:income,debt};
 });
 return {clients,count:clients.length};
};

export const renderClients=({root,model,onOpen=()=>{}})=>{
 if(!root)return;
 root.innerHTML='<section class="clients-header"><div><h1>Клиенты</h1><p>История и расчёты по клиентам</p></div><span>'+model.count+'</span></section>';
 const list=document.createElement('section'); list.className='clients-list';
 for(const client of model.clients){
  const el=document.createElement('button'); el.type='button'; el.className='client-row';
  el.innerHTML='<strong>'+esc(client.client||'Без имени')+'</strong><span>'+esc(client.phone||'')+'</span><span>'+client.jobs.length+' заявок · '+money(client.totalIncome)+'</span>'+(client.debt?'<em>Долг '+money(client.debt)+'</em>':'');
  el.addEventListener('click',()=>onOpen(client));
  list.append(el);
 }
 if(!model.clients.length)list.innerHTML='<p class="clients-empty">Клиентов пока нет.</p>';
 root.append(list);
};

export const renderClientDetail=({root,client,onBack=()=>{},onJobClick=()=>{}})=>{
 if(!root||!client)return;
 root.innerHTML='';
 const head=document.createElement('section');head.className='client-detail-head';
 head.innerHTML='<button type="button" class="client-back">← Клиенты</button><h1>'+esc(client.client||'Без имени')+'</h1><p>'+esc(client.phone||'')+'</p>';
 head.querySelector('button').onclick=onBack;root.append(head);
 const stats=document.createElement('section');stats.className='client-stats';
 stats.innerHTML='<div><span>Заявок</span><strong>'+client.jobs.length+'</strong></div><div><span>Доход</span><strong>'+money(client.totalIncome)+'</strong></div><div><span>Долг</span><strong>'+money(client.debt)+'</strong></div>';
 root.append(stats);
 const history=document.createElement('section');history.className='client-history';history.innerHTML='<h2>История</h2>';
 [...client.jobs].reverse().forEach(j=>{
  const row=document.createElement('button');row.type='button';row.className='client-job';
  row.innerHTML='<div><strong>'+esc(j.type||'Заявка')+'</strong><span>'+date(j.date)+' · '+esc(j.status||'')+'</span></div><strong>'+money(effectiveIncome(j))+'</strong>';
  row.addEventListener('click',()=>onJobClick(j));
  history.append(row);
 });
 root.append(history);
};
