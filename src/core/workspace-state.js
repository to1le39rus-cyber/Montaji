import {normalizeShared,normalizeNotes} from '../domain/normalize.js';
export function createWorkspaceState() {
  let value={shared:null,notes:null,status:'loading',error:null,streams:{}};
  const listeners=new Set();
  const publish=()=>listeners.forEach(fn=>fn(value));
  return {
    get value(){return value;},
    subscribe(fn){listeners.add(fn);fn(value);return()=>listeners.delete(fn);},
    receive(key,data,meta={}) {
      // onSnapshot is ordered. Do not compare only revision: legacy clients do not increment it.
      value={...value,[key]:key==='shared'?normalizeShared(data):normalizeNotes(data),error:null,streams:{...value.streams,[key]:meta}};
      value.status=Object.values(value.streams).some(s=>s.fromCache||s.pending)?'cached':'ready';publish();
    },
    error(error){value={...value,status:'error',error};publish();},
    offline(){value={...value,status:'offline'};publish();},
    reset(){value={shared:null,notes:null,status:'loading',error:null,streams:{}};publish();}
  };
}
