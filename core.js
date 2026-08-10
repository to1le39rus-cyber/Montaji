export const TYPES=['Монтаж','Замер','Рекламация','Доставка','Сервис'];
export const SLOTS=['1','2','3'];
export const MAX_MONTAGES=3;
export const SLOT_LABELS={1:'10:00–12:00',2:'14:00–16:00',3:'3-й слот / резерв'};
export const isCancelled=j=>j.status==='Отменён';
export const jobsFor=(jobs,date)=>jobs.filter(j=>j.date===date&&!isCancelled(j)).sort((a,b)=>Number(a.slot)-Number(b.slot));
export const montageCount=(jobs,date)=>jobsFor(jobs,date).filter(j=>j.type==='Монтаж').length;
export function canPlace(jobs,job,{ignoreId=null}={}){
  const same=jobsFor(jobs,job.date).filter(j=>j.id!==ignoreId);
  if(same.some(j=>String(j.slot)===String(job.slot))) return {ok:false,reason:'Слот уже занят'};
  if(job.type==='Монтаж' && montageCount(jobs.filter(j=>j.id!==ignoreId),job.date)>=MAX_MONTAGES) return {ok:false,reason:'В этот день уже 3 монтажа'};
  return {ok:true};
}
export const totals=(jobs,start,end)=>jobs.filter(j=>!isCancelled(j)&&j.date>=start&&j.date<=end).reduce((a,j)=>a+Number(j.price||0),0);
export const montageTotals=(jobs,start,end)=>jobs.filter(j=>!isCancelled(j)&&j.type==='Монтаж'&&j.date>=start&&j.date<=end).length;
export const normalizeJob=j=>({...j,slot:String(j.slot||'1'),type:j.type||'Монтаж',price:Number(j.price||0),status:j.status||'Запланирован'});
