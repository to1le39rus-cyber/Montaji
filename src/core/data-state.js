export const DATA_STATES=Object.freeze({
  idle:'idle',
  loading:'loading',
  ready:'ready',
  offline:'offline',
  error:'error'
});
export const initialDataState=()=>({
  status:DATA_STATES.idle,
  data:null,
  error:null,
  lastSuccessfulLoadAt:null
});
export const loaded=(state,data)=>({...state,status:DATA_STATES.ready,data,error:null,lastSuccessfulLoadAt:new Date().toISOString()});
export const failed=(state,status,error)=>({...state,status,error});
