import test from 'node:test';
import assert from 'node:assert/strict';
import { createJobRepository } from '../src/data/job-repository.js';

test('transactional update preserves untouched job fields',async()=>{
 let stored={data:{jobs:[{id:'j1',client:'Клиент',price:12000,address:'Гагарина 7',phone:'+7',source:'Магазин',comment:'важно',status:'Запланирован',paid:false}]}};
 const repository=createJobRepository({
  firestore:{},
  doc:()=>({}),
  serverTimestamp:()=> 'SERVER_TIME',
  runTransaction:async(_db,fn)=>{
   const tx={
    get:async()=>({exists:()=>true,data:()=>stored}),
    set:(_ref,value)=>{stored=value;}
   };
   return fn(tx);
  }
 });
 const updated=await repository.updateJob('j1',job=>({...job,status:'Выполнен',completedDate:'2026-09-19',id:'WRONG'}));
 assert.equal(updated.id,'j1');
 assert.equal(updated.status,'Выполнен');
 assert.equal(updated.completedDate,'2026-09-19');
 assert.equal(updated.address,'Гагарина 7');
 assert.equal(updated.phone,'+7');
 assert.equal(updated.source,'Магазин');
 assert.equal(updated.comment,'важно');
 assert.equal(updated.paid,false);
 assert.equal(stored.data.jobs[0].price,12000);
 assert.equal(stored.data.jobs[0].id,'j1');
});
