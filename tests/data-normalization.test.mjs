import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJob, normalizeExpense, normalizeShared, normalizeNotes } from '../src/domain/normalize.js';
import { initialDataState, loaded, failed, DATA_STATES } from '../src/core/data-state.js';

test('normalize preserves existing job fields while applying safe defaults',()=>{
  const j=normalizeJob({id:'j1',date:'2026-09-19',type:'Монтаж',price:'12 500',status:'Выполнен',paid:false,address:'A'});
  assert.equal(j.id,'j1'); assert.equal(j.address,'A'); assert.equal(j.price,12500); assert.equal(j.paid,false);
});
test('normalize keeps cancelled expenses out of active semantics',()=>{
  const e=normalizeExpense({id:'e1',amount:'100,50',cancelled:true});
  assert.equal(e.amount,100.5); assert.equal(e.cancelled,true);
});
test('shared normalization never returns an undefined collection shape',()=>{
  assert.deepEqual(normalizeShared(null),{jobs:[],expenses:[],version:5});
});
test('notes normalization is isolated',()=>{
  assert.deepEqual(normalizeNotes(null),[]);
  assert.deepEqual(normalizeNotes({notes:[{id:'n1'}]}),[{id:'n1'}]);
});
test('data failure retains last loaded data',()=>{
  const initial=initialDataState();
  const ready=loaded(initial,{jobs:[{id:'j1'}]});
  const failedState=failed(ready,DATA_STATES.error,new Error('offline'));
  assert.deepEqual(failedState.data,ready.data);
  assert.equal(failedState.status,DATA_STATES.error);
});
