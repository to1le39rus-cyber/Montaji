import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMeasurementResult,measurementToInstallationDraft} from '../src/domain/measurement.js';

test('measurement total includes base installation and extensible additional works',()=>{
 const result=normalizeMeasurementResult({doorSize:'860 × 2050',handing:'Левая',installationPrice:'8000',additionalWorks:[{title:'Подъём на этаж',price:'800'},{title:'Расширение проёма',price:'1500'}]});
 assert.equal(result.total,10300);
 assert.equal(result.additionalWorks.length,2);
});
test('measurement conversion preserves manager context and traceability',()=>{
 const draft=measurementToInstallationDraft({id:'m1',organizationId:'store1',salonId:'s1',managerId:'u1',client:'Алексей',phone:'8999',address:'Адрес',managerComment:'Срочно',measurement:{doorSize:'860',installationPrice:8000,additionalWorks:[]}});
 assert.equal(draft.type,'Монтаж');
 assert.equal(draft.client,'Алексей');
 assert.equal(draft.partner.managerComment,'Срочно');
 assert.equal(draft.partner.measurementRequestId,'m1');
 assert.match(draft.comment,/Комментарий менеджера: Срочно/);
});
