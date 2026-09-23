import test from 'node:test';
import assert from 'node:assert/strict';
import { assignPartnerRequest, partnerNotificationEvents } from '../src/domain/partner-requests.js';
import { createPartnerRequestService } from '../src/services/partner-request-service.js';

const request={id:'R1',organizationId:'s1',organizationName:'Lavetra',kind:'measure',stage:'installer_review',client:'Клиент',phone:'+7',address:'Адрес',schedulingMode:'client_call',timeline:[]};

test('incoming partner request produces installer notification',()=>{
 const events=partnerNotificationEvents([request]);
 assert.equal(events.length,1);
 assert.equal(events[0].requestId,'R1');
});

test('assigning date moves request to scheduled',()=>{
 const next=assignPartnerRequest(request,{date:'2026-09-27',time:'14:00'});
 assert.equal(next.stage,'scheduled');
 assert.equal(next.scheduledDate,'2026-09-27');
});

test('measurement can become linked installation without retyping',()=>{
 const service=createPartnerRequestService({initial:[request]});
 service.assign('R1',{date:'2026-09-27',time:'14:00'});
 service.completeMeasurement('R1',{doorSize:'860 × 2050',handing:'Левая',installationPrice:8000,additionalWorks:[{title:'Расширение',price:1500}]});
 const installation=service.createInstallation('R1',{date:'2026-10-03',time:'10:00'});
 assert.equal(installation.kind,'installation');
 assert.equal(installation.stage,'scheduled');
 assert.equal(installation.client,'Клиент');
 assert.equal(installation.price,9500);
 assert.equal(installation.sourceMeasurementId,'R1');
 assert.equal(service.list().find(x=>x.id==='R1').installationRequestId,installation.id);
});
