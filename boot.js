/* MONТАЖИ — single application entry point.
   All application logic lives in app.js. No runtime source rewriting,
   no post-load patches, no duplicate Firebase clients.

   Production safety: Firestore can fail a first server read transiently.
   The app itself listens for the browser "online" event and retries the
   canonical shared-data load. We use that existing path instead of
   touching, replacing, or recreating the database.
*/
import './app.js?v=20260825-safe1';

const retry = () => window.dispatchEvent(new Event('online'));

// A failed first getDocFromServer() must not leave the app permanently dead.
// Retry a few times; successful load starts the existing realtime listener.
let attempts = 0;
const timer = setInterval(() => {
  const status = document.querySelector('#syncStatus');
  if (!status) return;
  const text = status.textContent || '';
  if (/База недоступна|Нет связи с общей базой/.test(text) && attempts < 6) {
    attempts += 1;
    retry();
  }
  if (/синхронизировано|обновлено/.test(text)) {
    clearInterval(timer);
  }
}, 2000);

// Give the user an explicit safe retry without changing any stored data.
const observer = new MutationObserver(() => {
  const status = document.querySelector('#syncStatus');
  if (!status) return;
  const failed = /База недоступна|Нет связи с общей базой/.test(status.textContent || '');
  let button = document.querySelector('#safeDbRetry');
  if (failed && !button) {
    button = document.createElement('button');
    button.id = 'safeDbRetry';
    button.type = 'button';
    button.textContent = 'Повторить подключение';
    button.style.cssText = 'position:fixed;z-index:9999;right:18px;top:112px;padding:10px 14px;border:0;border-radius:12px;background:#5f6d4c;color:#fff;font:600 14px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.15)';
    button.onclick = () => { button.remove(); retry(); };
    document.body.appendChild(button);
  }
  if (!failed && button) button.remove();
});
observer.observe(document.documentElement, {childList:true, subtree:true, characterData:true});
