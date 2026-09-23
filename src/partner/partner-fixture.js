export const partnerFixture={
  organization:{id:'lavetra',name:'Lavetra',salons:[{id:'center',name:'Салон на Ленина'},{id:'north',name:'Салон Северный'}]},
  currentUser:{id:'manager-1',name:'Анна · Демо',role:'Менеджер',salonId:'center'},
  team:[
    {id:'manager-1',name:'Анна · Демо',salon:'Ленина',orders:12,revenue:286400},
    {id:'manager-2',name:'Менеджер 02',salon:'Ленина',orders:9,revenue:218000},
    {id:'manager-3',name:'Менеджер 03',salon:'Северный',orders:11,revenue:264500},
    {id:'manager-4',name:'Менеджер 04',salon:'Северный',orders:7,revenue:171000}
  ],
  availability:[
    {date:'23 сент.',day:'Ср',tone:'free',windows:{morning:'Свободно',day:'Свободно',evening:'По запросу',call:'Позвонить'}},
    {date:'24 сент.',day:'Чт',tone:'medium',windows:{morning:'Занято',day:'Можно запросить',evening:'По запросу',call:'Позвонить'}},
    {date:'25 сент.',day:'Пт',tone:'free',windows:{morning:'Свободно',day:'Свободно',evening:'По запросу',call:'Позвонить'}},
    {date:'26 сент.',day:'Сб',tone:'medium',windows:{morning:'Можно запросить',day:'Занято',evening:'По запросу',call:'Позвонить'}},
    {date:'28 сент.',day:'Пн',tone:'free',windows:{morning:'Свободно',day:'Свободно',evening:'По запросу',call:'Позвонить'}}
  ],
  orders:[
    {id:'LV-1048',organizationId:'lavetra',salonId:'center',managerId:'manager-1',kind:'measure',stage:'store_action',client:'Демо-клиент 01',phone:'+7 000 000-00-01',address:'Тестовый адрес, 1',desiredDate:'24 сент.',windowId:'day',managerComment:'Срочно. Связаться с клиентом сегодня и согласовать время замера.',proposal:'24 сентября · 14:00–16:00',sum:0,timeline:[{label:'Запрос отправлен',at:'21 сент.'},{label:'Предложено время',at:'сегодня, 09:40'}]},
    {id:'LV-1042',organizationId:'lavetra',salonId:'north',managerId:'manager-3',kind:'measure',stage:'measured',client:'Демо-клиент 02',phone:'+7 000 000-00-02',address:'Тестовый адрес, 2',desiredDate:'20 сент.',windowId:'morning',managerComment:'Клиент рассматривает входную дверь. Нужен размер и расчёт работ.',sum:0,measurement:{openingWidth:980,openingHeight:2070,doorSize:'960 × 2050',handing:'Левая',installationPrice:8000,additionalWorks:[{id:'w1',title:'Расширение проёма',price:1500},{id:'w2',title:'Подъём на этаж',price:800}],installerComment:'Проём готов. Добор 120 мм.',photos:[],total:10300},timeline:[{label:'Запрос отправлен',at:'18 сент.'},{label:'Замер выполнен',at:'20 сент., 11:24'}]},
    {id:'LV-1037',organizationId:'lavetra',salonId:'center',managerId:'manager-2',kind:'installation',stage:'scheduled',client:'Демо-клиент 03',phone:'+7 000 000-00-03',address:'Тестовый адрес, 3',desiredDate:'25 сент.',windowId:'morning',sum:18400,timeline:[{label:'Замер согласован',at:'16 сент.'},{label:'Монтаж назначен',at:'19 сент.'}]},
    {id:'LV-1026',organizationId:'lavetra',salonId:'north',managerId:'manager-4',kind:'installation',stage:'completed',client:'Демо-клиент 04',phone:'+7 000 000-00-04',address:'Тестовый адрес, 4',desiredDate:'16 сент.',windowId:'day',sum:21900,timeline:[{label:'Монтаж выполнен',at:'16 сент.'}]}
  ]
};
