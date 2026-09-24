import { icon } from '../ui/icons.js';
import { esc, money } from '../ui/format.js';
import { isCompleted, isCancelled, isDebt } from '../domain/jobs.js';

const slotLabel=slot=>({'1':'Первая половина дня','2':'Вторая половина дня','3':'Вечерняя половина','4':'По запросу'}[String(slot)]||'По запросу');

export const statusKey = status => ({'Запланировано':'planned','Выполнен':'done','Перенесен':'moved','Отменен':'cancelled'}[status] || 'neutral');
export const statusMarkup = job => '<span class="job-status" data-status="'+statusKey(job.status)+'">'+icon(isCompleted(job)?'check':isCancelled(job)?'close':job.status==='Перенесен'?'refresh':'clock')+esc(job.status)+'</span>';
export const createJobCard = ({job,onOpen=()=>{},onComplete,onPaid,onRoute,onShare,onMore}) => {
  const card=document.createElement('article');
  card.className='job-card'; card.dataset.jobId=job.id; card.dataset.status=statusKey(job.status);
  const done=isCompleted(job), cancelled=isCancelled(job);
  // Payment is independent of completion; a prepaid planned job must stay visible as paid.
  const payment=job.paid===true?'Оплачено':isDebt(job)?'Долг':'Не оплачено';
  card.innerHTML=`
    <button class="job-card-main" type="button" aria-label="Открыть заявку: ${esc(job.client||'Без имени')}">
      <div class="job-card-kicker"><span>${esc(job.type)}<i></i>${esc(slotLabel(job.slot||'1'))}</span>${job.time?'<time>'+esc(job.time)+'</time>':''}</div>
      <div class="job-card-identity"><h3>${esc(job.client||'Без имени')}</h3><strong>${money(job.type==='Замер'?(job.measurePrice||job.price):job.price)}</strong></div>
      ${job.source?'<p class="job-card-source">'+icon('store')+'<span>'+esc(job.source)+'</span></p>':''}${job.address?'<p class="job-card-address">'+icon('pin')+'<span>'+esc(job.address)+'</span></p>':''}
      ${job.comment?'<p class="job-card-comment">'+icon('note')+'<span>'+esc(job.comment)+'</span></p>':''}
      <div class="job-card-state">${statusMarkup(job)}${!cancelled?'<span class="job-payment'+(isDebt(job)?' is-debt':'')+'">'+(job.paid===true?icon('check'):'')+payment+'</span>':''}</div>
    </button>
    <div class="job-card-actions">
      ${job.address?'<button class="job-route" type="button" data-route>'+icon('route')+'<span>Маршрут</span></button>':''}
      ${job.phone?'<a href="tel:'+esc(String(job.phone).replace(/[^+\d]/g,''))+'" aria-label="Позвонить: '+esc(job.client)+'">'+icon('phone')+'<span>Позвонить</span></a>':''}
      <button class="job-card-more" type="button" data-more aria-label="Действия с заявкой: ${esc(job.client)}">${icon('more')}</button>
    </div>
    ${!cancelled&&((!done&&onComplete)||(isDebt(job)&&onPaid))?'<div class="job-card-command"><button type="button" data-command>'+icon(done?'money':'check')+(done?'Отметить оплату':'Отметить выполнение')+icon('arrow')+'</button></div>':''}
  `;
  card.querySelector('.job-card-main').onclick=()=>onOpen(job);
  card.querySelector('[data-more]').onclick=()=>onMore?onMore(job):onOpen(job);
  card.querySelector('[data-route]')?.addEventListener('click',()=>onRoute?onRoute(job):onOpen(job));
  card.querySelector('[data-command]')?.addEventListener('click',async event=>{
    const button=event.currentTarget; button.disabled=true; button.setAttribute('aria-busy','true');
    try{await (done?onPaid:onComplete)(job)}finally{if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy')}}
  });
  return card;
};
