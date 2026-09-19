import { normalizeJob } from './normalize.js';

const uid=()=>crypto.randomUUID?.()||String(Date.now())+'-'+Math.random();
const day=d=>d instanceof Date?d.toISOString().slice(0,10):String(d||'').slice(0,10);

export const createJob=({job={},now=new Date()})=>normalizeJob({...job,id:job.id||uid(),date:job.date||day(now),status:job.status||'Запланирован'});
export const updateJob=(job,patch={})=>normalizeJob({...job,...patch,id:job.id});
export const completeJob=(job,completedDate)=>normalizeJob({...job,status:'Выполнен',completedDate:completedDate||job.completedDate||job.date});
export const cancelJob=(job,reason='')=>normalizeJob({...job,status:'Отменён',cancelledAt:job.cancelledAt||new Date().toISOString(),cancelReason:reason||job.cancelReason||''});
export const rescheduleJob=(job,date)=>normalizeJob({...job,date:day(date),status:'Перенос'});
export const markPaid=job=>normalizeJob({...job,paid:true});
export const markUnpaid=job=>normalizeJob({...job,paid:false});
