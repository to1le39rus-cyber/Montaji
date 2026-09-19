import { effectiveIncome, isDebt, isIncomeEligible, isCancelled } from './jobs.js';
const amount = value => Math.max(0, Number(String(value ?? '').replace(',','.')) || 0);
export const jobIncome = jobs => (Array.isArray(jobs)?jobs:[]).filter(isIncomeEligible).reduce((s,j)=>s+effectiveIncome(j),0);
export const jobDebt = jobs => (Array.isArray(jobs)?jobs:[]).filter(isDebt).reduce((s,j)=>s+effectiveIncome(j),0);
export const expenseTotal = expenses => (Array.isArray(expenses)?expenses:[]).filter(e=>!e?.cancelled).reduce((s,e)=>s+amount(e?.amount),0);
export const financeTotals = (jobs,expenses) => {
  const income=jobIncome(jobs), expensesTotal=expenseTotal(expenses);
  return { income, expenses: expensesTotal, net: income-expensesTotal, debt: jobDebt(jobs) };
};
export const periodFilter = (items,start,end,getDate=item=>item?.date) =>
  (Array.isArray(items)?items:[]).filter(item=>{const d=getDate(item);return d>=start&&d<=end;});
