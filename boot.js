const APP_URL = new URL('app.js?runtime=20260825-direct-module', location.href);

async function boot(){
  try {
    await import(APP_URL.href);
  } catch (error) {
    console.error('Montaji boot failed', error);
    const el = document.querySelector('#syncStatus');
    if (el) {
      el.textContent = 'Ошибка запуска';
      el.dataset.state = 'offline';
    }
    const message = error?.message || String(error);
    const authMessage = document.querySelector('#authMessage');
    if (authMessage) {
      authMessage.textContent = `Не удалось запустить приложение. ${message}`;
      authMessage.className = 'auth-message auth-message--error';
    }
    const toast = document.querySelector('#toast');
    if (toast) {
      toast.textContent = 'Не удалось запустить приложение.';
      toast.dataset.state = 'error';
    }
  }
}

boot();
