import { montraMark } from '../ui/brand.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export const createLaunchScreen=({mount=document.body}={})=>{
 const screen=document.createElement('section');screen.className='launch-screen';screen.setAttribute('aria-label','Запуск приложения');
 screen.innerHTML='<div class="launch-aurora" aria-hidden="true"></div><div class="launch-grain" aria-hidden="true"></div><div class="launch-stage"><div class="launch-mark" aria-hidden="true">'+montraMark({className:'launch-montra-mark'})+'<i></i></div><div class="launch-word"><strong>MONTRA</strong></div><p>От заявки до результата.</p></div><div class="launch-system"><div class="launch-status"><i></i><span>Запускаем приложение</span></div><div class="launch-progress" aria-hidden="true"><i></i></div></div>';
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
