import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTodayModel } from '../src/screens/today.js';

const jobs=[
 {id:'1',date:'2026-09-19',type:'Монтаж',client:'А',price:10000,status:'Выполнен',paid:true},
 {id:'2',date:'2026-09-19',type:'Монтаж',client:'Б',price:12000,status:'Запланирован',paid:true},
 {id:'3',date:'2026-09-19',type:'Монтаж',client:'В',price:9000,status:'Отменён',paid:true},
 {id:'4',date:'2026-09-19',type:'Доп. доход',client:'Г',price:5000,status:'Выполнен',paid:true}
];

test('Today uses active jobs and separates additional income from montage workload',()=>{
 const m=buildTodayModel({state:{jobs},date:'2026-09-19'});
 assert.equal(m.jobs.length,3);
 assert.equal(m.montages.length,2);
 assert.equal(m.completed.length,2);
 assert.equal(m.income,15000);
 assert.equal(m.jobs.some(j=>j.id==='3'),false);
});
