function patchDaySheetSource(source){
  const openStart=source.indexOf('function openDay(d){');
  const archiveStart=source.indexOf('function showDayArchive(d){',openStart);
  if(openStart<0||archiveStart<0) throw new Error('day-sheet patch: openDay boundary not found');
  let fn=source.slice(openStart,archiveStart);
  fn=fn.replace("m.className='modal open'", "m.className='modal open day-sheet-modal'");
  fn=fn.replace('<div class="sheet">','<div class="sheet day-sheet-final">');
  fn=fn.replace(
    '</div><button class="circle-btn" data-close>×</button></div><div class="day-stats">',
    '</div><button class="circle-btn" data-close>×</button></div><div class="day-summary"><span>${pending.length} выезд${pending.length===1?\'\':\'ов\'}</span><strong>${money(t.net)}</strong></div><div class="day-stats">'
  );
  fn=fn.replace('jobCard(j,{compact:true})','jobCard(j,{compact:false})');
  fn=fn.replace(
    '<button class="free-slot" data-slot="${s}">＋ Свободное окно</button>',
    '<button class="free-slot" data-slot="${s}"><span class="free-slot-main"><strong>Свободное окно</strong><small>${s===\'1\'||s===\'2\'?\'2 часа доступно\':\'Оставшееся время\'}</small></span><b>＋ Добавить выезд</b></button>'
  );
  fn=fn.replace('<button class="archive-day" id="archiveDay">Открыть полный день →</button>','<button class="archive-day day-history" id="archiveDay">☷&nbsp;&nbsp;Показать историю дня</button>');
  return source.slice(0,openStart)+fn+source.slice(archiveStart);
}
