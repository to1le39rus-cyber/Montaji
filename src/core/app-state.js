export const createAppState=()=>{
 let state={jobs:[],expenses:[],version:5};
 let notes=[];
 let user=null;
 let dataStatus='idle';
 const listeners=new Set();
 const snapshot=()=>({state,notes,user,dataStatus});
 const emit=()=>listeners.forEach(fn=>fn(snapshot()));
 return {
  get snapshot(){return snapshot();},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  setState(v){state=v;emit();},
  setNotes(v){notes=Array.isArray(v)?v:[];emit();},
  setUser(v){user=v;emit();},
  setDataStatus(v){dataStatus=v;emit();}
 };
};
