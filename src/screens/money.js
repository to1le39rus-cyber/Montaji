import { financeTotals, periodFilter } from '../domain/finances.js';
import { activityDate, isIncomeEligible, effectiveIncome } from '../domain/jobs.js';
import { icon } from '../ui/icons.js';
import { esc, formatDate } from '../ui/format.js';

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
 const montageByStore=incomeJobs.filter(j=>j.type==='Монтаж').reduce((map,j)=>{const key=String(j.source||'Без магазина').trim()||'Без магазина';const item=map.get(key)||{name:key,income:0,count:0,jobs:[]};item.income+=effectiveIncome(j);item.count+=1;item.jobs.push(j);map.set(key,item);return map},new Map());
 const additionalIncome=incomeJobs.filter(j=>j.type==='Доп. доход').sort((a,b)=>String(activityDate(b)).localeCompare(String(activityDate(a))));
 const expenseCategories=[...new Set(expenseItems.map(e=>String(e.category||e.name||e.title||'Другое').trim()||'Другое'))].sort((a,b)=>a.localeCompare(b,'ru'));
 return {...totals,start,end,jobCount:jobs.length,incomeJobs,incomeByType:Object.entries(byType).sort((a,b)=>b[1]-a[1]),debts,expenseItems,allTimeTotals,montageByStore:[...montageByStore.values()].sort((a,b)=>b.income-a.income),additionalIncome,expenseCategories};
};

export const renderMoney=({root,model,onPeriodChange=()=>{},onJobClick=()=>{},onAddExpense})=>{
 if(!root)return;
 root.innerHTML='';root.dataset.screen='money';
 const header=document.createElement('section'); header.className='money-header';
 const title=document.createElement('div'); title.innerHTML='<span class="money-eyebrow">Финансы</span><h1>Деньги</h1><p class="money-subtitle">'+model.jobCount+' заявок в выбранном периоде</p>';
 const range=document.createElement('div'); range.className='money-range';
 for(const [key,value] of [['start',model.start],['end',model.end]]){
  const input=document.createElement('input'); input.type='date'; input.value=value; input.dataset.period=key; input.setAttribute('aria-label',key==='start'?'Начало периода':'Конец периода');
  input.addEventListener('change',()=>onPeriodChange(input.dataset.period,input.value)); range.append(input);
 }
 header.append(title); root.append(header);

 const quick=document.createElement('div'); quick.className='money-quick';
 const end=model.end||new Date().toISOString().slice(0,10);
 [['Сегодня',end,end],['7 дней',addDays(end,-6),end],['Месяц',firstOfMonth(end),end]].forEach(([label,start,endDate])=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>onPeriodChange('range',start,endDate));quick.append(b);
 });
 root.append(quick);

 const overview=document.createElement('section');overview.className='money-overview';
 overview.innerHTML='<div class="money-overview-top"><span>Чистыми</span><span class="money-period-label">'+formatDate(model.start,{day:'numeric',month:'short'})+' — '+formatDate(model.end,{day:'numeric',month:'short'})+'</span></div><strong class="money-net">'+money(model.net)+'</strong><div class="money-flow"><div><span>Доход</span><strong>'+money(model.income)+'</strong></div><i aria-hidden="true"></i><div><span>Расход</span><strong>−'+money(model.expenses)+'</strong></div></div><div class="money-flow-line"><span style="--income-share:'+(model.income?Math.max(8,Math.round(model.net/model.income*100)):0)+'%"></span></div>';
 root.append(overview);

 const summary=document.createElement('section');summary.className='money-summary';
 summary.innerHTML='<div><span class="money-summary-icon income">'+icon('arrow')+'</span><span>Получено<strong>'+money(model.income)+'</strong></span></div><div><span class="money-summary-icon expense">'+icon('receipt')+'</span><span>Потрачено<strong>'+money(model.expenses)+'</strong></span></div><div class="'+(model.debt?'has-debt':'')+'"><span class="money-summary-icon debt">'+icon('money')+'</span><span>Ждём оплаты<strong>'+money(model.debt)+'</strong></span></div>';
 root.append(summary);

 const period=document.createElement('section');period.className='money-period';
 period.innerHTML='<div class="section-head"><h2>Период</h2><span class="section-caption">Можно выбрать любые даты</span></div>';
 period.append(range);root.append(period);

 const lifetime=document.createElement('section');lifetime.className='money-lifetime';
 lifetime.innerHTML='<span><small>Вся история</small><strong>'+money(model.allTimeTotals.income)+'</strong></span><span><small>Осталось чистыми</small><strong>'+money(model.allTimeTotals.net)+'</strong></span>'+icon('chevron');
 root.append(lifetime);

 const details=document.createElement('section');details.className='money-details';
 const income=document.createElement('div');income.className='money-detail-card';income.innerHTML='<div class="money-card-head"><span><small>Структура</small><h2>Откуда пришли деньги</h2></span><strong>'+money(model.income)+'</strong></div>';
 const maxIncome=Math.max(1,...model.incomeByType.map(([,value])=>value));
 if(model.incomeByType.length) model.incomeByType.forEach(([type,value])=>{
  const row=document.createElement('button');row.type='button';row.className='money-row money-row-button';
  const label=document.createElement('span');label.innerHTML='<b>'+esc(type)+'</b><i><em style="width:'+Math.round(value/maxIncome*100)+'%"></em></i>';const amount=document.createElement('strong');amount.innerHTML=money(value)+icon('chevron');row.append(label,amount);income.append(row);
  if(type==='Монтаж')row.onclick=()=>{
   const box=income.querySelector('[data-drill="stores"]');if(box){box.remove();return}
   const drill=document.createElement('div');drill.dataset.drill='stores';drill.className='money-drill';
   const search=document.createElement('input');search.type='search';search.className='money-search';search.placeholder='Найти магазин';search.setAttribute('aria-label','Найти магазин');
   const list=document.createElement('div');drill.append(search,list);
   const drawStores=()=>{list.innerHTML='';const q=search.value.trim().toLocaleLowerCase('ru');const stores=model.montageByStore.filter(store=>!q||store.name.toLocaleLowerCase('ru').includes(q));if(!stores.length){const empty=document.createElement('p');empty.className='money-empty';empty.textContent='Магазины не найдены.';list.append(empty);return}for(const store of stores){const wrap=document.createElement('div');const item=document.createElement('button');item.type='button';item.className='money-row money-row-button';const text=document.createElement('span');text.textContent=store.name;const small=document.createElement('small');small.textContent=store.count+' монтажей';text.append(small);const sum=document.createElement('strong');sum.textContent=money(store.income);item.append(text,sum);const jobs=document.createElement('div');jobs.className='money-store-jobs';jobs.hidden=true;item.onclick=()=>{jobs.hidden=!jobs.hidden};for(const job of [...store.jobs].sort((a,b)=>String(activityDate(b)).localeCompare(String(activityDate(a))))){const jobRow=document.createElement('button');jobRow.type='button';jobRow.className='money-row money-row-button';const jobText=document.createElement('span');jobText.textContent=String(job.client||'Без имени');const date=document.createElement('small');date.textContent=String(activityDate(job)||'');jobText.append(date);const jobSum=document.createElement('strong');jobSum.textContent=money(effectiveIncome(job));jobRow.append(jobText,jobSum);jobRow.onclick=()=>onJobClick(job);jobs.append(jobRow)}wrap.append(item,jobs);list.append(wrap)}};search.oninput=drawStores;drawStores();row.after(drill)
  };
  if(type==='Доп. доход')row.onclick=()=>{const box=income.querySelector('[data-drill="additional"]');if(box){box.remove();return}const drill=document.createElement('div');drill.dataset.drill='additional';drill.className='money-drill';for(const job of model.additionalIncome){const item=document.createElement('button');item.type='button';item.className='money-row money-row-button';const text=document.createElement('span');text.textContent=String(job.client||job.comment||'Доп. доход');const small=document.createElement('small');small.textContent=String(activityDate(job)||'');text.append(small);const sum=document.createElement('strong');sum.textContent=money(effectiveIncome(job));item.append(text,sum);item.onclick=()=>onJobClick(job);drill.append(item)}row.after(drill)};
 });
 else income.insertAdjacentHTML('beforeend','<p class="money-empty">Нет завершённых доходов за период.</p>');
 const debt=document.createElement('div');debt.className='money-detail-card money-debt-card';debt.innerHTML='<div class="money-card-head"><span><small>Контроль оплаты</small><h2>Долги клиентов</h2></span><strong>'+money(model.debt)+'</strong></div>';
 if(model.debts.length) model.debts.forEach(j=>{const row=document.createElement('button');row.type='button';row.className='money-row money-row-button';row.innerHTML='<span><b>'+esc(String(j.client||'Без имени'))+'</b><small>Выполнено · '+esc(String(activityDate(j)))+'</small></span><strong>'+money(effectiveIncome(j))+icon('chevron')+'</strong>';row.onclick=()=>onJobClick(j);debt.append(row)});
 else debt.insertAdjacentHTML('beforeend','<div class="money-clear">'+icon('check')+'<span><strong>Всё оплачено</strong><small>Выполненных неоплаченных заявок нет</small></span></div>');
 const expenses=document.createElement('div');expenses.className='money-detail-card';expenses.innerHTML='<div class="money-card-head"><span><small>История</small><h2>Расходы</h2></span>'+(onAddExpense?'<button type="button" class="text-action" data-add-expense>'+icon('plus')+'Добавить</button>':'<strong>'+money(model.expenses)+'</strong>')+'</div>';
 expenses.querySelector('[data-add-expense]')?.addEventListener('click',()=>onAddExpense(model.end));
 if(model.expenseItems.length){
  const controls=document.createElement('div');controls.className='money-list-controls';const select=document.createElement('select');select.setAttribute('aria-label','Категория расходов');select.innerHTML='<option value="">Все категории</option>';for(const category of model.expenseCategories){const option=document.createElement('option');option.value=category;option.textContent=category;select.append(option)}const more=document.createElement('button');more.type='button';more.textContent='Показать все · '+model.expenseItems.length;controls.append(select,more);expenses.append(controls);
  const list=document.createElement('div');expenses.append(list);let expanded=false;
  const drawExpenses=()=>{list.innerHTML='';const filtered=model.expenseItems.filter(e=>!select.value||(String(e.category||e.name||e.title||'Другое').trim()||'Другое')===select.value);const shown=expanded?filtered:filtered.slice(0,5);for(const e of shown){const row=document.createElement('div');row.className='money-row expense-row';const mark=document.createElement('span');mark.className='expense-mark';mark.setAttribute('aria-hidden','true');mark.innerHTML=icon('receipt');const text=document.createElement('span');text.innerHTML='<b>'+esc(String(e.name||e.title||e.category||'Расход'))+'</b>';const small=document.createElement('small');small.textContent=e.date?formatDate(String(e.date),{day:'numeric',month:'short'}):'';text.append(small);const sum=document.createElement('strong');sum.textContent='−'+money(e.amount);row.append(mark,text,sum);list.append(row)}more.hidden=filtered.length<=5;more.textContent=expanded?'Свернуть':'Показать все · '+filtered.length};
  select.onchange=()=>{expanded=false;drawExpenses()};more.onclick=()=>{expanded=!expanded;drawExpenses()};drawExpenses();
 }else expenses.insertAdjacentHTML('beforeend','<p class="money-empty">Расходов за период нет.</p>');
 details.append(income,debt,expenses);root.append(details);
};
