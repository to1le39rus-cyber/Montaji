import test from 'node:test';
import assert from 'node:assert/strict';
import { isIncomeEligible, isDebt, effectiveIncome, montageJobsForDate, JOB_STATUSES } from '../src/domain/jobs.js';
import { financeTotals } from '../src/domain/finances.js';
import { canConvertMeasurement, buildConvertedMontage } from '../src/domain/measurements.js';
import { nextPresetSlot } from '../src/domain/scheduling.js';

test('cancelled and incomplete jobs are not income',()=>{
  assert.equal(isIncomeEligible({status:'Отменён',price:100}),false);
  assert.equal(isIncomeEligible({status:'Запланирован',price:100}),false);
  assert.equal(effectiveIncome({status:'Выполнен',type:'Монтаж',price:100}),100);
});
test('completed unpaid job is income and debt',()=>{
  const j={status:'Выполнен',type:'Монтаж',price:100,paid:false};
  assert.equal(effectiveIncome(j),100); assert.equal(isDebt(j),true);
});
test('additional income is not montage workload',()=>{
  const jobs=[{date:'2026-09-19',type:'Монтаж',status:'Запланирован',slot:'1'},{date:'2026-09-19',type:'Доп. доход',status:'Запланирован',slot:'2'}];
  assert.equal(montageJobsForDate(jobs,'2026-09-19').length,1);
});
test('multiple montages per day are supported',()=>{
  const jobs=Array.from({length:5},(_,i)=>({date:'2026-09-19',type:'Монтаж',status:'Запланирован',slot:String((i%3)+1)}));
  assert.equal(montageJobsForDate(jobs,'2026-09-19').length,5);
});
test('next preset is convenience only',()=>{
  const jobs=Array.from({length:4},(_,i)=>({date:'2026-09-19',type:'Монтаж',status:'Запланирован',slot:String(i+1)}));
  assert.equal(nextPresetSlot(jobs,'2026-09-19'),'3');
});
test('measurement conversion preserves relation and financial fields',()=>{
  const m={id:'m1',type:'Замер',measurePrice:500,measurePaid:true,measureCredit:500,source:'Store'};
  assert.equal(canConvertMeasurement(m),true);
  const j=buildConvertedMontage(m,{date:'2026-09-20',status:'Запланирован',price:10000},'j1');
  assert.equal(j.type,'Монтаж'); assert.equal(j.convertedFromMeasureId,'m1'); assert.equal(j.measureCredit,500); assert.equal(j.measurePaid,true); assert.equal(j.source,'Store');
});
test('finance totals separate income, debt and expenses',()=>{
  const jobs=[{status:'Выполнен',type:'Монтаж',price:100,paid:false},{status:'Отменён',type:'Монтаж',price:900,paid:false}];
  const expenses=[{amount:30,cancelled:false},{amount:20,cancelled:true}];
  assert.deepEqual(financeTotals(jobs,expenses),{income:100,expenses:30,net:70,debt:100});
});

test('job lifecycle has only the agreed four statuses',()=>{
  assert.deepEqual(JOB_STATUSES,['Запланирован','Выполнен','Отменён','Перенос']);
});
