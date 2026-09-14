/**
 * Step 4.2 interaction layer.
 * Separates "Подробнее" from "Изменить данные" and keeps the main screen
 * focused on decisions instead of operational clutter.
 */

const STYLE_ID = 'montaji-step4-ux-style';
const DETAIL_ID = 'montaji-job-detail';

function escText(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

function closeJobDetail() {
  document.getElementById(DETAIL_ID)?.remove();
  document.body.classList.remove('modal-open');
}

function openJobDetail(card) {
  if (!card) return;
  closeJobDetail();

  const client = card.querySelector('.job-client')?.textContent?.trim() || 'Без клиента';
  const meta = card.querySelector('.job-meta')?.textContent?.trim() || '';
  const amount = card.querySelector('.amount')?.textContent?.trim() || '';
  const status = card.querySelector('.card-status')?.textContent?.trim() || 'Запланирован';
  const details = [...card.querySelectorAll('.job-details .detail-line')]
    .map(el => el.textContent.trim())
    .filter(Boolean);
  const phone = card.querySelector('a[href^="tel:"]')?.getAttribute('href') || '';
  const maps = [...card.querySelectorAll('.map-chip')];
  const shareButton = card.querySelector('.share-address');
  const doneButton = card.querySelector('[data-quick="done"]');

  const address = details.find(x => x.startsWith('📍')) || '';
  const comment = details.find(x => !x.startsWith('📍')) || '';

  const modal = document.createElement('div');
  modal.id = DETAIL_ID;
  modal.className = 'modal open';
  modal.setAttribute('aria-hidden', 'false');
  modal.innerHTML = `
    <div class="backdrop" data-detail-close></div>
    <div class="sheet job-detail-sheet">
      <div class="handle"></div>
      <div class="sheet-head">
        <div>
          <div class="eyebrow">Выезд</div>
          <h2>${escText(client)}</h2>
        </div>
        <button class="circle-btn" type="button" data-detail-close aria-label="Закрыть">×</button>
      </div>

      <div class="job-detail-hero">
        <div>
          <strong>${escText(meta)}</strong>
          <span>${escText(status)}</span>
        </div>
        <b>${escText(amount)}</b>
      </div>

      <div class="job-detail-info">
        ${address ? `<div><small>Адрес</small><p>${escText(address.replace(/^📍\s*/, '') )}</p></div>` : ''}
        ${phone ? `<div><small>Телефон</small><p>${escText(phone.replace(/^tel:/, ''))}</p></div>` : ''}
        ${comment ? `<div><small>Комментарий</small><p>${escText(comment)}</p></div>` : ''}
      </div>

      <div class="job-detail-actions">
        ${maps.map(a => `<a class="secondary" href="${escText(a.getAttribute('href') || '#')}" target="_blank" rel="noopener">${escText(a.textContent.trim())}</a>`).join('')}
        ${phone ? `<a class="secondary" href="${escText(phone)}">Позвонить</a>` : ''}
        ${shareButton ? `<button class="secondary" type="button" data-detail-share>Отправить адрес</button>` : ''}
      </div>

      <div class="job-detail-main-actions">
        ${doneButton ? `<button class="primary" type="button" data-detail-done>✓ Выполнено</button>` : ''}
        <button class="secondary" type="button" data-detail-edit>Изменить данные</button>
      </div>
    </div>
  `;

  document.body.append(modal);
  document.body.classList.add('modal-open');

  modal.querySelectorAll('[data-detail-close]').forEach(el => {
    el.addEventListener('click', closeJobDetail);
  });

  modal.querySelector('[data-detail-edit]')?.addEventListener('click', () => {
    const edit = card.querySelector('.edit');
    if (!edit) return;
    window.__montajiBypassEditCapture = true;
    closeJobDetail();
    edit.click();
    window.__montajiBypassEditCapture = false;
  });

  modal.querySelector('[data-detail-done]')?.addEventListener('click', () => {
    const done = card.querySelector('[data-quick="done"]');
    if (!done) return;
    closeJobDetail();
    done.click();
  });

  modal.querySelector('[data-detail-share]')?.addEventListener('click', () => {
    shareButton?.click();
    closeJobDetail();
  });
}

function normalizeCardActions(root = document) {
  root.querySelectorAll('.job-card .edit').forEach(button => {
    if (button.textContent.trim() !== 'Подробнее') button.textContent = 'Подробнее';
  });

  root.querySelectorAll('.job-card .status-pill.route, .job-card .status-pill.onsite').forEach(pill => {
    pill.classList.remove('route', 'onsite');
    pill.textContent = 'Запланирован';
  });
}

function installStatusCleanup() {
  document.querySelectorAll('.system-note').forEach(note => {
    if (note.textContent.includes('Быстрые действия')) {
      note.innerHTML = '<strong>Карточка выезда</strong><br>В «Подробнее» собраны адрес, телефон, карты и комментарий. Редактирование данных открывается отдельной кнопкой.';
    }
  });
  const select = document.getElementById('jobStatus');
  if (!select || select.dataset.step42Cleaned) return;
  select.dataset.step42Cleaned = '1';
  ['В пути', 'На объекте'].forEach(label => {
    select.querySelectorAll('option').forEach(option => {
      if (option.textContent.trim() === label) option.remove();
    });
  });
}

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Calendar: one primary workload metric. */
    .day > span { display: none !important; }
    .day > i { font-size: 9px; line-height: 1.25; }

    /* Today: decision-critical card only. Operational actions stay in details. */
    .job-list > .job-card .job-details .detail-line { display: none !important; }
    .job-list > .job-card .actions .map-chip,
    .job-list > .job-card .actions .action-chip:not(.primary-chip),
    .job-list > .job-card .quick-actions { display: none !important; }
    .job-list > .job-card .actions { margin-top: 10px; }

    /* Step 4.2: compact read-only detail sheet. */
    .job-detail-sheet { padding-bottom: max(24px, env(safe-area-inset-bottom)); }
    .job-detail-hero {
      display:flex; align-items:flex-start; justify-content:space-between; gap:16px;
      padding:18px; border:1px solid rgba(80,88,220,.14); border-radius:18px;
      background:rgba(245,246,255,.8); margin-bottom:14px;
    }
    .job-detail-hero div { display:grid; gap:6px; min-width:0; }
    .job-detail-hero strong { font-size:16px; line-height:1.3; }
    .job-detail-hero span { color:#737887; font-size:13px; }
    .job-detail-hero > b { white-space:nowrap; font-size:20px; }
    .job-detail-info { display:grid; gap:10px; margin-bottom:14px; }
    .job-detail-info > div { padding:13px 14px; border-radius:14px; background:#f6f6f4; }
    .job-detail-info small { display:block; color:#858a91; margin-bottom:4px; }
    .job-detail-info p { margin:0; line-height:1.4; }
    .job-detail-actions, .job-detail-main-actions { display:grid; gap:9px; }
    .job-detail-actions { grid-template-columns:repeat(2,minmax(0,1fr)); margin-bottom:12px; }
    .job-detail-actions > * { text-align:center; }
    .job-detail-main-actions > * { width:100%; }
  `;
  document.head.append(style);

  const observer = new MutationObserver(() => {
    normalizeCardActions();
    installStatusCleanup();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    const edit = event.target.closest?.('.job-card .edit');
    if (!edit || window.__montajiBypassEditCapture) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openJobDetail(edit.closest('.job-card'));
  }, true);

  normalizeCardActions();
  installStatusCleanup();
}
