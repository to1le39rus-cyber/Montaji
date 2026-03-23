const STORAGE_KEY = 'montage-planner-v1';

const STATUS_OPTIONS = ['Бронь', 'Подтверждён', 'Выполнен', 'Перенос', 'Отменён'];
const PAYMENT_OPTIONS = ['Не оплачено', 'Частично', 'Оплачено'];
const DEFAULT_STORES = [
  'Магазин 1','Магазин 2','Магазин 3','Магазин 4','Магазин 5',
  'Магазин 6','Магазин 7','Магазин 8','Магазин 9','Магазин 10'
];
const SLOTS = [
  { id:'1', label:'1 слот', subtitle:'11:00–12:00 приезд' },
  { id:'2', label:'2 слот', subtitle:'14:00–16:00 приезд' },
  { id:'3', label:'3 слот', subtitle:'без времени' },
  { id:'4', label:'4 слот', subtitle:'без времени' },
];

const state = loadState();

const els = {
  monthTitle: document.getElementById('monthTitle'),
  calendarGrid: document.getElementById('calendarGrid'),
  prevMonthBtn: document.getElementById('prevMonthBtn'),
  nextMonthBtn: document.getElementById('nextMonthBtn'),
  addJobBtn: document.getElementById('addJobBtn'),
  jobSheet: document.getElementById('jobSheet'),
  daySheet: document.getElementById('daySheet'),
  filtersSheet: document.getElementById('filtersSheet'),
  openFiltersBtn: document.getElementById('openFiltersBtn'),
  jobSheetTitle: document.getElementById('jobSheetTitle'),
  jobForm: document.getElementById('jobForm'),
  jobId: document.getElementById('jobId'),
  jobDate: document.getElementById('jobDate'),
  jobSlot: document.getElementById('jobSlot'),
  jobClient: document.getElementById('jobClient'),
  jobPhone: document.getElementById('jobPhone'),
  jobAddress: document.getElementById('jobAddress'),
  jobStore: document.getElementById('jobStore'),
  jobPrice: document.getElementById('jobPrice'),
  jobStatus: document.getElementById('jobStatus'),
  jobPayment: document.getElementById('jobPayment'),
  jobComment: document.getElementById('jobComment'),
  deleteJobBtn: document.getElementById('deleteJobBtn'),
  daySheetTitle: document.getElementById('daySheetTitle'),
  daySlots: document.getElementById('daySlots'),
  dayExpenseInput: document.getElementById('dayExpenseInput'),
  dayExpenseComment: document.getElementById('dayExpenseComment'),
  saveDayExpenseBtn: document.getElementById('saveDayExpenseBtn'),
  dayStats: document.getElementById('dayStats'),
  searchInput: document.getElementById('searchInput'),
  filterStore: document.getElementById('filterStore'),
  filterStatus: document.getElementById('filterStatus'),
  filterPayment: document.getElementById('filterPayment'),
  filterFill: document.getElementById('filterFill'),
  applyFiltersBtn: document.getElementById('applyFiltersBtn'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  storesTextarea: document.getElementById('storesTextarea'),
  saveStoresBtn: document.getElementById('saveStoresBtn'),
  storesDatalist: document.getElementById('storesDatalist'),
  reportMonth: document.getElementById('reportMonth'),
  reportYear: document.getElementById('reportYear'),
  statsGrid: document.getElementById('statsGrid'),
  archiveList: document.getElementById('archiveList'),
  exportMonthBtn: document.getElementById('exportMonthBtn'),
  exportYearBtn: document.getElementById('exportYearBtn'),
  backupBtn: document.getElementById('backupBtn'),
  importFileInput: document.getElementById('importFileInput'),
};

bootstrap();

function bootstrap() {
  populateStaticInputs();
  bindEvents();
  render();
  registerServiceWorker();
}

function loadState() {
  const today = new Date();
  const defaultState = {
    currentMonth: today.getMonth(),
    currentYear: today.getFullYear(),
    reportMonth: today.getMonth() + 1,
    reportYear: today.getFullYear(),
    selectedDate: formatDate(today),
    search: '',
    filters: { store:'all', status:'all', payment:'all', fill:'all' },
    settings: { stores: DEFAULT_STORES },
    jobs: [],
    expenses: {}
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function populateStaticInputs() {
  els.jobSlot.innerHTML = SLOTS.map(slot => `<option value="${slot.id}">${slot.label} — ${slot.subtitle}</option>`).join('');
  els.jobStatus.innerHTML = STATUS_OPTIONS.map(x => `<option value="${x}">${x}</option>`).join('');
  els.jobPayment.innerHTML = PAYMENT_OPTIONS.map(x => `<option value="${x}">${x}</option>`).join('');
  fillMonthSelect(els.reportMonth);
  renderYearOptions();
  renderStoreInputs();
  renderFilterInputs();
}

function fillMonthSelect(el) {
  el.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2025, i, 1).toLocaleDateString('ru-RU', { month: 'long' });
    return `<option value="${i+1}">${capitalize(month)}</option>`;
  }).join('');
}

function renderYearOptions() {
  const years = getAllYears();
  const options = years.map(y => `<option value="${y}">${y}</option>`).join('');
  els.reportYear.innerHTML = options;
  if (!years.includes(state.reportYear)) state.reportYear = years[years.length - 1];
  els.reportMonth.value = String(state.reportMonth);
  els.reportYear.value = String(state.reportYear);
}

function getAllYears() {
  const years = new Set([new Date().getFullYear()]);
  state.jobs.forEach(j => years.add(Number(j.date.slice(0, 4))));
  Object.keys(state.expenses).forEach(d => years.add(Number(d.slice(0, 4))));
  return Array.from(years).sort((a, b) => a - b);
}

function renderStoreInputs() {
  const stores = state.settings.stores?.length ? state.settings.stores : DEFAULT_STORES;
  els.storesTextarea.value = stores.join('\n');
  els.storesDatalist.innerHTML = stores.map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
}

function renderFilterInputs() {
  const stores = state.settings.stores?.length ? state.settings.stores : DEFAULT_STORES;
  els.filterStore.innerHTML = ['<option value="all">Все</option>', ...stores.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)].join('');
  els.filterStatus.innerHTML = ['<option value="all">Все</option>', ...STATUS_OPTIONS.map(s => `<option value="${s}">${s}</option>`)].join('');
  els.filterPayment.innerHTML = ['<option value="all">Все</option>', ...PAYMENT_OPTIONS.map(s => `<option value="${s}">${s}</option>`)].join('');
  els.filterStore.value = state.filters.store || 'all';
  els.filterStatus.value = state.filters.status || 'all';
  els.filterPayment.value = state.filters.payment || 'all';
  els.filterFill.value = state.filters.fill || 'all';
}

function bindEvents() {
  els.prevMonthBtn.addEventListener('click', () => shiftMonth(-1));
  els.nextMonthBtn.addEventListener('click', () => shiftMonth(1));
  els.addJobBtn.addEventListener('click', () => openJobSheet());
  els.jobForm.addEventListener('submit', onSaveJob);
  els.deleteJobBtn.addEventListener('click', onDeleteJob);
  els.saveDayExpenseBtn.addEventListener('click', saveDayExpense);
  els.searchInput.addEventListener('input', e => { state.search = e.target.value.trim().toLowerCase(); renderCalendar(); });
  els.openFiltersBtn.addEventListener('click', () => openSheet('filtersSheet'));
  els.applyFiltersBtn.addEventListener('click', () => {
    state.filters = {
      store: els.filterStore.value,
      status: els.filterStatus.value,
      payment: els.filterPayment.value,
      fill: els.filterFill.value
    };
    saveState();
    closeSheet('filtersSheet');
    renderCalendar();
  });
  els.resetFiltersBtn.addEventListener('click', () => {
    state.filters = { store:'all', status:'all', payment:'all', fill:'all' };
    renderFilterInputs();
    saveState();
    renderCalendar();
  });
  els.saveStoresBtn.addEventListener('click', saveStores);
  els.reportMonth.addEventListener('change', e => { state.reportMonth = Number(e.target.value); saveState(); renderReports(); });
  els.reportYear.addEventListener('change', e => { state.reportYear = Number(e.target.value); saveState(); renderReports(); });
  els.exportMonthBtn.addEventListener('click', exportMonthCsv);
  els.exportYearBtn.addEventListener('click', exportYearCsv);
  els.backupBtn.addEventListener('click', backupJson);
  els.importFileInput.addEventListener('change', importJson);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeSheet(btn.getAttribute('data-close')));
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });
}

function render() {
  els.searchInput.value = state.search || '';
  renderCalendar();
  renderReports();
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen--active'));
  document.querySelectorAll('.nav-item').forEach(s => s.classList.remove('nav-item--active'));
  document.getElementById(screenId).classList.add('screen--active');
  document.querySelector(`.nav-item[data-screen="${screenId}"]`).classList.add('nav-item--active');
}

function shiftMonth(offset) {
  let month = state.currentMonth + offset;
  let year = state.currentYear;
  if (month < 0) { month = 11; year -= 1; }
  if (month > 11) { month = 0; year += 1; }
  state.currentMonth = month;
  state.currentYear = year;
  saveState();
  renderCalendar();
}

function renderCalendar() {
  const titleDate = new Date(state.currentYear, state.currentMonth, 1);
  els.monthTitle.textContent = titleDate.toLocaleDateString('ru-RU', { month:'long', year:'numeric' });
  els.monthTitle.textContent = capitalize(els.monthTitle.textContent);

  const firstDay = new Date(state.currentYear, state.currentMonth, 1);
  const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0);
  let weekDay = firstDay.getDay();
  weekDay = weekDay === 0 ? 7 : weekDay;

  const prevDays = weekDay - 1;
  const daysInMonth = lastDay.getDate();
  const prevMonthLastDate = new Date(state.currentYear, state.currentMonth, 0).getDate();

  const cells = [];
  for (let i = prevDays - 1; i >= 0; i--) {
    const d = new Date(state.currentYear, state.currentMonth - 1, prevMonthLastDate - i);
    cells.push(renderDayCell(d, true));
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(state.currentYear, state.currentMonth, day);
    cells.push(renderDayCell(d, false));
  }
  const nextCount = Math.ceil(cells.length / 7) * 7 - cells.length;
  for (let day = 1; day <= nextCount; day++) {
    const d = new Date(state.currentYear, state.currentMonth + 1, day);
    cells.push(renderDayCell(d, true));
  }
  els.calendarGrid.innerHTML = cells.join('');
  els.calendarGrid.querySelectorAll('.calendar-day').forEach(node => {
    node.addEventListener('click', () => openDaySheet(node.dataset.date));
  });
}

function renderDayCell(date, muted) {
  const dayKey = formatDate(date);
  const jobs = getJobsForDate(dayKey);
  const matchingJobs = jobs.filter(jobMatchesFilters);
  const fillClass = getDayFillClass(matchingJobs.length);
  if (!dayMatchesFilter(dayKey, matchingJobs.length)) return `<div class="calendar-day calendar-day--muted hidden"></div>`;
  if (state.search && matchingJobs.length === 0) {
    const textMatched = jobs.some(job => jobMatchesSearch(job));
    if (!textMatched) return `<div class="calendar-day calendar-day--muted hidden"></div>`;
  }
  const slotIds = new Set(matchingJobs.map(j => j.slot));
  const indicators = SLOTS.map(slot => `<span class="slot-indicator ${slotIds.has(slot.id) ? 'slot-indicator--busy' : ''}"></span>`).join('');
  const expense = state.expenses[dayKey]?.amount || 0;
  return `
    <button class="calendar-day ${muted ? 'calendar-day--muted' : ''} calendar-day--${fillClass}" data-date="${dayKey}">
      <div class="calendar-day__top">
        <span class="calendar-day__num">${date.getDate()}</span>
        <span class="calendar-day__count">${matchingJobs.length}/4</span>
      </div>
      <div class="calendar-day__slots">${indicators}</div>
      <div class="calendar-day__expense">${expense ? `Расх. ${formatMoney(expense)}` : '&nbsp;'}</div>
    </button>
  `;
}

function getDayFillClass(count) {
  if (count >= 4) return 'full';
  if (count === 3) return 'busy';
  if (count >= 1) return 'partial';
  return 'free';
}

function dayMatchesFilter(dayKey, count) {
  const fill = state.filters.fill || 'all';
  if (fill === 'free' && count !== 0) return false;
  if (fill === 'partial' && !(count > 0 && count < 4)) return false;
  if (fill === 'full' && count !== 4) return false;
  return true;
}

function jobMatchesSearch(job) {
  const q = state.search;
  if (!q) return true;
  return [job.client, job.phone, job.address].join(' ').toLowerCase().includes(q);
}

function jobMatchesFilters(job) {
  if (!jobMatchesSearch(job)) return false;
  if (state.filters.store !== 'all' && job.store !== state.filters.store) return false;
  if (state.filters.status !== 'all' && job.status !== state.filters.status) return false;
  if (state.filters.payment !== 'all' && job.payment !== state.filters.payment) return false;
  return true;
}

function getJobsForDate(date) {
  return state.jobs
    .filter(job => job.date === date)
    .sort((a, b) => Number(a.slot) - Number(b.slot));
}

function openJobSheet(date = state.selectedDate, jobId = null) {
  els.jobForm.reset();
  els.jobDate.value = date || formatDate(new Date());
  els.jobStatus.value = STATUS_OPTIONS[0];
  els.jobPayment.value = PAYMENT_OPTIONS[0];
  els.jobSlot.value = '1';
  els.jobId.value = '';
  els.deleteJobBtn.hidden = true;
  els.jobSheetTitle.textContent = 'Новый монтаж';

  if (jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (job) {
      els.jobSheetTitle.textContent = 'Редактировать монтаж';
      els.jobId.value = job.id;
      els.jobDate.value = job.date;
      els.jobSlot.value = job.slot;
      els.jobClient.value = job.client;
      els.jobPhone.value = job.phone || '';
      els.jobAddress.value = job.address || '';
      els.jobStore.value = job.store || '';
      els.jobPrice.value = job.price || '';
      els.jobStatus.value = job.status;
      els.jobPayment.value = job.payment;
      els.jobComment.value = job.comment || '';
      els.deleteJobBtn.hidden = false;
    }
  }

  openSheet('jobSheet');
}

function onSaveJob(e) {
  e.preventDefault();
  const job = {
    id: els.jobId.value || crypto.randomUUID(),
    date: els.jobDate.value,
    slot: els.jobSlot.value,
    client: els.jobClient.value.trim(),
    phone: normalizePhone(els.jobPhone.value),
    address: els.jobAddress.value.trim(),
    store: els.jobStore.value.trim(),
    price: Number(els.jobPrice.value || 0),
    status: els.jobStatus.value,
    payment: els.jobPayment.value,
    comment: els.jobComment.value.trim(),
  };

  if (!job.date || !job.client) {
    alert('Заполни дату и ФИО клиента.');
    return;
  }

  const collision = state.jobs.find(item =>
    item.id !== job.id &&
    item.date === job.date &&
    item.slot === job.slot &&
    item.status !== 'Отменён'
  );
  if (collision) {
    const ok = confirm('Этот слот уже занят. Всё равно сохранить?');
    if (!ok) return;
  }

  const existingIndex = state.jobs.findIndex(item => item.id === job.id);
  if (existingIndex >= 0) state.jobs[existingIndex] = job;
  else state.jobs.push(job);

  state.selectedDate = job.date;
  saveState();
  closeSheet('jobSheet');
  render();
  openDaySheet(job.date);
}

function onDeleteJob() {
  const id = els.jobId.value;
  if (!id) return;
  const ok = confirm('Удалить запись?');
  if (!ok) return;
  state.jobs = state.jobs.filter(job => job.id !== id);
  saveState();
  closeSheet('jobSheet');
  render();
}

function openDaySheet(date) {
  state.selectedDate = date;
  const human = new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric', weekday:'long' });
  els.daySheetTitle.textContent = capitalize(human);
  const expense = state.expenses[date] || { amount: '', comment: '' };
  els.dayExpenseInput.value = expense.amount ?? '';
  els.dayExpenseComment.value = expense.comment ?? '';

  const jobs = getJobsForDate(date);
  els.daySlots.innerHTML = SLOTS.map(slot => renderSlotBlock(date, slot, jobs.find(j => j.slot === slot.id))).join('');
  els.dayStats.innerHTML = dayStatsMarkup(date, jobs);
  els.daySlots.querySelectorAll('[data-edit-job]').forEach(btn => {
    btn.addEventListener('click', () => openJobSheet(date, btn.dataset.editJob));
  });
  els.daySlots.querySelectorAll('[data-add-slot]').forEach(btn => {
    openSheet('jobSheet');
    els.jobForm.reset();
    els.jobSheetTitle.textContent = 'Новый монтаж';
    els.jobId.value = '';
    els.jobDate.value = date;
    els.jobSlot.value = btn.dataset.addSlot;
    els.jobStatus.value = STATUS_OPTIONS[0];
    els.jobPayment.value = PAYMENT_OPTIONS[0];
    els.deleteJobBtn.hidden = true;
  });

  openSheet('daySheet');
}

function renderSlotBlock(date, slot, job) {
  if (!job) {
    return `
      <section class="slot-block">
        <div class="slot-block__head">
          <h3>${slot.label} <span class="muted">· ${slot.subtitle}</span></h3>
          <button class="ghost-btn" data-add-slot="${slot.id}">Добавить</button>
        </div>
        <div class="slot-empty">Свободно</div>
      </section>
    `;
  }

  const tpl = document.getElementById('jobCardTemplate').content.firstElementChild.cloneNode(true);
  tpl.querySelector('.job-card__client').textContent = job.client;
  tpl.querySelector('.job-card__meta').textContent = `${slot.label} · ${slot.subtitle}`;
  tpl.querySelector('.job-card__slot').textContent = job.status;
  tpl.querySelector('.job-card__slot').dataset.status = job.status;
  tpl.querySelector('.job-card__details').innerHTML = [
    job.phone ? `📞 ${escapeHtml(job.phone)}` : '',
    job.address ? `📍 ${escapeHtml(job.address)}` : '',
    job.store ? `🏪 ${escapeHtml(job.store)}` : '',
    `💰 ${formatMoney(job.price)} · ${escapeHtml(job.payment)}`,
    job.comment ? `📝 ${escapeHtml(job.comment)}` : ''
  ].filter(Boolean).map(line => `<div>${line}</div>`).join('');
  const actions = [];
  if (job.phone) actions.push(`<a class="action-link" href="tel:${job.phone.replace(/[^\d+]/g,'')}">Позвонить</a>`);
  if (job.address) actions.push(`<a class="action-link" href="https://maps.google.com/?q=${encodeURIComponent(job.address)}" target="_blank" rel="noopener">Карта</a>`);
  actions.push(`<button class="action-link" type="button" data-edit-job="${job.id}">Изменить</button>`);
  tpl.querySelector('.job-card__actions').innerHTML = actions.join('');
  return `
    <section class="slot-block">
      <div class="slot-block__head">
        <h3>${slot.label} <span class="muted">· ${slot.subtitle}</span></h3>
      </div>
      ${tpl.outerHTML}
    </section>
  `;
}

function dayStatsMarkup(date, jobs) {
  const revenue = jobs.reduce((sum, job) => sum + Number(job.price || 0), 0);
  const expense = Number(state.expenses[date]?.amount || 0);
  const net = revenue - expense;
  const items = [
    ['Монтажей', jobs.length],
    ['Выручка', formatMoney(revenue)],
    ['Расходка', formatMoney(expense)],
    ['Чистыми', formatMoney(net)],
  ];
  return items.map(([label, value]) => `<div class="mini-stat"><div class="mini-stat__label">${label}</div><div class="mini-stat__value">${value}</div></div>`).join('');
}

function saveDayExpense() {
  const date = state.selectedDate;
  if (!date) return;
  state.expenses[date] = {
    amount: Number(els.dayExpenseInput.value || 0),
    comment: els.dayExpenseComment.value.trim()
  };
  saveState();
  render();
  openDaySheet(date);
}

function saveStores() {
  const stores = els.storesTextarea.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  state.settings.stores = stores.length ? stores : DEFAULT_STORES;
  saveState();
  renderStoreInputs();
  renderFilterInputs();
  alert('Список магазинов обновлён.');
}

function renderReports() {
  renderYearOptions();
  const month = state.reportMonth;
  const year = state.reportYear;
  const monthJobs = state.jobs.filter(job => {
    const [y, m] = job.date.split('-').map(Number);
    return y === year && m === month;
  });
  const monthExpenses = Object.entries(state.expenses)
    .filter(([date]) => {
      const [y, m] = date.split('-').map(Number);
      return y === year && m === month;
    })
    .reduce((sum, [, val]) => sum + Number(val.amount || 0), 0);

  const monthRevenue = monthJobs.reduce((sum, job) => sum + Number(job.price || 0), 0);
  const monthNet = monthRevenue - monthExpenses;
  const yearJobs = state.jobs.filter(job => Number(job.date.slice(0,4)) === year);
  const yearRevenue = yearJobs.reduce((sum, job) => sum + Number(job.price || 0), 0);
  const yearExpenses = Object.entries(state.expenses)
    .filter(([date]) => Number(date.slice(0,4)) === year)
    .reduce((sum, [, val]) => sum + Number(val.amount || 0), 0);

  const cards = [
    ['Монтажей за месяц', monthJobs.length],
    ['Выручка за месяц', formatMoney(monthRevenue)],
    ['Расходка за месяц', formatMoney(monthExpenses)],
    ['Чистыми за месяц', formatMoney(monthNet)],
    ['Монтажей за год', yearJobs.length],
    ['Выручка за год', formatMoney(yearRevenue)],
    ['Расходка за год', formatMoney(yearExpenses)],
    ['Чистыми за год', formatMoney(yearRevenue - yearExpenses)]
  ];
  els.statsGrid.innerHTML = cards.map(([label, value]) => `
    <div class="stat-card">
      <div class="stat-card__label">${label}</div>
      <div class="stat-card__value">${value}</div>
    </div>
  `).join('');

  renderArchive();
}

function renderArchive() {
  const years = getAllYears().slice().reverse();
  els.archiveList.innerHTML = years.map(year => {
    const jobs = state.jobs.filter(job => Number(job.date.slice(0,4)) === year);
    const revenue = jobs.reduce((sum, job) => sum + Number(job.price || 0), 0);
    const expenses = Object.entries(state.expenses)
      .filter(([date]) => Number(date.slice(0,4)) === year)
      .reduce((sum, [, val]) => sum + Number(val.amount || 0), 0);

    return `
      <div class="archive-item">
        <div>
          <div><strong>${year}</strong></div>
          <div class="archive-item__stats">${jobs.length} монтажей · выручка ${formatMoney(revenue)} · чистыми ${formatMoney(revenue - expenses)}</div>
        </div>
        <button class="ghost-btn" data-export-year="${year}">CSV</button>
      </div>
    `;
  }).join('');
  els.archiveList.querySelectorAll('[data-export-year]').forEach(btn => {
    btn.addEventListener('click', () => exportYearCsv(Number(btn.dataset.exportYear)));
  });
}

function exportMonthCsv() {
  const month = state.reportMonth;
  const year = state.reportYear;
  const jobs = state.jobs.filter(job => {
    const [y, m] = job.date.split('-').map(Number);
    return y === year && m === month;
  }).sort((a,b) => a.date.localeCompare(b.date) || Number(a.slot)-Number(b.slot));
  const rows = jobs.map(job => ({
    Дата: job.date,
    Слот: getSlotName(job.slot),
    Клиент: job.client,
    Телефон: job.phone,
    Адрес: job.address,
    Магазин: job.store,
    Цена: job.price,
    Статус: job.status,
    Оплата: job.payment,
    Комментарий: job.comment,
    Расходка_дня: state.expenses[job.date]?.amount || 0,
  }));
  downloadCsv(rows, `montazhi-${year}-${String(month).padStart(2,'0')}.csv`);
}

function exportYearCsv(year = state.reportYear) {
  const jobs = state.jobs.filter(job => Number(job.date.slice(0,4)) === year)
    .sort((a,b) => a.date.localeCompare(b.date) || Number(a.slot)-Number(b.slot));
  const rows = jobs.map(job => ({
    Дата: job.date,
    Слот: getSlotName(job.slot),
    Клиент: job.client,
    Телефон: job.phone,
    Адрес: job.address,
    Магазин: job.store,
    Цена: job.price,
    Статус: job.status,
    Оплата: job.payment,
    Комментарий: job.comment,
    Расходка_дня: state.expenses[job.date]?.amount || 0,
  }));
  downloadCsv(rows, `montazhi-${year}.csv`);
}

function backupJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json;charset=utf-8' });
  const name = `montazhi-backup-${formatDate(new Date())}.json`;
  triggerDownload(blob, name);
}

function importJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const next = JSON.parse(reader.result);
      if (!Array.isArray(next.jobs) || typeof next.expenses !== 'object') {
        throw new Error('bad format');
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, ...next }));
      Object.assign(state, loadState());
      renderStoreInputs();
      renderFilterInputs();
      render();
      alert('Данные импортированы.');
    } catch {
      alert('Не удалось импортировать файл.');
    }
    els.importFileInput.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

function downloadCsv(rows, filename) {
  const headers = rows.length ? Object.keys(rows[0]) : ['Пусто'];
  const csv = [
    headers.join(';'),
    ...rows.map(row => headers.map(h => csvCell(row[h])).join(';'))
  ].join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function csvCell(value) {
  const str = String(value ?? '');
  return `"${str.replaceAll('"', '""')}"`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openSheet(id) {
  document.getElementById(id).classList.add('is-open');
  document.getElementById(id).setAttribute('aria-hidden', 'false');
}

function closeSheet(id) {
  document.getElementById(id).classList.remove('is-open');
  document.getElementById(id).setAttribute('aria-hidden', 'true');
}

function getSlotName(slotId) {
  return SLOTS.find(s => s.id === slotId)?.label || slotId;
}

function normalizePhone(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value || 0)) + ' ₽';
}

function formatDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0, 10);
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
