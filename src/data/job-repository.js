import { normalizeJob } from '../domain/normalize.js';

export const createJobRepository=({firestore,doc,runTransaction,serverTimestamp,collectionPath=['appData','shared'],actorId='client'})=>{
 const ref=doc(firestore,...collectionPath);

 const readJobs=(snap)=>{
  if(!snap.exists()) throw new Error('Общая база не найдена');
  const payload=snap.data()||{};
  const current=payload.data||{};
  return {
   current,
   jobs:Array.isArray(current.jobs)?current.jobs:[],
  };
 };

 const write=(tx,current,jobs)=>{
  const next={...current,jobs,version:5};
  tx.set(ref,{data:next,version:5,updatedAt:serverTimestamp(),updatedBy:actorId},{merge:true});
  return next;
 };

 const createJob=async(job)=>{
  return runTransaction(firestore,async tx=>{
   const {current,jobs}=readJobs(await tx.get(ref));
   const value=normalizeJob(job);
   if(!value.id) throw new Error('У заявки должен быть id');
   if(jobs.some(item=>item?.id===value.id)) throw new Error('Заявка с таким id уже существует');
   write(tx,current,[...jobs,value]);
   return value;
  });
 };

 const updateJob=async(id,transform)=>{
  if(!id) throw new Error('Не указан id заявки');
  return runTransaction(firestore,async tx=>{
   const {current,jobs}=readJobs(await tx.get(ref));
   const index=jobs.findIndex(j=>j?.id===id);
   if(index<0) throw new Error('Заявка не найдена');

   const before=normalizeJob(jobs[index]);
   const transformed=await transform(before);
   const after=normalizeJob({...before,...transformed,id:before.id});
   const nextJobs=jobs.map((j,i)=>i===index?after:j);
   write(tx,current,nextJobs);
   return after;
  });
 };

 return {createJob,updateJob};
};
