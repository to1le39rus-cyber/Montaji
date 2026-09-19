import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoreRepository} from '../src/data/store-repository.js';
import {createStoreService} from '../src/domain/store-service.js';

const harness=initial=>{
 let stored={data:{...initial}};
 const repository=createStoreRepository({
  firestore:{},doc:()=>({}),serverTimestamp:()=> 'SERVER_TIME',actorId:'operator-1',
  runTransaction:async(_db,fn)=>{
   const tx={get:async()=>({exists:()=>true,data:()=>stored}),set:(_ref,value)=>{stored=value}};
   return fn(tx);
  }
 });
 return {repository,get:()=>stored};
};

test('store update applies patch to transaction-fresh entity',async()=>{
 const {repository,get}=harness({jobs:[{id:'j1'}],stores:[{id:'s1',name:'Магазин',address:'Старый',phone:'REMOTE'}]});
 const service=createStoreService({repository});
 const updated=await service.update('s1',{address:'Новый'});
 assert.equal(updated.address,'Новый');
 assert.equal(updated.phone,'REMOTE');
 assert.equal(get().data.jobs[0].id,'j1');
});

test('store update rejects entity removed by another client',async()=>{
 const {repository}=harness({stores:[]});
 const service=createStoreService({repository});
 await assert.rejects(()=>service.update('missing',{name:'Новый'}),/Магазин не найден/);
});

test('store create and remove preserve unrelated shared data',async()=>{
 const {repository,get}=harness({jobs:[{id:'j1'}],expenses:[{id:'e1'}],stores:[]});
 const service=createStoreService({repository});
 const created=await service.create({name:'Тест'});
 assert.ok(created.id);
 assert.equal(get().data.jobs.length,1);
 assert.equal(get().data.expenses.length,1);
 await service.remove(created.id);
 assert.equal(get().data.stores.length,0);
 assert.equal(get().data.jobs[0].id,'j1');
});
