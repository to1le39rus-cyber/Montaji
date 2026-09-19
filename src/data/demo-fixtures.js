import {businessDay,addDays} from '../domain/dates.js';
export function demoFixtures(today=businessDay()) {
  const stores=[{id:'store-forest',name:'Лес и форма',address:'Учебный проспект, 12',contact:'Демо-менеджер',phone:'',revision:1},{id:'store-line',name:'Линия кухни',address:'Тестовая улица, 8',contact:'Отдел доставки',phone:'',revision:1}];
  const make=(id,client,date,slot,price,extra={})=>({id,client,date,slot,type:'Монтаж',status:'Запланирован',price,paid:false,phone:'',address:'Примерная улица, 18',comment:'Все имена и адреса вымышлены. Код домофона: 12.',source:'Лес и форма',store:'Лес и форма',storeId:'store-forest',storeNameSnapshot:'Лес и форма',measurePrice:0,measureCredit:0,measurePaid:false,time:'',completedDate:'',revision:1,...extra});
  return {shared:{version:5,revision:1,stores,jobs:[
    make('demo-1','Алексей · демо',today,'1',18500,{address:'Примерная улица, 18 · кв. 42',comment:'Кухня 3,2 м. Столешница на месте. Перед приездом уточнить доставку.'}),
    make('demo-2','Мария · демо',today,'2',1500,{type:'Замер',measurePrice:1500,address:'Учебный проспект, 7',source:'Линия кухни',store:'Линия кухни',storeId:'store-line',storeNameSnapshot:'Линия кухни'}),
    make('demo-3','Илья · демо',today,'3',4200,{type:'Сервис',status:'Выполнен',completedDate:today,paid:true}),
    make('demo-4','Алексей · демо',addDays(today,-5),'1',1500,{type:'Замер',measurePrice:1500,status:'Выполнен',paid:true,measurePaid:true,completedDate:addDays(today,-5),convertedToJobId:'demo-1'}),
    make('demo-5','София · демо',addDays(today,-2),'1',24600,{status:'Выполнен',completedDate:addDays(today,-2)}),
    make('demo-6','Даниил · демо',addDays(today,1),'1',21000),
    make('demo-7','Елена · демо',addDays(today,1),'1',2000,{type:'Доставка'}),
    make('demo-8','Никита · демо',addDays(today,3),'2',0,{type:'Рекламация'}),
    make('demo-9','Мария · демо',addDays(today,-10),'2',12000,{status:'Отменён',cancelReason:'Изменились планы клиента'}),
    make('demo-10','Дополнительная работа',today,'3',1800,{type:'Доп. доход',status:'Выполнен',completedDate:today,paid:true,source:'Частный заказ',storeId:'',storeNameSnapshot:'',address:''})
  ],expenses:[{id:'expense-1',date:today,amount:850,category:'Транспорт',comment:'Топливо · пример',cancelled:false,revision:1},{id:'expense-2',date:addDays(today,-2),amount:1200,category:'Материалы',comment:'Крепёж · пример',cancelled:false,revision:1}]},notes:{revision:1,notes:[{id:'note-1',title:'Уточнить доставку столешницы',text:'Связаться с магазином до выезда. Это тестовая заметка.',dueDate:today,urgent:true,done:false,archived:false,revision:1},{id:'note-2',title:'Пополнить расходники',text:'Саморезы, герметик, малярная лента.',dueDate:addDays(today,1),urgent:false,done:false,archived:false,revision:1}]}};
}
