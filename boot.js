const legacyStyles = new Set([
  'ux-upgrades.css',
  'premium-field-tech.css',
  'montaji-design-v2.css',
  'dark-theme.css',
  'notes-theme.css'
]);

document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
  const name = new URL(link.href, location.href).pathname.split('/').pop();
  if (legacyStyles.has(name)) link.remove();
});

document.querySelectorAll('style').forEach(style => {
  if (style.textContent.includes('FINAL TODAY IMPORTANT CARDS')) style.remove();
});

const cleanTheme = document.createElement('link');
cleanTheme.rel = 'stylesheet';
cleanTheme.href = 'montaji-clean.css?v=20260907-1';
document.head.appendChild(cleanTheme);

import('./app.js').catch(error => {
  console.error('Montaji boot failed', error);
  const el = document.querySelector('#syncStatus');
  if (el) {
    el.textContent = 'Ошибка запуска';
    el.dataset.state = 'offline';
  }
});
