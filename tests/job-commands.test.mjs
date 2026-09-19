import test from 'node:test';
import assert from 'node:assert/strict';
import { createJob,updateJob,completeJob,cancelJob,rescheduleJob,markPaid,markUnpaid } from '../src/domain/job-commands.js';

test('job lifecycle commands preserve identity and history fields',()=>{
 const job=createJob({job:{client:'А',price:10000,date:'2026-09-19'}});
 assert.ok(job.id); assert.equal(job.status,'Запланирован');
 const edited=updateJob(job,{client:'Б',price:12000}); assert.equal(edited.id,job.id); assert.equal(edited.client,'Б');
 assert.equal(completeJob(job).status,'Выполнен');
 assert.equal(completeJob(job).completedDate,'2026-09-19');
 const cancelled=cancelJob(job,'Клиент отменил'); assert.equal(cancelled.status,'Отменён'); assert.ok(cancelled.cancelledAt); assert.equal(cancelled.cancelReason,'Клиент отменил');
 const moved=rescheduleJob(job,'2026-09-20'); assert.equal(moved.date,'2026-09-20'); assert.equal(moved.status,'Перенос');
 assert.equal(markPaid({...job,paid:false}).paid,true); assert.equal(markUnpaid(job).paid,false);
});
