import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotesModel } from '../src/screens/notes.js';

test('Notes separates urgent and active notes',()=>{
 const model=buildNotesModel({notes:[
  {id:'1',title:'Срочно',urgent:true,done:false,archived:false},
  {id:'2',title:'Готово',urgent:true,done:true,archived:false},
  {id:'3',title:'Архив',urgent:true,done:false,archived:true},
  {id:'4',title:'Обычная',urgent:false,done:false,archived:false}
 ]});
 assert.equal(model.urgent.length,1);
 assert.equal(model.active.length,2);
});
test('notes input failure can be represented as empty isolated notes',()=>{
 const model=buildNotesModel({notes:null});
 assert.deepEqual(model,{notes:[],urgent:[],active:[]});
});
