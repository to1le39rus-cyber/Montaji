/* Montaji AA — user feedback pass 2026-09-11. Sandbox only. */
(() => {
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  // 1) Calendar: completed jobs remain visible on their date.
  const patchCalendar = () => {
    try {
      if (!globalThis.__montajiCalendarPatched && typeof globalThis.__montajiPatchSource === 'function') {
        globalThis.__montajiPatchSource();
      }
    } catch (e) { console.warn('[feedback-pass] calendar patch skipped', e); }
  };

  // 2) Remove the experimental "Следующее" insight. Today should surface actions,
  // not a duplicate forecast of a card that is already visible below.
  const removeNextInsight = () => {
    document.querySelectorAll('#insights .insight').forEach(el => {
      if (/^Следующее\s*:/i.test(text(el))) el.remove();
    });
  };

  // 3) The address already has explicit Яндекс / 2ГИС / route actions.
  // IMPORTANT: never remove a real Day Sheet merely because its job cards contain
  // those same actions. The previous heuristic matched populated Day Sheets and
  // immediately removed them after open; empty days therefore appeared to work.
  const removeAddressLongPressUI = () => {
    document.querySelectorAll('[role="dialog"], .modal, .sheet').forEach(el => {
      if (el.dataset.feedbackLongpressRemoved === '1') return;
      if (el.matches('.day-sheet-modal, .day-sheet-final') || el.closest('.day-sheet-modal, .day-sheet-final')) return;
      const t = text(el);
      const looksLikeAddressActions = /Отправить адрес|Скопировать адрес|Поделиться адресом/i.test(t) && /Яндекс|2ГИС|маршрут/i.test(t);
      if (looksLikeAddressActions && el.id !== 'jobModal') {
        el.dataset.feedbackLongpressRemoved = '1';
        el.remove();
      }
    });
  };

  // 4) Date UX: scheduled date is the single date the installer chooses.
  // Completion date remains in the data model for reporting, but is not presented
  // as a second editable decision. When status is completed, keep it synced to the
  // scheduled date unless the existing record already has a deliberate completion date.
  const syncCompletionDate = () => {
    const date = document.querySelector('#jobDate');
    const completed = document.querySelector('#jobCompletedDate');
    const status = document.querySelector('#jobStatus');
    if (!date || !completed || !status) return;
    const done = status.value === 'Выполнен';
    const wrap = document.querySelector('#completedDateWrap');
    if (wrap) {
      wrap.style.display = 'none';
      wrap.setAttribute('aria-hidden', 'true');
    }
    if (done && date.value && !completed.dataset.manualCompletion) completed.value = date.value;
  };

  const observe = () => {
    patchCalendar();
    removeNextInsight();
    removeAddressLongPressUI();
    syncCompletionDate();
    document.addEventListener('click', e => {
      const target = e.target.closest?.('#jobStatus, #jobDate');
      if (target) setTimeout(syncCompletionDate, 0);
    }, true);
    document.addEventListener('change', e => {
      const target = e.target.closest?.('#jobStatus, #jobDate');
      if (target) setTimeout(syncCompletionDate, 0);
    }, true);
    const mo = new MutationObserver(() => {
      removeNextInsight();
      removeAddressLongPressUI();
      syncCompletionDate();
    });
    if (document.body) mo.observe(document.body, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, {once:true});
  else observe();
})();
