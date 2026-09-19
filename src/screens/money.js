import { financeTotals, periodFilter } from '../domain/finances.js';
import { activityDate, isIncomeEligible, effectiveIncome } from '../domain/jobs.js';

const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
const firstOfMonth=d=>d.slice(0,8)+'01';
const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

export const buildMoneyModel=({state,start,end})=>{
 const jobs=periodFilter(state?.jobs||[],start,end,activityDate);
 const expenses=periodFilter(state?.expenses||[],start,end,e=>e?.date);
 const totals=financeTotals(jobs,expenses);
 const incomeJobs=jobs.filter(isIncomeEligible);
 const byType=incomeJobs.reduce((map,j)=>{const key=j.type||'Другое';map[key]=(map[key]||0)+effectiveIncome(j);return map},{});
 const debts=jobs.filter(j=>isIncomeEligible(j)&&j.paid===false).sort((a,b)=>String(activityDate(a)).localeCompare(String(activityDate(b))));
 const expenseItems=expenses.filter(e=>!e?.cancelled).sort((a,b)=>String(a?.date||'').localeCompare(String(b?.date||'')));
 return {...totals,start,end,jobCount:jobs.length,incomeJobs,incomeByType:Object.entries(byType).sort((a,b)=>b[1]-a[1]),debts,expenseItems};
};

export const renderMoney=({root,model,onPeriodChange=()=>{}})=>{
 if(!root)return;
 root.innerHTML='';
 const header=document.createElement('section'); header.className='money-header';
 const title=document.createElement('div'); title.innerHTML='<h1>Деньги</h1><p class="money-subtitle">'+model.jobCount+' заявок в периоде</p>';
 const range=document.createElement('div'); range.className='money-range';
 for(const [key,value] of [['start',model.start],['end',model.end]]){
  const input=document.createElement('input'); input.type='date'; input.value=value; input.dataset.period=key; input.setAttribute('aria-label',key==='start'?'Начало периода':'Конец периода');
  input.addEventListener('change',()=>onPeriodChange(input.dataset.period,input.value)); range.append(input);
 }
 header.append(title,range); root.append(header);

 const quick=document.createElement('div'); quick.className='money-quick';
 const end=model.end||new Date().toISOString().slice(0,10);
 [['Сегодня',end,end],['7 дней',addDays(end,-6),end],['Месяц',firstOfMonth(end),end]].forEach(([label,start,endDate])=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>onPeriodChange('range',start,endDate));quick.append(b);
 });
 root.append(quick);

 const grid=document.createElement('section'); grid.className='money-grid';
 grid.innerHTML='<div><span>Доход</span><strong>'+money(model.income)+'</strong></div><div><span>Расходы</span><strong>'+money(model.expenses)+'</strong></div><div><span>Чистый доход</span><strong>'+money(model.net)+'</strong></div><div><span>Долг клиентов</span><strong>'+money(model.debt)+'</strong></div>';
 root.append(grid);

 const details=document.createElement('section');details.className='money-details';
 const income=document.createElement('div');income.className='money-detail-card';income.innerHTML='<h2>Доход по типам</h2>';
 if(model.incomeByType.length) model.incomeByType.forEach(([type,value])=>{const row=document.createElement('div');row.className='money-row';row.innerHTML='<span>'+type+'</span><strong>'+money(value)+'</strong>';income.append(row)});
 else income.insertAdjacentHTML('beforeend','<p class="money-empty">Нет завершённых доходов за период.</p>');
 const debt=document.createElement('div');debt.className='money-detail-card';debt.innerHTML='<h2>Долги клиентов</h2>';
 if(model.debts.length) model.debts.forEach(j=>{const row=document.createElement('div');row.className='money-row';row.innerHTML='<span>'+String(j.client||'Без имени')+'<small>'+String(activityDate(j))+'</small></span><strong>'+money(effectiveIncome(j))+'</strong>';debt.append(row)});
 else debt.insertAdjacentHTML('beforeend','<p class="money-empty">Долгов нет.</p>');
 const expenses=document.createElement('div');expenses.className='money-detail-card';expenses.innerHTML='<h2>Расходы</h2>';
 if(model.expenseItems.length) model.expenseItems.forEach(e=>{const row=document.createElement('div');row.className='money-row';row.innerHTML='<span>'+String(e.name||e.title||e.category||'Расход')+'<small>'+String(e.date||'')+'</small></span><strong>'+money(e.amount)+'</strong>';expenses.append(row)});
 else expenses.insertAdjacentHTML('beforeend','<p class="money-empty">Расходов за период нет.</p>');
 details.append(income,debt,expenses);root.append(details);
};