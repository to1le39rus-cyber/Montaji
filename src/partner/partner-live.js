import {icon} from '../ui/icons.js';
import {createFirebase} from '../data/firebase.js';
import {createPartnerRequestRepository} from '../data/partner-request-repository.js';
import {createRealtimePartnerRequestService} from '../services/realtime-partner-request-service.js';
import {firebaseConfig} from '../../firebase-config.js';

const root=document.querySelector('#partner-live-app');
const fb=createFirebase(firebaseConfig);
const repository=createPartnerRequestRepository({firestore:fb.firestore,...fb.firestoreApi});
let service=null,storeId='',membership=null,requests=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const requestId=()=>'REQ-'+Date.now().toString(36).toUpperCase();
const shell=body=>'<main class="partner-shell"><header class="partner-top"><div><b>MONTRA</b><span>ПАРТНЁР · LIVE</span></div><button data-signout>Выйти</button></header><div class="partner-content">'+body+'</div></main>';

function login(error=''){root.innerHTML='<main class="partner-shell"><section class="screen-title"><small>MONTRA Партнёр</small><h1>Вход магазина</h1><p>Тест реальной синхронизации Firebase.</p></section><form id="live-login" class="partner-form"><label>Email<input name="email" type="email" required></label><label>Пароль<input name="password" type="password" required></label>'+(error?'<p class="quiet">'+esc(error)+'</p>':'')+'<button class="submit-request">Войти</button></form></main>'}
function stageLabel(x){if(x.stage==='installer_review')return 'Отправлена монтажнику';if(x.stage==='scheduled')return 'Назначено · '+esc(x.scheduledDate)+' '+esc(x.scheduledTime);if(x.stage==='measured')return 'Замер выполнен';return esc(x.stage)}
function render(){
 const list=requests.filter(x=>x.organizationId===storeId);
 root.innerHTML=shell('<section class="screen-title"><small>Подключено к Firebase</small><h1>'+esc(membership?.storeName||'Магазин')+'</h1><p>Заявки синхронизируются с MONTRA монтажника в реальном времени.</p></section><button class="new-request" data-new>'+icon('plus')+'<span><b>Новая заявка</b><small>Создать тестовый замер</small></span>'+icon('chevron')+'</button><div class="section-row"><h2>Заявки <span>'+list.length+'</span></h2></div><section class="order-list">'+(list.map(x=>'<button class="order-card" type="button" data-request-id="'+esc(x.id)+'"><span class="order-kind">'+icon(x.kind==='installation'?'tools':'measure')+'</span><span class="order-copy"><small>'+esc(x.id)+' · '+(x.kind==='installation'?'Монтаж':'Замер')+'</small><b>'+esc(x.client)+'</b><em>'+esc(x.address)+'</em><span class="action-pill installer">'+stageLabel(x)+'</span></span></button>').join('')||'<p class="quiet">Пока заявок нет.</p>')+'</section>');
}
function openRequest(id){const x=requests.find(item=>item.id===id);if(!x)return;document.body.insertAdjacentHTML('beforeend','<div class="sheet-layer"><button class="sheet-scrim" data-close></button><section class="partner-sheet"><div class="sheet-handle"></div><header class="sheet-head"><div><small>Заявка магазина</small><h2>'+esc(x.client||'Без имени')+'</h2></div><button data-close>×</button></header><div class="detail-body"><dl><div><dt>Статус</dt><dd>'+stageLabel(x)+'</dd></div><div><dt>Телефон</dt><dd><a href="tel:'+esc(x.phone)+'">'+esc(x.phone||'—')+'</a></dd></div><div><dt>Адрес</dt><dd>'+esc(x.address||'—')+'</dd></div>'+(x.managerComment?'<div><dt>Комментарий менеджера</dt><dd>'+esc(x.managerComment)+'</dd></div>':'')+'</dl></div></section></div>');document.body.classList.add('sheet-open')}
function openNew(){
 document.body.insertAdjacentHTML('beforeend','<div class="sheet-layer"><button class="sheet-scrim" data-close></button><section class="partner-sheet"><div class="sheet-handle"></div><header class="sheet-head"><div><small>Новая заявка</small><h2>Запросить замер</h2></div><button data-close>×</button></header><form id="live-request" class="partner-form"><label>Клиент<input name="client" required></label><label>Телефон<input name="phone" required inputmode="tel"></label><label>Адрес<input name="address" required></label><fieldset class="schedule-choice"><legend>Когда провести замер?</legend><label><input type="radio" name="schedulingMode" value="client_call" checked><span><b>Согласовать с клиентом</b><small>Монтажник договорится сам</small></span></label><label><input type="radio" name="schedulingMode" value="preferred"><span><b>Есть пожелание по дате</b><small>Указать дату ниже</small></span></label></fieldset><label data-preferred-date hidden>Желаемая дата<input name="desiredDate" type="date"></label><label>Комментарий менеджера<textarea name="managerComment" rows="3"></textarea></label><button class="submit-request">Отправить заявку на замер</button></form></section></div>');document.body.classList.add('sheet-open');const form=document.querySelector('#live-request');const syncPreferred=()=>{const preferred=form?.elements.schedulingMode?.value==='preferred';const field=form?.querySelector('[data-preferred-date]');if(field){field.hidden=!preferred;field.querySelector('input').required=preferred}};form?.querySelectorAll('input[name="schedulingMode"]').forEach(input=>input.addEventListener('change',syncPreferred));syncPreferred()
}
function close(){document.querySelector('.sheet-layer')?.remove();document.body.classList.remove('sheet-open')}

document.addEventListener('click',async e=>{if(e.target.closest('[data-close]'))close();const request=e.target.closest('[data-request-id]');if(request)openRequest(request.dataset.requestId);if(e.target.closest('[data-new]'))openNew();if(e.target.closest('[data-signout]'))await fb.authApi.signOut(fb.auth)});
document.addEventListener('submit',async e=>{
 e.preventDefault();
 if(e.target.id==='live-login'){const fd=new FormData(e.target);try{await fb.authApi.signInWithEmailAndPassword(fb.auth,fd.get('email').trim(),fd.get('password'))}catch(err){login(err.message)}return}
 if(e.target.id==='live-request'){const fd=Object.fromEntries(new FormData(e.target));try{await service.create({id:requestId(),organizationId:storeId,organizationName:membership.storeName||'Магазин',salonId:membership.salonId||'',managerId:fb.auth.currentUser.uid,managerName:membership.name||fb.auth.currentUser.email,kind:'measure',stage:'installer_review',client:fd.client,phone:fd.phone,address:fd.address,schedulingMode:fd.schedulingMode,desiredDate:fd.schedulingMode==='preferred'?fd.desiredDate:'',managerComment:fd.managerComment,timeline:[{label:'Запрос отправлен',at:'только что'}]});close()}catch(err){alert(err.message)}}
});

fb.authApi.onAuthStateChanged(fb.auth,user=>{
 service?.dispose();service=null;requests=[];
 if(!user){login();return}
 const memberships=fb.firestoreApi.query(fb.firestoreApi.collection(fb.firestore,'storeMemberships'),fb.firestoreApi.where('uid','==',user.uid));
 fb.firestoreApi.onSnapshot(memberships,snap=>{
   const docs=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false);
   if(!docs.length){root.innerHTML=shell('<section class="screen-title"><h1>Доступ не подключён</h1><p>Для этого аккаунта ещё нет активного магазина.</p></section>');return}
   membership=docs[0];storeId=membership.storeId;service?.dispose();service=createRealtimePartnerRequestService({repository,mode:'store',storeId});service.subscribe(data=>{requests=data;render()});
 },err=>{root.innerHTML=shell('<section class="screen-title"><h1>Нет доступа</h1><p>'+esc(err.message)+'</p></section>')});
});
login();
