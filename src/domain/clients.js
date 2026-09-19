export const clientKey = job => {
  const phone=String(job?.phone||'').replace(/\D/g,'');
  return phone || String(job?.client||'').trim().toLocaleLowerCase('ru-RU');
};

export const projectClients = jobs => {
  const map=new Map();
  for(const job of Array.isArray(jobs)?jobs:[]){
    if(job?.status==='Отменен') continue;
    const key=clientKey(job); if(!key) continue;
    const prev=map.get(key);
    const history=[...(prev?.jobs||[]),job].sort((a,b)=>String(a?.date||'').localeCompare(String(b?.date||'')));
    const latest=history[history.length-1]||job;
    map.set(key,{
      key,
      client:latest.client||prev?.client||job.client||'',
      phone:latest.phone||prev?.phone||job.phone||'',
      lastDate:latest.date||prev?.lastDate||'',
      jobs:history
    });
  }
  return [...map.values()].sort((a,b)=>String(b.lastDate||'').localeCompare(String(a.lastDate||'')));
};
