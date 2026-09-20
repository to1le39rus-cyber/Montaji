const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
import { icon } from '../ui/icons.js';
const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
const statusKey=status=>({'Запланировано':'planned','Выполнен':'done','Перенесен':'moved','Отменен':'cancelled'}[status]||'neutral');
export const createJobCard=({job,onOpen=()=>{},onComplete=()=>{},onPaid=()=>{}})=>{
 const el=document.createElement('article'); el.className='job-card'; el.dataset.jobId=job.id; el.dataset.status=statusKey(job.status);
 const actions=(job.phone?'<a class="job-card-action" href="tel:'+esc(job.phone)+'" aria-label="Позвонить клиенту">'+icon('phone')+'<span>Позвонить</span></a>':'')+(job.status==='Выполнен'?'': '<button type="button" data-action="complete">Выполнить</button>')+(job.paid===false?'<button type="button" data-action="paid">Оплачено</button>':'');
 el.innerHTML='<button class="job-card-main" type="button"><div class="job-card-top"><div class="job-card-identity"><span>'+esc(job.type||'Монтаж')+' · слот '+esc(job.slot||'1')+'</span><strong>'+esc(job.client||'Без клиента')+'</strong></div><span class="job-card-status"><i></i>'+esc(job.status||'')+'</span></div>'+(job.address?'<div class="job-card-address">'+icon('pin')+'<span>'+esc(job.address)+'</span></div>':'')+'<div class="job-card-bottom"><strong>'+money(job.price)+'</strong><span class="job-payment '+(job.paid===false?'is-unpaid':'is-paid')+'">'+(job.paid===false?'Не оплачено':'Оплачено')+'</span></div></button><div class="job-card-actions">'+actions+'</div>';
 el.querySelector('.job-card-main').addEventListener('click',()=>onOpen(job));
 el.querySelector('[data-action="complete"]')?.addEventListener('click',()=>onComplete(job));
 el.querySelector('[data-action="paid"]')?.addEventListener('click',()=>onPaid(job));
 return el;
};
