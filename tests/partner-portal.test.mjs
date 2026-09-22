import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequest,nextAction,requestInstallation,visibleOrders,WINDOWS} from '../src/partner/partner-domain.js';

test('магазин получает только заказы своей организации',()=>{
  const orders=[{organizationId:'lavetra'},{organizationId:'other'}];
  assert.equal(visibleOrders(orders,'lavetra').length,1);
});

test('новый запрос ждёт решения монтажника',()=>{
  const request=createRequest({kind:'measure',client:' Ирина ',phone:' 123 ',address:' Дом ',desiredDate:'25 сент.',windowId:'morning',comment:''},{organizationId:'lavetra',salonId:'one',managerId:'m1'});
  assert.equal(request.stage,'installer_review');
  assert.equal(request.client,'Ирина');
  assert.equal(nextAction(request).owner,'installer');
});

test('монтаж можно запросить только после результата замера',()=>{
  assert.throws(()=>requestInstallation({timeline:[]}),/результат замера/);
  const result=requestInstallation({measurement:{width:900},timeline:[],kind:'measure',stage:'measured'});
  assert.equal(result.kind,'installation');
  assert.equal(result.installationRequested,true);
});

test('окна времени являются вариантами согласования, а не вместимостью',()=>{
  assert.deepEqual(WINDOWS.map(x=>x.id),['morning','day','evening','call']);
  assert.equal(WINDOWS.some(x=>'capacity' in x),false);
});
