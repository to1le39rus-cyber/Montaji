export const JOB_TYPES = Object.freeze(['Монтаж','Замер','Рекламация','Доставка','Сервис','Доп. доход']);
export const JOB_STATUSES = Object.freeze(['Запланирован','Выполнен','Отменён','Перенос']);
export const isCompleted = job => job?.status === 'Выполнен';
export const isCancelled = job => job?.status === 'Отменён';
export const isMeasurement = job => job?.type === 'Замер';
export const isAdditionalIncome = job => job?.type === 'Доп. доход';
export const isIncomeEligible = job => isCompleted(job) && !isCancelled(job);
export const isDebt = job => isIncomeEligible(job) && job?.paid === false;
export const activityDate = job => isCompleted(job) ? (job.completedDate || job.date) : job.date;
export const jobsForDate = (jobs,date) => (Array.isArray(jobs)?jobs:[]).filter(j=>!isCancelled(j)&&j?.date===date);
export const montageJobsForDate = (jobs,date) => jobsForDate(jobs,date).filter(j=>j.type==='Монтаж');
export const effectiveIncome = job => {
  if (!isIncomeEligible(job)) return 0;
  return Number(job?.type === 'Замер' ? (job.measurePrice || job.price) : job.price) || 0;
};
export const createJob = (input, id) => ({
  ...input,
  id,
  date: input?.date || '',
  type: input?.type || 'Монтаж',
  status: input?.status || 'Запланирован',
  paid: input?.paid !== false
});
