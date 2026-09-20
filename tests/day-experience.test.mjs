import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTodayModel} from '../src/screens/today.js';
import {buildScheduleModel} from '../src/screens/schedule.js';
import {buildMoneyModel} from '../src/screens/money.js';
import {sortBySchedule} from '../src/domain/scheduling.js';
import {createNoteService} from '../src/domain/note-service.js';
import {createExpenseService} from '../src/domain/expense-service.js';
import {createDevNotesRepository,createDevExpenseRepository} from '../src/data/dev-repository.js';

test('Today financial figures use completion date, exactly as Money does',()=>{
 const state={jobs:[
  {id:'a',date:'2026-09-18',completedDate:'2026-09-20',status:'Выполнен',price:12000,paid:false},
  {id:'b',date:'2026-09-20',status:'Запланировано',price:9000,paid:true},
  {id:'c',date:'2026-09-20',status:'Отменен',price:8000,paid:false}
 ],expenses:[{id:'e',date:'2026-09-20',amount:1300},{date:'2026-09-20',amount:500,cancelled:true}]};
 const today=buildTodayModel({state,date:'2026-09-20'}),money=buildMoneyModel({state,start:'2026-09-20',end:'2026-09-20'});
 assert.equal(today.net,10700);assert.equal(today.net,money.net);assert.equal(today.debt,money.debt);assert.equal(today.jobs.length,1);
});
test('calendar is Monday-first, covers leap February, and has no capacity ceiling',()=>{
 const jobs=Array.from({length:12},(_,i)=>({id:String(i),date:'2024-02-29',slot:String(i+1),type:'Монтаж',status:'Запланировано'}));
 const month=buildScheduleModel({state:{jobs},date:'2024-02-29'});
 assert.equal(month.days[0].date,'2024-01-29');assert.equal(month.days.at(-1).date,'2024-03-03');
 assert.equal(month.days.find(d=>d.date==='2024-02-29').count,12);
 const week=buildScheduleModel({state:{jobs},date:'2024-02-29',view:'week'});
 assert.equal(week.days.length,7);assert.equal(week.days[0].date,'2024-02-26');assert.equal(week.jobs.length,12);
 assert.deepEqual(sortBySchedule([{slot:'10'},{slot:'2'},{slot:'1'}]).map(j=>j.slot),['1','2','10']);
});
test('urgent tasks disappear from Today on completion and return on undo',async()=>{
 const data={notes:[{id:'n',title:'Позвонить',urgent:true,done:false,archived:false}]};
 const service=createNoteService({repository:createDevNotesRepository({state:data})});
 await service.update('n',{done:true});
 assert.equal(buildTodayModel({state:{},date:'2026-09-20',notes:data.notes}).urgent.length,0);
 await service.update('n',{done:false});
 assert.equal(buildTodayModel({state:{},date:'2026-09-20',notes:data.notes}).urgent.length,1);
 await service.update('n',{archived:true});
 assert.equal(buildTodayModel({state:{},date:'2026-09-20',notes:data.notes}).urgent.length,0);
});
test('note editing preserves concurrently updated fields and identifiers',async()=>{
 const data={notes:[{id:'n',title:'Remote title',text:'Old text',done:true,urgent:true}]};
 const service=createNoteService({repository:createDevNotesRepository({state:data})});
 await service.update('n',{text:'Edited text',id:'wrong'});
 assert.equal(data.notes[0].id,'n');assert.equal(data.notes[0].title,'Remote title');assert.equal(data.notes[0].done,true);
 assert.equal(data.notes[0].text,'Edited text');
 await assert.rejects(()=>service.update('missing',{done:true}),/недоступна/);
});
test('expense creation preserves jobs and only reduces the day net once',async()=>{
 const state={jobs:[{id:'j',date:'2026-09-20',status:'Выполнен',type:'Монтаж',price:10000,paid:true}],expenses:[],stores:[]};
 const service=createExpenseService({repository:createDevExpenseRepository({state}),makeId:()=> 'expense'});
 await service.create({date:'2026-09-20',amount:'1250',category:'Топливо'});
 assert.equal(state.jobs[0].id,'j');assert.equal(state.expenses.length,1);
 assert.equal(buildTodayModel({state,date:'2026-09-20'}).net,8750);
 await assert.rejects(()=>service.create({date:'2026-09-20',amount:0}),/сумму/);
});
