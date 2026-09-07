/* Montaji design shell: keep the functional base, then apply exactly one dark theme last. */
const legacyStyles = new Set([
  'ux-upgrades.css',
  'premium-field-tech.css',
  'montaji-design-v2.css',
  'dark-theme.css',
  'notes-theme.css',
  'montaji-clean.css'
]);

document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
  const name = new URL(link.href, location.href).pathname.split('/').pop();
  if (legacyStyles.has(name)) link.remove();
});

/* Remove the old inline Today/notes override. The dark theme owns this cascade now. */
document.querySelectorAll('style').forEach(style => style.remove());

const darkTheme = document.createElement('link');
darkTheme.rel = 'stylesheet';
darkTheme.href = 'dark-theme.css?v=20260907-final';
document.head.appendChild(darkTheme);

import('./app.js').catch(error => {
  console.error('Montaji boot failed', error);
  const el = document.querySelector('#syncStatus');
  if (el) {
    el.textContent = 'Ошибка запуска';
    el.dataset.state = 'offline';
  }
});
