import { financeTotals, periodFilter } from '../domain/finances.js';
import { activityDate } from '../domain/jobs.js';

const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';

export const buildMoneyModel=({state,start,end})=>{
 const jobs=periodFilter(state?.jobs||[],start,end,activityDate);
 const expenses=periodFilter(state?.expenses||[],start,end,e=>e?.date);
 const totals=financeTotals(jobs,expenses);
 return {...totals,start,end};
};

export const renderMoney=({root,model})=>{
 if(!root)return;
 root.innerHTML='<section class="money-header"><h1>Деньги</h1><span>'+model.start+' — '+model.end+'</span></section>'+
 '<section class="money-grid">'+
 '<div><span>Доход</span><strong>'+money(model.income)+'</strong></div>'+
 '<div><span>Расходы</span><strong>'+money(model.expenses)+'</strong></div>'+
 '<div><span>Чистый доход</span><strong>'+money(model.net)+'</strong></div>'+
 '<div><span>Долг клиентов</span><strong>'+money(model.debt)+'</strong></div>'+
 '</section>';
};
