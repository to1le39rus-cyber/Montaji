// One modal surface for every journey. Nested views keep their return context.
export const createSheet = ({ root, background }) => {
  const overlay = document.createElement('div');
  overlay.className = 'canonical-modal';
  overlay.hidden = true;
  root.append(overlay);
  let dismiss = null, opener = null, savedScroll = 0;
  const visibleControls = () => [...overlay.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]')].filter(el => el.getClientRects().length);
  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.replaceChildren();
    background.forEach(el => el.inert = false);
    document.body.classList.remove('sheet-is-open');
    document.body.style.removeProperty('top');
    window.scrollTo(0, savedScroll);
    opener?.isConnected && opener.focus({ preventScroll: true });
    dismiss = null;
  };
  const open = ({ title, body, footer, onBack, className = '' }) => {
    if (overlay.hidden) {
      opener = document.activeElement;
      savedScroll = window.scrollY;
      document.body.style.top = `-${savedScroll}px`;
      document.body.classList.add('sheet-is-open');
      background.forEach(el => el.inert = true);
    }
    overlay.hidden = false;
    dismiss = onBack || close;
    const panel = document.createElement('section');
    panel.className = `canonical-modal-panel ${className}`;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', title);
    panel.tabIndex = -1;
    const head = document.createElement('header');
    head.className = 'canonical-modal-head';
    const heading = document.createElement('h2'); heading.textContent = title;
    const back = document.createElement('button'); back.type = 'button'; back.className = 'sheet-dismiss'; back.textContent = onBack ? 'Назад' : 'Закрыть'; back.onclick = () => dismiss?.();
    head.append(heading, back);
    const content = document.createElement('div'); content.className = 'canonical-modal-body'; content.append(body);
    panel.append(head, content);
    if (footer) { const bar = document.createElement('footer'); bar.className = 'sheet-footer'; bar.append(footer); panel.append(bar); }
    overlay.replaceChildren(panel);
    panel.focus({ preventScroll: true });
    return panel;
  };
  overlay.addEventListener('click', event => { if (event.target === overlay) dismiss?.(); });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); dismiss?.(); }
    if (event.key !== 'Tab') return;
    const controls = visibleControls();
    if (!controls.length) { event.preventDefault(); return; }
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) { event.preventDefault(); first.focus(); }
  });
  return { open, close, get isOpen() { return !overlay.hidden; } };
};
