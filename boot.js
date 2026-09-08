const APP_URL = new URL('app.js?runtime=stage2-direct', location.href);
const NOTES_URL = new URL('notes-ui.js?runtime=stage2-direct', location.href);
const MONEY_UI_URL = new URL('money-ui-v2.js?runtime=stage2-direct', location.href);
const DEBT_UI_URL = new URL('debt-ui.js?runtime=stage2-direct', location.href);

async function boot(){
  // Stage 2: load real ES modules directly. No fetch→Blob→import rewriting.
  await import(APP_URL.href);
  await new Promise(resolve => setTimeout(resolve, 300));
  await import(NOTES_URL.href);
  await import(MONEY_UI_URL.href);
  await import(DEBT_UI_URL.href);
}

boot().catch(error=>{
  console.error('Montaji boot failed', error);
  const bootEl = document.querySelector('#boot');
  if (bootEl) bootEl.innerHTML = `<div><b>Не удалось загрузить приложение</b><br><small>${String(error?.message || error)}</small></div>`;
  const toast = document.querySelector('#toast');
  if (toast) {
    toast.textContent = `Не удалось запустить приложение: ${error?.message || 'ошибка'}`;
    toast.dataset.state = 'error';
  }
});
