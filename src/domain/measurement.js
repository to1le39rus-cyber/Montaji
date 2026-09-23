const text=value=>String(value??'').trim();
const amount=value=>Math.max(0,Number(String(value??0).replace(/\s/g,'').replace(',','.'))||0);

export const normalizeAdditionalWork=(work={})=>({
 id:text(work.id)||('work-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)),
 title:text(work.title),
 price:amount(work.price)
});

export const normalizeMeasurementResult=(input={})=>{
 const additionalWorks=(Array.isArray(input.additionalWorks)?input.additionalWorks:[])
  .map(normalizeAdditionalWork).filter(work=>work.title||work.price);
 const installationPrice=amount(input.installationPrice);
 return {
  openingWidth:amount(input.openingWidth)||null,
  openingHeight:amount(input.openingHeight)||null,
  doorSize:text(input.doorSize),
  handing:text(input.handing),
  installationPrice,
  additionalWorks,
  installerComment:text(input.installerComment),
  photos:Array.isArray(input.photos)?input.photos:[],
  total:installationPrice+additionalWorks.reduce((sum,work)=>sum+work.price,0)
 };
};

export const measurementToInstallationDraft=order=>{
 if(!order?.measurement)throw new Error('Сначала нужен результат замера');
 const measurement=normalizeMeasurementResult(order.measurement);
 return {
  type:'Монтаж',
  client:text(order.client),
  phone:text(order.phone),
  address:text(order.address),
  date:'',
  price:measurement.total,
  source:text(order.storeName||order.organizationName||''),
  comment:text([
   order.managerComment&&('Комментарий менеджера: '+order.managerComment),
   measurement.doorSize&&('Дверь: '+measurement.doorSize+(measurement.handing?' · '+measurement.handing:'')),
   measurement.installerComment&&('Комментарий замерщика: '+measurement.installerComment)
  ].filter(Boolean).join('\n')),
  partner:{
   organizationId:text(order.organizationId),salonId:text(order.salonId),managerId:text(order.managerId),
   measurementRequestId:text(order.id),managerComment:text(order.managerComment),
   measurement
  }
 };
};
