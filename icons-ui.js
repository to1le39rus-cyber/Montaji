(()=>{
  const ICONS={
    home:'<path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    money:'<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M7 9h.01M17 16h.01"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5"/><path d="M16 5.5a3 3 0 0 1 0 5.5M17 15c2.2.4 3.5 2 4 5"/>',
    more:'<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>',
    phone:'<path d="M7 3.5 4.8 5.7c-.8.8-.6 2.5.5 4.5 1.4 2.6 3.9 5.1 6.5 6.5 2 1.1 3.7 1.3 4.5.5l2.2-2.2-3.2-2.2-1.8 1.2c-1.5-.8-3.5-2.8-4.3-4.3l1.2-1.8L8.2 5z"/>',
    share:'<path d="M12 15V3"/><path d="m7.5 7.5 4.5-4.5 4.5 4.5"/><path d="M5 12v7h14v-7"/>',
    open:'<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 13v6H4V5h6"/>',
    route:'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3c4 0 2-8 5-10"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    paid:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M7 13h10"/><circle cx="12" cy="12.5" r="2.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
    edit:'<path d="m4 20 4.2-1 9.6-9.6a2.2 2.2 0 0 0-3.2-3.2L5 15.8z"/><path d="m13.5 7.5 3 3"/>',
    archive:'<path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3zM8 11h8"/>',
    restore:'<path d="M5 7v5h5"/><path d="M5.5 12A7 7 0 1 0 7 6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>', back:'<path d="m15 18-6-6 6-6"/>', forward:'<path d="m9 18 6-6-6-6"/>',
    bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
    download:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
    map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    location:'<circle cx="12" cy="10" r="3"/><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  const svg=n=>`<svg class="mi mi-${n}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[n]||ICONS.more}</svg>`;
  const wrap=(el,n)=>{if(!el||el.querySelector('.mi'))return;el.classList.add('iconized');el.insertAdjacentHTML('afterbegin',svg(n));};
  function run(){
    document.querySelectorAll('.bottom-nav .nav').forEach(b=>{
      const sp=b.querySelector('span'); if(!sp)return;
      const s=b.dataset.screen||'';
      const n=s.includes('today')?'home':s.includes('schedule')?'calendar':s.includes('money')?'money':s.includes('clients')?'users':'more';
      sp.classList.add('nav-icon');
      if(!sp.querySelector('.mi')){sp.textContent='';sp.insertAdjacentHTML('afterbegin',svg(n));}
    });
    document.querySelectorAll('.map-chip').forEach(a=>wrap(a,/2ГИС/i.test(a.textContent)?'map':'location'));
    document.querySelectorAll('.action-chip').forEach(el=>{const t=el.textContent.trim();const n=t==='Позвонить'?'phone':t==='Отправить адрес'?'share':t==='Открыть'?'open':t==='Изм.'?'edit':t==='Архив'?'archive':t==='Вернуть'?'restore':null;if(n)wrap(el,n);});
    document.querySelectorAll('[data-quick="route"]').forEach(el=>wrap(el,'route'));document.querySelectorAll('[data-quick="done"]').forEach(el=>wrap(el,'check'));document.querySelectorAll('[data-quick="paid"]').forEach(el=>wrap(el,'paid'));
    document.querySelectorAll('.quick-inline .text-btn,#todayNoteBtn').forEach(el=>{const t=el.textContent.trim();wrap(el,t.includes('Доход')?'plus':t.includes('Расход')?'minus':'plus');});
    document.querySelectorAll('#prevMonth,#nextMonth').forEach(el=>wrap(el,el.id==='prevMonth'?'back':'forward'));
    document.querySelectorAll('.circle-btn').forEach(el=>{if(el.id==='themeBtn')wrap(el,'sun');else if(el.textContent.trim()==='×')wrap(el,'close');});
    const fab=document.querySelector('#addBtn');if(fab)wrap(fab,'plus');
    document.querySelectorAll('.setting-row b').forEach(el=>{if(el.querySelector('.mi'))return;el.classList.add('iconized');el.insertAdjacentHTML('afterbegin',svg(/JSON|Excel/.test(el.textContent)?'download':'forward'));});
    document.querySelectorAll('.status-pill').forEach(el=>{if(el.querySelector('.mi'))return;const t=el.textContent.trim();const n=t.includes('Выполнен')?'check':t.includes('В пути')?'route':t.includes('На объекте')?'location':'clock';el.insertAdjacentHTML('afterbegin',svg(n));});
    document.querySelectorAll('.detail-line').forEach(el=>{if(el.textContent.trim().startsWith('📍')){el.textContent=el.textContent.trim().replace(/^📍\s*/,'');el.insertAdjacentHTML('afterbegin',svg('location'));}});
  }
  const style=document.createElement('style');style.textContent=`
    .mi{width:16px;height:16px;display:inline-block;vertical-align:-3px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
    .iconized{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px}
    .map-chip.iconized{min-width:64px}.action-chip .mi{width:15px;height:15px}.quick-actions button.iconized{gap:5px}
    .bottom-nav{position:fixed!important;z-index:80!important;left:12px!important;right:12px!important;bottom:max(10px,env(safe-area-inset-bottom))!important;width:auto!important;height:76px!important;padding:7px!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;align-items:stretch!important;background:rgba(255,255,255,.94)!important;border:1px solid rgba(20,30,22,.10)!important;border-radius:25px!important;box-shadow:0 12px 36px rgba(20,30,22,.13),0 2px 8px rgba(20,30,22,.06)!important;backdrop-filter:blur(24px)!important;-webkit-backdrop-filter:blur(24px)!important;overflow:hidden!important}
    .bottom-nav .nav{position:relative!important;min-width:0!important;height:60px!important;border:0!important;border-radius:19px!important;background:transparent!important;color:#8a908a!important;padding:6px 2px!important;margin:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;-webkit-tap-highlight-color:transparent!important;transition:background .18s ease,color .18s ease,transform .18s ease!important}
    .bottom-nav .nav:active{transform:scale(.96)!important}.bottom-nav .nav.active{color:#263126!important;background:#e9eee6!important}
    .bottom-nav .nav .nav-icon{display:grid!important;place-items:center!important;width:28px!important;height:27px!important;margin:0!important;padding:0!important;background:transparent!important;font-size:0!important;line-height:0!important;color:inherit!important}
    .bottom-nav .nav .nav-icon::before,.bottom-nav .nav .nav-icon::after{content:none!important;display:none!important}
    .bottom-nav .nav .nav-icon .mi{width:22px!important;height:22px!important;stroke-width:1.85!important}
    .bottom-nav .nav small{display:block!important;margin:0!important;font-size:10px!important;line-height:12px!important;font-weight:600!important;letter-spacing:-.01em!important;white-space:nowrap!important}.bottom-nav .nav.active small{font-weight:700!important}
    .app{padding-bottom:calc(98px + env(safe-area-inset-bottom))!important}.fab{bottom:calc(100px + env(safe-area-inset-bottom))!important}#toast{bottom:calc(100px + env(safe-area-inset-bottom))!important}
    .fab.iconized{font-size:0}.fab.iconized .mi{width:23px;height:23px}.circle-btn.iconized{font-size:0}.setting-row b.iconized{gap:4px}.status-pill .mi{width:12px;height:12px;vertical-align:-2px}.detail-line .mi{margin-right:5px;vertical-align:-3px}
    @media(max-width:380px){.bottom-nav{left:9px!important;right:9px!important;border-radius:23px!important}.bottom-nav .nav small{font-size:9px!important}.bottom-nav .nav .nav-icon .mi{width:21px!important;height:21px!important}}
  `;document.head.appendChild(style);
  run();
  setTimeout(run,300);setTimeout(run,1000);setTimeout(run,2000);
})();