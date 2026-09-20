import { jobsForDate, isCompleted, effectiveIncome } from '../domain/jobs.js';
import { createJobCard } from '../components/job-card.js';
import { icon } from '../ui/icons.js';

const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const dateAtNoon=value=>new Date(value+'T12:00:00');
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const shift=(value,days)=>{const d=dateAtNoon(value);d.setDate(d.getDate()+days);return iso(d)};
const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(dateAtNoon(value)).replace(/^./,x=>x.toUpperCase());
const shortWeekday=value=>new Intl.DateTimeFormat('ru-RU',{weekday:'short'}).format(dateAtNoon(value)).replace('.','');
const countLabel=(n,one,few,many)=>n+' '+(n%10===1&&n%100!==11?one:[2,3,4].includes(n%10)&&![12,13,14].includes(n%100)?few:many);
const activeExpenses=(items,date)=>items.filter(e=>!e?.cancelled&&e?.date===date);
const expenseTotal=items=>items.reduce((sum,e)=>sum+(Number(e?.amount)||0),0);

export const buildTodayModel=({state,date,notes=[]})=>{
 const allJobs=Array.isArray(state?.jobs)?state.jobs:[];
 const expenses=Array.isArray(state?.expenses)?state.expenses:[];
 const jobs=jobsForDate(allJobs,date);
 const montages=jobs.filter(j=>j.type==='Монтаж');
 const completed=jobs.filter(isCompleted);
 const income=completed.reduce((sum,j)=>sum+effectiveIncome(j),0);
 const unpaid=completed.filter(j=>j.paid===false);
 const todayExpenses=activeExpenses(expenses,date);
 const expense=expenseTotal(todayExpenses);
 const d=dateAtNoon(date),day=d.getDay()||7;
 const weekStart=shift(date,1-day),monthStart=date.slice(0,7)+'-01';
 const incomeFor=(start,end)=>allJobs.filter(j=>j.date>=start&&j.date<=end).reduce((sum,j)=>sum+effectiveIncome(j),0);
 const expensesFor=(start,end)=>expenseTotal(expenses.filter(e=>!e?.cancelled&&e.date>=start&&e.date<=end));
 const future=[];
 for(let i=1;i<=14&&future.length<5;i++){
  const next=shift(date,i),list=jobsForDate(allJobs,next);
  if(list.length)future.push({date:next,jobs:list,total:list.reduce((sum,j)=>sum+(Number(j.price)||0),0)});
 }
 const activeNotes=(Array.isArray(notes)?notes:[]).filter(n=>!n?.done&&!n?.archived);
 return {
  date,jobs,montages,completed,income,unpaid,todayExpenses,expense,net:income-expense,
  weekNet:incomeFor(weekStart,date)-expensesFor(weekStart,date),
  monthNet:incomeFor(monthStart,date)-expensesFor(monthStart,date),
  urgent:activeNotes.filter(n=>n?.urgent===true),
  notes:activeNotes.filter(n=>n?.urgent!==true),future
 };
};

const sectionHead=(title,action='')=>'<div class="today-section-head"><h2>'+title+'</h2>'+action+'</div>';

export const renderToday=({root,model,onJobClick=()=>{},onComplete=()=>{},onPaid=()=>{},onOpenNotes=()=>{}})=>{
 if(!root)return;
 root.innerHTML='';
 const header=document.createElement('header');header.className='today-header';
 header.innerHTML='<div><span class="today-eyebrow">Рабочий день</span><h1>Сегодня</h1></div><div class="today-date">'+formatDate(model.date)+'</div>';
 root.append(header);

 if(model.urgent.length){
  const urgent=document.createElement('section');urgent.className='today-attention';
  urgent.innerHTML='<div class="today-attention-head"><span class="attention-pulse"></span><strong>Требует внимания</strong><span>'+model.urgent.length+'</span></div>';
  model.urgent.slice(0,3).forEach(note=>{
   const row=document.createElement('button');row.type='button';row.className='today-task';
   row.innerHTML='<span class="task-check">'+icon('check')+'</span><span><strong>'+esc(note.title||'Срочная задача')+'</strong><small>'+esc(note.text||'Открыть заметку')+'</small></span>'+icon('chevron');
   row.onclick=onOpenNotes;urgent.append(row);
  });root.append(urgent);
 }

 const hero=document.createElement('section');hero.className='today-hero';
 hero.innerHTML='<div class="today-hero-orbit" aria-hidden="true"></div><div class="today-hero-top"><span>Результат дня</span><span class="today-live"><i></i>'+countLabel(model.jobs.length,'заявка','заявки','заявок')+'</span></div><div class="today-net"><strong>'+money(model.net)+'</strong><span>чистыми</span></div><div class="today-ledger"><div><small>Доход</small><b>'+money(model.income)+'</b></div><div><small>Расход</small><b>'+money(model.expense)+'</b></div><div><small>Готово</small><b>'+model.completed.length+' / '+model.jobs.length+'</b></div></div><div class="today-progress"><span style="--progress:'+(model.jobs.length?Math.round(model.completed.length/model.jobs.length*100):0)+'%"></span></div>';
 root.append(hero);

 const periods=document.createElement('section');periods.className='today-periods';
 periods.innerHTML='<div><span>Неделя</span><strong>'+money(model.weekNet)+'</strong></div><div><span>Месяц</span><strong>'+money(model.monthNet)+'</strong></div>';
 root.append(periods);

 const jobsHead=document.createElement('div');jobsHead.innerHTML=sectionHead('Заявки','<span class="section-meta">'+countLabel(model.montages.length,'монтаж','монтажа','монтажей')+'</span>');root.append(jobsHead.firstElementChild);
 const list=document.createElement('section');list.className='today-jobs';
 if(!model.jobs.length)list.innerHTML='<div class="today-empty"><span>'+icon('briefcase')+'</span><strong>День свободен</strong><small>Можно принять новый выезд или оставить день без работы.</small></div>';
 else model.jobs.forEach(job=>list.append(createJobCard({job,onOpen:onJobClick,onComplete,onPaid})));
 root.append(list);

 const expenseSection=document.createElement('section');expenseSection.className='today-support-card';
 expenseSection.innerHTML=sectionHead('Расходы сегодня','<strong class="support-total">'+money(model.expense)+'</strong>')+(model.todayExpenses.length?'<div class="today-expenses">'+model.todayExpenses.map(e=>'<div><span>'+esc(e.category||'Расход')+(e.comment?' · '+esc(e.comment):'')+'</span><strong>− '+money(e.amount)+'</strong></div>').join('')+'</div>':'<p>Сегодня расходов нет</p>');
 root.append(expenseSection);

 if(model.future.length){
  const upcoming=document.createElement('section');upcoming.className='today-upcoming';upcoming.innerHTML=sectionHead('Ближайшие дни');
  model.future.forEach(day=>{const row=document.createElement('button');row.type='button';row.className='upcoming-row';row.innerHTML='<span class="upcoming-date"><b>'+dateAtNoon(day.date).getDate()+'</b><small>'+shortWeekday(day.date)+'</small></span><span class="upcoming-clients"><strong>'+esc(day.jobs.map(j=>j.client).join(', '))+'</strong><small>'+countLabel(day.jobs.length,'выезд','выезда','выездов')+' · '+money(day.total)+'</small></span>'+icon('chevron');row.onclick=()=>onJobClick(day.jobs[0]);upcoming.append(row)});root.append(upcoming);
 }

 const notes=document.createElement('section');notes.className='today-notes';notes.innerHTML=sectionHead('Заметки','<button type="button" class="text-action">Все заметки '+icon('chevron')+'</button>');
 notes.querySelector('.text-action').onclick=onOpenNotes;
 if(model.notes.length)model.notes.slice(0,3).forEach(note=>{const row=document.createElement('button');row.type='button';row.className='today-note';row.innerHTML='<span>'+icon('note')+'</span><span><strong>'+esc(note.title||'Заметка')+'</strong><small>'+esc(note.text||'')+'</small></span>';row.onclick=onOpenNotes;notes.append(row)});
 else notes.insertAdjacentHTML('beforeend','<p>Активных заметок нет</p>');root.append(notes);
};
