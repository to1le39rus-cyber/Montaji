const PROFILE_CSS = './modules/profile-ui.css?v=20260915-profile3';

let currentUser = null;
let lastJobSignature = '';
let sheetRoot = null;
const PROFILE_KEY = 'montaji.profile.v1';

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

function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch { return {}; }
}
function saveProfile(patch) {
  const next = { ...loadProfile(), ...patch };
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {}
  return next;
}
function getRuntime() {
  const email = currentUser?.email?.trim() || document.querySelector('#authEmail')?.value?.trim() || '';
  const stored = loadProfile();
  const displayName = stored.name?.trim() || currentUser?.displayName?.trim() || '';
  const firstName = displayName.split(/\s+/)[0] || (email.includes('@') ? email.split('@')[0].split(/[._-]/)[0] : 'Анатолий');
  const state = window.__montajiProfileState || {};
  return { email, name: firstName || 'Анатолий', state, profile: stored };
}
function initials(name) {
  return String(name || 'А').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'А';
}
function avatarMarkup(name, large = false) {
  const profile = loadProfile();
  if (profile.avatar) return `<div class="profile-avatar${large ? ' profile-avatar--large' : ''}" style="background-image:url('${escapeHtml(profile.avatar)}')" aria-label="Аватар"></div>`;
  return `<div class="profile-avatar${large ? ' profile-avatar--large' : ''}" aria-hidden="true">${escapeHtml(profile.emoji || initials(name))}</div>`;
}
function dateLabel() {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}
function ensureHeader() {
  const header = document.querySelector('.topbar');
  if (!header || document.querySelector('#profileBell')) return;
  const left = header.firstElementChild;
  if (!left) return;
  const { name, state } = getRuntime();
  const greeting = document.createElement('div');
  greeting.className = 'profile-greeting';
  greeting.innerHTML = `${avatarMarkup(name)}<div class="profile-copy"><div class="profile-hello">Привет, ${escapeHtml(name)}! 👋</div><div class="profile-sub" id="topDate">${escapeHtml(dateLabel())} · Монтажник</div></div>`;
  greeting.querySelector('.profile-avatar').addEventListener('click', openProfile);
  left.replaceWith(greeting);

  const right = header.querySelector('.top-actions');
  if (!right) return;
  right.classList.add('profile-actions');
  const bell = document.createElement('button');
  bell.type = 'button'; bell.id = 'profileBell'; bell.className = 'profile-bell';
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
        <div class="profile-handle"></div><button class="profile-close" data-profile-close="profileSheet" aria-label="Закрыть">×</button>
        <div class="profile-panel-head" id="profileHead"></div>
        <div class="profile-section">
          <button class="profile-row" type="button" data-profile-action="profile"><span><strong>Профиль</strong><small>Имя и фотография</small></span><b>Настроить ›</b></button>
          <button class="profile-row" type="button" data-profile-action="notifications"><span><strong>Уведомления</strong><small>Выезды и изменения базы</small></span><b id="notificationState">Включены</b></button>
          <button class="profile-row profile-disabled" type="button" disabled><span><strong>Мои заметки</strong><small>Личные заметки и списки</small></span><b>Следующий этап</b></button>
        </div>
        <div class="profile-section"><div class="profile-row profile-row--static"><span><strong>Аккаунт</strong><small id="profileEmail"></small></span><b>В сети</b></div><button class="profile-row profile-row--danger" type="button" data-profile-action="logout"><span><strong>Выйти</strong><small>Завершить текущий сеанс</small></span><b>Выйти ›</b></button></div>
      </div>
    </section>
    <section class="profile-sheet notice-sheet" id="noticeSheet" aria-hidden="true">
      <div class="profile-backdrop" data-profile-close="noticeSheet"></div>
      <div class="profile-panel" role="dialog" aria-modal="true" aria-labelledby="noticeTitle">
        <div class="profile-handle"></div><button class="profile-close" data-profile-close="noticeSheet" aria-label="Закрыть">×</button>
        <div class="profile-panel-head"><div class="profile-notice-icon">⌁</div><div><div class="profile-panel-name" id="noticeTitle">Уведомления</div><div class="profile-panel-role">Всё важное по работе</div></div></div>
        <div class="profile-section" id="noticeList"></div>
      </div>
    </section>
    <section class="profile-sheet" id="profileEditSheet" aria-hidden="true">
      <div class="profile-backdrop" data-profile-close="profileEditSheet"></div>
      <div class="profile-panel profile-edit-panel" role="dialog" aria-modal="true" aria-labelledby="editProfileTitle">
        <div class="profile-handle"></div><button class="profile-close" data-profile-close="profileEditSheet" aria-label="Закрыть">×</button>
        <div class="profile-panel-name" id="editProfileTitle">Профиль</div><div class="profile-panel-role">Личные данные этого телефона</div>
        <form id="profileForm" class="profile-form">
          <label>Имя<input id="profileNameInput" type="text" maxlength="40" placeholder="Анатолий"></label>
          <div class="profile-avatar-editor"><div id="profilePreview"></div><label class="secondary avatar-file-label">Выбрать фото<input id="profileAvatarInput" type="file" accept="image/*" hidden></label></div>
          <div class="profile-emoji-row"><span>Или символ</span><button type="button" data-avatar="А">А</button><button type="button" data-avatar="🔧">🔧</button><button type="button" data-avatar="🛠️">🛠️</button><button type="button" data-avatar="⚡">⚡</button></div>
          <button class="primary" type="submit">Сохранить</button>
        </form>
      </div>
    </section>`;
  document.body.append(sheetRoot);
  sheetRoot.querySelectorAll('[data-profile-close]').forEach(el => el.addEventListener('click', () => closeSheet(el.dataset.profileClose)));
  sheetRoot.querySelector('[data-profile-action="notifications"]')?.addEventListener('click', openNotifications);
  sheetRoot.querySelector('[data-profile-action="profile"]')?.addEventListener('click', openProfileEdit);
  sheetRoot.querySelector('[data-profile-action="logout"]')?.addEventListener('click', logout);
  sheetRoot.querySelector('#profileForm')?.addEventListener('submit', saveProfileForm);
  sheetRoot.querySelectorAll('[data-avatar]').forEach(b => b.addEventListener('click', () => { saveProfile({ avatar: '', emoji: b.dataset.avatar }); renderProfileHead(); }));
  sheetRoot.querySelector('#profileAvatarInput')?.addEventListener('change', handleAvatarFile);
}
function openSheet(id) { const sheet = document.querySelector(`#${id}`); if (!sheet) return; sheet.classList.add('open'); sheet.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); }
function closeSheet(id) { const sheet = document.querySelector(`#${id}`); if (!sheet) return; sheet.classList.remove('open'); sheet.setAttribute('aria-hidden','true'); if (!document.querySelector('.profile-sheet.open')) document.body.classList.remove('modal-open'); }
function renderProfileHead() { const { name, email } = getRuntime(); const head = document.querySelector('#profileHead'); if (head) head.innerHTML = `${avatarMarkup(name,true)}<div><div class="profile-panel-name" id="profileTitle">${escapeHtml(name)}</div><div class="profile-panel-role">Монтажник</div></div>`; const em=document.querySelector('#profileEmail'); if(em) em.textContent=email||'Авторизованный пользователь'; }
function openProfile() { renderProfileHead(); closeSheet('profileEditSheet'); openSheet('profileSheet'); }
function openProfileEdit() { const { name }=getRuntime(); document.querySelector('#profileNameInput').value=name; renderProfilePreview(); closeSheet('profileSheet'); openSheet('profileEditSheet'); }
function renderProfilePreview() { const { name }=getRuntime(); const el=document.querySelector('#profilePreview'); if(el) el.innerHTML=avatarMarkup(name,true); }
function handleAvatarFile(event) { const file=event.target.files?.[0]; if(!file) return; if(file.size>1500000) return alert('Фото слишком большое. Выберите файл до 1,5 МБ.'); const reader=new FileReader(); reader.onload=()=>{saveProfile({avatar:reader.result,emoji:''});renderProfilePreview();renderProfileHead();}; reader.readAsDataURL(file); }
function saveProfileForm(event) { event.preventDefault(); const name=document.querySelector('#profileNameInput').value.trim(); if(!name)return; saveProfile({name}); closeSheet('profileEditSheet'); renderProfileHead(); ensureHeader(); }
function logout() { if(!confirm('Выйти из аккаунта на этом телефоне?'))return; document.querySelector('#logoutBtn')?.click(); }
function openNotifications() { renderNotifications(); openSheet('noticeSheet'); document.querySelector('#profileBell')?.classList.remove('has-new'); }
function extractJobs(state) { return Array.isArray(state?.jobs) ? state.jobs.filter(job => job?.status !== 'Отменён') : []; }
function renderNotifications() { const list=document.querySelector('#noticeList'); if(!list)return; const jobs=extractJobs(getRuntime().state); const today=new Date().toISOString().slice(0,10); const todayJobs=jobs.filter(job=>job.date===today); const upcoming=jobs.filter(job=>job.date&&job.date>today).sort((a,b)=>`${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`)).slice(0,3); const items=[]; if(todayJobs.length)items.push({title:`Сегодня · ${todayJobs.length} ${todayJobs.length===1?'выезд':'выезда'}`,text:'Актуальные выезды собраны на экране «Сегодня».'}); upcoming.forEach(job=>items.push({title:job.client||'Новый выезд',text:`${job.date}${job.time?` · ${job.time}`:''}`})); if(!items.length)items.push({title:'Пока всё спокойно',text:'Новых уведомлений нет.'}); list.innerHTML=items.map(item=>`<div class="notice-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></div>`).join(''); }
function updateBell(state) { const bell=document.querySelector('#profileBell'); if(!bell)return; const jobs=extractJobs(state); const signature=JSON.stringify(jobs.map(job=>[job.id,job.date,job.status,job.client])); if(lastJobSignature&&signature!==lastJobSignature)bell.classList.add('has-new'); lastJobSignature=signature; }
function syncRuntime(detail={}) { if(detail.user)currentUser=detail.user; if(detail.state)window.__montajiProfileState=detail.state; ensureHeader(); buildSheets(); renderProfileHead(); updateBell(window.__montajiProfileState||{}); }
function watchApp() { window.addEventListener('montaji:runtime',event=>syncRuntime(event.detail||{})); syncRuntime(); const observer=new MutationObserver(()=>{if(!document.querySelector('#profileBell'))syncRuntime();}); observer.observe(document.body,{childList:true,subtree:true}); document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeSheet('profileSheet');closeSheet('noticeSheet');closeSheet('profileEditSheet');}});}
injectStyles(); buildSheets(); watchApp();