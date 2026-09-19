import { createAppState } from './app-state.js';
import { createRouter } from './router.js';
import { buildTodayModel, renderToday } from '../screens/today.js';
import { buildScheduleModel, renderSchedule } from '../screens/schedule.js';
import { buildMoneyModel, renderMoney } from '../screens/money.js';
import { buildClientsModel, renderClients } from '../screens/clients.js';
import { buildNotesModel, renderNotes } from '../screens/notes.js';
import { buildMoreModel, renderMore } from '../screens/more.js';
import { createJobForm } from '../components/job-form.js';
import { createJob, updateJob, completeJob, cancelJob, rescheduleJob, markPaid, markUnpaid } from '../domain/job-commands.js';

const isoToday=()=>new Date().toISOString().slice(0,10);
export const createCanonicalShell=({root,initialState={jobs:[],expenses:[],version:5},initialNotes=[],user=null})=>{
 const state=createAppState(); state.setState(initialState); state.setNotes(initialNotes); state.setUser(user);
 const content=document.createElement('main'); content.className='app-content';
 const nav=document.createElement('nav'); nav.className='app-nav';
 const modal=document.createElement('div'); modal.className='canonical-modal'; modal.hidden=true;
 root.innerHTML=''; root.className='app-shell'; root.append(nav,content,modal);
 const names=['today','schedule','money','clients','notes','more']; const labels={today:'Сегодня',schedule:'Расписание',money:'Деньги',clients:'Клиенты',notes:'Заметки',more:'Ещё'};
 let selectedDate=isoToday(), moneyStart=isoToday(), moneyEnd=isoToday();
 const renderRoute=async name=>{if(name==='today')return renderToday({root:content,model:buildTodayModel({state:state.snapshot.state,date:selectedDate}),onJobClick:openJob,onComplete:j=>mutateJob(j,completeJob),onPaid:j=>mutateJob(j,markPaid)});if(name==='schedule')return renderSchedule({root:content,model:buildScheduleModel({state:state.snapshot.state,date:selectedDate}),onJobClick:openJob,onComplete:j=>mutateJob(j,completeJob),onPaid:j=>mutateJob(j,markPaid),onDateChange:d=>{selectedDate=d;renderRoute('schedule')}});if(name==='money')return renderMoney({root:content,model:buildMoneyModel({state:state.snapshot.state,start:moneyStart,end:moneyEnd}),onPeriodChange:(key,value)=>{if(key==='start')moneyStart=value;else moneyEnd=value;if(moneyEnd<moneyStart)moneyEnd=moneyStart;renderRoute('money')}});if(name==='clients')return renderClients({root:content,model:buildClientsModel({state:state.snapshot.state})});if(name==='notes')return renderNotes({root:content,model:buildNotesModel({notes:state.snapshot.notes})});if(name==='more')return renderMore({root:content,model:buildMoreModel({user:state.snapshot.user,dataStatus:state.snapshot.dataStatus})});};
 const router=createRouter({root:content,routes:Object.fromEntries(names.map(name=>[name,()=>renderRoute(name)]))});
 function mutateJob(job,fn){state.setState({...state.snapshot.state,jobs:(state.snapshot.state.jobs||[]).map(j=>j.id===job.id?fn(j):j)});renderRoute(router.current||'today')}
 function openJob(job={}){
  modal.hidden=false;modal.innerHTML='';const panel=document.createElement('section');panel.className='canonical-modal-panel';
  const close=()=>{modal.hidden=true;modal.innerHTML=''};
  const form=createJobForm({job,onCancel:close,onSubmit:next=>{const jobs=state.snapshot.state.jobs||[];const value=job.id?updateJob(job,next):createJob({job:next});state.setState({...state.snapshot.state,jobs:job.id?jobs.map(j=>j.id===job.id?value:j):[...jobs,value]});close();renderRoute(router.current||'today')}});
  const actions=document.createElement('div');actions.className='job-lifecycle-actions';
  if(job.id){for(const [label,fn] of [['Выполнить',()=>completeJob(job)],['Оплатить',()=>markPaid(job)],['Не оплачено',()=>markUnpaid(job)],['Перенести',()=>rescheduleJob(job,prompt('Новая дата',job.date)||job.date)],['Отменить',()=>cancelJob(job)]] ){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{const next=fn();if(next){const jobs=state.snapshot.state.jobs||[];state.setState({...state.snapshot.state,jobs:jobs.map(j=>j.id===job.id?next:j)});close();renderRoute(router.current||'today')}});actions.append(b)}}
  panel.innerHTML='<div class="canonical-modal-head"><strong>'+(job.id?'Заявка':'Новая заявка')+'</strong><button type="button">Закрыть</button></div>';panel.querySelector('button').addEventListener('click',close);panel.append(form);if(job.id)panel.append(actions);modal.append(panel);
 }
 names.forEach(name=>{const button=document.createElement('button');button.type='button';button.textContent=labels[name];button.dataset.route=name;button.addEventListener('click',()=>router.render(name).then(()=>nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.route===name?'page':'false'))));nav.append(button)});
 router.render('today').then(()=>nav.querySelector('[data-route="today"]')?.setAttribute('aria-current','page'));return {state,router,root,openJob};
};