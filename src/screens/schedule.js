import { jobsForDate, isCompleted, isCancelled } from '../domain/jobs.js';
import { sortBySchedule } from '../domain/scheduling.js';
import { createJobCard } from '../components/job-card.js';
import { icon } from '../ui/icons.js';
import { esc, localISO, dateObject, addDays, weekStart, monthStart, shiftMonth, formatDate, capitalize, jobsLabel, plural } from '../ui/format.js';

export const buildScheduleModel=({state,date,today=localISO(),view='month'})=>{
  const allJobs=(state?.jobs||[]).filter(j=>!isCancelled(j));
  const jobs=sortBySchedule(jobsForDate(allJobs,date));
  const first=monthStart(date),next=shiftMonth(date,1);
  const monthJobs=allJobs.filter(j=>j.date>=first&&j.date<next);
  const occupiedDays=new Set(monthJobs.map(j=>j.date)).size;
  const daysInMonth=dateObject(addDays(next,-1)).getDate();
  const firstCell=view==='week'?weekStart(date):weekStart(first);
  const cellCount=view==='week'?7:Math.ceil((((dateObject(first).getDay()+6)%7)+daysInMonth)/7)*7;
  const days=Array.from({length:cellCount},(_,i)=>{
    const day=addDays(firstCell,i),list=jobsForDate(allJobs,day);
    return {date:day,count:list.length,montages:list.filter(j=>j.type==='Монтаж').length,measurements:list.filter(j=>j.type==='Замер').length,done:list.filter(isCompleted).length,inMonth:day.slice(0,7)===date.slice(0,7)};
  });
  return {date,today,view,jobs,days,monthJobs:monthJobs.length,occupiedDays,daysInMonth,
    montageCount:jobs.filter(j=>j.type==='Монтаж').length,completedCount:jobs.filter(isCompleted).length};
};
const el=(className,html='')=>{const node=document.createElement('section');node.className=className;node.innerHTML=html;return node};

export const renderSchedule=({
  root,model,onJobClick,onComplete,onPaid,onRoute,onMore,onDateChange=()=>{},onViewChange=()=>{},onShift=()=>{},onToday=()=>{},
  onAddJob,query='',filter='all',onSearch=()=>{},onFilter=()=>{}
})=>{
  if(!root)return;
  root.replaceChildren();root.dataset.screen='schedule';
  const heading=el('screen-heading','<div><h1>График</h1><p>Планы, выезды и свободные дни</p></div><button class="icon-button schedule-search-toggle" type="button" aria-label="Найти заявку" aria-expanded="'+String(Boolean(query))+'">'+icon('search')+'</button>');
  root.append(heading);
  const search=el('schedule-search','<label>'+icon('search')+'<input type="search" placeholder="Клиент, телефон или адрес" aria-label="Поиск заявок на выбранный день" value="'+esc(query)+'"></label>');search.hidden=!query;root.append(search);
  heading.querySelector('button').onclick=()=>{search.hidden=!search.hidden;heading.querySelector('button').setAttribute('aria-expanded',String(!search.hidden));if(!search.hidden)search.querySelector('input').focus()};
  const controls=el('schedule-controls','<div class="segmented" role="group" aria-label="Вид графика"><button type="button" data-view="month" aria-pressed="'+(model.view==='month')+'">Месяц</button><button type="button" data-view="week" aria-pressed="'+(model.view==='week')+'">Неделя</button></div><button class="text-action" type="button" data-today>'+icon('sun')+'Сегодня</button>');
  controls.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>onViewChange(button.dataset.view));controls.querySelector('[data-today]').onclick=onToday;root.append(controls);
  const monthLabel=capitalize(formatDate(model.date,{month:'long'}));
  const calendar=el('calendar-surface');
  calendar.innerHTML='<header class="calendar-head"><div><h2>'+monthLabel+' <span>'+formatDate(model.date,{year:'numeric'}).replace(/[^0-9]/g,'')+'</span></h2><p>'+plural(model.occupiedDays,'день с выездами','дня с выездами','дней с выездами')+'</p></div><div class="calendar-arrows"><button type="button" class="icon-button" data-prev aria-label="Предыдущий '+(model.view==='month'?'месяц':'период')+'">'+icon('back')+'</button><button type="button" class="icon-button" data-next aria-label="Следующий '+(model.view==='month'?'месяц':'период')+'">'+icon('chevron')+'</button></div></header><div class="calendar-weekdays" aria-hidden="true">'+['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>'<span>'+d+'</span>').join('')+'</div>';
  calendar.querySelector('[data-prev]').onclick=()=>onShift(-1);calendar.querySelector('[data-next]').onclick=()=>onShift(1);
  const grid=el('calendar-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label',monthLabel+' — загрузка по дням');
  model.days.forEach(day=>{
    const button=document.createElement('button');button.type='button';button.className='calendar-day';button.dataset.date=day.date;
    button.dataset.load=day.count===0?'empty':day.count<=1?'light':day.count<=3?'medium':'high';
    button.dataset.adjacent=String(!day.inMonth);
    button.setAttribute('aria-pressed',String(day.date===model.date));if(day.date===model.today)button.setAttribute('aria-current','date');
    button.setAttribute('aria-label',formatDate(day.date,{day:'numeric',month:'long'})+': '+jobsLabel(day.count)+(day.measurements?', '+plural(day.measurements,'замер','замера','замеров'):''));
    button.innerHTML='<span class="calendar-number">'+dateObject(day.date).getDate()+'</span><span class="calendar-count">'+(day.count?day.count:'<span aria-hidden="true">—</span>')+(day.measurements?'<i class="measurement-dot" aria-hidden="true"></i>':'')+'</span>';
    button.onclick=()=>onDateChange(day.date);
    button.onkeydown=event=>{const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];if(delta!==undefined){event.preventDefault();const next=addDays(day.date,delta);onDateChange(next);queueMicrotask(()=>root.querySelector('[data-date="'+next+'"]')?.focus({preventScroll:true}))}};
    grid.append(button);
  });
  calendar.append(grid);
  calendar.insertAdjacentHTML('beforeend','<div class="calendar-legend"><span><i class="load-swatch"></i>Число — заявки</span><span><i class="measurement-dot"></i>Есть замер</span></div>');
  root.append(calendar);
  const agenda=el('schedule-agenda');
  agenda.innerHTML='<div class="section-head"><div><h2>'+capitalize(formatDate(model.date,{weekday:'long',day:'numeric',month:'long'}))+'</h2><p class="agenda-summary">'+jobsLabel(model.jobs.length)+' · '+plural(model.montageCount,'монтаж','монтажа','монтажей')+'</p></div>'+(onAddJob?'<button type="button" class="icon-button agenda-add" aria-label="Добавить заявку на '+formatDate(model.date)+'">'+icon('plus')+'</button>':'')+'</div><div class="agenda-filters" role="group" aria-label="Фильтр заявок">'+[['all','Все'],['upcoming','Предстоят'],['done','Выполнены']].map(([key,title])=>'<button type="button" data-filter="'+key+'" aria-pressed="'+(filter===key)+'">'+title+'</button>').join('')+'</div><div class="schedule-list"></div>';
  agenda.querySelector('.agenda-add')?.addEventListener('click',onAddJob);
  const list=agenda.querySelector('.schedule-list');
  let activeFilter=filter,currentQuery=query;
  const draw=()=>{
    const searchValue=currentQuery.trim().toLocaleLowerCase('ru');
    const matches=model.jobs.filter(job=>(activeFilter==='all'||(activeFilter==='done'?isCompleted(job):!isCompleted(job)))&&(!searchValue||[job.client,job.phone,job.address,job.comment].join(' ').toLocaleLowerCase('ru').includes(searchValue)));
    list.replaceChildren();
    if(!matches.length){
      const empty=el('empty-state',icon(model.jobs.length?'search':'sun')+'<h3>'+(model.jobs.length?'Ничего не найдено':'День свободен')+'</h3><p>'+(model.jobs.length?'Попробуйте другое имя или уберите фильтр.':'Заявок пока нет. Можно запланировать новый выезд.')+'</p>');
      const button=document.createElement('button');button.type='button';button.className='button subtle';
      if(model.jobs.length){button.textContent='Сбросить фильтры';button.onclick=()=>{activeFilter='all';currentQuery='';onFilter('all');onSearch('');search.querySelector('input').value='';agenda.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='all')));draw()};empty.append(button)}
      else if(onAddJob){button.textContent='Добавить заявку';button.onclick=onAddJob;empty.append(button)}
      list.append(empty);return;
    }
    matches.forEach(job=>list.append(createJobCard({job,onOpen:onJobClick,onComplete,onPaid,onRoute,onMore})));
  };
  search.querySelector('input').oninput=event=>{currentQuery=event.target.value;onSearch(currentQuery);draw()};
  agenda.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{activeFilter=button.dataset.filter;onFilter(activeFilter);agenda.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw()});
  draw();root.append(agenda);
};
