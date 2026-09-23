import { measurementToInstallationDraft, normalizeMeasurementResult } from '../domain/measurement.js';

export const WINDOWS = Object.freeze([
  { id:'morning', label:'Первая половина', time:'10:00–12:00' },
  { id:'day', label:'Вторая половина', time:'14:00–16:00' },
  { id:'evening', label:'Вечером', time:'По договорённости' },
  { id:'call', label:'Особое время', time:'Позвонить монтажнику' }
]);

export const REQUEST_STAGES = Object.freeze({
  DRAFT:'draft', REVIEW:'installer_review', STORE_ACTION:'store_action',
  SCHEDULED:'scheduled', MEASURED:'measured', COMPLETED:'completed'
});

export const visibleOrders=(orders,organizationId)=>orders.filter(order=>order.organizationId===organizationId);

export function nextAction(order){
  if(order.stage===REQUEST_STAGES.REVIEW) return { owner:'installer', label:'Монтажник согласует время' };
  if(order.stage===REQUEST_STAGES.STORE_ACTION) return { owner:'store', label:'Подтвердите предложенное время' };
  if(order.stage===REQUEST_STAGES.MEASURED && !order.installationRequested) return { owner:'store', label:'Можно запросить монтаж' };
  if(order.stage===REQUEST_STAGES.SCHEDULED) return { owner:'installer', label:order.kind==='measure'?'Ждём замер':'Монтаж запланирован' };
  return { owner:'none', label:'Действий не требуется' };
}

export function createRequest(values,context){
  return {
    id:`request-${Date.now()}`, organizationId:context.organizationId, salonId:context.salonId,
    managerId:context.managerId, kind:values.kind||'measure', stage:REQUEST_STAGES.REVIEW,
    client:values.client.trim(), phone:values.phone.trim(), address:values.address.trim(),
    schedulingMode:values.schedulingMode==='client_call'?'client_call':'preferred', desiredDate:values.schedulingMode==='client_call'?'':values.desiredDate, windowId:values.schedulingMode==='client_call'?'':values.windowId, managerComment:String(values.managerComment??values.comment??'').trim(),
    createdAt:new Date().toISOString(), timeline:[{ label:'Запрос отправлен', at:'только что' }]
  };
}

export function completeMeasurement(order,result){
  return {...order,measurement:normalizeMeasurementResult(result),stage:REQUEST_STAGES.MEASURED,
    timeline:[...(order.timeline||[]),{label:'Замер выполнен',at:'только что'}]};
}

export function requestInstallation(order){
  if(!order.measurement) throw new Error('Сначала нужен результат замера');
  return {...order,installationRequested:true,installationDraft:measurementToInstallationDraft(order),stage:REQUEST_STAGES.REVIEW,kind:'installation',
    timeline:[...order.timeline,{label:'Магазин запросил монтаж',at:'только что'}]};
}
