import { createAppState } from './app-state.js';
import { createRouter } from './router.js';
import { buildTodayModel, renderToday } from '../screens/today.js';
import { buildScheduleModel, renderSchedule } from '../screens/schedule.js';
import { buildMoneyModel, renderMoney } from '../screens/money.js';
import { buildClientsModel, renderClients, renderClientDetail } from '../screens/clients.js';
import { buildNotesModel, renderNotes } from '../screens/notes.js';
import { buildMoreModel, renderMore } from '../screens/more.js';
import { createJobForm } from '../components/job-form.js';
import { createStoreForm } from '../components/store-form.js';
import { createNoteForm } from '../components/note-form.js';
import { createSheet } from '../components/sheet.js';
import { createFeedback } from '../components/feedback.js';
import { enterScreen } from '../ui/motion.js';
import { statusMarkup } from '../components/job-card.js';
import { icon } from '../ui/icons.js';
import { montraMark } from '../ui/brand.js';
import { esc, money, localISO, formatDate, addDays, shiftMonth, dateObject } from '../ui/format.js';
import { JOB_TYPES, isCancelled, isCompleted, isDebt } from '../domain/jobs.js';
import { createStoreMemberCommand, storeAccessSummary, STORE_ROLES } from '../domain/store-access.js';
import { partnerNotificationEvents, requestScheduleLabel } from '../domain/partner-requests.js';
import { normalizeMeasurementResult } from '../domain/measurement.js';

const element = (className, html = '') => { const el=document.createElement('div'); el.className=className; el.innerHTML=html; return el; };
export const createCanonicalShell = ({
  root, initialState={jobs:[],expenses:[],stores:[],version:5}, initialNotes=[], user=null, readOnly=false,
  jobService=null, storeService=null, noteService=null, expenseService=null, actions={},
  today=localISO(), demo=false, initialRoute='today', partnerRequestService=null
}) => {
  const state=createAppState();
  state.setState(initialState); state.setNotes(initialNotes); state.setUser(user);
  const content=element('app-content'); content.id='main-content'; content.setAttribute('role','main');
  const brand=element('app-brandbar','<span class="app-mark">'+montraMark({className:'app-montra-mark'})+'</span><span class="app-brand">MONTRA</span>');
  const bell=document.createElement('button');bell.type='button';bell.className='notification-bell';bell.setAttribute('aria-label','Уведомления');bell.innerHTML='<span class="notification-bell-icon">'+icon('bell')+'</span><b hidden>0</b>';brand.append(bell);
  const dock=element('app-dock');
  const nav=document.createElement('nav'); nav.className='app-nav'; nav.setAttribute('aria-label','Основная навигация');
  const indicator=element('app-nav-indicator'); indicator.setAttribute('aria-hidden','true'); nav.append(indicator);
  const add=document.createElement('button'); add.type='button'; add.className='canonical-add'; add.setAttribute('aria-label','Добавить'); add.innerHTML=icon('plus'); add.hidden=readOnly;
  dock.append(nav,add);
  root.className='app-shell'; root.replaceChildren(brand,content,dock);
  const sheet=createSheet({root,background:[brand,content,dock]});
  const notify=createFeedback(root);
  let selectedDate=today, scheduleView='month', scheduleFilter='all', scheduleQuery='';
  let activeNoteId, disposeScreen;
  let moneyStart=today, moneyEnd=today, cacheStatus='none';
  let connectionTimer;
  let partnerRequests=partnerRequestService?.list?.()||[];
  const refreshBell=()=>{const count=partnerNotificationEvents(partnerRequests).length;const badge=bell.querySelector('b');badge.textContent=String(count);badge.hidden=!count;bell.classList.toggle('has-items',Boolean(count))};
  refreshBell();
  const names=['today','schedule','money','clients','more'];
  const navItems=[['Сегодня','home'],['График','calendar'],['Деньги','money'],['Клиенты','user'],['Ещё','more']];
  const canJobs=!readOnly&&Boolean(jobService);
  const currentJob=job=>state.snapshot.state.jobs?.find(item=>item.id===job.id)||job;
  const jobCallbacks={
    onJobClick:job=>openJobCard(job),
    onComplete:canJobs?job=>mutateJob(job.id,()=>jobService.complete(job.id),'Заявка выполнена'):undefined,
    onPaid:canJobs?job=>mutateJob(job.id,()=>jobService.markPaid(job.id),'Оплата отмечена'):undefined,
    onRoute:job=>openRoute(job), onShare:job=>shareAddress(job), onMore:job=>openJobCard(job)
  };
  const renderRoute=async name=>{
    disposeScreen?.();disposeScreen=undefined;
    if(name==='today') disposeScreen=renderToday({
      root:content, model:buildTodayModel({state:state.snapshot.state,date:today,notes:state.snapshot.notes}), ...jobCallbacks,
      onOpenNote:openNote, onOpenNotes:()=>navigate('notes'), onCompleteNote:noteService&&!readOnly?completeNote:undefined,
      activeNoteId,onNoteChange:id=>activeNoteId=id,
      onOpenOverdue:openOverdue,
      onAddNote:noteService&&!readOnly?()=>editNote({}):undefined, onAddJob:canJobs?()=>openJob({date:today}):undefined,
      onAddExpense:expenseService&&!readOnly?()=>openExpense(today):undefined,
      onOpenDay:date=>{selectedDate=date;navigate('schedule')},
      onMoney:(start,end)=>{moneyStart=start;moneyEnd=end;navigate('money')}
    });
    else if(name==='schedule') renderSchedule({
      root:content, model:buildScheduleModel({state:state.snapshot.state,date:selectedDate,today,view:scheduleView}), ...jobCallbacks,
      query:scheduleQuery, filter:scheduleFilter,
      onDateChange:date=>{selectedDate=date;renderRoute('schedule')},
      onViewChange:view=>{scheduleView=view;renderRoute('schedule')},
      onShift:direction=>{
        if(scheduleView==='week') selectedDate=addDays(selectedDate,direction*7);
        else {const first=shiftMonth(selectedDate,direction),end=dateObject(shiftMonth(first,1));end.setDate(0);selectedDate=first.slice(0,8)+String(Math.min(dateObject(selectedDate).getDate(),end.getDate())).padStart(2,'0')}
        renderRoute('schedule');
      },
      onToday:()=>{selectedDate=today;renderRoute('schedule')},
      onSearch:query=>scheduleQuery=query, onFilter:filter=>scheduleFilter=filter,
      onAddJob:canJobs?()=>openJob({date:selectedDate}):undefined
    });
    else if(name==='money') renderMoney({root:content,model:buildMoneyModel({state:state.snapshot.state,start:moneyStart,end:moneyEnd}),onJobClick:job=>openJobCard(job),onAddExpense:expenseService&&!readOnly?date=>openExpense(date):undefined,onPeriodChange:(key,value,endValue)=>{
      if(key==='range'){moneyStart=value;moneyEnd=endValue||value}else if(key==='start')moneyStart=value;else moneyEnd=value;
      if(moneyEnd<moneyStart)moneyEnd=moneyStart;renderRoute('money');
    }});
    else if(name==='clients') renderClients({root:content,model:buildClientsModel({state:state.snapshot.state}),onOpen:openClient});
    else if(name==='notes') renderNotes({root:content,model:buildNotesModel({notes:state.snapshot.notes}),onOpen:openNote,onAdd:noteService&&!readOnly?()=>editNote({}):undefined});
    else if(name==='more') renderMore({root:content,model:buildMoreModel({user:state.snapshot.user,dataStatus:state.snapshot.dataStatus,cacheStatus,stores:state.snapshot.state.stores||[],notes:state.snapshot.notes}),actions:{...actions,openStores,openNotes:()=>navigate('notes')}});
    const index=Math.max(0,names.indexOf(name==='notes'?'more':name));
    indicator.style.setProperty('--nav-index',index*100+'%');
    nav.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-current',i===index?'page':'false'));
    paintConnection(state.snapshot.dataStatus);
  };
  function paintConnection(value) {
    const node=content.querySelector('.connection-state');
    if(!node)return;
    clearTimeout(connectionTimer);
    const labels={idle:'Подключаем базу',cache:'Проверяем Firestore',ready:'База подключена',pending:'Сохраняем',offline:'Нет соединения',error:'Ошибка связи'};
    node.dataset.status=value;node.classList.remove('is-compact');node.setAttribute('aria-expanded','true');
    node.querySelector('span').textContent=demo?'Демо-режим':(labels[value]||labels.idle);
    const compact=()=>{if(!node.isConnected)return;node.classList.add('is-compact');node.setAttribute('aria-expanded','false')};
    if(value==='ready'||value==='pending'){
      node.onclick=()=>{const closing=!node.classList.contains('is-compact');node.classList.toggle('is-compact',closing);node.setAttribute('aria-expanded',String(!closing))};
      connectionTimer=setTimeout(compact,1500);
    }else node.onclick=null;
  }
  const router=createRouter({root:content,routes:Object.fromEntries([...names,'notes'].map(name=>[name,()=>renderRoute(name)]))});
  async function navigate(name) {
    sheet.close(); await router.render(name); window.scrollTo(0,0);
    enterScreen(content);
  }
  async function mutateJob(id, operation, message) {
    if(!canJobs)return false;
    try {
      const updated=await operation();
      if(updated?.id){const current=state.snapshot.state;state.setState({...current,jobs:current.jobs.map(job=>job.id===id?updated:job)})}
      if(message)notify(message);
      return true;
    } catch(error) { notify(error?.message||'Не удалось сохранить заявку');return false; }
  }
  function actionButton(label, name, action, primary=false) {
    const button=document.createElement('button');button.type='button';button.className='button'+(primary?' primary':'');button.innerHTML=icon(name)+'<span>'+esc(label)+'</span>';
    button.onclick=async()=>{if(button.disabled)return;button.disabled=true;try{await action()}finally{button.disabled=false}};return button;
  }
  function openOverdue(jobs=[]) {
    const body=element('sheet-choices');
    jobs.forEach(job=>{
      const button=document.createElement('button');button.type='button';button.className='button';
      button.innerHTML='<span style="min-width:0;text-align:left"><strong>'+esc(job.client||'Без имени')+'</strong><small style="display:block;margin-top:4px">'+formatDate(job.date,{day:'numeric',month:'long'})+(job.address?' · '+esc(job.address):'')+'</small></span>'+icon('chevron');
      button.onclick=()=>openJobCard(job,()=>openOverdue(jobs));body.append(button);
    });
    sheet.open({title:'Просроченные выезды',body});
  }
  function openJobCard(source, returnTo) {
    const job=currentJob(source), back=()=>openJobCard(source,returnTo);
    const body=element('job-detail');
    const payment=job.paid?'Оплачено':isDebt(job)?'Долг':'Не оплачено';
    body.innerHTML='<section class="detail-hero"><div class="detail-eyebrow"><span>'+esc(job.type)+'</span><i></i><span>'+esc(slotLabel(job.slot||'1'))+'</span><time>'+formatDate(job.date,{day:'numeric',month:'long'})+'</time></div><div class="detail-title"><h1>'+esc(job.client||'Без имени')+'</h1>'+statusMarkup(job)+'</div><div class="detail-value"><strong>'+money(job.type==='Замер'?(job.measurePrice||job.price):job.price)+'</strong><span class="job-payment'+(isDebt(job)?' is-debt':'')+'">'+payment+'</span></div></section><section class="detail-facts">'+[
      ['pin','Адрес',job.address],['phone','Телефон',job.phone],['store','Источник',job.source],['note','Комментарий',job.comment]
    ].filter(([, ,value])=>value).map(([name,label,value])=>'<div class="detail-fact" data-kind="'+name+'"><span class="detail-fact-icon">'+icon(name)+'</span><span><small>'+label+'</small><strong>'+esc(value)+'</strong></span></div>').join('')+'</section>';
    const controls=element('detail-actions');
    if(job.address){const route=actionButton('Маршрут','route',()=>openRoute(job,back),true);route.classList.add('detail-primary');controls.append(route)}
    if(job.phone){const link=document.createElement('a');link.className='button detail-primary';link.href='tel:'+String(job.phone).replace(/[^+\d]/g,'');link.innerHTML=icon('phone')+'Позвонить';controls.append(link)}
    const secondary=element('detail-secondary');
    if(job.address)secondary.append(actionButton('Поделиться','share',()=>shareAddress(job)));
    if(canJobs){
      secondary.append(actionButton('Изменить','edit',()=>openJob(job,back)));
      if(!isCancelled(job)){
        if(!isCompleted(job))secondary.append(actionButton('Выполнить','check',async()=>{if(await mutateJob(job.id,()=>jobService.complete(job.id),'Заявка выполнена'))back()}));
        {const paymentAction=actionButton(job.paid?'Снять оплату':'Оплатить','money',async()=>{if(await mutateJob(job.id,()=>job.paid?jobService.markUnpaid(job.id):jobService.markPaid(job.id),'Оплата обновлена'))back()},isDebt(job));paymentAction.classList.add('payment-action');secondary.append(paymentAction)}
        secondary.append(actionButton('Перенести','calendar',()=>openReschedule(job,back)));
        const cancel=actionButton('Отменить заявку','close',()=>{
          const confirmation=element('simple-form','<p>Заявка останется в истории со статусом «Отменен» и перестанет учитываться в доходе.</p>');
          confirmation.append(actionButton('Отменить заявку','close',async()=>{if(await mutateJob(job.id,()=>jobService.cancel(job.id),'Заявка отменена'))back()}));
          sheet.open({title:'Отменить заявку?',body:confirmation,onBack:back});
        });cancel.classList.add('danger','detail-cancel');secondary.append(cancel);
      }
    }
    if(secondary.childElementCount)controls.append(secondary);
    body.append(controls);sheet.open({title:'Заявка',body,onBack:returnTo,className:'job-detail-sheet'});
  }
  function openJob(input={}, returnTo) {
    if(!canJobs)return;
    const job=input.id?currentJob(input):{date:selectedDate,type:'Монтаж',slot:'1',status:'Запланировано',paid:false,...input};
    const close=returnTo||sheet.close;
    const form=createJobForm({job,stores:state.snapshot.state.stores||[],onCancel:close,onQuickAddStore:storeService?async name=>{try{const created=await storeService.create({name});const current=state.snapshot.state;state.setState({...current,stores:[...(current.stores||[]),created]});notify('Магазин добавлен');return created}catch(e){notify(e.message||'Не удалось добавить магазин');return null}}:null,onSubmit:async patch=>{
      if(job.id){if(!Object.keys(patch).length){close();return}if(await mutateJob(job.id,()=>jobService.update(job.id,patch),'Заявка сохранена'))close()}
      else try{const created=await jobService.create(patch);const current=state.snapshot.state;state.setState({...current,jobs:[...current.jobs,created]});notify('Заявка добавлена');close()}catch(e){notify(e.message||'Не удалось создать заявку')}
    }});
    sheet.open({title:job.id?'Редактировать заявку':'Новая заявка',body:form,onBack:returnTo});
  }
  function openReschedule(job, returnTo) {
    const form=element('simple-form','<label>Новая дата<input type="date" value="'+esc(job.date)+'" required></label><p class="section-caption">Слот и остальные детали сохранятся.</p>');
    form.append(actionButton('Перенести заявку','calendar',async()=>{const date=form.querySelector('input').value;if(!date)return;if(await mutateJob(job.id,()=>jobService.reschedule(job.id,date),'Заявка перенесена'))returnTo()},true));
    sheet.open({title:'Перенести заявку',body:form,onBack:returnTo});
  }
  function openRoute(job, returnTo) {
    const body=element('sheet-choices','<p>'+esc(job.address)+'</p>');
    const address=encodeURIComponent(job.address);
    [['Яндекс Карты','https://yandex.ru/maps/?rtext=~'+address+'&rtt=auto'],['2ГИС','https://2gis.ru/search/'+address]].forEach(([label,href])=>{
      const link=document.createElement('a');link.className='button';link.target='_blank';link.rel='noopener noreferrer';link.href=href;link.innerHTML=icon('route')+'<span>'+label+'</span>'+icon('arrow');body.append(link);
    });
    sheet.open({title:'Проложить маршрут',body,onBack:returnTo});
  }
  async function shareAddress(job) {
    const text=[job.client,job.address].filter(Boolean).join(' — ');
    try{if(navigator.share)await navigator.share({title:'Адрес клиента',text});else if(navigator.clipboard){await navigator.clipboard.writeText(text);notify('Адрес скопирован')}else notify('Скопируйте адрес из карточки заявки')}
    catch(e){if(e.name!=='AbortError')notify('Не удалось отправить адрес')}
  }
  function openClient(client) {
    const fresh=buildClientsModel({state:state.snapshot.state}).clients.find(c=>c.key===client.key)||client;
    const body=element('client-detail');
    renderClientDetail({root:body,client:fresh,onBack:sheet.close,onJobClick:job=>openJobCard(job,()=>openClient(client))});
    sheet.open({title:'Клиент',body});
  }
  function openNote(source) {
    const note=state.snapshot.notes.find(n=>n.id===source.id)||source;
    const body=element('note-detail','<div class="detail-head"><span class="section-caption">'+(note.urgent?'Срочная задача':'Заметка')+'</span><h1>'+esc(note.title||'Заметка')+'</h1></div><p style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65">'+esc(note.text||'')+'</p>'+(note.dueDate?'<p class="section-caption">Срок: '+formatDate(note.dueDate)+'</p>':''));
    if(noteService&&!readOnly){
      const controls=element('detail-actions');
      controls.append(actionButton(note.done?'Вернуть в активные':'Выполнено','check',async()=>{if(await updateNote(note,{done:!note.done}))sheet.close()},true));
      controls.append(actionButton('Редактировать','edit',()=>editNote(note,()=>openNote(note))));
      controls.append(actionButton(note.archived?'Из архива':'В архив','archive',async()=>{if(await updateNote(note,{archived:!note.archived}))sheet.close()}));body.append(controls);
    }
    sheet.open({title:note.urgent?'Задача':'Заметка',body});
  }
  async function updateNote(note, patch) {
    try{state.setNotes(await noteService.update(note.id,patch));return true}catch(e){notify(e.message||'Не удалось сохранить заметку');return false}
  }
  async function completeNote(note) {
    if(await updateNote(note,{done:true}))notify('Задача выполнена',{label:'Вернуть',run:()=>updateNote(note,{done:false})});
  }
  function editNote(note={}, returnTo) {
    if(!noteService||readOnly)return;
    const form=createNoteForm({note,onSubmit:async patch=>{
      try{state.setNotes(note.id?await noteService.update(note.id,patch):await noteService.create(patch));notify('Заметка сохранена');(returnTo||sheet.close)()}catch(e){notify(e.message)}
    }});
    sheet.open({title:note.id?'Редактировать заметку':'Новая заметка',body:form,onBack:returnTo});
  }
  function openExpense(date=today) {
    if(!expenseService||readOnly)return;
    const form=document.createElement('form');form.className='simple-form';
    form.innerHTML='<label>Сумма, ₽<input name="amount" inputmode="decimal" placeholder="0" required></label><label>Категория<select name="category">'+['Материалы','Топливо','Аренда','Обед','Прочее'].map(x=>'<option>'+x+'</option>').join('')+'</select></label><label>Дата<input name="date" type="date" value="'+date+'" required></label><label>Комментарий<input name="comment" placeholder="На что потратили"></label><button class="button primary" type="submit">Добавить расход</button>';
    form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');if(button.disabled)return;button.disabled=true;try{
      const input=Object.fromEntries(new FormData(form));input.amount=String(input.amount).replace(/\s/g,'');
      state.setState(await expenseService.create(input));sheet.close();notify('Расход добавлен');
    }catch(e){notify(e.message)}finally{button.disabled=false}};
    sheet.open({title:'Новый расход',body:form});
  }
  function openQuickAdd() {
    const body=element('quick-create');
    const icons=['tools','measure','refresh','truck','briefcase','money'];
    JOB_TYPES.forEach((type,i)=>{if(canJobs)body.append(actionButton(type,icons[i],()=>openJob({date:router.current==='schedule'?selectedDate:today,type},openQuickAdd)))});
    if(expenseService)body.append(actionButton('Расход','receipt',()=>openExpense(router.current==='schedule'?selectedDate:today)));
    if(noteService)body.append(actionButton('Заметка','note',()=>editNote({},openQuickAdd)));
    sheet.open({title:'Что добавить?',body});
  }
  function openNotifications() {
    const events=partnerNotificationEvents(partnerRequests),body=element('notification-list');
    if(!events.length)body.innerHTML='<p class="section-caption">Новых событий нет.</p>';
    events.forEach(event=>{const button=document.createElement('button');button.type='button';button.className='notification-row';button.innerHTML='<span class="notification-dot"></span><span><strong>'+esc(event.title)+'</strong><small>'+esc(event.body)+'</small></span>'+icon('chevron');button.onclick=()=>openPartnerRequest(event.requestId,openNotifications);body.append(button)});
    sheet.open({title:'Уведомления',body});
  }
  function openPartnerRequests(returnTo) {
    const body=element('partner-request-list');
    partnerRequests.forEach(request=>{const button=document.createElement('button');button.type='button';button.className='partner-request-row';button.innerHTML='<span><small>'+(request.kind==='installation'?'МОНТАЖ':'ЗАМЕР')+'</small><strong>'+esc(request.client||'Без имени')+'</strong><em>'+esc(request.organizationName||request.storeName||'Магазин')+' · '+esc(requestScheduleLabel(request))+'</em></span>'+icon('chevron');button.onclick=()=>openPartnerRequest(request.id,()=>openPartnerRequests(returnTo));body.append(button)});
    if(!partnerRequests.length)body.innerHTML='<p class="section-caption">Заявок магазинов пока нет.</p>';
    sheet.open({title:'Заявки магазинов',body,onBack:returnTo});
  }
  function openPartnerRequest(id,returnTo) {
    const request=partnerRequests.find(item=>item.id===id);if(!request)return openPartnerRequests(returnTo);
    const body=element('partner-request-detail');
    body.innerHTML='<section class="store-access-hero"><small>'+(request.kind==='installation'?'Монтаж':'Замер')+' · '+esc(request.organizationName||request.storeName||'Магазин')+'</small><h2>'+esc(request.client||'Без имени')+'</h2><p>'+esc(requestScheduleLabel(request))+'</p></section><section class="detail-facts">'+[
      ['phone','Телефон',request.phone],['pin','Адрес',request.address],['note','Комментарий менеджера',request.managerComment]
    ].filter(([, ,v])=>v).map(([name,label,value])=>'<div class="detail-fact"><span class="detail-fact-icon">'+icon(name)+'</span><span><small>'+label+'</small><strong>'+esc(value)+'</strong></span></div>').join('')+'</section>';
    const controls=element('detail-actions');
    if(request.phone){const link=document.createElement('a');link.className='button detail-primary';link.href='tel:'+String(request.phone).replace(/[^+\d]/g,'');link.innerHTML=icon('phone')+'Позвонить клиенту';controls.append(link)}
    if(partnerRequestService&&request.stage==='installer_review')controls.append(actionButton(request.kind==='installation'?'Назначить монтаж':'Назначить замер','calendar',()=>openPartnerSchedule(request,()=>openPartnerRequest(id,returnTo)),true));
    if(partnerRequestService&&request.kind==='measure'&&request.stage==='scheduled')controls.append(actionButton('Заполнить замер','measure',()=>openMeasurementEditor(request,()=>openPartnerRequest(id,returnTo)),true));
    if(request.measurement){
      const m=normalizeMeasurementResult(request.measurement);
      const works=m.additionalWorks.map(w=>'<li>'+esc(w.title)+' <b>'+money(w.price)+'</b></li>').join('');
      body.insertAdjacentHTML('beforeend','<section class="measurement-result-card"><small>РЕЗУЛЬТАТ ЗАМЕРА</small><h3>'+esc(m.doorSize||'Размер двери не указан')+(m.handing?' · '+esc(m.handing):'')+'</h3>'+(m.openingWidth&&m.openingHeight?'<p>Проём '+m.openingWidth+' × '+m.openingHeight+' мм</p>':'')+'<p>Монтаж '+money(m.installationPrice)+'</p>'+(works?'<ul>'+works+'</ul>':'')+'<strong>Итого '+money(m.total)+'</strong>'+(m.installerComment?'<p>'+esc(m.installerComment)+'</p>':'')+'</section>');
      if(partnerRequestService&&request.kind==='measure'&&!request.installationRequestId)controls.append(actionButton('Создать монтаж','tools',()=>openInstallationFromMeasurement(request,()=>openPartnerRequest(id,returnTo)),true));
    }
    body.append(controls);sheet.open({title:'Заявка магазина',body,onBack:returnTo});
  }
  function openPartnerSchedule(request,returnTo) {
    const form=document.createElement('form');form.className='simple-form';form.innerHTML='<label>Дата<input name="date" type="date" required></label><label>Время<input name="time" type="time"></label><p class="section-caption">После сохранения магазин увидит согласованную дату.</p><button class="button primary" type="submit">Сохранить дату</button>';
    form.onsubmit=async e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(form));await partnerRequestService.assign(request.id,values);notify('Дата согласована');returnTo()}catch(error){notify(error.message)}};
    sheet.open({title:request.kind==='installation'?'Назначить монтаж':'Назначить замер',body:form,onBack:returnTo});
  }
  function openMeasurementEditor(request,returnTo) {
    const form=document.createElement('form');form.className='simple-form measurement-form';form.innerHTML='<div class="form-grid"><label>Ширина проёма, мм<input name="openingWidth" inputmode="numeric"></label><label>Высота, мм<input name="openingHeight" inputmode="numeric"></label></div><label>Рекомендуемая дверь<input name="doorSize" placeholder="860 × 2050"></label><label>Открывание<select name="handing"><option value="">Не указано</option><option>Левая</option><option>Правая</option></select></label><label>Монтаж, ₽<input name="installationPrice" inputmode="numeric" placeholder="0"></label><div class="additional-works"><div class="section-row"><h3>Дополнительные работы</h3><button type="button" class="button add-work">+ Работа</button></div><div class="work-rows"></div></div><label>Комментарий замерщика<textarea name="installerComment" rows="3"></textarea></label><p class="measurement-total">Итого: <strong>0 ₽</strong></p><button class="button primary" type="submit">Завершить замер</button>';
    const rows=form.querySelector('.work-rows'),addWork=()=>{const row=element('work-row','<input data-work-title placeholder="Например, расширение проёма"><input data-work-price inputmode="numeric" placeholder="₽"><button type="button" aria-label="Удалить">×</button>');row.querySelector('button').onclick=()=>{row.remove();recalc()};row.querySelectorAll('input').forEach(i=>i.oninput=recalc);rows.append(row)};
    const recalc=()=>{const base=Number(form.elements.installationPrice.value)||0;let total=base;rows.querySelectorAll('.work-row').forEach(r=>total+=Number(r.querySelector('[data-work-price]').value)||0);form.querySelector('.measurement-total strong').textContent=money(total)};
    form.querySelector('.add-work').onclick=addWork;form.elements.installationPrice.oninput=recalc;addWork();
    form.onsubmit=async e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(form));values.additionalWorks=[...rows.querySelectorAll('.work-row')].map((r,i)=>({id:'work-'+i,title:r.querySelector('[data-work-title]').value,price:r.querySelector('[data-work-price]').value}));await partnerRequestService.completeMeasurement(request.id,values);notify('Замер выполнен');returnTo()}catch(error){notify(error.message)}};
    sheet.open({title:'Результат замера',body:form,onBack:returnTo});
  }
  function openInstallationFromMeasurement(request,returnTo) {
    const form=document.createElement('form');form.className='simple-form';form.innerHTML='<p class="section-caption">Если дату уже согласовали с клиентом — назначьте её сейчас. Если нет, монтаж останется входящей заявкой.</p><label>Дата монтажа<input name="date" type="date"></label><label>Время<input name="time" type="time"></label><button class="button primary" type="submit">Создать монтаж</button>';
    form.onsubmit=async e=>{e.preventDefault();try{await partnerRequestService.createInstallation(request.id,Object.fromEntries(new FormData(form)));notify('Монтаж создан');returnTo()}catch(error){notify(error.message)}};
    sheet.open({title:'Создать монтаж',body:form,onBack:returnTo});
  }
  function openStores() {
    const body=element('sheet-choices');
    if(storeService&&!readOnly)body.append(actionButton('Подключить магазин','plus',()=>openStoreEditor(null)));
    for(const store of state.snapshot.state.stores||[]){
      const access=storeAccessSummary(store),button=document.createElement('button');button.type='button';button.className='button store-access-row';
      button.innerHTML=icon('store')+'<span><strong>'+esc(store.name)+'</strong><small>'+(access.members.length?access.members.length+' сотрудников · '+access.pending+' приглашений':'Доступ ещё не настроен')+'</small></span>'+icon('chevron');
      button.onclick=()=>openStoreCard(store.id);body.append(button);
    }
    if(!body.children.length)body.innerHTML='<p>Магазины пока не добавлены.</p>';
    sheet.open({title:'Магазины',body});
  }
  function openStoreCard(id) {
    const store=(state.snapshot.state.stores||[]).find(s=>s.id===id);if(!store)return openStores();
    const access=storeAccessSummary(store),body=element('store-access-card');
    body.innerHTML='<section class="store-access-hero"><small>Партнёр MONTRA</small><h2>'+esc(store.name)+'</h2><p>'+esc(store.address||'Адрес не указан')+'</p></section><section class="store-access-summary"><article><b>'+access.members.length+'</b><span>сотрудников</span></article><article><b>'+access.active+'</b><span>активны</span></article><article><b>'+access.pending+'</b><span>приглашены</span></article></section><div class="section-row"><h3>Доступ сотрудников</h3></div>';
    const list=element('store-member-list');
    access.members.forEach(member=>{const row=element('store-member-row','<span><strong>'+esc(member.name)+'</strong><small>'+esc(member.email)+' · '+STORE_ROLES[member.role]+'</small></span><em>'+ (member.status==='active'?'Активен':'Приглашён') +'</em>');list.append(row)});
    if(!access.members.length)list.innerHTML='<p class="section-caption">Пока никто не приглашён. Добавьте администратора или менеджера магазина.</p>';
    body.append(list);
    if(storeService&&!readOnly)body.append(actionButton('Пригласить сотрудника','plus',()=>openStoreInvite(id),true),actionButton('Редактировать магазин','edit',()=>openStoreEditor(id)));
    sheet.open({title:'Магазин',body,onBack:openStores});
  }
  function openStoreInvite(id) {
    const store=(state.snapshot.state.stores||[]).find(s=>s.id===id);if(!store)return;
    const form=document.createElement('form');form.className='simple-form';
    form.innerHTML='<label>Имя сотрудника<input name="name" required placeholder="Анна"></label><label>E-mail<input name="email" type="email" required placeholder="manager@example.ru"></label><label>Роль<select name="role"><option value="manager">Менеджер</option><option value="admin">Администратор магазина</option></select></label><p class="section-caption">Пока это безопасный preview доступа. Реальная отправка приглашения включится вместе с Auth и отдельными Firestore memberships.</p><button class="button primary" type="submit">Создать приглашение</button>';
    form.onsubmit=async event=>{event.preventDefault();try{const member=createStoreMemberCommand(Object.fromEntries(new FormData(form)));const members=[...(store.members||[]),member];const next=await storeService.update(store.id,{members});const current=state.snapshot.state;state.setState({...current,stores:current.stores.map(s=>s.id===next.id?next:s)});notify('Приглашение создано');openStoreCard(id)}catch(e){notify(e.message||'Не удалось создать приглашение')}};
    sheet.open({title:'Доступ к '+store.name,body:form,onBack:()=>openStoreCard(id)});
  }
  function openStoreEditor(id) {
    if(!storeService||readOnly)return;
    const store=(state.snapshot.state.stores||[]).find(s=>s.id===id);
    const form=createStoreForm({store:store||{},onCancel:openStores,onSubmit:async patch=>{
      try{const next=store?await storeService.update(store.id,patch):await storeService.create(patch);const current=state.snapshot.state;state.setState({...current,stores:store?current.stores.map(s=>s.id===next.id?next:s):[...current.stores,next]});openStores()}catch(e){notify(e.message)}
    }});
    if(store)form.append(actionButton('Удалить из справочника','close',()=>{
      const body=element('simple-form','<p>Исторические заявки сохранят название магазина.</p>');
      body.append(actionButton('Удалить магазин','close',async()=>{try{await storeService.remove(id);const current=state.snapshot.state;state.setState({...current,stores:current.stores.filter(s=>s.id!==id)});openStores()}catch(e){notify(e.message)}}));
      sheet.open({title:'Удалить магазин?',body,onBack:()=>openStoreEditor(id)});
    }));
    sheet.open({title:store?'Редактировать магазин':'Новый магазин',body:form,onBack:openStores});
  }
  bell.onclick=openNotifications;
  add.onclick=openQuickAdd;
  names.forEach((name,i)=>{
    const button=document.createElement('button');button.type='button';button.dataset.route=name;button.setAttribute('aria-label',navItems[i][0]);
    button.innerHTML='<span class="app-nav-icon">'+icon(navItems[i][1])+'</span><span class="app-nav-label">'+navItems[i][0]+'</span>';
    button.onclick=()=>navigate(name);nav.append(button);
  });
  const disposePartner=partnerRequestService?.subscribe?.(requests=>{partnerRequests=requests;refreshBell()});
  let previous=state.snapshot, queued=false;
  state.subscribe(snapshot=>{
    paintConnection(snapshot.dataStatus);
    const changed=previous.state!==snapshot.state||previous.notes!==snapshot.notes;previous=snapshot;
    if(changed&&!queued){queued=true;queueMicrotask(()=>{queued=false;if(root.isConnected)renderRoute(router.current||'today')})}
  });
  state.setDataStatus(demo?'ready':'idle');
  router.render([...names,'notes'].includes(initialRoute)?initialRoute:'today').then(()=>enterScreen(content));
  return {state,router,root,openJob,openPartnerRequests,setCacheStatus(value){cacheStatus=value;if(router.current==='more')renderRoute('more')}};
};
