/**
 * Interaction layer for the job-detail sheet.
 * Presentation lives in modules/ux-style.css, not in runtime-injected CSS.
 */
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
  const details = [...card.querySelectorAll('.job-details .detail-line')].map(el => el.textContent.trim()).filter(Boolean);
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
        <div><div class="eyebrow">Выезд</div><h2>${escText(client)}</h2></div>
        <button class="circle-btn" type="button" data-detail-close aria-label="Закрыть">×</button>
      </div>
      <div class="job-detail-hero">
        <div><strong>${escText(meta)}</strong><span>${escText(status)}</span></div>
        <b>${escText(amount)}</b>
      </div>
      <div class="job-detail-info">
        ${address ? `<div><small>Адрес</small><p>${escText(address.replace(/^📍\s*/, ''))}</p></div>` : ''}
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
    </div>`;

  document.body.append(modal);
  document.body.classList.add('modal-open');
  modal.querySelectorAll('[data-detail-close]').forEach(el => el.addEventListener('click', closeJobDetail));
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
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(() => normalizeCardActions());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', event => {
    const edit = event.target.closest?.('.job-card .edit');
    if (!edit || window.__montajiBypassEditCapture) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openJobDetail(edit.closest('.job-card'));
  }, true);
  normalizeCardActions();
}
