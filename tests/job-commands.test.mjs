import test from 'node:test';
import assert from 'node:assert/strict';
import { createJob,completeJob,cancelJob,rescheduleJob,markPaid } from '../src/domain/job-commands.js';

test('job commands change state without persistence concerns',()=>{
 const job=createJob({job:{client:'А',price:10000,date:'2026-09-19'}});
 assert.ok(job.id); assert.equal(job.status,'Запланирован');
 assert.equal(completeJob(job).status,'Выполнен');
 assert.equal(completeJob(job).completedDate,'2026-09-19');
 assert.equal(cancelJob(job).status,'Отменён');
 assert.equal(rescheduleJob(job,'2026-09-20').date,'2026-09-20');
 assert.equal(rescheduleJob(job,'2026-09-20').status,'Перенос');
 assert.equal(markPaid({...job,paid:false}).paid,true);
});
