import { normalizeJob } from './normalize.js';

const uid=()=>crypto.randomUUID?.()||String(Date.now())+'-'+Math.random();

export const createJob=({job={},now=new Date()})=>normalizeJob({
 ...job,
 id:job.id||uid(),
 date:job.date||now.toISOString().slice(0,10),
 status:job.status||'Запланирован'
});

export const completeJob=(job,completedDate)=>normalizeJob({
 ...job,status:'Выполнен',completedDate:completedDate||job.completedDate||job.date
});

export const cancelJob=job=>normalizeJob({...job,status:'Отменён'});

export const rescheduleJob=(job,date)=>normalizeJob({
 ...job,date,status:'Перенос'
});

export const markPaid=job=>normalizeJob({...job,paid:true});
