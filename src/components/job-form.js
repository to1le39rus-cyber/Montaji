const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const value=(job,key)=>esc(job?.[key]??'');
const types=['Монтаж','Замер','Рекламация','Доставка','Сервис','Доп. доход'];
import { JOB_STATUSES } from '../domain/jobs.js';
const statuses=JOB_STATUSES;

export const createJobForm=({job={},stores=[],onSubmit=()=>{},onCancel=()=>{},onQuickAddStore=null})=>{
 const form=document.createElement('form'); form.className='job-form';
 const storeOptions=(()=>{const current=String(job.source||job.store||'').trim();const names=[...new Set(stores.map(s=>String(s?.name||'').trim()).filter(Boolean))];if(current&&!names.includes(current))names.unshift(current);return names.map(x=>'<option value="'+esc(x)+'"'+(x===current?' selected':'')+'>'+esc(x)+'</option>').join('')})();
 form.innerHTML='<section class="job-form-section"><header><span>01</span><div><strong>Когда и что</strong><small>Работа и место в графике</small></div></header><div class="job-form-grid"><label>Тип<select name="type">'+types.map(x=>'<option'+(x===job.type?' selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Дата<input name="date" type="date" value="'+value(job,'date')+'"></label><label>Слот<input name="slot" type="number" inputmode="numeric" min="1" step="1" value="'+value(job,'slot')+'" placeholder="1"></label></div></section><section class="job-form-section"><header><span>02</span><div><strong>Клиент</strong><small>Контакт и адрес</small></div></header><div class="job-form-grid"><label>Имя<input name="client" value="'+value(job,'client')+'" autocomplete="name" required></label><label>Телефон<input name="phone" inputmode="tel" autocomplete="tel" value="'+value(job,'phone')+'"></label><label class="job-form-wide">Адрес<input name="address" value="'+value(job,'address')+'" autocomplete="street-address"></label></div></section><section class="job-form-section"><header><span>03</span><div><strong>Расчёт и детали</strong><small>Стоимость, источник и комментарий</small></div></header><div class="job-form-grid"><label>Стоимость<input name="price" inputmode="decimal" value="'+value(job,'price')+'"></label><label>Магазин / источник<select name="source"><option value="">Не выбран</option>'+storeOptions+(onQuickAddStore?'<option value="__quick_add_store__">＋ Добавить магазин</option>':'')+'</select><div class="quick-store-add" data-quick-store hidden><input type="text" data-quick-store-name placeholder="Название магазина" autocomplete="organization"><div><button type="button" data-quick-store-cancel>Отмена</button><button type="button" data-quick-store-save>Добавить</button></div></div></label><div class="job-form-wide" data-measure-fields hidden><label>Стоимость замера<input name="measurePrice" inputmode="decimal" value="'+value(job,'measurePrice')+'"></label><label class="native-check"><input name="measurePaid" type="checkbox"'+(job.measurePaid?' checked':'')+'> Замер оплачен</label><label>Зачёт замера<input name="measureCredit" inputmode="decimal" value="'+value(job,'measureCredit')+'"></label></div><label class="job-form-wide">Комментарий<textarea name="comment">'+value(job,'comment')+'</textarea></label></div></section><details class="job-form-more"'+(job.id?' open':'')+'><summary>Состояние заявки</summary><div class="job-form-grid"><label>Статус<select name="status">'+statuses.map(x=>'<option'+(x===job.status?' selected':'')+'>'+x+'</option>').join('')+'</select></label><label class="job-form-completed">Дата выполнения<input name="completedDate" type="date" value="'+value(job,'completedDate')+'"></label><fieldset class="job-form-paid job-form-wide"><legend>Оплата</legend><div class="payment-toggle" role="group" aria-label="Статус оплаты"><button type="button" data-paid-value="false">Не оплачено</button><button type="button" data-paid-value="true">Оплачено</button></div><input name="paid" type="hidden" value="'+(job.paid!==false?'true':'false')+'"></fieldset></div></details><div class="job-form-actions"><button type="button" data-cancel>Отмена</button><button type="submit">'+(job.id?'Сохранить':'Создать заявку')+'</button></div>';
 const syncPaid=()=>{const paid=form.elements.paid.value==='true';form.querySelectorAll('[data-paid-value]').forEach(button=>{const active=button.dataset.paidValue===String(paid);button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active))})};
 const sync=()=>{form.querySelector('[data-measure-fields]').hidden=form.elements.type.value!=='Замер'; const done=form.elements.status.value==='Выполнен'; form.elements.completedDate.disabled=!done; form.querySelector('.job-form-completed')?.classList.toggle('is-disabled',!done);syncPaid()};
 if(onQuickAddStore){
  const source=form.elements.source,box=form.querySelector('[data-quick-store]'),input=form.querySelector('[data-quick-store-name]');
  const hideQuick=()=>{box.hidden=true;input.value=''};
  source.addEventListener('change',()=>{if(source.value==='__quick_add_store__'){source.value='';box.hidden=false;setTimeout(()=>input.focus(),0)}else hideQuick()});
  form.querySelector('[data-quick-store-cancel]')?.addEventListener('click',hideQuick);
  form.querySelector('[data-quick-store-save]')?.addEventListener('click',async()=>{const name=input.value.trim();if(!name)return input.focus();const button=form.querySelector('[data-quick-store-save]');button.disabled=true;try{const store=await onQuickAddStore(name);if(store?.name){const option=document.createElement('option');option.value=store.name;option.textContent=store.name;const addOption=source.querySelector('option[value="__quick_add_store__"]');source.insertBefore(option,addOption);source.value=store.name;hideQuick()}}finally{button.disabled=false}});
 }
 form.elements.type.addEventListener('change',sync); form.elements.status.addEventListener('change',sync); form.querySelectorAll('[data-paid-value]').forEach(button=>button.addEventListener('click',()=>{form.elements.paid.value=button.dataset.paidValue;syncPaid()})); sync();
 const readValue=()=>{
  const fd=new FormData(form);const n=k=>Number(String(fd.get(k)||'').replace(/\s/g,'').replace(',','.'))||0;const slot=Math.max(1,Number(fd.get('slot')||1));
  return {type:String(fd.get('type')||'Монтаж'),date:String(fd.get('date')||''),slot:String(slot),client:String(fd.get('client')||'').trim(),phone:String(fd.get('phone')||'').trim(),price:n('price'),address:String(fd.get('address')||'').trim(),source:String(fd.get('source')||'').trim(),measurePrice:n('measurePrice'),measurePaid:form.elements.measurePaid?.checked===true,measureCredit:n('measureCredit'),comment:String(fd.get('comment')||'').trim(),status:String(fd.get('status')||'Запланировано'),completedDate:String(fd.get('completedDate')||''),paid:form.elements.paid.value==='true'};
 };
 const initial=readValue();
 const same=(a,b)=>Object.is(a,b);
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(form.dataset.saving==='true')return;
  const current=readValue();
  const payload=job.id?Object.fromEntries(Object.entries(current).filter(([key,val])=>!same(val,initial[key]))):current;
  form.dataset.saving='true';
  const submit=form.querySelector('button[type="submit"]');if(submit){submit.disabled=true;submit.textContent='Сохраняем…'}
  try{await onSubmit(payload)}
  finally{form.dataset.saving='false';if(submit){submit.disabled=false;submit.textContent=job.id?'Сохранить':'Создать заявку'}}
 });
 form.querySelector('[data-cancel]').addEventListener('click',onCancel); return form;
};
