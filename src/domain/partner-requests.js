const text=value=>String(value??'').trim();

export const PARTNER_REQUEST_STAGES=Object.freeze({
 REVIEW:'installer_review', STORE_ACTION:'store_action', SCHEDULED:'scheduled',
 MEASURED:'measured', COMPLETED:'completed'
});

export const normalizePartnerRequest=(request={})=>({
 ...request,
 id:text(request.id),
 organizationId:text(request.organizationId),
 organizationName:text(request.organizationName||request.storeName),
 salonId:text(request.salonId),
 salonName:text(request.salonName),
 managerId:text(request.managerId),
 managerName:text(request.managerName),
 kind:request.kind==='installation'?'installation':'measure',
 stage:text(request.stage)||PARTNER_REQUEST_STAGES.REVIEW,
 client:text(request.client),phone:text(request.phone),address:text(request.address),
 schedulingMode:request.schedulingMode==='client_call'?'client_call':'preferred',
 desiredDate:text(request.desiredDate),windowId:text(request.windowId),
 managerComment:text(request.managerComment),
 scheduledDate:text(request.scheduledDate),
 scheduledTime:text(request.scheduledTime),
 measurement:request.measurement||null,
 timeline:Array.isArray(request.timeline)?request.timeline:[]
});

export const requestNeedsInstaller=request=>{
 const item=normalizePartnerRequest(request);
 return item.stage===PARTNER_REQUEST_STAGES.REVIEW;
};

export const requestScheduleLabel=request=>{
 const item=normalizePartnerRequest(request);
 if(item.scheduledDate)return [item.scheduledDate,item.scheduledTime].filter(Boolean).join(' · ');
 if(item.schedulingMode==='client_call')return 'Нужно согласовать с клиентом';
 return [item.desiredDate,item.windowId].filter(Boolean).join(' · ')||'Дата не указана';
};

export const assignPartnerRequest=(request,{date,time=''})=>{
 const item=normalizePartnerRequest(request);
 if(!date)throw new Error('Укажите дату');
 return {...item,stage:PARTNER_REQUEST_STAGES.SCHEDULED,scheduledDate:text(date),scheduledTime:text(time),
  timeline:[...item.timeline,{label:'Дата согласована',at:'только что',date:text(date),time:text(time)}]};
};

export const partnerNotificationEvents=requests=>(requests||[]).map(normalizePartnerRequest)
 .filter(requestNeedsInstaller)
 .map(request=>({
   id:'partner-request:'+request.id,
   type:request.kind==='installation'?'installation_request':'measurement_request',
   requestId:request.id,
   title:request.kind==='installation'?'Новая заявка на монтаж':'Новая заявка на замер',
   body:[request.organizationName||'Магазин',request.client].filter(Boolean).join(' · '),
   createdAt:request.createdAt||''
 }));
