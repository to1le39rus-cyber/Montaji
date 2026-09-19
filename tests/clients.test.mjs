import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClientsModel } from '../src/screens/clients.js';

test('Clients groups jobs by normalized phone',()=>{
 const model=buildClientsModel({state:{jobs:[
  {id:'1',client:'Иван',phone:'+7 (900) 111-22-33',date:'2026-09-18',price:5000,status:'Выполнен'},
  {id:'2',client:'Иван П.',phone:'79001112233',date:'2026-09-19',price:7000,status:'Запланирован'},
  {id:'3',client:'Другой',phone:'+7 900 444 55 66',date:'2026-09-19',price:3000,status:'Выполнен'}
 ]}});
 assert.equal(model.count,2);
 const ivan=model.clients.find(c=>c.phone);
 assert.equal(ivan.jobs.length,2);
 assert.equal(ivan.client,'Иван П.');
});
test('Cancelled jobs do not create client records',()=>{
 const model=buildClientsModel({state:{jobs:[
  {id:'1',client:'Удалённый',phone:'+79990000000',date:'2026-09-19',status:'Отменён'}
 ]}});
 assert.equal(model.count,0);
});

test('Client history keeps older jobs when newer job was processed first',()=>{
 const model=buildClientsModel({state:{jobs:[
  {id:'new',client:'Иван П.',phone:'79001112233',date:'2026-09-19',price:7000,status:'Запланирован'},
  {id:'old',client:'Иван',phone:'+7 (900) 111-22-33',date:'2026-09-18',price:5000,status:'Выполнен'}
 ]}});
 assert.equal(model.count,1);
 assert.equal(model.clients[0].jobs.length,2);
});
