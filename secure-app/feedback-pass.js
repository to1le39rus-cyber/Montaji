/* Montaji AA — user feedback pass 2026-09-12. Sandbox only. */
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

  // 2) "Следующее" was intentionally removed from What matters.
  // The Today screen must surface actionable items only; the actual job card
  // already provides the next visit, so this duplicate forecast has no product value.
  const removeNextInsight = () => {
    const host = document.querySelector('#insights');
    if (!host) return;
    host.querySelectorAll('.insight').forEach(el => {
      const t = text(el).replace(/^[→›\s]+/, '');
      if (/^Следующее\s*:/i.test(t)) el.remove();
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
  // as a second editable decision.
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

  const removeExperimentalInsightRepeatedly = () => {
    // Firebase/realtime rendering can replace #insights after the first observer
    // pass. Keep this cleanup lightweight and bounded so the experiment can never
    // reappear during the current Today session.
    removeNextInsight();
    [0, 50, 150, 300, 600, 1200, 2500, 5000].forEach(ms => setTimeout(removeNextInsight, ms));
  };

  const observe = () => {
    patchCalendar();
    removeExperimentalInsightRepeatedly();
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
