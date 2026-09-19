import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMoneyModel } from '../src/screens/money.js';

test('Money keeps income, debt, expenses and net separate',()=>{
 const state={
  jobs:[
   {id:'1',date:'2026-09-19',type:'Монтаж',price:10000,status:'Выполнен',paid:false,completedDate:'2026-09-19'},
   {id:'2',date:'2026-09-19',type:'Монтаж',price:5000,status:'Запланирован',paid:false},
   {id:'3',date:'2026-09-19',type:'Монтаж',price:7000,status:'Отменён',paid:false},
   {id:'4',date:'2026-09-19',type:'Доп. доход',price:3000,status:'Выполнен',paid:true,completedDate:'2026-09-19'}
  ],
  expenses:[
   {id:'e1',date:'2026-09-19',amount:2000,cancelled:false},
   {id:'e2',date:'2026-09-19',amount:500,cancelled:true}
  ]
 };
 const m=buildMoneyModel({state,start:'2026-09-19',end:'2026-09-19'});
 assert.equal(m.income,13000);
 assert.equal(m.debt,10000);
 assert.equal(m.expenses,2000);
 assert.equal(m.net,11000);
});


test('Money builds lifetime totals and store drilldown from eligible jobs only',()=>{
 const state={
  jobs:[
   {id:'m1',date:'2026-09-18',type:'Монтаж',source:'Store A',price:1000,status:'Выполнен',paid:true,completedDate:'2026-09-18'},
   {id:'m2',date:'2026-09-19',type:'Монтаж',source:'Store A',price:2000,status:'Выполнен',paid:true,completedDate:'2026-09-19'},
   {id:'m3',date:'2026-09-19',type:'Монтаж',source:'Store B',price:4000,status:'Отменён',paid:false},
   {id:'a1',date:'2026-09-19',type:'Доп. доход',price:500,status:'Выполнен',paid:true,completedDate:'2026-09-19'}
  ],
  expenses:[{id:'e1',date:'2026-09-18',amount:300,cancelled:false}]
 };
 const m=buildMoneyModel({state,start:'2026-09-19',end:'2026-09-19'});
 assert.equal(m.income,2500);
 assert.equal(m.allTimeTotals.income,3500);
 assert.equal(m.allTimeTotals.net,3200);
 assert.equal(m.montageByStore.length,1);
 assert.equal(m.montageByStore[0].name,'Store A');
 assert.equal(m.montageByStore[0].income,2000);
 assert.deepEqual(m.montageByStore[0].jobs.map(j=>j.id),['m2']);
 assert.deepEqual(m.additionalIncome.map(j=>j.id),['a1']);
});
