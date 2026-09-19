import test from 'node:test';
import assert from 'node:assert/strict';
import { createJobRepository } from '../src/data/job-repository.js';

const harness=(initial={jobs:[]})=>{
 let stored={data:{...initial}};
 const repository=createJobRepository({
  firestore:{},
  doc:()=>({}),
  serverTimestamp:()=> 'SERVER_TIME',
  actorId:'operator-1',
  runTransaction:async(_db,fn)=>{
   const tx={
    get:async()=>({exists:()=>true,data:()=>stored}),
    set:(_ref,value)=>{stored=value;}
   };
   return fn(tx);
  }
 };
 return {repository,get:()=>stored};
};

test('transactional update preserves untouched job fields',async()=>{
 const {repository,get}=harness({jobs:[{id:'j1',client:'Клиент',price:12000,address:'Гагарина 7',phone:'+7',source:'Магазин',comment:'важно',status:'Запланирован',paid:false}]});
 const updated=await repository.updateJob('j1',job=>({...job,status:'Выполнен',completedDate:'2026-09-19',id:'WRONG'}));
 assert.equal(updated.id,'j1');
 assert.equal(updated.status,'Выполнен');
 assert.equal(updated.completedDate,'2026-09-19');
 assert.equal(updated.address,'Гагарина 7');
 assert.equal(updated.phone,'+7');
 assert.equal(updated.source,'Магазин');
 assert.equal(updated.comment,'важно');
 assert.equal(updated.paid,false);
 assert.equal(get().data.jobs[0].price,12000);
 assert.equal(get().data.jobs[0].id,'j1');
 assert.equal(get().updatedBy,'operator-1');
});

test('createJob appends without changing existing history',async()=>{
 const {repository,get}=harness({jobs:[{id:'old',client:'Старый',status:'Выполнен',price:5000}]});
 const created=await repository.createJob({id:'new',client:'Новый',date:'2026-09-20',type:'Монтаж',status:'Запланирован',price:7000});
 assert.equal(created.id,'new');
 assert.equal(get().data.jobs.length,2);
 assert.equal(get().data.jobs[0].id,'old');
 assert.equal(get().data.jobs[1].id,'new');
});

test('createJob rejects duplicate id inside the transaction',async()=>{
 const {repository}=harness({jobs:[{id:'j1',client:'Клиент'}]});
 await assert.rejects(()=>repository.createJob({id:'j1',client:'Другой'}),/таким id/);
});

test('updateJob rejects missing id and unknown job',async()=>{
 const {repository}=harness({jobs:[{id:'j1'}]});
 await assert.rejects(()=>repository.updateJob('',()=>({})),/id заявки/);
 await assert.rejects(()=>repository.updateJob('missing',()=>({})),/Заявка не найдена/);
});
