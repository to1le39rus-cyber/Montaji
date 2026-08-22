// Production bootstrap: keep the app on a normal module URL so relative imports
// (especially firebase-config.js) resolve exactly like local development.
// The legacy UI binds todayNoteBtn even though the current index does not render it;
// keep a hidden compatibility node until that stale binding is removed from app.js.
const legacyNoteButton=document.createElement('button');
legacyNoteButton.id='todayNoteBtn';
legacyNoteButton.type='button';
legacyNoteButton.hidden=true;
document.body.appendChild(legacyNoteButton);

import('./app.js?runtime=20260822-5').catch(error=>{
  console.error('Montaji app startup failed',error);
  const el=document.querySelector('#authMessage');
  if(el){
    el.textContent='Ошибка запуска приложения. Обновите страницу.';
    el.className='auth-message auth-message--error';
  }
  const status=document.querySelector('#syncStatus');
  if(status){status.textContent='Ошибка запуска';status.dataset.state='offline';}
});
