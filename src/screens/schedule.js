import { jobsForDate, montageJobsForDate, isCompleted } from '../domain/jobs.js';
import { sortBySchedule } from '../domain/scheduling.js';

export const buildScheduleModel=({state,date})=>{
 const jobs=sortBySchedule(jobsForDate(state?.jobs||[],date));
 return {
  date,
  jobs,
  montageCount:montageJobsForDate(state?.jobs||[],date).length,
  completedCount:jobs.filter(isCompleted).length
 };
};

export const renderSchedule=({root,model,renderJob=()=>{}})=>{
 if(!root)return;
 root.innerHTML='';
 const header=document.createElement('section');
 header.className='schedule-header';
 header.innerHTML='<h1>Расписание</h1><span>'+model.date+'</span>';
 root.append(header);
 const summary=document.createElement('div');
 summary.className='schedule-summary';
 summary.innerHTML='<span>Монтажей: <strong>'+model.montageCount+'</strong></span><span>Выполнено: <strong>'+model.completedCount+'</strong></span>';
 root.append(summary);
 const list=document.createElement('section');
 list.className='schedule-list';
 for(const job of model.jobs){
  const row=document.createElement('button');
  row.type='button';
  row.className='schedule-row';
  row.dataset.jobId=job.id;
  row.innerHTML='<span class="schedule-slot">'+String(job.slot||'1')+'</span><span class="schedule-client">'+String(job.client||'Без клиента')+'</span><span class="schedule-type">'+String(job.type||'Монтаж')+'</span><span class="schedule-status">'+String(job.status||'')+'</span>';
  row.addEventListener('click',()=>renderJob(job));
  list.append(row);
 }
 if(!model.jobs.length)list.innerHTML='<p class="schedule-empty">На этот день заявок нет.</p>';
 root.append(list);
};
