const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const uid=()=>crypto.randomUUID?.()||('dev-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));

export const createDevJobRepository=({state})=>({
 async createJob(job){
  const created=clone({...job,id:job.id||uid()});
  state.jobs=[...(state.jobs||[]),created];
  return clone(created);
 },
 async updateJob(id,transform){
  const index=(state.jobs||[]).findIndex(job=>job.id===id);
  if(index<0)throw new Error('Заявка не найдена');
  const current=clone(state.jobs[index]);
  const updated=typeof transform==='function'?transform(current):{...current,...transform,id};
  state.jobs=state.jobs.map((job,i)=>i===index?clone(updated):job);
  return clone(updated);
 }
});

export const createDevStoreRepository=({state})=>({
 async create(store){
  const created=clone(store);
  state.stores=[...(state.stores||[]),created];
  return clone(created);
 },
 async update(id,transform){
  const index=(state.stores||[]).findIndex(store=>store.id===id);
  if(index<0)throw new Error('Магазин не найден');
  const current=clone(state.stores[index]);
  const updated=typeof transform==='function'?transform(current):{...current,...transform,id};
  state.stores=state.stores.map((store,i)=>i===index?clone(updated):store);
  return clone(updated);
 },
 async remove(id){
  state.stores=(state.stores||[]).filter(store=>store.id!==id);
  return true;
 }
});
