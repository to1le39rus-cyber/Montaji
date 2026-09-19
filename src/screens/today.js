import { jobsForDate, isCompleted, effectiveIncome } from '../domain/jobs.js';
import { createJobCard } from '../components/job-card.js';

export const buildTodayModel=({state,date})=>{
 const jobs=jobsForDate(state?.jobs||[],date);
 const montages=jobs.filter(j=>j.type==='Монтаж');
 const completed=jobs.filter(isCompleted);
 const income=completed.reduce((sum,j)=>sum+effectiveIncome(j),0);
 return {date,jobs,montages,completed,income};
};
export const renderToday=({root,model,onJobClick=()=>{},onComplete=()=>{},onPaid=()=>{}})=>{
 if(!root)return;
 root.innerHTML='';
 const header=document.createElement('section'); header.className='today-header';
 header.innerHTML='<h1>Сегодня</h1><div class="today-date">'+model.date+'</div>'; root.append(header);
 const summary=document.createElement('section'); summary.className='today-summary';
 summary.innerHTML='<div><span>Монтажи</span><strong>'+model.montages.length+'</strong></div><div><span>Доход</span><strong>'+new Intl.NumberFormat('ru-RU').format(Math.round(model.income||0))+' ₽</strong></div>'; root.append(summary);
 const list=document.createElement('section'); list.className='today-jobs';
 if(!model.jobs.length) list.innerHTML='<p class="today-empty">На этот день пока нет заявок.</p>';
 else model.jobs.forEach(job=>list.append(createJobCard({job,onOpen:onJobClick,onComplete,onPaid})));
 root.append(list);
};