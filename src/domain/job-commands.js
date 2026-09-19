import { normalizeJob } from './normalize.js';

const uid=()=>crypto.randomUUID?.()||String(Date.now())+'-'+Math.random();
const day=d=>d instanceof Date?d.toISOString().slice(0,10):String(d||'').slice(0,10);

export const createJob=({job={},now=new Date()})=>normalizeJob({...job,id:job.id||uid(),date:job.date||day(now),status:job.status||'Запланировано'});
export const updateJob=(job,patch={})=>{
 const next={...job,...patch,id:job.id};
 if(next.status==='Выполнен') next.completedDate=next.completedDate||job.completedDate||next.date;
 else if(Object.prototype.hasOwnProperty.call(patch,'status') && patch.status!=='Выполнен') next.completedDate='';
 return normalizeJob(next);
};
export const completeJob=(job,completedDate)=>normalizeJob({...job,status:'Выполнен',completedDate:completedDate||job.completedDate||job.date});
export const cancelJob=(job,reason='')=>normalizeJob({...job,status:'Отменен',cancelledAt:job.cancelledAt||new Date().toISOString(),cancelReason:reason||job.cancelReason||''});
export const rescheduleJob=(job,date)=>normalizeJob({...job,date:day(date),status:'Перенесен'});
export const markPaid=job=>normalizeJob({...job,paid:true});
export const markUnpaid=job=>normalizeJob({...job,paid:false});
