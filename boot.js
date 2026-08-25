const APP_URL = new URL('app.js?runtime=20260825-sandbox-loader-2', location.href);
const BASE = 'https://raw.githubusercontent.com/to1le39rus-cyber/Montaji/dev-safe/';

async function boot(){
  try {
    const [appResponse, configResponse] = await Promise.all([
      fetch(`${BASE}app.js`, {cache:'no-store'}),
      fetch(`${BASE}firebase-config.js`, {cache:'no-store'})
    ]);
    if (!appResponse.ok) throw new Error(`app.js HTTP ${appResponse.status}`);
    if (!configResponse.ok) throw new Error(`firebase-config.js HTTP ${configResponse.status}`);

    let source = await appResponse.text();
    const configSource = await configResponse.text();
    source = source.replace("import { firebaseConfig } from './firebase-config.js';", configSource);
    const blob = new Blob([source], {type:'text/javascript'});
    const url = URL.createObjectURL(blob);
    await import(url);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Montaji sandbox boot failed', error);
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
