import { normalizePartnerRequest, assignPartnerRequest } from '../domain/partner-requests.js';
import { normalizeMeasurementResult, measurementToInstallationDraft } from '../domain/measurement.js';

const clone=value=>JSON.parse(JSON.stringify(value));
export const createPartnerRequestService=({initial=[]}={})=>{
 let requests=clone(initial).map(normalizePartnerRequest);
 const listeners=new Set();
 const publish=()=>listeners.forEach(fn=>fn(clone(requests)));
 const get=id=>requests.find(item=>item.id===id);
 const replace=next=>{requests=requests.map(item=>item.id===next.id?normalizePartnerRequest(next):item);publish();return clone(get(next.id))};
 return {
  list:()=>clone(requests),
  subscribe(fn){listeners.add(fn);fn(clone(requests));return()=>listeners.delete(fn)},
  assign(id,schedule){const current=get(id);if(!current)throw new Error('Заявка не найдена');return replace(assignPartnerRequest(current,schedule))},
  completeMeasurement(id,result){const current=get(id);if(!current)throw new Error('Заявка не найдена');const measurement=normalizeMeasurementResult(result);return replace({...current,measurement,stage:'measured',timeline:[...(current.timeline||[]),{label:'Замер выполнен',at:'только что'}]})},
  createInstallation(id,{date='',time=''}={}){const current=get(id);if(!current?.measurement)throw new Error('Сначала завершите замер');const draft=measurementToInstallationDraft(current);const installation={...normalizePartnerRequest({...current,...draft,id:current.id+'-installation',kind:'installation',stage:date?'scheduled':'installer_review',scheduledDate:date,scheduledTime:time,measurement:current.measurement}),sourceMeasurementId:current.id,installationDraft:draft,timeline:[...(current.timeline||[]),{label:date?'Монтаж согласован':'Монтаж создан',at:'только что',date,time}]};requests=[...requests,installation];replace({...current,installationRequestId:installation.id});publish();return clone(installation)}
 };
};
