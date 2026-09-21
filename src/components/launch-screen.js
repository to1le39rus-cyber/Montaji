const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export const createLaunchScreen=({mount=document.body}={})=>{
 const screen=document.createElement('section');screen.className='launch-screen';screen.setAttribute('aria-label','Запуск приложения');
 screen.innerHTML='<div class="launch-aurora" aria-hidden="true"></div><div class="launch-grain" aria-hidden="true"></div><div class="launch-stage"><div class="launch-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><path class="launch-frame" d="M16 53V11h32v42M12 53h40"/><g class="launch-tools"><path d="M26 39l13-16M24 25l4-4 3 3-4 4M36 38l4 4M34 40l4 4"/><path d="M39 26l-3-3 4-4 3 3z"/></g><path class="launch-door" d="M19 14h25v39H19z"/><circle class="launch-handle" cx="39" cy="34" r="1.2"/></svg><i></i></div><div class="launch-word"><strong>МОНТАЖИ</strong><span>AA</span></div><p>Рабочее пространство</p></div><div class="launch-system"><div class="launch-status"><i></i><span>Запускаем приложение</span></div><div class="launch-progress" aria-hidden="true"><i></i></div></div>';
 mount.prepend(screen);
 const status=screen.querySelector('.launch-status span');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ready=(async()=>{
  requestAnimationFrame(()=>screen.classList.add('is-started'));
  await wait(reduce?80:620);status.textContent='Готовим рабочее пространство';screen.classList.add('is-loading');
  await wait(reduce?80:720);status.textContent='Всё готово';screen.classList.add('is-ready');
  await wait(reduce?60:420);screen.classList.add('is-leaving');
  await wait(reduce?20:480);screen.remove();
 })();
 return {element:screen,ready,dismiss:()=>{screen.remove()}};
};
