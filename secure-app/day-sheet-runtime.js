function patchDaySheetSource(source){
  const openStart=source.indexOf('function openDay(d){');
  const archiveStart=source.indexOf('function showDayArchive(d){',openStart);
  if(openStart<0||archiveStart<0) throw new Error('day-sheet patch: openDay boundary not found');
  const fn=`function openDay(d){
    const js=jobsForDate(d),pending=js.filter(j=>!isDone(j)),done=js.filter(isDone),t=dateTotals(d),m=document.createElement('div');
    const visitCard=j=>{
      const time=isMeasure(j)?(j.time||SLOTS[j.slot]||''):SLOTS[j.slot]||j.time||'';
      const amount=isMeasure(j)?num(j.measurePrice||j.price):num(j.price);
      const note=j.comment?'<div class="day-visit-note">'+esc(j.comment)+'</div>':'';
      const address=j.address?'<div class="day-visit-address"><span class="day-visit-address-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg></span><span>'+esc(j.address)+'</span></div>':'';
      const actions=(j.address?mapLinks(j.address):'')+callLink(j.phone)+shareAddress(j)+'<button class="action-chip primary-chip edit" data-id="'+esc(j.id)+'">Открыть</button>';
      return '<article class="day-visit '+(isDone(j)?'is-done':'')+'"><div class="day-visit-head"><div><strong>'+esc(j.client||'Без клиента')+'</strong><span>'+esc(time)+(j.type?' · '+esc(j.type):'')+(j.store?' · '+esc(j.store):'')+'</span></div><b>'+money(amount)+'</b></div>'+address+note+'<div class="day-visit-foot">'+statusLabel(j)+'<div class="day-visit-actions">'+actions+'</div></div></article>';
    };
    const freeCard=s=>'<button class="day-free-slot free-slot" data-slot="'+s+'"><span><strong>Свободное окно</strong><small>'+(s==='1'||s==='2'?'2 часа доступно':'Оставшееся время')+'</small></span><b>＋ Добавить выезд</b></button>';
    m.className='modal open day-sheet-modal';
    m.innerHTML='<div class="backdrop"></div><div class="sheet day-sheet-final"><div class="handle"></div><div class="sheet-head"><div><div class="eyebrow">РАБОЧИЙ ДЕНЬ</div><h2>'+esc(fmtDate(d))+'</h2></div><button class="circle-btn" data-close aria-label="Закрыть">×</button></div><div class="day-summary"><span>'+pending.length+' '+(pending.length===1?'выезд':'выездов')+'</span><strong>'+money(t.net)+'</strong></div><div class="day-stats"><div><small>Доход</small><b>'+money(t.income)+'</b></div><div><small>Расход</small><b>− '+money(t.expenses)+'</b></div><div><small>Чистыми</small><b>'+money(t.net)+'</b></div></div><div class="day-actions"><button id="dayAdd">＋ Выезд</button><button id="dayExpense">− Расход</button><button id="dayNote">＋ Заметка</button></div><div class="day-plan-head"><h3 class="sheet-section">ПЛАН</h3></div><div class="day-timeline">'+['1','2','3'].map(s=>{const j=pending.find(x=>x.type==='Монтаж'&&String(x.slot)===s);return '<section class="day-slot"><div class="slot-title">'+SLOTS[s]+'</div>'+(j?visitCard(j):freeCard(s))+'</section>';}).join('')+'</div>'+(pending.filter(j=>j.type!=='Монтаж').length?'<h3 class="sheet-section day-other-title">ДРУГИЕ ВЫЕЗДЫ</h3>'+pending.filter(j=>j.type!=='Монтаж').map(visitCard).join(''):'')+(done.length?'<button class="archive-day day-history" id="archiveDay">☷&nbsp;&nbsp;Показать историю дня <span>'+done.length+'</span></button>':'<button class="archive-day day-history" id="archiveDay">☷&nbsp;&nbsp;Показать историю дня</button>')+(t.unpaid?'<button class="debt-banner" data-open-debts="1">💰 Не оплачено: '+money(t.unpaid)+' · открыть долги</button>':'')+'</div>';
    document.body.append(m);
    m.querySelector('.backdrop').onclick=()=>m.remove();
    m.querySelector('[data-close]').onclick=()=>m.remove();
    m.querySelector('#dayAdd').onclick=()=>{m.remove();openJob(null,d,freeSlot(d),'Монтаж')};
    m.querySelector('#dayExpense').onclick=()=>{m.remove();openExpense(d)};
    m.querySelector('#dayNote').onclick=()=>{m.remove();openNote()};
    m.querySelector('#archiveDay').onclick=()=>{m.remove();showDayArchive(d)};
    m.querySelectorAll('.free-slot').forEach(b=>b.onclick=()=>{m.remove();openJob(null,d,b.dataset.slot,'Монтаж')});
    m.querySelectorAll('.edit').forEach(b=>b.onclick=()=>{m.remove();openJob(b.dataset.id)});
    bindQuickActions(m);
  }
  `;
  return source.slice(0,openStart)+fn+source.slice(archiveStart);
}
