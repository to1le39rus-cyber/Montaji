const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
export const createJobCard=({job,onOpen=()=>{},onComplete=()=>{},onPaid=()=>{}})=>{
 const el=document.createElement('article'); el.className='job-card'; el.dataset.jobId=job.id;
 const actions=(job.status==='Выполнен'?'': '<button type="button" data-action="complete">Выполнить</button>')+
   (job.paid===false?'<button type="button" data-action="paid">Оплачено</button>':'');
 el.innerHTML='<button class="job-card-main" type="button"><div class="job-card-top"><strong>'+esc(job.client||'Без клиента')+'</strong><span>'+esc(job.status||'')+'</span></div><div class="job-card-meta">'+esc(job.type||'Монтаж')+' · слот '+esc(job.slot||'1')+'</div>'+(job.address?'<div class="job-card-address">'+esc(job.address)+'</div>':'')+'<div class="job-card-bottom"><strong>'+money(job.price)+'</strong><span>'+(job.paid===false?'Не оплачено':'Оплачено')+'</span></div></button><div class="job-card-actions">'+actions+'</div>';
 el.querySelector('.job-card-main').addEventListener('click',()=>onOpen(job));
 el.querySelector('[data-action="complete"]')?.addEventListener('click',()=>onComplete(job));
 el.querySelector('[data-action="paid"]')?.addEventListener('click',()=>onPaid(job));
 return el;
};
