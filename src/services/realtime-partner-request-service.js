import { normalizePartnerRequest, assignPartnerRequest } from '../domain/partner-requests.js';
import { normalizeMeasurementResult, measurementToInstallationDraft } from '../domain/measurement.js';

const clone=value=>JSON.parse(JSON.stringify(value));
export const createRealtimePartnerRequestService=({repository,mode='installer',storeId=''})=>{
 let requests=[],listeners=new Set(),unsubscribe=null;
 const emit=()=>listeners.forEach(fn=>fn(clone(requests)));
 const get=id=>requests.find(item=>item.id===id);
 const subscribeRemote=()=>{
  if(unsubscribe)return;
  const onData=data=>{requests=data.map(normalizePartnerRequest);emit()};
  unsubscribe=mode==='store'?repository.subscribeStore(storeId,onData,console.error):repository.subscribeInstaller(onData,console.error);
 };
 const patch=async(id,next)=>{await repository.patch(id,next);return {...get(id),...next}};
 return {
  list:()=>clone(requests),
  subscribe(fn){listeners.add(fn);subscribeRemote();fn(clone(requests));return()=>listeners.delete(fn)},
  async create(request){return repository.create(request)},
  async assign(id,schedule){const current=get(id);if(!current)throw new Error('Заявка не найдена');const next=assignPartnerRequest(current,schedule);await patch(id,{stage:next.stage,scheduledDate:next.scheduledDate,scheduledTime:next.scheduledTime,timeline:next.timeline});return next},
  async completeMeasurement(id,result){const current=get(id);if(!current)throw new Error('Заявка не найдена');const measurement=normalizeMeasurementResult(result);const timeline=[...(current.timeline||[]),{label:'Замер выполнен',at:'только что'}];await patch(id,{measurement,stage:'measured',timeline});return {...current,measurement,stage:'measured',timeline}},
  async createInstallation(id,{date='',time=''}={}){const current=get(id);if(!current?.measurement)throw new Error('Сначала завершите замер');const draft=measurementToInstallationDraft(current);const installationId=current.id+'-installation';const installation=normalizePartnerRequest({...current,...draft,id:installationId,kind:'installation',stage:date?'scheduled':'installer_review',scheduledDate:date,scheduledTime:time,measurement:current.measurement,sourceMeasurementId:current.id,installationDraft:draft,timeline:[...(current.timeline||[]),{label:date?'Монтаж согласован':'Монтаж создан',at:'только что',date,time}]});await repository.create(installation);await patch(current.id,{installationRequestId:installationId});return installation},
  dispose(){unsubscribe?.();unsubscribe=null;listeners.clear()}
 };
};
