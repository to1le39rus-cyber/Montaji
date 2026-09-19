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
 const expenseItems=expenses.filter(e=>!e?.cancelled).sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||'')));
 const allTimeTotals=financeTotals(state?.jobs||[],state?.expenses||[]);
 const montageByStore=incomeJobs.filter(j=>j.type==='Монтаж').reduce((map,j)=>{const key=String(j.source||'Без магазина').trim()||'Без магазина';const item=map.get(key)||{name:key,income:0,count:0};item.income+=effectiveIncome(j);item.count+=1;map.set(key,item);return map},new Map());
 const additionalIncome=incomeJobs.filter(j=>j.type==='Доп. доход').sort((a,b)=>String(activityDate(b)).localeCompare(String(activityDate(a))));
 const expenseCategories=[...new Set(expenseItems.map(e=>String(e.category||e.name||e.title||'Другое').trim()||'Другое'))].sort((a,b)=>a.localeCompare(b,'ru'));
 return {...totals,start,end,jobCount:jobs.length,incomeJobs,incomeByType:Object.entries(byType).sort((a,b)=>b[1]-a[1]),debts,expenseItems,allTimeTotals,montageByStore:[...montageByStore.values()].sort((a,b)=>b.income-a.income),additionalIncome,expenseCategories};
};

export const renderMoney=({root,model,onPeriodChange=()=>{},onJobClick=()=>{}})=>{
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
 const lifetime=document.createElement('section');lifetime.className='money-lifetime';
 lifetime.innerHTML='<span>За всё время</span><strong>'+money(model.allTimeTotals.income)+'</strong><small>доход · чистыми '+money(model.allTimeTotals.net)+'</small>';
 root.append(lifetime);

 const details=document.createElement('section');details.className='money-details';
 const income=document.createElement('div');income.className='money-detail-card';income.innerHTML='<h2>Доход по типам</h2>';
 if(model.incomeByType.length) model.incomeByType.forEach(([type,value])=>{
  const row=document.createElement('button');row.type='button';row.className='money-row money-row-button';
  const label=document.createElement('span');label.textContent=type;const amount=document.createElement('strong');amount.textContent=money(value);row.append(label,amount);income.append(row);
  if(type==='Монтаж')row.onclick=()=>{const box=income.querySelector('[data-drill="stores"]');if(box){box.remove();return}const drill=document.createElement('div');drill.dataset.drill='stores';drill.className='money-drill';if(!model.montageByStore.length)drill.textContent='Нет монтажей за период.';for(const store of model.montageByStore){const item=document.createElement('div');item.className='money-row';const text=document.createElement('span');text.textContent=store.name;const small=document.createElement('small');small.textContent=store.count+' монтажей';text.append(small);const sum=document.createElement('strong');sum.textContent=money(store.income);item.append(text,sum);drill.append(item)}row.after(drill)};
  if(type==='Доп. доход')row.onclick=()=>{const box=income.querySelector('[data-drill="additional"]');if(box){box.remove();return}const drill=document.createElement('div');drill.dataset.drill='additional';drill.className='money-drill';for(const job of model.additionalIncome){const item=document.createElement('button');item.type='button';item.className='money-row money-row-button';const text=document.createElement('span');text.textContent=String(job.client||job.comment||'Доп. доход');const small=document.createElement('small');small.textContent=String(activityDate(job)||'');text.append(small);const sum=document.createElement('strong');sum.textContent=money(effectiveIncome(job));item.append(text,sum);item.onclick=()=>onJobClick(job);drill.append(item)}row.after(drill)};
 });
 else income.insertAdjacentHTML('beforeend','<p class="money-empty">Нет завершённых доходов за период.</p>');
 const debt=document.createElement('div');debt.className='money-detail-card';debt.innerHTML='<h2>Долги клиентов</h2>';
 if(model.debts.length) model.debts.forEach(j=>{const row=document.createElement('div');row.className='money-row';row.innerHTML='<span>'+String(j.client||'Без имени')+'<small>'+String(activityDate(j))+'</small></span><strong>'+money(effectiveIncome(j))+'</strong>';debt.append(row)});
 else debt.insertAdjacentHTML('beforeend','<p class="money-empty">Долгов нет.</p>');
 const expenses=document.createElement('div');expenses.className='money-detail-card';expenses.innerHTML='<h2>Расходы</h2>';
 if(model.expenseItems.length){
  const controls=document.createElement('div');controls.className='money-list-controls';const select=document.createElement('select');select.innerHTML='<option value="">Все категории</option>';for(const category of model.expenseCategories){const option=document.createElement('option');option.value=category;option.textContent=category;select.append(option)}const more=document.createElement('button');more.type='button';more.textContent='Показать все · '+model.expenseItems.length;controls.append(select,more);expenses.append(controls);
  const list=document.createElement('div');expenses.append(list);let expanded=false;
  const drawExpenses=()=>{list.innerHTML='';const filtered=model.expenseItems.filter(e=>!select.value||(String(e.category||e.name||e.title||'Другое').trim()||'Другое')===select.value);const shown=expanded?filtered:filtered.slice(0,5);for(const e of shown){const row=document.createElement('div');row.className='money-row';const text=document.createElement('span');text.textContent=String(e.name||e.title||e.category||'Расход');const small=document.createElement('small');small.textContent=String(e.date||'');text.append(small);const sum=document.createElement('strong');sum.textContent=money(e.amount);row.append(text,sum);list.append(row)}more.hidden=filtered.length<=5;more.textContent=expanded?'Свернуть':'Показать все · '+filtered.length};
  select.onchange=()=>{expanded=false;drawExpenses()};more.onclick=()=>{expanded=!expanded;drawExpenses()};drawExpenses();
 }else expenses.insertAdjacentHTML('beforeend','<p class="money-empty">Расходов за период нет.</p>');
 details.append(income,debt,expenses);root.append(details);
};