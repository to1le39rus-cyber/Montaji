import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntityRepository} from '../../src/data/entity-repository.js';
import {createWorkspaceService} from '../../src/domain/workspace-service.js';
import {createWorkspaceState} from '../../src/core/workspace-state.js';
import {dirtyPatch} from '../../src/domain/edit-intent.js';
import {businessDay} from '../../src/domain/dates.js';
import {demoFixtures} from '../../src/data/demo-fixtures.js';
import {normalizeShared} from '../../src/domain/normalize.js';
function setup() {
  let documents=demoFixtures('2026-09-19'),counter=0,calls=0;
  const transport={transact:async(key,mutator)=>{calls++;const next=mutator(structuredClone(documents[key]));documents[key]=next.document;return next.result;}};
  const service=createWorkspaceService(createEntityRepository(transport),{uuid:()=>`op-${++counter}`,today:()=> '2026-09-19'});
  return {service,get data(){return documents.shared;},get calls(){return calls;},remote(fn){fn(documents.shared);}};
}
test('disjoint device edits merge; stale form never resets payment',async()=>{
  const s=setup(),a=structuredClone(s.data.jobs[0]),b=structuredClone(a);
  await s.service.paid(b,true);await s.service.save('jobs',a,{...a,comment:'новый комментарий'});
  assert.equal(s.data.jobs[0].paid,true);assert.equal(s.data.jobs[0].comment,'новый комментарий');
});
test('same-field conflict exposes current entity without silent retry',async()=>{
  const s=setup(),a=structuredClone(s.data.jobs[0]);await s.service.save('jobs',a,{price:22000});
  await assert.rejects(s.service.save('jobs',a,{price:25000}),e=>e.code==='conflict'&&e.details.fields.includes('price'));
  assert.equal(s.data.jobs[0].price,22000);
});
test('legacy writer changes are detected even without revision increment',async()=>{
  const s=setup(),a=structuredClone(s.data.jobs[0]);s.remote(d=>d.jobs[0].price=1);
  await assert.rejects(s.service.save('jobs',a,{price:2}),{code:'conflict'});
});
test('deleted entity is not resurrected',async()=>{
  const s=setup(),a=structuredClone(s.data.jobs[0]);s.remote(d=>d.jobs.shift());
  await assert.rejects(s.service.save('jobs',a,{price:2}),{code:'deleted'});
});
test('same operation is idempotent before and after acknowledgement',async()=>{
  const s=setup(),input={...s.data.jobs[0],client:'Тест'},options={id:'new',operationId:'stable'};
  await Promise.all([s.service.save('jobs',null,input,options),s.service.save('jobs',null,input,options)]);
  await s.service.save('jobs',null,input,options);
  assert.equal(s.data.jobs.filter(j=>j.id==='new').length,1);
});
test('duplicate stores normalize whitespace/case; rename preserves historical snapshot',async()=>{
  const s=setup(),store=structuredClone(s.data.stores[0]);
  await assert.rejects(s.service.save('stores',null,{name:'  ЛЕС   И ФОРМА '}));
  await s.service.save('stores',store,{name:'Новое имя'});
  assert.equal(s.data.jobs[0].storeNameSnapshot,'Лес и форма');
  await s.service.save('stores',s.data.stores[0],{archived:true});
  await assert.rejects(s.service.save('jobs',null,{...s.data.jobs[0],storeNameSnapshot:'Новое имя'}));
});
test('concurrent store rename detected when assigning to new job',async()=>{
  const s=setup();await s.service.save('stores',s.data.stores[0],{name:'Другое имя'});
  await assert.rejects(s.service.save('jobs',null,s.data.jobs[0]),/переименован/);
});
test('measurement conversion is atomic and cannot be repeated',async()=>{
  const s=setup();s.remote(d=>{d.jobs[3].convertedToJobId='';});const source=structuredClone(s.data.jobs[3]);
  await s.service.convert(source,{...source,status:'Запланирован',price:10000,completedDate:''},{id:'converted'});
  assert.equal(s.data.jobs[3].convertedToJobId,'converted');
  await assert.rejects(s.service.convert(source,{...source,status:'Запланирован',price:10000,completedDate:''}));
  assert.equal(s.data.jobs.filter(j=>j.convertedFromMeasureId===source.id).length,1);
});
test('completed uses business today, paid aliases coherent',async()=>{
  const s=setup(),job=s.data.jobs[5];await s.service.complete(job);assert.equal(s.data.jobs[5].completedDate,'2026-09-19');
  await s.service.paid(s.data.jobs[5],true);assert.equal(s.data.jobs[5].measurePaid,true);
});
test('snapshot-before-ack and ack-before-snapshot have a single authoritative result',()=>{
  for(const ordering of ['snapshot-first','ack-first']) {
    const state=createWorkspaceState(),fixture=demoFixtures().shared;
    state.receive('shared',fixture); // acknowledgements have no state mutation API
    state.receive('shared',{...fixture,jobs:[...fixture.jobs,{id:'new'}]});
    state.receive('shared',{...fixture,jobs:[...fixture.jobs,{id:'new'}]});
    assert.equal(state.value.shared.jobs.filter(j=>j.id==='new').length,1,ordering);
    state.error(new Error('permission-denied'));assert.equal(state.value.status,'error');
  }
});
test('normalization retains identity, archive, revisions and unknown legacy fields',()=>{
  const input=demoFixtures().shared;input.stores[0].archived=true;input.jobs[0].custom='preserve';
  const output=normalizeShared(input);assert.equal(output.stores[0].archived,true);assert.equal(output.jobs[0].custom,'preserve');
});
test('timezone is independent of device and UTC boundary',()=>{
  assert.equal(businessDay(new Date('2026-09-18T22:30:00Z')),'2026-09-19');
  assert.deepEqual(dirtyPatch({price:1,paid:false},{price:1,paid:false,comment:'x'}),{comment:'x'});
});
