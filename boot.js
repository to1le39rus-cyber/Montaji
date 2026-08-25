const APP_URL = new URL('app.js?runtime=20260825-sandbox-stable', location.href);

async function boot(){
  const response = await fetch(APP_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  const blob = new Blob([source], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

boot().catch(error => {
  console.error('Montaji sandbox boot failed', error);
  const el = document.querySelector('#syncStatus');
  if (el) {
    el.textContent = 'Ошибка запуска';
    el.dataset.state = 'offline';
  }
  const toast = document.querySelector('#toast');
  if (toast) {
    toast.textContent = 'Не удалось запустить приложение.';
    toast.dataset.state = 'error';
  }
});
