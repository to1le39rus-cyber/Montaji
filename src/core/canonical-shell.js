import { createAppState } from './app-state.js';
import { createRouter } from './router.js';
import { buildTodayModel, renderToday } from '../screens/today.js';
import { buildScheduleModel, renderSchedule } from '../screens/schedule.js';
import { buildMoneyModel, renderMoney } from '../screens/money.js';
import { buildClientsModel, renderClients, renderClientDetail } from '../screens/clients.js';
import { buildNotesModel, renderNotes } from '../screens/notes.js';
import { buildMoreModel, renderMore } from '../screens/more.js';
import { createJobForm } from '../components/job-form.js';
import { createStoreForm } from '../components/store-form.js';

const isoToday=()=>new Date().toISOString().slice(0,10);
const setText=(el,value)=>{el.textContent=String(value??'').trim()||'—';return el};
export const createCanonicalShell=({root,initialState={jobs:[],expenses:[],stores:[],version:5},initialNotes=[],user=null,readOnly=false,jobService=null,storeService=null,actions={}})=>{
 const state=createAppState(); state.setState(initialState); state.setNotes(initialNotes); state.setUser(user);
 const content=document.createElement('main'); content.className='app-content';
 const addButton=document.createElement('button'); addButton.type='button'; addButton.className='canonical-add'; addButton.textContent='+ Новая заявка'; addButton.hidden=readOnly;
 const nav=document.createElement('nav'); nav.className='app-nav';
 const modal=document.createElement('div'); modal.className='canonical-modal'; modal.hidden=true;
 root.innerHTML=''; root.className='app-shell'; root.append(nav,addButton,content,modal);
 const names=['today','schedule','money','clients','notes','more']; const labels={today:'Сегодня',schedule:'Расписание',money:'Деньги',clients:'Клиенты',notes:'Заметки',more:'Ещё'};
 let selectedDate=isoToday(), moneyStart=isoToday(), moneyEnd=isoToday(), cacheStatus='none';
 const renderRoute=async name=>{if(name==='today')return renderToday({root:content,model:buildTodayModel({state:state.snapshot.state,date:selectedDate}),onJobClick:readOnly?undefined:openJob,onComplete:readOnly?undefined:j=>mutateJob(j.id,id=>jobService.complete(id)),onPaid:readOnly?undefined:j=>mutateJob(j.id,id=>jobService.markPaid(id))});if(name==='schedule')return renderSchedule({root:content,model:buildScheduleModel({state:state.snapshot.state,date:selectedDate}),onJobClick:readOnly?undefined:openJob,onComplete:readOnly?undefined:j=>mutateJob(j.id,id=>jobService.complete(id)),onPaid:readOnly?undefined:j=>mutateJob(j.id,id=>jobService.markPaid(id)),onDateChange:d=>{selectedDate=d;renderRoute('schedule')}});if(name==='money')return renderMoney({root:content,model:buildMoneyModel({state:state.snapshot.state,start:moneyStart,end:moneyEnd}),onJobClick:openJobCard,onPeriodChange:(key,value,endValue)=>{if(key==='range'){moneyStart=value;moneyEnd=endValue||value}else if(key==='start')moneyStart=value;else moneyEnd=value;if(moneyEnd<moneyStart)moneyEnd=moneyStart;renderRoute('money')}});if(name==='clients'){const model=buildClientsModel({state:state.snapshot.state}); return renderClients({root:content,model,onOpen:openClient})}if(name==='notes')return renderNotes({root:content,model:buildNotesModel({notes:state.snapshot.notes})});if(name==='more')return renderMore({root:content,model:buildMoreModel({user:state.snapshot.user,dataStatus:state.snapshot.dataStatus,cacheStatus,stores:state.snapshot.state.stores||[]}),actions:{...actions,openStores}});};
 const router=createRouter({root:content,routes:Object.fromEntries(names.map(name=>[name,()=>renderRoute(name)]))});
 async function mutateJob(id,operation){
 if(readOnly||!jobService)return false;
 try{
  const updated=await operation(id);
  if(updated?.id){
   const current=state.snapshot.state;
   const nextJobs=(current.jobs||[]).map(job=>job.id===id?updated:job);
   state.setState({...current,jobs:nextJobs});
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
  const jobId=job?.id;
  const currentJob=()=>state.snapshot.state.jobs?.find(item=>item.id===jobId)||job;
  job=currentJob();
  modal.hidden=false; modal.innerHTML='';
  const panel=document.createElement('section'); panel.className='canonical-modal-panel job-card-modal';
  const close=()=>{modal.hidden=true;modal.innerHTML=''};
  const head=document.createElement('div');head.className='canonical-modal-head';const headTitle=document.createElement('strong');headTitle.textContent=job.type||'Заявка';const closeButton=document.createElement('button');closeButton.type='button';closeButton.textContent='Закрыть';head.append(headTitle,closeButton);
  const detail=document.createElement('div');detail.className='job-card-detail';const client=document.createElement('h1');setText(client,job.client);const meta=document.createElement('p');meta.textContent=(String(job.date||'').trim()||'—')+' · слот '+(String(job.slot||'').trim()||'—');const address=document.createElement('p');setText(address,job.address);const source=document.createElement('p');setText(source,job.source);const comment=document.createElement('p');setText(comment,job.comment);const stats=document.createElement('div');stats.className='job-card-detail-stats';const status=document.createElement('span');setText(status,job.status);const price=document.createElement('strong');price.textContent=new Intl.NumberFormat('ru-RU').format(Number(job.price)||0)+' ₽';const paid=document.createElement('span');paid.textContent=job.paid===true?'Оплачено':'Не оплачено';stats.append(status,price,paid);detail.append(client,meta,address,source,comment,stats);panel.append(head,detail);
  closeButton.onclick=close;

  const actions=document.createElement('div'); actions.className='job-card-detail-actions';
  const edit=document.createElement('button'); edit.type='button'; edit.textContent='✏️ Редактировать';
  edit.onclick=()=>{const latest=currentJob();close();openJob(latest)};
  actions.append(edit); panel.append(actions); modal.append(panel);
}
 function openReschedule(job){
  modal.hidden=false; modal.innerHTML=''; const panel=document.createElement('section'); panel.className='canonical-modal-panel';
  panel.innerHTML='<div class="canonical-modal-head"><strong>Перенести заявку</strong><button type="button">Закрыть</button></div><label class="reschedule-field">Новая дата<input type="date" value="'+job.date+'" /></label><div class="job-form-actions"><button type="button" data-cancel>Отмена</button><button type="button" data-save>Перенести</button></div>';
  const close=()=>{modal.hidden=true;modal.innerHTML=''}; panel.querySelector('.canonical-modal-head button').onclick=close; panel.querySelector('[data-cancel]').onclick=close;
  panel.querySelector('[data-save]').onclick=async()=>{const date=panel.querySelector('input').value;if(!date)return;const ok=await mutateJob(job.id,(id)=>jobService.reschedule(id,date));if(ok)close()}; modal.append(panel);
 }
 function setStores(stores){
  state.setState({...state.snapshot.state,stores});
 }
 function openStores(){
  modal.hidden=false;modal.innerHTML='';const panel=document.createElement('section');panel.className='canonical-modal-panel';const close=()=>{modal.hidden=true;modal.innerHTML=''};
  const draw=()=>{
   panel.innerHTML='<div class="canonical-modal-head"><strong>Магазины</strong><button type="button">Закрыть</button></div><button type="button" class="store-add">+ Добавить магазин</button><div class="store-list"></div>';
   panel.querySelector('.canonical-modal-head button').onclick=close;
   panel.querySelector('.store-add').onclick=()=>openStoreEditor(null);
   const list=panel.querySelector('.store-list'),stores=state.snapshot.state.stores||[];
   if(!stores.length){const empty=document.createElement('p');empty.textContent='Магазины пока не добавлены.';list.append(empty)}
   for(const store of stores){
    const row=document.createElement('button');row.type='button';row.className='store-row';
    const title=document.createElement('strong');title.textContent=String(store.name||'');
    const meta=document.createElement('span');meta.textContent=String(store.address||store.phone||'');
    row.append(title,meta);row.onclick=()=>openStoreEditor(store.id);list.append(row);
   }
  };
  draw();modal.append(panel);
 }
 function openStoreEditor(storeId){
  if(!storeService)return;const store=storeId?(state.snapshot.state.stores||[]).find(item=>item.id===storeId):null;if(storeId&&!store){alert('Магазин уже удалён или недоступен');openStores();return}modal.innerHTML='';const panel=document.createElement('section');panel.className='canonical-modal-panel';const back=()=>{modal.innerHTML='';openStores()};
  panel.innerHTML='<div class="canonical-modal-head"><strong>'+(store?'Редактировать магазин':'Новый магазин')+'</strong><button type="button">Назад</button></div>';panel.querySelector('button').onclick=back;
  const form=createStoreForm({store:store||{},onCancel:back,onSubmit:async patch=>{
   try{
    const stores=state.snapshot.state.stores||[];
    if(store){
     const updated=await storeService.update(store.id,patch);
     setStores(stores.map(item=>item.id===updated.id?updated:item));
    }else{
     const created=await storeService.create(patch);
     setStores([...stores,created]);
    }
    back();
   }catch(e){console.error(e);alert(e?.message||'Не удалось сохранить магазин')}
  }});panel.append(form);
  if(store){
   const del=document.createElement('button');del.type='button';del.className='store-delete';del.textContent='Удалить из справочника';
   del.onclick=async()=>{
    if(!confirm('Удалить магазин из справочника? Старые заявки останутся без изменений.'))return;
    try{
     await storeService.remove(store.id);
     setStores((state.snapshot.state.stores||[]).filter(item=>item.id!==store.id));
     back();
    }catch(e){alert(e?.message||'Не удалось удалить магазин')}
   };
   panel.append(del);
  }
  modal.append(panel);
 }
 function openJob(job={}){
  if(readOnly)return;
  if(job.id)job=state.snapshot.state.jobs?.find(item=>item.id===job.id)||job;
  modal.hidden=false;modal.innerHTML='';const panel=document.createElement('section');panel.className='canonical-modal-panel job-edit-modal';
  const close=()=>{modal.hidden=true;modal.innerHTML=''};
  const form=createJobForm({job,stores:state.snapshot.state.stores||[],onCancel:close,onSubmit:async next=>{if(job.id){if(!Object.keys(next).length){close();return}const ok=await mutateJob(job.id,(id)=>jobService.update(id,next));if(ok)close();}else if(jobService){
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
   if(job.status!=='Выполнен'&&job.status!=='Отменен') commands.push(['Выполнить',()=>mutateJob(job.id,(id)=>jobService.complete(id))]);
   if(job.status!=='Отменен'&&job.paid!==true) commands.push(['Оплатить',()=>mutateJob(job.id,(id)=>jobService.markPaid(id))]);
   if(job.status!=='Отменен'&&job.paid===true) commands.push(['Не оплачено',()=>mutateJob(job.id,(id)=>jobService.markUnpaid(id))]);
   if(job.status!=='Отменен') commands.push(['Перенести',()=>{openReschedule(job);return null}]);
   if(job.status!=='Отменен') commands.push(['Отменить',()=>mutateJob(job.id,(id)=>jobService.cancel(id))]);
   for(const [label,fn] of commands){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',async()=>{const result=await fn();if(result!==null&&result!==false)close()});actionsBox.append(b)}
  }
  panel.innerHTML='<div class="canonical-modal-head"><strong>'+(job.id?'Заявка':'Новая заявка')+'</strong><button type="button">Закрыть</button></div>';panel.querySelector('button').addEventListener('click',close);const body=document.createElement('div');body.className='canonical-modal-body';body.append(form);if(job.id)body.append(actionsBox);panel.append(body);modal.append(panel);body.scrollTop=0;requestAnimationFrame(()=>{body.scrollTop=0});
 }
 addButton.addEventListener('click',()=>openJob({date:selectedDate,type:'Монтаж',slot:'1',status:'Запланировано',paid:false}));
 names.forEach(name=>{const button=document.createElement('button');button.type='button';button.textContent=labels[name];button.dataset.route=name;button.addEventListener('click',()=>router.render(name).then(()=>nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.route===name?'page':'false'))));nav.append(button)});
 router.render('today').then(()=>nav.querySelector('[data-route="today"]')?.setAttribute('aria-current','page'));
 return {state,router,root,openJob,setCacheStatus(value){cacheStatus=value;if(router.current==='more')renderRoute('more')}};
};
