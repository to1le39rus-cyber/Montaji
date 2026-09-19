import { normalizeJob } from '../domain/normalize.js';

export const createJobRepository=({firestore,doc,runTransaction,serverTimestamp,collectionPath=['appData','shared']})=>{
 const ref=doc(firestore,...collectionPath);
 const updateJob=async(id,transform)=>{
  return runTransaction(firestore,async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists()) throw new Error('Общая база не найдена');
   const payload=snap.data()||{};
   const current=payload.data||{};
   const jobs=Array.isArray(current.jobs)?current.jobs:[];
   const index=jobs.findIndex(j=>j?.id===id);
   if(index<0) throw new Error('Заявка не найдена');
   const before=jobs[index];
   const transformed=await transform(normalizeJob(before));
   const after={...before,...transformed,id:before.id};
   const next={...current,jobs:jobs.map((j,i)=>i===index?after:j),version:5};
   tx.set(ref,{data:next,version:5,updatedAt:serverTimestamp(),updatedBy:'client'},{merge:true});
   return after;
  });
 };
 return {updateJob};
};
