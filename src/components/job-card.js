import { icon } from '../ui/icons.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)||0))+' ₽';
const statusKey=status=>({'Запланировано':'planned','Выполнен':'done','Перенесен':'moved','Отменен':'cancelled'}[status]||'neutral');
const routeUrl=address=>'https://yandex.ru/maps/?rtext=~'+encodeURIComponent(address)+'&rtt=auto';

export const createJobCard=({job,onOpen=()=>{},onComplete=()=>{},onPaid=()=>{}})=>{
 const el=document.createElement('article');el.className='job-card';el.dataset.jobId=job.id;el.dataset.status=statusKey(job.status);
 const completed=job.status==='Выполнен';
 const payment=completed?(job.paid===false?'<span class="job-payment is-unpaid">Не оплачено</span>':'<span class="job-payment is-paid">Оплачено</span>'):'<span class="job-payment is-future">Оплата после выполнения</span>';
 const route=job.address?'<a class="job-card-action is-icon" href="'+routeUrl(job.address)+'" target="_blank" rel="noopener" aria-label="Проложить маршрут">'+icon('route')+'<span>Маршрут</span></a>':'';
 const phone=job.phone?'<a class="job-card-action is-icon" href="tel:'+esc(job.phone)+'" aria-label="Позвонить клиенту">'+icon('phone')+'<span>Позвонить</span></a>':'';
 const share=job.address?'<button class="job-card-action is-icon" type="button" data-action="share">'+icon('share')+'<span>Адрес</span></button>':'';
 const lifecycle=!completed?'<button class="job-card-action is-primary" type="button" data-action="complete">'+icon('check')+'<span>Выполнить</span></button>':job.paid===false?'<button class="job-card-action is-primary" type="button" data-action="paid"><span>Отметить оплату</span></button>':'';
 el.innerHTML='<button class="job-card-main" type="button"><div class="job-card-top"><div class="job-card-identity"><span>'+esc(job.type||'Монтаж')+' · слот '+esc(job.slot||'1')+'</span><strong>'+esc(job.client||'Без клиента')+'</strong></div><span class="job-card-status"><i></i>'+esc(job.status||'')+'</span></div>'+(job.time?'<div class="job-card-time">'+icon('clock')+'<span>'+esc(job.time)+'</span></div>':'')+(job.address?'<div class="job-card-address">'+icon('pin')+'<span>'+esc(job.address)+'</span></div>':'')+(job.comment?'<div class="job-card-comment">'+icon('note')+'<span>'+esc(job.comment)+'</span></div>':'')+'<div class="job-card-bottom"><strong>'+money(job.price)+'</strong>'+payment+'</div></button><div class="job-card-actions">'+route+phone+share+lifecycle+'</div>';
 el.querySelector('.job-card-main').addEventListener('click',()=>onOpen(job));
 el.querySelector('[data-action="complete"]')?.addEventListener('click',()=>onComplete(job));
 el.querySelector('[data-action="paid"]')?.addEventListener('click',()=>onPaid(job));
 el.querySelector('[data-action="share"]')?.addEventListener('click',async()=>{
  const text=[job.client,job.address].filter(Boolean).join(' — ');
  if(navigator.share){try{await navigator.share({title:'Адрес клиента',text})}catch{}}
  else if(navigator.clipboard){await navigator.clipboard.writeText(text)}
 });
 return el;
};
