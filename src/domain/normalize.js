const num=v=>Math.max(0,Number(String(v??'').replace(',','.'))||0);
export const normalizeJob = (j={}) => ({
  ...j,
  id:j.id || '',
  date:j.date || '',
  slot:String(j.slot || '1'),
  type:j.type || 'Монтаж',
  client:j.client || '',
  price:num(j.price),
  status:j.status || 'Запланирован',
  paid:j.paid !== false,
  completedDate:j.completedDate || '',
  time:j.time || '',
  measurePrice:num(j.measurePrice),
  measurePaid:j.measurePaid === true,
  measureCredit:num(j.measureCredit),
  convertedToJobId:j.convertedToJobId || '',
  convertedFromMeasureId:j.convertedFromMeasureId || '',
  source:j.source || j.store || ''
});
export const normalizeExpense = (e={}) => ({
  ...e,
  id:e.id || '',
  date:e.date || '',
  amount:num(e.amount),
  category:e.category || 'Прочее',
  comment:e.comment || '',
  cancelled:e.cancelled === true
});
export const normalizeShared = d => ({
  jobs:Array.isArray(d?.jobs)?d.jobs.map(normalizeJob):[],
  expenses:Array.isArray(d?.expenses)?d.expenses.map(normalizeExpense):[],
  version:5
});
export const normalizeNotes = d => Array.isArray(d?.notes)?d.notes:[];
