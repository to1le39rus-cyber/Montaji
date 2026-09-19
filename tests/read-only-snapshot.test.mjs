import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadOnlySnapshot, summarizeSnapshot } from '../src/data/read-only-snapshot.js';

test('read-only snapshot reads both repositories without exposing writes',async()=>{
  const shared={jobs:[{id:'j1'}],expenses:[{id:'e1'}]};
  const notes=[{id:'n1'}];
  let sharedLoads=0,notesLoads=0;
  const snapshot=await createReadOnlySnapshot({
    sharedRepository:{load:async()=>{sharedLoads++;return shared;}},
    notesRepository:{load:async()=>{notesLoads++;return notes;}}
  });
  assert.equal(sharedLoads,1);
  assert.equal(notesLoads,1);
  assert.equal(snapshot.readOnly,true);
  assert.deepEqual(summarizeSnapshot(snapshot),{jobs:1,expenses:1,notes:1,readOnly:true});
  assert.equal('save' in snapshot,false);
  assert.equal('transact' in snapshot,false);
});
