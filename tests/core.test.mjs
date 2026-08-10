import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlace,montageCount,totals,montageTotals} from '../core.js';

const jobs=[
 {id:'a',date:'2026-08-12',slot:'1',type:'Монтаж',price:6500,status:'Подтверждён'},
 {id:'b',date:'2026-08-12',slot:'2',type:'Монтаж',price:8000,status:'Подтверждён'},
 {id:'c',date:'2026-08-12',slot:'3',type:'Замер',price:0,status:'Запланирован'}
];

test('counts only real montages',()=>assert.equal(montageCount(jobs,'2026-08-12'),2));
test('allows a third montage in reserve slot',()=>assert.deepEqual(canPlace(jobs,{id:'d',date:'2026-08-12',slot:'3',type:'Монтаж'}),{ok:true}));
test('blocks a fourth montage',()=>assert.equal(canPlace([...jobs,{id:'d',date:'2026-08-12',slot:'3',type:'Монтаж'}],{id:'e',date:'2026-08-12',slot:'3',type:'Монтаж'}).ok,false));
test('blocks occupied slot',()=>assert.equal(canPlace(jobs,{id:'x',date:'2026-08-12',slot:'1',type:'Замер'}).reason,'Слот уже занят'));
test('ignoring edited job permits same slot',()=>assert.equal(canPlace(jobs,{id:'a',date:'2026-08-12',slot:'1',type:'Монтаж'},{ignoreId:'a'}).ok,true));
test('money totals exclude cancelled jobs',()=>assert.equal(totals([...jobs,{id:'z',date:'2026-08-12',slot:'4',type:'Монтаж',price:10000,status:'Отменён'}],'2026-08-01','2026-08-31'),14500));
test('montage totals exclude cancelled jobs',()=>assert.equal(montageTotals(jobs,'2026-08-01','2026-08-31'),2));
