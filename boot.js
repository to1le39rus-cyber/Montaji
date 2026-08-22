// Production bootstrap.
// The Vercel shell loads this file as inline module code, so app.js must use
// an absolute source URL. That also keeps ./firebase-config.js on the same
// GitHub origin as app.js and removes the old Blob/config injection path.
const legacyNoteButton=document.createElement('button');
legacyNoteButton.id='todayNoteBtn';
legacyNoteButton.type='button';
legacyNoteButton.hidden=true;
document.body.appendChild(legacyNoteButton);

const APP_URL='https://raw.githubusercontent.com/to1le39rus-cyber/Montaji/Astera-smart/app.js?runtime=20260822-6';
import(APP_URL).catch(error=>{
  console.error('Montaji app startup failed',error);
  const el=document.querySelector('#authMessage');
  if(el){
    el.textContent='Ошибка запуска приложения. Обновите страницу.';
    el.className='auth-message auth-message--error';
  }
  const status=document.querySelector('#syncStatus');
  if(status){status.textContent='Ошибка запуска';status.dataset.state='offline';}
});
