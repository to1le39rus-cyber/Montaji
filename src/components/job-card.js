const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
const statusKey=status=>({'Запланировано':'planned','Выполнен':'done','Перенесен':'moved','Отменен':'cancelled'}[status]||'neutral');
const icon=(name)=>({pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',briefcase:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V5h6v2"/><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M3 12h18M9 12v2m6-2v2"/></svg>',clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'}[name]||'');
export const createJobCard=({job,onOpen=()=>{},onComplete=()=>{},onPaid=()=>{}})=>{
 const el=document.createElement('article'); el.className='job-card'; el.dataset.jobId=job.id; el.dataset.status=statusKey(job.status);
 const actions=(job.status==='Выполнен'?'': '<button type="button" data-action="complete">Выполнить</button>')+
   (job.paid===false?'<button type="button" data-action="paid">Оплачено</button>':'');
 el.innerHTML='<button class="job-card-main" type="button"><div class="job-card-top"><strong>'+esc(job.client||'Без клиента')+'</strong><span class="job-card-status"><i></i>'+esc(job.status||'')+'</span></div><div class="job-card-meta"><span>'+icon('briefcase')+esc(job.type||'Монтаж')+'</span><span>'+icon('clock')+'Слот '+esc(job.slot||'1')+'</span></div>'+(job.address?'<div class="job-card-address">'+icon('pin')+'<span>'+esc(job.address)+'</span></div>':'')+'<div class="job-card-bottom"><strong>'+money(job.price)+'</strong><span class="job-payment '+(job.paid===false?'is-unpaid':'is-paid')+'">'+(job.paid===false?'Не оплачено':'Оплачено')+'</span></div></button><div class="job-card-actions">'+actions+'</div>';
 el.querySelector('.job-card-main').addEventListener('click',()=>onOpen(job));
 el.querySelector('[data-action="complete"]')?.addEventListener('click',()=>onComplete(job));
 el.querySelector('[data-action="paid"]')?.addEventListener('click',()=>onPaid(job));
 return el;
};
