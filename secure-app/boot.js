const APP_URL = new URL('../app.js', location.href);
const MONEY_UI_URL = new URL('../money-ui-v2.js', location.href);
const DEBT_UI_URL = new URL('../debt-ui.js', location.href);

async function boot(){
  await import(APP_URL.href);
  await import(MONEY_UI_URL.href);
  await import(DEBT_UI_URL.href);
}

boot().catch(error=>{
  console.error('Montaji boot failed',error);
  const el=document.querySelector('#syncStatus');
  if(el){el.textContent='Ошибка запуска';el.dataset.state='offline'}
  const toast=document.querySelector('#toast');
  if(toast){toast.textContent=`Не удалось запустить приложение: ${error?.message||'ошибка'}`;toast.dataset.state='error'}
});
