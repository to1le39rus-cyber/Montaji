import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoreMemberCommand,storeAccessSummary} from '../src/domain/store-access.js';

test('store member requires a valid email',()=>{
 assert.throws(()=>createStoreMemberCommand({name:'Анна',email:'anna'}),/e-mail/);
});
test('store access summary separates active and invited members',()=>{
 const summary=storeAccessSummary({members:[
  {id:'1',name:'Анна',email:'a@example.ru',role:'admin',status:'active'},
  {id:'2',name:'Иван',email:'i@example.ru',role:'manager',status:'invited'}
 ]});
 assert.equal(summary.members.length,2);
 assert.equal(summary.active,1);
 assert.equal(summary.pending,1);
});
