export const clientKey = job => {
  const phone=String(job?.phone||'').replace(/\D/g,'');
  return phone || String(job?.client||'').trim().toLocaleLowerCase('ru-RU');
};
export const projectClients = jobs => {
  const map=new Map();
  for(const job of Array.isArray(jobs)?jobs:[]){
    if(job?.status==='Отменён') continue;
    const key=clientKey(job); if(!key) continue;
    const prev=map.get(key);
    if(!prev || String(job.date||'') > String(prev.lastDate||'')) map.set(key,{key,client:job.client||prev.client,phone:job.phone||prev.phone,lastDate:job.date||prev.lastDate,jobs:[...(prev?.jobs||[]),job]});
  }
  return [...map.values()];
};
