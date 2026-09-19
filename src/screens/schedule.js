import { jobsForDate, montageJobsForDate, isCompleted } from '../domain/jobs.js';
import { sortBySchedule } from '../domain/scheduling.js';
import { createJobCard } from '../components/job-card.js';

export const buildScheduleModel=({state,date})=>{
 const jobs=sortBySchedule(jobsForDate(state?.jobs||[],date));
 return {date,jobs,montageCount:montageJobsForDate(state?.jobs||[],date).length,completedCount:jobs.filter(isCompleted).length};
};
export const renderSchedule=({root,model,onJobClick=()=>{},onComplete=()=>{},onPaid=()=>{},onDateChange=()=>{}})=>{
 if(!root)return;
 root.innerHTML='';
 const header=document.createElement('section'); header.className='schedule-header';
 header.innerHTML='<div><h1>Расписание</h1><span class="screen-date">'+model.date+'</span></div>';
 const dateInput=document.createElement('input'); dateInput.type='date'; dateInput.value=model.date; dateInput.className='screen-date-input'; dateInput.setAttribute('aria-label','Дата расписания'); dateInput.addEventListener('change',()=>onDateChange(dateInput.value)); header.append(dateInput); root.append(header);
 const summary=document.createElement('div'); summary.className='schedule-summary'; summary.innerHTML='<span>Монтажей: <strong>'+model.montageCount+'</strong></span><span>Выполнено: <strong>'+model.completedCount+'</strong></span>'; root.append(summary);
 const list=document.createElement('section'); list.className='schedule-list';
 if(!model.jobs.length) list.innerHTML='<p class="schedule-empty">На этот день заявок нет.</p>';
 else model.jobs.forEach(job=>list.append(createJobCard({job,onOpen:onJobClick,onComplete,onPaid})));
 root.append(list);
};