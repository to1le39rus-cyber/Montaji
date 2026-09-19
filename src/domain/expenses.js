export const createExpense = (input,id) => ({
  ...input,
  id,
  date:input?.date || '',
  amount:Math.max(0,Number(String(input?.amount??'').replace(',','.'))||0),
  category:input?.category || 'Прочее',
  comment:input?.comment || '',
  cancelled:false
});
export const cancelExpense = expense => expense ? {...expense,cancelled:true} : expense;
