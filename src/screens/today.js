import { jobsForDate, isCompleted, isCancelled, isDebt, activityDate } from '../domain/jobs.js';
import { financeTotals, periodFilter } from '../domain/finances.js';
import { sortBySchedule } from '../domain/scheduling.js';
import { createJobCard } from '../components/job-card.js';
import { createCarousel } from '../ui/carousel.js';
import { icon } from '../ui/icons.js';
import { esc, money, jobsLabel, plural, formatDate, capitalize, weekStart, monthStart } from '../ui/format.js';

export const buildTodayModel = ({state,date,notes=[]}) => {
  const allJobs=state?.jobs||[], expenses=state?.expenses||[];
  const jobs=sortBySchedule(jobsForDate(allJobs,date));
  const period=(start,end)=>financeTotals(periodFilter(allJobs,start,end,activityDate),periodFilter(expenses,start,end));
  const day=period(date,date),week=period(weekStart(date),date),month=period(monthStart(date),date);
  const activeNotes=(Array.isArray(notes)?notes:[]).filter(n=>!n?.done&&!n?.archived);
  const completed=jobs.filter(isCompleted),unpaid=jobs.filter(isDebt);
  const futureDates=[...new Set(allJobs.filter(j=>j.date>date&&!isCancelled(j)).map(j=>j.date))].sort().slice(0,5);
  return {
    date,jobs,montages:jobs.filter(j=>j.type==='Монтаж'),completed,unpaid,income:day.income,expense:day.expenses,net:day.net,debt:day.debt,
    weekNet:week.net,monthNet:month.net,weekStart:weekStart(date),monthStart:monthStart(date),
    todayExpenses:periodFilter(expenses,date,date).filter(e=>!e.cancelled),
    urgent:activeNotes.filter(n=>n.urgent===true).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')),
    notes:activeNotes.filter(n=>n.urgent!==true),
    future:futureDates.map(day=>({date:day,jobs:sortBySchedule(jobsForDate(allJobs,day))})),
    remaining:jobs.filter(j=>!isCompleted(j)).length
  };
};
const section=(className,html='')=>{const el=document.createElement('section');el.className=className;el.innerHTML=html;return el};
const heading=(title,count,action='')=>'<div class="section-head"><h2>'+title+(count===undefined?'':' <small>'+count+'</small>')+'</h2>'+action+'</div>';

export const renderToday = ({
  root,model,onJobClick,onComplete,onPaid,onRoute,onMore,
  onOpenNote=()=>{},onOpenNotes=()=>{},onCompleteNote,onAddNote,onAddJob,onAddExpense,onOpenDay=()=>{},onMoney=()=>{},
  activeNoteId,onNoteChange=()=>{}
}) => {
  if(!root)return;
  root.replaceChildren();root.dataset.screen='today';
  const header=section('screen-heading','<div><h1>Сегодня</h1><p>'+capitalize(formatDate(model.date,{weekday:'long',day:'numeric',month:'long'}))+'</p></div><button class="connection-state" type="button" aria-live="polite" aria-expanded="true"><i aria-hidden="true"></i><span>Подключаем базу</span></button>');
  root.append(header);
  let attentionBlock;
  if(model.urgent.length){
    const attention=section('today-attention','<div class="attention-heading"><span class="attention-dot"></span><h2>На первом месте</h2><span>'+model.urgent.length+'</span></div>');
    model.urgent.slice(0,3).forEach(note=>{
      const due=note.dueDate?note.dueDate<model.date?'Просрочено':note.dueDate===model.date?'Сегодня':formatDate(note.dueDate,{day:'numeric',month:'short'}):'Срочная задача';
      const row=document.createElement('div');row.className='task-row';
      if(onCompleteNote){const complete=document.createElement('button');complete.type='button';complete.className='task-complete';complete.setAttribute('aria-label','Выполнить задачу: '+(note.title||note.text));complete.innerHTML='<span>'+icon('check')+'</span>';complete.onclick=async()=>{complete.disabled=true;try{await onCompleteNote(note)}finally{complete.disabled=false}};row.append(complete)}
      const open=document.createElement('button');open.type='button';open.className='task-open';open.innerHTML='<span><strong>'+esc(note.title||note.text)+'</strong><small>'+due+(note.text&&note.title?' · '+esc(note.text):'')+'</small></span>'+icon('chevron');open.onclick=()=>onOpenNote(note);row.append(open);attention.append(row);
    });
    if(model.urgent.length>3){const all=document.createElement('button');all.className='text-action';all.textContent='Ещё '+(model.urgent.length-3)+' · Все срочные задачи';all.onclick=onOpenNotes;attention.append(all)}
    attentionBlock=attention;
  }
  const hero=section('today-hero');
  const ratio=model.jobs.length?model.completed.length/model.jobs.length:0;
  hero.innerHTML='<div class="hero-heading"><span>Чистыми за день</span><span class="hero-date">'+formatDate(model.date,{day:'2-digit',month:'2-digit'})+'</span></div><div class="hero-focus"><button class="hero-amount" type="button" aria-label="Открыть деньги за сегодня">'+money(model.net)+icon('arrow')+'</button><div class="day-completion" aria-label="Выполнено '+model.completed.length+' из '+model.jobs.length+' заявок"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27"/><circle class="completion-ring" cx="32" cy="32" r="27" pathLength="100" stroke-dasharray="'+Math.round(ratio*100)+' 100"/></svg><span>'+model.completed.length+'<small>/'+model.jobs.length+'</small></span></div></div><div class="hero-ledger"><div><span>Доход</span><strong>'+money(model.income)+'</strong></div><div><span>Расход</span><strong>'+money(model.expense)+'</strong></div><div><span>Ещё '+plural(model.remaining,'заявка','заявки','заявок')+'</span><small>'+(model.remaining?'по плану дня':'Всё выполнено')+'</small></div></div>';
  hero.querySelector('.hero-amount').onclick=()=>onMoney(model.date,model.date);
  root.append(hero);
  const periods=section('today-periods','<button type="button" data-period="week"><span>Эта неделя</span><strong>'+money(model.weekNet)+'</strong>'+icon('chevron')+'</button><button type="button" data-period="month"><span>Этот месяц</span><strong>'+money(model.monthNet)+'</strong>'+icon('chevron')+'</button>');
  periods.querySelector('[data-period="week"]').onclick=()=>onMoney(model.weekStart,model.date);periods.querySelector('[data-period="month"]').onclick=()=>onMoney(model.monthStart,model.date);
  root.append(periods);
  if(attentionBlock)root.append(attentionBlock);
  const work=section('today-work',heading('Заявки на сегодня',model.jobs.length,onAddJob?'<button type="button" class="text-action" data-add-job>'+icon('plus')+'Заявка</button>':''));
  work.querySelector('[data-add-job]')?.addEventListener('click',onAddJob);
  const list=section('today-jobs');
  if(!model.jobs.length){list.innerHTML='<div class="empty-state">'+icon('sun')+'<h3>Сегодня без выездов</h3><p>Хороший момент разобраться с заметками или спланировать ближайшие дни.</p>'+(onAddJob?'<button type="button" class="button subtle">Добавить заявку</button>':'')+'</div>';list.querySelector('button')?.addEventListener('click',onAddJob)}
  else model.jobs.forEach(job=>list.append(createJobCard({job,onOpen:onJobClick,onComplete,onPaid,onRoute,onMore})));
  work.append(list);root.append(work);
  const expenses=section('today-expenses',heading('Расходы сегодня',undefined,onAddExpense?'<button type="button" class="text-action">'+icon('plus')+'Расход</button>':''));
  expenses.querySelector('button')?.addEventListener('click',onAddExpense);
  if(model.todayExpenses.length){
    const rows=section('expense-receipt');
    model.todayExpenses.forEach(e=>{const row=document.createElement('div');row.className='expense-line';row.innerHTML='<span class="expense-icon">'+icon('receipt')+'</span><div><strong>'+esc(e.category)+'</strong><small>'+esc(e.comment||'Без комментария')+'</small></div><b>−'+money(e.amount)+'</b>';rows.append(row)});
    expenses.append(rows);
  }else expenses.insertAdjacentHTML('beforeend','<p class="quiet-empty">Расходов пока нет</p>');
  root.append(expenses);
  const future=section('today-upcoming',heading('Ближайшие дни',undefined,'<button type="button" class="text-action">График '+icon('arrow')+'</button>'));
  future.querySelector('button').onclick=()=>onOpenDay(model.date);
  if(!model.future.length)future.insertAdjacentHTML('beforeend','<p class="quiet-empty">Будущих заявок пока нет</p>');
  model.future.forEach(day=>{
    const row=document.createElement('button');row.type='button';row.className='upcoming-row';
    row.innerHTML='<span class="upcoming-date"><b>'+formatDate(day.date,{day:'numeric'})+'</b><small>'+formatDate(day.date,{weekday:'short'})+'</small></span><span class="upcoming-info"><strong>'+jobsLabel(day.jobs.length)+'</strong><small>'+esc(day.jobs.map(j=>j.client).join(', '))+'</small></span><span class="upcoming-type">'+plural(day.jobs.filter(j=>j.type==='Монтаж').length,'монтаж','монтажа','монтажей')+'</span>'+icon('chevron');
    row.onclick=()=>onOpenDay(day.date);future.append(row);
  });root.append(future);
  const notes=section('today-notes',heading('Заметки',model.notes.length,onAddNote?'<button class="text-action" type="button" data-add-note>'+icon('plus')+'Заметка</button>':''));
  notes.querySelector('[data-add-note]')?.addEventListener('click',onAddNote);
  let carousel;
  if(model.notes.length){
    carousel=createCarousel({label:'Заметки на сегодня',activeId:activeNoteId,onActiveChange:onNoteChange,items:model.notes.map(note=>{
      const row=document.createElement('button');row.type='button';row.className='today-note';row.innerHTML='<span class="note-kicker">'+icon('note')+'<small>'+(note.dueDate?formatDate(note.dueDate,{day:'numeric',month:'short'}):'Без срока')+'</small></span><strong>'+esc(note.title||'Заметка')+'</strong><p>'+esc(note.text||'Открыть заметку')+'</p>';row.onclick=()=>onOpenNote(note);
      return {id:note.id,content:row};
    })});
    notes.append(carousel.element);
  }
  if(!model.notes.length)notes.insertAdjacentHTML('beforeend','<p class="quiet-empty">Всё важное можно записать здесь</p>');
  const all=document.createElement('button');all.type='button';all.className='text-action notes-all';all.innerHTML='Все заметки и архив '+icon('arrow');all.onclick=onOpenNotes;notes.append(all);root.append(notes);
  carousel?.mount();
  return ()=>carousel?.destroy();
};
