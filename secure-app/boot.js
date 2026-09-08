const BASE = 'https://cdn.jsdelivr.net/gh/to1le39rus-cyber/Montaji@ef6f73b9e97c244eda2fa903ec3fb831c90cf6e7/';

async function boot(){
  await import(BASE + 'app.js?stage2=direct-cdn');
  await new Promise(resolve => setTimeout(resolve, 300));
  await import(BASE + 'notes-ui.js?stage2=direct-cdn');
  await import(BASE + 'money-ui-v2.js?stage2=direct-cdn');
  await import(BASE + 'debt-ui.js?stage2=direct-cdn');
}

boot().catch(error => {
  console.error('Montaji boot failed', error);
  const bootEl = document.querySelector('#boot');
  if (bootEl) bootEl.innerHTML = `<div><b>Не удалось загрузить приложение</b><br><small>${String(error?.message || error)}</small></div>`;
});