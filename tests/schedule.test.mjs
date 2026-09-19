import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduleModel } from '../src/screens/schedule.js';

test('Schedule supports more than three montage jobs on one date',()=>{
 const jobs=Array.from({length:5},(_,i)=>({
  id:String(i+1),date:'2026-09-19',type:'Монтаж',client:'Клиент '+(i+1),
  status:i<2?'Выполнен':'Запланирован',slot:String((i%3)+1)
 }));
 const model=buildScheduleModel({state:{jobs},date:'2026-09-19'});
 assert.equal(model.jobs.length,5);
 assert.equal(model.montageCount,5);
 assert.equal(model.completedCount,2);
});
test('cancelled jobs are absent from Schedule',()=>{
 const model=buildScheduleModel({state:{jobs:[
  {id:'1',date:'2026-09-19',type:'Монтаж',status:'Отменён',slot:'1'},
  {id:'2',date:'2026-09-19',type:'Монтаж',status:'Запланирован',slot:'2'}
 ]},date:'2026-09-19'});
 assert.deepEqual(model.jobs.map(j=>j.id),['2']);
});
