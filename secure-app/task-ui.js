/* Montaji AA — Task UI
   Separate UX for tasks, shared note persistence underneath. */
(() => {
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const close = m => {
    m?.classList.remove('open');
    m?.setAttribute('aria-hidden', 'true');
    document.body.classList.toggle('modal-open', !!document.querySelector('.modal.open'));
  };
  const icon = name => {
    const p = {
      check: '<path d="m5 12 4 4L19 6"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name] || p.check}</svg>`;
  };

  function openTask() {
    let modal = document.querySelector('#quickTaskModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'quickTaskModal';
      modal.className = 'modal quick-task-modal';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="backdrop" data-task-close></div>
        <div class="sheet quick-task-sheet">
          <div class="handle"></div>
          <div class="quick-task-head">
            <div>
              <div class="quick-v2-kicker">ЗАДАЧА</div>
              <h2>Новая задача</h2>
              <p>То, что нужно сделать и не забыть.</p>
            </div>
            <button class="quick-v2-close" type="button" data-task-close aria-label="Закрыть">${icon('close')}</button>
          </div>
          <form id="quickTaskForm" class="quick-task-form">
            <label>Что сделать?
              <input name="title" type="text" required maxlength="120" autocomplete="off" placeholder="Например, позвонить клиенту">
            </label>
            <label>Детали <span class="optional">(необязательно)</span>
              <textarea name="details" rows="4" maxlength="500" placeholder="Что важно учесть…"></textarea>
            </label>
            <div class="quick-task-hint"><span>${icon('check')}</span><span>После сохранения задача появится в «Что важно».</span></div>
            <button class="primary quick-task-save" type="submit">Создать задачу</button>
          </form>
        </div>`;
      document.body.append(modal);
      modal.querySelectorAll('[data-task-close]').forEach(b => b.addEventListener('click', () => close(modal)));
      modal.querySelector('#quickTaskForm').addEventListener('submit', e => {
        e.preventDefault();
        const form = e.currentTarget;
        const title = form.elements.title.value.trim();
        const details = form.elements.details.value.trim();
        if (!title) return;

        const noteBtn = [...document.querySelectorAll('button')].find(b => {
          const t = text(b);
          return t === '＋ Заметка' || t === '+ Заметка';
        });
        if (!noteBtn) return;

        close(modal);
        noteBtn.click();
        setTimeout(() => {
          const noteModal = [...document.querySelectorAll('.modal.open')].find(x => x.querySelector('#noteForm'));
          const noteForm = noteModal?.querySelector('#noteForm');
          const titleField = noteModal?.querySelector('#nTitle');
          const bodyField = noteModal?.querySelector('#nText');
          if (!noteForm || !titleField || !bodyField) return;

          titleField.value = `☐ ${title}`;
          titleField.dispatchEvent(new Event('input', { bubbles: true }));
          bodyField.value = details || title;
          bodyField.dispatchEvent(new Event('input', { bubbles: true }));
          noteForm.querySelector('button[type="submit"]')?.click();
        }, 80);
      });
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const form = modal.querySelector('#quickTaskForm');
    form?.reset();
    requestAnimationFrame(() => form?.elements.title?.focus({ preventScroll: true }));
  }

  document.addEventListener('click', e => {
    const button = e.target.closest?.('[data-action="task"]');
    if (!button) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openTask();
  }, true);
})();
