import {
 createJob as createJobCommand,
 updateJob as updateJobCommand,
 completeJob as completeJobCommand,
 cancelJob as cancelJobCommand,
 rescheduleJob as rescheduleJobCommand,
 markPaid as markPaidCommand,
 markUnpaid as markUnpaidCommand,
} from './job-commands.js';

export const createJobService=({repository})=>{
 if(!repository?.createJob||!repository?.updateJob) throw new Error('Job repository is required');

 const updateWith=(id,command)=>repository.updateJob(id,job=>command(job));

 return {
  create: input=>repository.createJob(createJobCommand({job:input})),
  update: (id,patch)=>updateWith(id,job=>updateJobCommand(job,patch)),
  complete: (id,completedDate)=>updateWith(id,job=>completeJobCommand(job,completedDate)),
  cancel: (id,reason='')=>updateWith(id,job=>cancelJobCommand(job,reason)),
  reschedule: (id,newDate)=>updateWith(id,job=>rescheduleJobCommand(job,newDate)),
  markPaid: id=>updateWith(id,markPaidCommand),
  markUnpaid: id=>updateWith(id,markUnpaidCommand),
 };
};
