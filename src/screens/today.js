import { jobsForDate } from '../domain/scheduling.js';
import { effectiveIncome, isCompleted } from '../domain/finances.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';

export const buildTodayModel = ({state,date}) => {
  const jobs=jobsForDate(state?.jobs||[],date);
  const montages=jobs.filter(j=>j.type==='Монтаж');
  const completed=jobs.filter(isCompleted);
  const income=completed.reduce((sum,j)=>sum+effectiveIncome(j),0);
  return {date,jobs,montages,completed,income};
};

export const renderToday = ({root,model,onJobClick=()=>{}}) => {
  if(!root)return;
  root.innerHTML='';
  const header=document.createElement('section');
  header.className='today-header';
  header.innerHTML='<h1>Сегодня</h1><div class="today-date">'+esc(model.date)+'</div>';
  root.append(header);

  const summary=document.createElement('section');
  summary.className='today-summary';
  summary.innerHTML='<div><span>Монтажи</span><strong>'+model.montages.length+'</strong></div><div><span>Доход</span><strong>'+money(model.income)+'</strong></div>';
  root.append(summary);

  const list=document.createElement('section');
  list.className='today-jobs';
  if(!model.jobs.length){
    list.innerHTML='<p class="today-empty">На этот день пока нет заявок.</p>';
  }else{
    for(const job of model.jobs){
      const card=document.createElement('button');
      card.type='button';
      card.className='today-job-card';
      card.dataset.jobId=job.id;
      card.innerHTML='<strong>'+esc(job.client)+'</strong><span>'+esc(job.type)+' · слот '+esc(job.slot)+'</span><span>'+money(job.price)+'</span>';
      card.addEventListener('click',()=>onJobClick(job));
      list.append(card);
    }
  }
  root.append(list);
};
