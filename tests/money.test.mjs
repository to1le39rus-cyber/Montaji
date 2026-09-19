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
