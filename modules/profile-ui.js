const STORAGE_KEY = 'montaji-profile-preferences-v1';

const $ = (selector, root = document) => root.querySelector(selector);

const safeRead = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

const safeWrite = value => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
  catch { /* profile preferences are optional */ }
};

const initials = name => String(name || 'А').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'А';

const dayLabel = () => new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

function normalizeName(user, prefs) {
  return prefs.name || user?.displayName || 'Анатолий';
}

function avatarStyle(el, prefs, large = false) {
  if (!el) return;
  el.classList.toggle('profile-avatar--large', large);
  if (prefs.avatar) {
    el.textContent = '';
    el.style.backgroundImage = `url(${prefs.avatar})`;
  } else {
    el.style.backgroundImage = '';
    el.textContent = initials(prefs.name || 'Анатолий');
  }
}

function sheet(kind, title, body) {
  const id = `profileSheet-${kind}`;
  let root = document.getElementById(id);
  if (root) return root;
  root = document.createElement('div');
  root.id = id;
  root.className = `profile-sheet ${kind === 'notice' ? 'notice-sheet' : ''}`;
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<div class="profile-backdrop" data-profile-close></div><section class="profile-panel" role="dialog" aria-modal="true" aria-label="${title}"><div class="profile-handle"></div><button class="profile-close" type="button" data-profile-close aria-label="Закрыть">×</button>${body}</section>`;
  document.body.append(root);
  root.addEventListener('click', e => {
    if (e.target.closest('[data-profile-close]')) closeSheet(root);
  });
  return root;
}

function openSheet(root) {
  document.querySelectorAll('.profile-sheet.open').forEach(x => closeSheet(x));
  root.classList.add('open');
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeSheet(root) {
  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal.open, .profile-sheet.open')) document.body.classList.remove('modal-open');
}

function profileBody(name, role, prefs) {
  const checked = prefs.notifications !== false;
  return `<div class="profile-panel-head"><div class="profile-avatar profile-avatar--large" id="profilePanelAvatar"></div><div><div class="profile-panel-name" id="profilePanelName">${name}</div><div class="profile-panel-role">${role}</div></div></div>
    <div class="profile-section">
      <button class="profile-row" type="button" id="profileSettingsBtn"><span><strong>Профиль</strong><small>Имя, фото и уведомления</small></span><b>Настроить ›</b></button>
      <button class="profile-row" type="button" id="profileNotificationsBtn"><span><strong>Уведомления</strong><small>События и изменения графика</small></span><b>${checked ? 'Включены' : 'Выключены'}</b></button>
    </div>
    <div class="profile-section">
      <button class="profile-row profile-row--static" type="button"><span><strong>Мои заметки</strong><small>Общие заметки синхронизируются через базу</small></span><b>Открыть в Сегодня ›</b></button>
      <button class="profile-row profile-row--static" type="button"><span><strong>Аккаунт</strong><small>${escapeHtml(userEmail())}</small></span><b>В сети</b></button>
    </div>
    <div class="profile-section"><button class="profile-row profile-row--danger" type="button" id="profileLogoutBtn"><span><strong>Выйти</strong><small>Завершить текущую сессию</small></span><b>Выйти ›</b></button></div>`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>\"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[m]));
}

let runtime = { user: null, state: { jobs: [] }, notes: [] };
let prefs = safeRead();
let role = 'Монтажник';
let profileRoot;

function userEmail() {
  return runtime.user?.email || 'Аккаунт подключён';
}

function buildTopbar() {
  const topbar = $('.topbar');
  if (!topbar || topbar.dataset.profileReady === '1') return;
  topbar.dataset.profileReady = '1';
  topbar.innerHTML = `<div class="profile-greeting"><button class="profile-avatar" id="profileAvatarBtn" type="button" aria-label="Открыть профиль"></button><div class="profile-copy"><div class="profile-hello" id="profileHello"></div><div class="profile-sub" id="profileSub"></div></div></div><div class="profile-actions"><span class="sync-dot" id="syncStatus" aria-live="polite"></span><button class="profile-bell" id="profileBell" type="button" aria-label="Уведомления"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span class="profile-bell-dot"></span></button></div>`;
  $('#profileAvatarBtn').addEventListener('click', openProfile);
  $('#profileBell').addEventListener('click', openNotifications);
  renderTopbar();
}

function renderTopbar() {
  const name = normalizeName(runtime.user, prefs);
  const hello = $('#profileHello');
  const sub = $('#profileSub');
  if (hello) hello.textContent = `Привет, ${name}! 👋`;
  if (sub) sub.textContent = `${capitalize(dayLabel())} · ${role}`;
  avatarStyle($('#profileAvatarBtn'), { ...prefs, name });
  const hasAttention = (runtime.state?.jobs || []).some(j => j.status !== 'Выполнен' && j.status !== 'Отменён' && j.date < new Date().toISOString().slice(0, 10));
  $('#profileBell')?.classList.toggle('has-new', prefs.notifications !== false && hasAttention);
}

function capitalize(value) { return value ? value[0].toUpperCase() + value.slice(1) : value; }

function openProfile() {
  const name = normalizeName(runtime.user, prefs);
  profileRoot = sheet('profile', 'Профиль', profileBody(escapeHtml(name), escapeHtml(role), prefs));
  const avatar = $('#profilePanelAvatar', profileRoot);
  avatarStyle(avatar, { ...prefs, name }, true);
  $('#profileSettingsBtn', profileRoot).onclick = openSettings;
  $('#profileNotificationsBtn', profileRoot).onclick = openNotifications;
  $('#profileLogoutBtn', profileRoot).onclick = logout;
  openSheet(profileRoot);
}

function openSettings() {
  const name = normalizeName(runtime.user, prefs);
  const root = sheet('edit', 'Настройки профиля', `<div class="profile-panel-head"><div class="profile-avatar profile-avatar--large" id="profileEditAvatar"></div><div><div class="profile-panel-name">Настройки профиля</div><div class="profile-panel-role">${escapeHtml(role)}</div></div></div><form class="profile-form" id="profileForm"><label>Имя<input id="profileNameInput" value="${escapeHtml(name)}" maxlength="60" autocomplete="name"></label><div class="profile-avatar-editor"><div class="profile-avatar" id="profilePreviewAvatar"></div><label class="avatar-file-label">Выбрать фото<input id="profileAvatarInput" type="file" accept="image/*" hidden></label></div><div class="profile-emoji-row"><span>Или аватар:</span><button type="button" data-avatar="А">А</button><button type="button" data-avatar="М">М</button><button type="button" data-avatar="AA">AA</button></div><label class="profile-row profile-row--static"><span><strong>Уведомления</strong><small>Напоминания о рабочих изменениях</small></span><input id="profileNotifyInput" type="checkbox" ${prefs.notifications !== false ? 'checked' : ''}></label><button class="primary" type="submit">Сохранить</button></form>`);
  avatarStyle($('#profileEditAvatar', root), { ...prefs, name }, true);
  avatarStyle($('#profilePreviewAvatar', root), { ...prefs, name });
  const form = $('#profileForm', root);
  $('#profileNameInput', root).addEventListener('input', e => avatarStyle($('#profilePreviewAvatar', root), { ...prefs, name: e.target.value }));
  $('#profileAvatarInput', root).addEventListener('change', handleAvatarFile);
  root.querySelectorAll('[data-avatar]').forEach(btn => btn.addEventListener('click', () => {
    prefs.avatar = '';
    prefs.avatarLetter = btn.dataset.avatar;
    safeWrite(prefs);
    const n = $('#profileNameInput', root).value.trim() || name;
    avatarStyle($('#profilePreviewAvatar', root), { ...prefs, name: n });
  }));
  form.onsubmit = e => {
    e.preventDefault();
    prefs.name = $('#profileNameInput', root).value.trim() || name;
    prefs.notifications = $('#profileNotifyInput', root).checked;
    safeWrite(prefs);
    renderTopbar();
    closeSheet(root);
    toastProfile('Профиль сохранён');
  };
  openSheet(root);
}

function handleAvatarFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return toastProfile('Нужен файл изображения');
  if (file.size > 2 * 1024 * 1024) return toastProfile('Фото должно быть до 2 МБ');
  const reader = new FileReader();
  reader.onload = () => {
    prefs.avatar = String(reader.result || '');
    prefs.avatarLetter = '';
    const root = e.target.closest('.profile-sheet');
    const name = $('#profileNameInput', root)?.value || 'Анатолий';
    avatarStyle($('#profilePreviewAvatar', root), { ...prefs, name });
  };
  reader.readAsDataURL(file);
}

function openNotifications() {
  const jobs = runtime.state?.jobs || [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const attention = jobs.filter(j => j.status !== 'Выполнен' && j.status !== 'Отменён' && j.date < todayKey);
  const future = jobs.filter(j => j.status === 'Перенос');
  const body = attention.length || future.length ? `${attention.length ? `<div class="notice-item"><strong>Есть просроченные выезды</strong><span>${attention.length} выезд(а/ов) требуют внимания.</span></div>` : ''}${future.length ? `<div class="notice-item"><strong>Есть переносы</strong><span>${future.length} выезд(а/ов) отмечены как перенос.</span></div>` : ''}` : `<div class="profile-notice-icon">✓</div><div class="profile-panel-name" style="margin-top:12px">Пока всё спокойно</div><div class="profile-panel-role">Новых рабочих уведомлений нет.</div>`;
  const root = sheet('notice', 'Уведомления', `<div class="profile-panel-head"><div class="profile-notice-icon">♢</div><div><div class="profile-panel-name">Уведомления</div><div class="profile-panel-role">Изменения по рабочим выездам</div></div></div><div class="profile-section">${body}</div>`);
  openSheet(root);
}

function logout() {
  const button = $('#logoutBtn');
  if (button) { button.click(); return; }
  toastProfile('Кнопка выхода недоступна');
}

function toastProfile(text) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.dataset.state = 'normal';
  clearTimeout(toastProfile.timer);
  toastProfile.timer = setTimeout(() => { el.textContent = ''; }, 2400);
}

function onRuntime(event) {
  runtime = event.detail || runtime;
  if (runtime.user?.displayName && !prefs.name) {
    prefs.name = runtime.user.displayName;
    safeWrite(prefs);
  }
  buildTopbar();
  renderTopbar();
}

buildTopbar();
window.addEventListener('montaji:runtime', onRuntime);
