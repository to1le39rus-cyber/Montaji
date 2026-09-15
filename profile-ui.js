const PROFILE_CSS = './modules/profile-ui.css?v=20260915-profile2';

let currentUser = null;
let lastJobSignature = '';
let sheetRoot = null;

function injectStyles() {
  if (document.querySelector(`link[href^="./modules/profile-ui.css"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = PROFILE_CSS;
  document.head.append(link);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;'
  }[char]));
}

function getRuntime() {
  const email = document.querySelector('#authEmail')?.value?.trim() || '';
  const displayName = currentUser?.displayName?.trim() || '';
  const firstName = displayName.split(/\s+/)[0] || (email.includes('@') ? email.split('@')[0].split(/[._-]/)[0] : 'Анатолий');
  const state = window.__montajiProfileState || {};
  return { email, name: firstName || 'Анатолий', state };
}

function initials(name) {
  return String(name || 'А').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'А';
}

function avatarMarkup(name, large = false) {
  return `<div class="profile-avatar${large ? ' profile-avatar--large' : ''}" aria-hidden="true">${escapeHtml(initials(name))}</div>`;
}

function ensureHeader() {
  const header = document.querySelector('.topbar');
  if (!header || document.querySelector('#profileBell')) return;
  const left = header.firstElementChild;
  if (!left) return;

  const { name, state } = getRuntime();
  const greeting = document.createElement('div');
  greeting.className = 'profile-greeting';
  greeting.innerHTML = `${avatarMarkup(name)}<div class="profile-copy"><div class="profile-hello">Привет, ${escapeHtml(name)}! 👋</div><div class="profile-sub">Сегодня · Монтажник</div></div>`;
  greeting.querySelector('.profile-avatar').addEventListener('click', openProfile);
  left.replaceWith(greeting);

  const right = header.querySelector('.top-actions');
  if (!right) return;
  right.classList.add('profile-actions');
  const bell = document.createElement('button');
  bell.type = 'button';
  bell.id = 'profileBell';
  bell.className = 'profile-bell';
  bell.setAttribute('aria-label', 'Уведомления');
  bell.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg><span class="profile-bell-dot"></span>';
  bell.addEventListener('click', openNotifications);
  right.prepend(bell);
  updateBell(state);
}

function buildSheets() {
  if (document.querySelector('#profileSheet')) return;
  sheetRoot = document.createElement('div');
  sheetRoot.innerHTML = `
    <section class="profile-sheet" id="profileSheet" aria-hidden="true">
      <div class="profile-backdrop" data-profile-close="profileSheet"></div>
      <div class="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profileTitle">
        <div class="profile-handle"></div>
        <button class="profile-close" data-profile-close="profileSheet" aria-label="Закрыть">×</button>
        <div class="profile-panel-head">
          ${avatarMarkup(getRuntime().name, true)}
          <div><div class="profile-panel-name" id="profileTitle">${escapeHtml(getRuntime().name)}</div><div class="profile-panel-role">Монтажник</div></div>
        </div>
        <div class="profile-section">
          <button class="profile-row" type="button" data-profile-action="profile"><span><strong>Профиль</strong><small>Имя и фотография</small></span><b>Настроить ›</b></button>
          <button class="profile-row" type="button" data-profile-action="notifications"><span><strong>Уведомления</strong><small>Выезды и изменения базы</small></span><b>Включены</b></button>
          <button class="profile-row profile-disabled" type="button" disabled><span><strong>Мои заметки</strong><small>Личные заметки и списки</small></span><b>Следующий этап</b></button>
        </div>
        <div class="profile-section">
          <div class="profile-row profile-row--static"><span><strong>Аккаунт</strong><small>${escapeHtml(getRuntime().email || 'Авторизованный пользователь')}</small></span><b>В сети</b></div>
        </div>
      </div>
    </section>
    <section class="profile-sheet notice-sheet" id="noticeSheet" aria-hidden="true">
      <div class="profile-backdrop" data-profile-close="noticeSheet"></div>
      <div class="profile-panel" role="dialog" aria-modal="true" aria-labelledby="noticeTitle">
        <div class="profile-handle"></div>
        <button class="profile-close" data-profile-close="noticeSheet" aria-label="Закрыть">×</button>
        <div class="profile-panel-head"><div class="profile-notice-icon">⌁</div><div><div class="profile-panel-name" id="noticeTitle">Уведомления</div><div class="profile-panel-role">Всё важное по работе</div></div></div>
        <div class="profile-section" id="noticeList"></div>
      </div>
    </section>`;
  document.body.append(sheetRoot);
  sheetRoot.querySelectorAll('[data-profile-close]').forEach(el => el.addEventListener('click', () => closeSheet(el.dataset.profileClose)));
  sheetRoot.querySelector('[data-profile-action="notifications"]')?.addEventListener('click', openNotifications);
}

function openSheet(id) {
  const sheet = document.querySelector(`#${id}`);
  if (!sheet) return;
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeSheet(id) {
  const sheet = document.querySelector(`#${id}`);
  if (!sheet) return;
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.profile-sheet.open')) document.body.classList.remove('modal-open');
}

function openProfile() {
  const runtime = getRuntime();
  const title = document.querySelector('#profileTitle');
  const role = document.querySelector('.profile-panel-role');
  if (title) title.textContent = runtime.name;
  if (role) role.textContent = 'Монтажник';
  openSheet('profileSheet');
}

function openNotifications() {
  renderNotifications();
  openSheet('noticeSheet');
  document.querySelector('#profileBell')?.classList.remove('has-new');
}

function extractJobs(state) {
  if (Array.isArray(state?.jobs)) return state.jobs.filter(job => job?.status !== 'Отменён');
  return [...document.querySelectorAll('#todayList .job-card')].map(card => ({ client: card.querySelector('.job-client')?.textContent || 'Выезд', date: '', slot: '' }));
}

function renderNotifications() {
  const list = document.querySelector('#noticeList');
  if (!list) return;
  const jobs = extractJobs(getRuntime().state);
  const today = new Date().toISOString().slice(0, 10);
  const todayJobs = jobs.filter(job => job.date === today);
  const upcoming = jobs.filter(job => job.date && job.date > today).sort((a, b) => `${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`)).slice(0, 3);
  const items = [];
  if (todayJobs.length) items.push({ title: `Сегодня · ${todayJobs.length} ${todayJobs.length === 1 ? 'выезд' : 'выезда'}`, text: 'Актуальные выезды собраны на экране «Сегодня».' });
  upcoming.forEach(job => items.push({ title: job.client || 'Новый выезд', text: `${job.date}${job.time ? ` · ${job.time}` : ''}` }));
  if (!items.length) items.push({ title: 'Пока всё спокойно', text: 'Новых уведомлений нет.' });
  list.innerHTML = items.map(item => `<div class="notice-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></div>`).join('');
}

function updateBell(state) {
  const bell = document.querySelector('#profileBell');
  if (!bell) return;
  const jobs = extractJobs(state);
  const signature = JSON.stringify(jobs.map(job => [job.id, job.date, job.status, job.client]));
  if (lastJobSignature && signature !== lastJobSignature) bell.classList.add('has-new');
  lastJobSignature = signature;
}

function syncRuntime(detail = {}) {
  if (detail.user) currentUser = detail.user;
  if (detail.state) window.__montajiProfileState = detail.state;
  ensureHeader();
  buildSheets();
  updateBell(window.__montajiProfileState || {});
}

function watchApp() {
  const onRuntime = event => syncRuntime(event.detail || {});
  window.addEventListener('montaji:runtime', onRuntime);
  syncRuntime();
  const observer = new MutationObserver(() => {
    if (!document.querySelector('#profileBell')) syncRuntime();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeSheet('profileSheet');
      closeSheet('noticeSheet');
    }
  });
}

injectStyles();
buildSheets();
watchApp();
