import { createAppState } from './app-state.js';
import { createRouter } from './router.js';
import { buildTodayModel, renderToday } from '../screens/today.js';
import { buildScheduleModel, renderSchedule } from '../screens/schedule.js';
import { buildMoneyModel, renderMoney } from '../screens/money.js';
import { buildClientsModel, renderClients, renderClientDetail } from '../screens/clients.js';
import { buildNotesModel, renderNotes } from '../screens/notes.js';
import { buildMoreModel, renderMore } from '../screens/more.js';
import { createJobForm } from '../components/job-form.js';

const isoToday=()=>new Date().toISOString().slice(0,10);
export const createCanonicalShell=({root,initialState={jobs:[],expenses:[],version:5},initialNotes=[],user=null,readOnly=false,jobService=null,actions={}})=>{
 const state=createAppState(); state.setState(initialState); state.setNotes(initialNotes); state.setUser(user);
 const content=document.createElement('main'); content.className='app-content';
 const addButton=document.createElement('button'); addButton.type='button'; addButton.className='canonical-add'; addButton.textContent='+ Новая заявка'; addButton.hidden=readOnly;
 const nav=document.createElement('nav'); nav.className='app-nav';
 const modal=document.createElement('div'); modal.className='canonical-modal'; modal.hidden=true;
 root.innerHTML=''; root.className='app-shell'; root.append(nav,addButton,content,modal);
 const names=['today','schedule','money','clients','notes','more']; const labels={today:'Сегодня',schedule:'Расписание',money:'Деньги',clients:'Клиенты',notes:'Заметки',more:'Ещё'};
 let selectedDate=isoToday(), moneyStart=isoToday(), moneyEnd=isoToday(), cacheStatus='none';
 const renderRoute=async name=>{if(name==='today')return renderToday({root:content,model:buildTodayModel({state:state.snapshot.state,date:selectedDate}),onJobClick:readOnly?undefined:openJob,onComplete:readOnly?undefined:j=>mutateJob(j.id,id=>jobService.complete(id)),onPaid:readOnly?undefined:j=>mutateJob(j.id,id=>jobService.markPaid(id))});if(name==='schedule')return renderSchedule({root:content,model:buildScheduleModel({state:state.snapshot.state,date:selectedDate}),onJobClick:readOnly?undefined:openJob,onComplete:readOnly?undefined:j=>mutateJob(j.id,id=>jobService.complete(id)),onPaid:readOnly?undefined:j=>mutateJob(j.id,id=>jobService.markPaid(id)),onDateChange:d=>{selectedDate=d;renderRoute('schedule')}});if(name==='money')return renderMoney({root:content,model:buildMoneyModel({state:state.snapshot.state,start:moneyStart,end:moneyEnd}),onPeriodChange:(key,value,endValue)=>{if(key==='range'){moneyStart=value;moneyEnd=endValue||value}else if(key==='start')moneyStart=value;else moneyEnd=value;if(moneyEnd<moneyStart)moneyEnd=moneyStart;renderRoute('money')}});if(name==='clients'){const model=buildClientsModel({state:state.snapshot.state}); return renderClients({root:content,model,onOpen:openClient})}if(name==='notes')return renderNotes({root:content,model:buildNotesModel({notes:state.snapshot.notes})});if(name==='more')return renderMore({root:content,model:buildMoreModel({user:state.snapshot.user,dataStatus:state.snapshot.dataStatus,cacheStatus}),actions});};
 const router=createRouter({root:content,routes:Object.fromEntries(names.map(name=>[name,()=>renderRoute(name)]))});
 async function mutateJob(id,operation){
 if(readOnly||!jobService)return false;
 const before=state.snapshot.state;
 try{
  const updated=await operation(id);
  if(updated?.id){
   const nextJobs=before.jobs.map(job=>job.id===id?updated:job);
   state.setState({...before,jobs:nextJobs});
   await renderRoute(router.current||'today');
  }
  return true;
 }catch(error){
  console.error(error);
  alert(error?.message||'Не удалось сохранить заявку');
  return false;
 }
}
 function openClient(client){
  modal.hidden=false;
  modal.innerHTML='';
  const panel=document.createElement('section');
  panel.className='canonical-modal-panel client-modal-panel';
  const close=()=>{modal.hidden=true;modal.innerHTML=''};
  renderClientDetail({root:panel,client,onBack:close,onJobClick:job=>{close();openJobCard(job)}});
  const closeButton=document.createElement('button');
  closeButton.type='button';
  closeButton.className='client-modal-close';
  closeButton.textContent='Закрыть';
  closeButton.addEventListener('click',close);
  panel.prepend(closeButton);
  modal.append(panel);
  modal.addEventListener('click',event=>{if(event.target===modal)close()},{once:true});
}
 function openJobCard(job){
  modal.hidden=false; modal.innerHTML='';
  const panel=document.createElement('section'); panel.className='canonical-modal-panel job-card-modal';
  const close=()=>{modal.hidden=true;modal.innerHTML=''};
  const value=v=>String(v??'').trim()||'—';
  panel.innerHTML='<div class="canonical-modal-head"><strong>Монтаж</strong><button type="button">Закрыть</button></div>'+
    '<div class="job-card-detail"><h1>'+value(job.client)+'</h1>'+
    '<p>'+value(job.date)+' · слот '+value(job.slot)+'</p>'+
    '<p>'+value(job.address)+'</p>'+
    '<p>'+value(job.source)+'</p>'+
    '<p>'+value(job.comment)+'</p>'+
    '<div class="job-card-detail-stats"><span>'+value(job.status)+'</span><strong>'+new Intl.NumberFormat('ru-RU').format(Number(job.price)||0)+' ₽</strong><span>'+(job.paid===true?'Оплачено':'Не оплачено')+'</span></div></div>';
  panel.querySelector('.canonical-modal-head button').onclick=close;
  const actions=document.createElement('div'); actions.className='job-card-detail-actions';
  const edit=document.createElement('button'); edit.type='button'; edit.textContent='✏️ Редактировать';
  edit.onclick=()=>{close();openJob(job)};
  actions.append(edit); panel.append(actions); modal.append(panel);
}
 function openReschedule(job){
  modal.hidden=false; modal.innerHTML=''; const panel=document.createElement('section'); panel.className='canonical-modal-panel';
  panel.innerHTML='<div class="canonical-modal-head"><strong>Перенести заявку</strong><button type="button">Закрыть</button></div><label class="reschedule-field">Новая дата<input type="date" value="'+job.date+'" /></label><div class="job-form-actions"><button type="button" data-cancel>Отмена</button><button type="button" data-save>Перенести</button></div>';
  const close=()=>{modal.hidden=true;modal.innerHTML=''}; panel.querySelector('.canonical-modal-head button').onclick=close; panel.querySelector('[data-cancel]').onclick=close;
  panel.querySelector('[data-save]').onclick=async()=>{const date=panel.querySelector('input').value;if(!date)return;const ok=await mutateJob(job.id,(id)=>jobService.reschedule(id,date));if(ok)close()}; modal.append(panel);
 }
 function openJob(job={}){
  if(readOnly)return;
  modal.hidden=false;modal.innerHTML='';const panel=document.createElement('section');panel.className='canonical-modal-panel';
  const close=()=>{modal.hidden=true;modal.innerHTML=''};
  const form=createJobForm({job,onCancel:close,onSubmit:async next=>{if(job.id){const ok=await mutateJob(job.id,(id)=>jobService.update(id,next));if(ok)close();}else if(jobService){
 try{
  const created=await jobService.create(next);
  const current=state.snapshot.state;
  state.setState({...current,jobs:[...(current.jobs||[]),created]});
  await renderRoute(router.current||'today');
  close();
 }catch(error){console.error(error);alert(error?.message||'Не удалось создать заявку');}
}}});
  const actionsBox=document.createElement('div');actionsBox.className='job-lifecycle-actions';
  if(job.id){
   const commands=[];
   if(job.status!=='Выполнен'&&job.status!=='Отменён') commands.push(['Выполнить',()=>mutateJob(job.id,(id)=>jobService.complete(id))]);
   if(job.status!=='Отменён'&&job.paid!==true) commands.push(['Оплатить',()=>mutateJob(job.id,(id)=>jobService.markPaid(id))]);
   if(job.status!=='Отменён'&&job.paid===true) commands.push(['Не оплачено',()=>mutateJob(job.id,(id)=>jobService.markUnpaid(id))]);
   if(job.status!=='Отменён') commands.push(['Перенести',()=>{openReschedule(job);return null}]);
   if(job.status!=='Отменён') commands.push(['Отменить',()=>mutateJob(job.id,(id)=>jobService.cancel(id))]);
   for(const [label,fn] of commands){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',async()=>{const result=await fn();if(result!==null&&result!==false)close()});actionsBox.append(b)}
  }
  panel.innerHTML='<div class="canonical-modal-head"><strong>'+(job.id?'Заявка':'Новая заявка')+'</strong><button type="button">Закрыть</button></div>';panel.querySelector('button').addEventListener('click',close);panel.append(form);if(job.id)panel.append(actionsBox);modal.append(panel);
 }
 addButton.addEventListener('click',()=>openJob({date:selectedDate,type:'Монтаж',slot:'1',status:'Запланирован',paid:false}));
 names.forEach(name=>{const button=document.createElement('button');button.type='button';button.textContent=labels[name];button.dataset.route=name;button.addEventListener('click',()=>router.render(name).then(()=>nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.route===name?'page':'false'))));nav.append(button)});
 router.render('today').then(()=>nav.querySelector('[data-route="today"]')?.setAttribute('aria-current','page'));
 return {state,router,root,openJob,setCacheStatus(value){cacheStatus=value;if(router.current==='more')renderRoute('more')}};
};
