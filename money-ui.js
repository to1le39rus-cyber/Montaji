(() => {
  const MAX_VISIBLE = 15;
  const state = { category: 'Все', period: 'all', showAll: false };
  const PERIODS = [['all', 'Все'], ['week', 'Неделя'], ['month', 'Месяц']];
  let observer = null;

  const esc = s => String(s ?? '').replace(/[&<>\"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[m]));
  const parseDate = text => { const m = String(text || '').match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`) : null; };
  const periodStart = type => {
    const now = new Date();
    if (type === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (type === 'week') { const monday = (now.getDay() + 6) % 7; const d = new Date(now); d.setHours(12,0,0,0); d.setDate(now.getDate() - monday); return d; }
    return null;
  };
  const rows = () => { const box = document.querySelector('#expenseArchive'); return box ? [...box.querySelectorAll('.expense-row')] : []; };
  const rowCategory = row => row.querySelector('b')?.textContent?.trim() || 'Прочее';
  const rowDate = row => parseDate(row.querySelector('small')?.textContent || row.textContent);
  const matches = row => {
    if (state.category !== 'Все' && rowCategory(row) !== state.category) return false;
    if (state.period !== 'all') { const d = rowDate(row), start = periodStart(state.period); if (!d || !start || d < start || d > new Date()) return false; }
    return true;
  };

  function ensureLunchOption() {
    document.querySelectorAll('select').forEach(select => {
      const opts = [...select.options].map(o => o.textContent.trim());
      const looksLikeExpense = opts.some(x => /Аренда|Материалы|Топливо|Другое|Прочее|Расход/i.test(x));
      if (looksLikeExpense && !opts.includes('Обед')) {
        const option = document.createElement('option'); option.value = 'Обед'; option.textContent = 'Обед';
        const other = [...select.options].find(o => /Другое|Прочее/i.test(o.textContent));
        if (other) select.insertBefore(option, other); else select.append(option);
      }
    });
  }

  function makeUI(box) {
    if (!box || box.previousElementSibling?.classList.contains('money-ui')) return;
    const wrap = document.createElement('div'); wrap.className = 'money-ui';
    wrap.innerHTML = `<div class="money-ui-head"><div><strong>Расходы</strong><small>последние 15 · фильтр по категории и периоду</small></div><button type="button" class="money-ui-reset" hidden>Сбросить</button></div><div class="money-ui-periods" role="tablist" aria-label="Период">${PERIODS.map(([v,l]) => `<button type="button" data-money-period="${v}" class="${v==='all'?'selected':''}">${l}</button>`).join('')}</div><div class="money-ui-cats" aria-label="Категория"></div><div class="money-ui-summary"></div><button type="button" class="money-ui-more" hidden>Показать все</button>`;
    box.parentNode.insertBefore(wrap, box);
    wrap.addEventListener('click', e => {
      const p = e.target.closest('[data-money-period]');
      if (p) { state.period = p.dataset.moneyPeriod; state.showAll = false; apply(); return; }
      const c = e.target.closest('[data-money-category]');
      if (c) { state.category = c.dataset.moneyCategory; state.showAll = false; apply(); return; }
      if (e.target.closest('.money-ui-more')) { state.showAll = !state.showAll; apply(); return; }
      if (e.target.closest('.money-ui-reset')) { state.category='Все'; state.period='all'; state.showAll=false; apply(); }
    });
  }

  function renderCategories(wrap, rs) {
    const cats = [...new Set(rs.map(rowCategory))].filter(Boolean).sort((a,b) => a.localeCompare(b,'ru'));
    wrap.querySelector('.money-ui-cats').innerHTML = ['Все', ...cats].map(c => `<button type="button" data-money-category="${esc(c)}" class="${state.category===c?'selected':''}">${esc(c)}</button>`).join('');
  }

  function apply() {
    const box = document.querySelector('#expenseArchive'), wrap = document.querySelector('.money-ui');
    if (!box || !wrap) return;
    observer?.disconnect();
    try {
      const rs = rows(); renderCategories(wrap, rs);
      const filtered = rs.filter(matches), visible = state.showAll ? filtered : filtered.slice(0, MAX_VISIBLE);
      rs.forEach(r => { r.style.display = 'none'; }); visible.forEach(r => { r.style.display = ''; });
      const total = filtered.reduce((sum, r) => { const t = r.querySelector('strong')?.textContent || ''; return sum + (Number((t.match(/[\d\s]+/) || ['0'])[0].replace(/\s/g,'')) || 0); }, 0);
      const label = state.category === 'Все' ? 'Все категории' : state.category;
      const period = PERIODS.find(x => x[0] === state.period)?.[1] || 'Все';
      wrap.querySelector('.money-ui-summary').textContent = `${label} · ${period} · ${filtered.length} ${filtered.length===1?'расход':filtered.length<5?'расхода':'расходов'}${filtered.length ? ` · ${new Intl.NumberFormat('ru-RU').format(total)} ₽` : ''}`;
      const more = wrap.querySelector('.money-ui-more'); more.hidden = filtered.length <= MAX_VISIBLE; more.textContent = state.showAll ? 'Скрыть лишнее' : `Показать все · ${filtered.length}`;
      wrap.querySelector('.money-ui-reset').hidden = state.category==='Все' && state.period==='all';
    } finally { observer?.observe(document.body, { childList:true, subtree:true }); }
  }

  function init() { ensureLunchOption(); const archive = document.querySelector('#expenseArchive'); if (archive) makeUI(archive); apply(); }

  const style = document.createElement('style'); style.textContent = `.money-ui{margin:12px 0 0;padding:14px 0 2px;border-top:1px solid var(--line)}.money-ui-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.money-ui-head strong{display:block;font-size:13px}.money-ui-head small{display:block;color:var(--muted);font-size:9px;margin-top:3px}.money-ui-reset{border:0;background:var(--soft);color:var(--olive-dark);border-radius:9px;padding:7px 9px;font-size:9px;font-weight:700}.money-ui-periods,.money-ui-cats{display:flex;gap:6px;overflow-x:auto;padding:2px 1px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.money-ui-periods::-webkit-scrollbar,.money-ui-cats::-webkit-scrollbar{display:none}.money-ui-periods button,.money-ui-cats button{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:8px 11px;font-size:9px;font-weight:700;white-space:nowrap}.money-ui-periods button.selected,.money-ui-cats button.selected{background:var(--olive-dark);color:#fff;border-color:var(--olive-dark)}.money-ui-summary{font-size:9px;color:var(--muted);padding:2px 2px 9px}.money-ui-more{width:100%;border:1px solid var(--line);background:var(--soft);color:var(--olive-dark);border-radius:12px;padding:10px;font-size:10px;font-weight:700;margin:2px 0 10px}body.dark .money-ui-periods button,body.dark .money-ui-cats button{background:#141715;color:#f4f6f1;border-color:rgba(244,246,241,.09)}body.dark .money-ui-periods button.selected,body.dark .money-ui-cats button.selected{background:#dce8d5;color:#172018;border-color:#dce8d5}body.dark .money-ui-more,body.dark .money-ui-reset{background:#252c27;color:#dce8d5;border-color:rgba(244,246,241,.09)}`; document.head.appendChild(style);
  observer = new MutationObserver(() => { ensureLunchOption(); const archive = document.querySelector('#expenseArchive'); if (archive) { makeUI(archive); apply(); } });
  observer.observe(document.body, { childList:true, subtree:true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
})();