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
 header.innerHTML='<div><span class="schedule-eyebrow">Рабочая неделя</span><h1>График</h1><span class="screen-date">'+model.date+'</span></div>';
 const dateInput=document.createElement('input'); dateInput.type='date'; dateInput.value=model.date; dateInput.className='screen-date-input'; dateInput.setAttribute('aria-label','Дата расписания'); dateInput.addEventListener('change',()=>onDateChange(dateInput.value)); header.append(dateInput); root.append(header);
 const strip=document.createElement('div');strip.className='schedule-strip';const selected=new Date(model.date+'T12:00:00');for(let offset=-3;offset<=3;offset++){const date=new Date(selected);date.setDate(date.getDate()+offset);const iso=date.toISOString().slice(0,10);const button=document.createElement('button');button.type='button';button.className=offset===0?'is-selected':'';button.innerHTML='<small>'+new Intl.DateTimeFormat('ru-RU',{weekday:'short'}).format(date).replace('.','')+'</small><strong>'+date.getDate()+'</strong>';button.setAttribute('aria-label',new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(date));button.onclick=()=>onDateChange(iso);strip.append(button)}root.append(strip);
 const summary=document.createElement('div'); summary.className='schedule-summary'; summary.innerHTML='<div><span>Загрузка</span><strong>'+model.jobs.length+' заявок</strong></div><div><span>Монтажи</span><strong>'+model.montageCount+'</strong></div><div><span>Готово</span><strong>'+model.completedCount+'</strong></div>'; root.append(summary);
 const list=document.createElement('section'); list.className='schedule-list';
 if(!model.jobs.length) list.innerHTML='<p class="schedule-empty">На этот день заявок нет.</p>';
 else model.jobs.forEach(job=>list.append(createJobCard({job,onOpen:onJobClick,onComplete,onPaid})));
 root.append(list);
};
