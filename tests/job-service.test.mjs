import test from 'node:test';
import assert from 'node:assert/strict';
import { createJobService } from '../src/domain/job-service.js';

test('job service routes lifecycle commands through repository',async()=>{
 const calls=[];
 const repository={
  createJob:async job=>{calls.push(['create',job]);return job;},
  updateJob:async(id,transform)=>{
   const before={id,date:'2026-09-19',status:'Запланирован',paid:false};
   const after=await transform(before);
   calls.push(['update',id,after]);
   return after;
  }
 };
 const service=createJobService({repository});
 const created=await service.create({id:'j1',date:'2026-09-19',client:'Клиент',price:10000});
 assert.equal(created.id,'j1');
 assert.equal(calls[0][0],'create');

 const completed=await service.complete('j1','2026-09-19');
 assert.equal(completed.status,'Выполнен');
 assert.equal(completed.completedDate,'2026-09-19');

 const paid=await service.markPaid('j1');
 assert.equal(paid.paid,true);

 const moved=await service.reschedule('j1','2026-09-20');
 assert.equal(moved.status,'Перенос');
 assert.equal(moved.date,'2026-09-20');

 const cancelled=await service.cancel('j1','Клиент отменил');
 assert.equal(cancelled.status,'Отменён');

 assert.deepEqual(calls.map(x=>x[0]),['create','update','update','update','update']);
});

test('job service keeps payment separate from completion',async()=>{
 const repository={
  createJob:async job=>job,
  updateJob:async(id,transform)=>transform({id,status:'Запланирован',paid:false,date:'2026-09-19'})
 };
 const service=createJobService({repository});
 const paid=await service.markPaid('j1');
 assert.equal(paid.paid,true);
 assert.equal(paid.status,'Запланирован');
});
