import { jobsForDate, isCompleted, effectiveIncome } from '../domain/jobs.js';
import { createJobCard } from '../components/job-card.js';

const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
const formatDate=iso=>{const d=new Date(iso+'T12:00:00');return new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(d).replace(/^./,x=>x.toUpperCase())};

export const buildTodayModel=({state,date})=>{
 const jobs=jobsForDate(state?.jobs||[],date);
 const montages=jobs.filter(j=>j.type==='Монтаж');
 const completed=jobs.filter(isCompleted);
 const income=completed.reduce((sum,j)=>sum+effectiveIncome(j),0);
 const unpaid=completed.filter(j=>j.paid===false);
 return {date,jobs,montages,completed,income,unpaid};
};
export const renderToday=({root,model,onJobClick=()=>{},onComplete=()=>{},onPaid=()=>{}})=>{
 if(!root)return;
 root.innerHTML='';
 const header=document.createElement('section'); header.className='today-header';
 header.innerHTML='<div><span class="today-eyebrow">Рабочий день</span><h1>Сегодня</h1></div><div class="today-date">'+formatDate(model.date)+'</div>'; root.append(header);
 const hero=document.createElement('section');hero.className='today-hero';
 hero.innerHTML='<div class="today-hero-glow" aria-hidden="true"></div><div class="today-hero-top"><span>План на день</span><span class="today-live"><i></i>'+model.jobs.length+' заявок</span></div><div class="today-hero-main"><div><strong>'+model.montages.length+'</strong><span>монтажа</span></div><div class="today-income"><small>Доход</small><strong>'+money(model.income)+'</strong></div></div><div class="today-progress"><span style="--progress:'+(model.jobs.length?Math.round(model.completed.length/model.jobs.length*100):0)+'%"></span></div><div class="today-hero-foot"><span>'+model.completed.length+' выполнено</span><span>'+model.unpaid.length+' не оплачено</span></div>';
 root.append(hero);
 const heading=document.createElement('div');heading.className='today-section-head';heading.innerHTML='<div><span>Заявки</span><strong>'+model.jobs.length+'</strong></div><small>По слотам</small>';root.append(heading);
 const list=document.createElement('section'); list.className='today-jobs';
 if(!model.jobs.length) list.innerHTML='<div class="today-empty"><strong>День свободен</strong><span>Создай первую заявку на сегодня.</span></div>';
 else model.jobs.forEach(job=>list.append(createJobCard({job,onOpen:onJobClick,onComplete,onPaid})));
 root.append(list);
};