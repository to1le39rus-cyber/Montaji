import { financeTotals, periodFilter } from '../domain/finances.js';
import { activityDate } from '../domain/jobs.js';

const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';

export const buildMoneyModel=({state,start,end})=>{
 const jobs=periodFilter(state?.jobs||[],start,end,activityDate);
 const expenses=periodFilter(state?.expenses||[],start,end,e=>e?.date);
 const totals=financeTotals(jobs,expenses);
 return {...totals,start,end};
};

export const renderMoney=({root,model,onPeriodChange=()=>{}})=>{
 if(!root)return;
 root.innerHTML='';
 const header=document.createElement('section'); header.className='money-header';
 const title=document.createElement('div'); title.innerHTML='<h1>Деньги</h1>';
 const range=document.createElement('div'); range.className='money-range';
 for(const [key,value] of [['start',model.start],['end',model.end]]){
  const input=document.createElement('input'); input.type='date'; input.value=value; input.dataset.period=key; input.setAttribute('aria-label',key==='start'?'Начало периода':'Конец периода');
  input.addEventListener('change',()=>onPeriodChange(input.dataset.period,input.value)); range.append(input);
 }
 header.append(title,range); root.append(header);
 const grid=document.createElement('section'); grid.className='money-grid';
 grid.innerHTML='<div><span>Доход</span><strong>'+money(model.income)+'</strong></div><div><span>Расходы</span><strong>'+money(model.expenses)+'</strong></div><div><span>Чистый доход</span><strong>'+money(model.net)+'</strong></div><div><span>Долг клиентов</span><strong>'+money(model.debt)+'</strong></div>';
 root.append(grid);
};
