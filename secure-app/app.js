if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  const node = document.getElementById('authMessage');
  if (node) {
    node.textContent = 'Не загрузилась библиотека Supabase. Обнови страницу через Ctrl+F5.';
    node.className = 'auth-message muted auth-message--error';
  }
  throw new Error('Supabase client not loaded');
}

const SUPABASE_URL =
  (window.APP_CONFIG && window.APP_CONFIG.supabaseUrl) ||
  ['https://', 'ijiekvurwnwrpvaxkdvn', '.supabase.co'].join('');

const SUPABASE_KEY =
  (window.APP_CONFIG && window.APP_CONFIG.supabaseKey) ||
  [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqaWVrdnVyd253cnB2YXhrZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjIyMDAsImV4cCI6MjA4OTgzODIwMH0',
    'qOkchV3RDmkDfAK8IrH1PCynPYy8KBUM5C9oIT0UdWE'
  ].join('.');

const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const STATUS_OPTIONS = ['Бронь', 'Подтверждён', 'Выполнен', 'Перенос', 'Отменён'];
const PAYMENT_OPTIONS = ['Не оплачено', 'Частично', 'Оплачено'];
const SLOTS = [
  { id: 1, label: '1 слот', subtitle: '11:00–12:00 приезд' },
  { id: 2, label: '2 слот', subtitle: '14:00–16:00 приезд' },
  { id: 3, label: '3 слот', subtitle: 'без времени' },
  { id: 4, label: '4 слот', subtitle: 'без времени' }
];

const state = {
  session: null,
  profile: null,
  stores: [],
  jobs: [],
  expenses: {},
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  reportMonth: new Date().getMonth() + 1,
  reportYear: new Date().getFullYear(),
  selectedDate: formatDate(new Date()),
  search: '',
  filters: {
    store: 'all',
    status: 'all',
    payment: 'all',
    fill: 'all'
  }
};

const $ = (id) => document.getElementById(id);

const els = {
  authScreen: $('authScreen'),
  appShell: $('appShell'),
  authForm: $('authForm'),
  authEmail: $('authEmail'),
  authPassword: $('authPassword'),
  authMessage: $('authMessage'),
  signUpBtn: $('signUpBtn'),
  logoutBtn: $('logoutBtn'),

  userEmail: $('userEmail'),
  userRole: $('userRole'),

  monthTitle: $('monthTitle'),
  calendarGrid: $('calendarGrid'),
  prevMonthBtn: $('prevMonthBtn'),
  nextMonthBtn: $('nextMonthBtn'),
  addJobBtn: $('addJobBtn'),
  openFiltersBtn: $('openFiltersBtn'),
  searchInput: $('searchInput'),

  reportMonth: $('reportMonth'),
  reportYear: $('reportYear'),
  statsGrid: $('statsGrid'),
  archiveList: $('archiveList'),
  exportMonthBtn: $('exportMonthBtn'),
  exportYearBtn: $('exportYearBtn'),

  jobSheet: $('jobSheet'),
  jobSheetTitle: $('jobSheetTitle'),
  jobForm: $('jobForm'),
  jobId: $('jobId'),
  jobDate: $('jobDate'),
  jobSlot: $('jobSlot'),
  jobClient: $('jobClient'),
  jobPhone: $('jobPhone'),
  jobAddress: $('jobAddress'),
  jobStore: $('jobStore'),
  jobPrice: $('jobPrice'),
  jobStatus: $('jobStatus'),
  jobPayment: $('jobPayment'),
  jobComment: $('jobComment'),
  deleteJobBtn: $('deleteJobBtn'),

  daySheet: $('daySheet'),
  daySheetTitle: $('daySheetTitle'),
  dayExpenseInput: $('dayExpenseInput'),
  dayExpenseComment: $('dayExpenseComment'),
  saveDayExpenseBtn: $('saveDayExpenseBtn'),
  daySlots: $('daySlots'),
  dayStats: $('dayStats'),

  filtersSheet: $('filtersSheet'),
  filterStore: $('filterStore'),
  filterStatus: $('filterStatus'),
  filterPayment: $('filterPayment'),
  filterFill: $('filterFill'),
  applyFiltersBtn: $('applyFiltersBtn'),
  resetFiltersBtn: $('resetFiltersBtn')
};

init().catch((error) => {
  console.error('init error', error);
  showAuthMessage(error.message || 'Ошибка запуска', true);
});

async function init() {
  populateStaticFields();
  bindEvents();

  const { data } = await sbClient.auth.getSession();
  state.session = data.session;

  await safeHandleSession();

  sbClient.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    await safeHandleSession();
  });
}

async function safeHandleSession() {
  try {
    await handleSession();
  } catch (error) {
    console.error('handleSession error', error);
    alert(error.message || 'Ошибка загрузки данных.');
  }
}

function populateStaticFields() {
  els.jobSlot.innerHTML = SLOTS.map(
    (slot) => `<option value="${slot.id}">${slot.label} — ${slot.subtitle}</option>`
  ).join('');

  els.jobStatus.innerHTML = STATUS_OPTIONS.map(
    (value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
  ).join('');

  els.jobPayment.innerHTML = PAYMENT_OPTIONS.map(
    (value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
  ).join('');

  els.reportMonth.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(2025, i, 1).toLocaleDateString('ru-RU', { month: 'long' });
    return `<option value="${i + 1}">${capitalize(monthName)}</option>`;
  }).join('');
}

function bindEvents() {
  els.authForm.addEventListener('submit', signIn);
  els.signUpBtn.addEventListener('click', signUp);
  els.logoutBtn.addEventListener('click', async () => {
    await sbClient.auth.signOut();
  });

  els.prevMonthBtn.addEventListener('click', () => shiftMonth(-1));
  els.nextMonthBtn.addEventListener('click', () => shiftMonth(1));
  els.addJobBtn.addEventListener('click', () => openJobSheet(state.selectedDate));

  els.jobForm.addEventListener('submit', saveJob);
  els.deleteJobBtn.addEventListener('click', deleteJob);

  els.saveDayExpenseBtn.addEventListener('click', saveExpense);

  els.searchInput.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderCalendar();
  });

  els.reportMonth.addEventListener('change', (event) => {
    state.reportMonth = Number(event.target.value);
    renderReports();
  });

  els.reportYear.addEventListener('change', (event) => {
    state.reportYear = Number(event.target.value);
    renderReports();
  });

  els.exportMonthBtn.addEventListener('click', () => exportCsv(false));
  els.exportYearBtn.addEventListener('click', () => exportCsv(true));

  els.openFiltersBtn.addEventListener('click', () => openSheet('filtersSheet'));

  els.applyFiltersBtn.addEventListener('click', () => {
    state.filters = {
      store: els.filterStore.value,
      status: els.filterStatus.value,
      payment: els.filterPayment.value,
      fill: els.filterFill.value
    };
    closeSheet('filtersSheet');
    renderCalendar();
  });

  els.resetFiltersBtn.addEventListener('click', () => {
    state.filters = {
      store: 'all',
      status: 'all',
      payment: 'all',
      fill: 'all'
    };
    populateFilterFields();
    renderCalendar();
  });

  document.querySelectorAll('[data-close]').forEach((node) => {
    node.addEventListener('click', () => closeSheet(node.dataset.close));
  });

  document.querySelectorAll('.nav-item').forEach((node) => {
    node.addEventListener('click', () => switchScreen(node.dataset.screen));
  });
}

async function handleSession() {
  if (!state.session) {
    state.profile = null;
    els.authScreen.classList.remove('hidden');
    els.appShell.classList.add('hidden');
    showAuthMessage('');
    return;
  }

  const ok = await loadProfile();
  if (!ok) return;

  await loadData();

  els.authScreen.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  els.userEmail.textContent = state.profile.email || '';
  els.userRole.textContent = state.profile.role === 'admin' ? 'Админ' : 'Просмотр';

  renderAll();
}

async function loadProfile() {
  const { data, error } = await sbClient
    .from('profiles')
    .select('id,email,role')
    .eq('id', state.session.user.id)
    .maybeSingle();

  if (error || !data) {
    showAuthMessage('Доступ не разрешён для этого email.', true);
    await sbClient.auth.signOut();
    return false;
  }

  state.profile = data;
  return true;
}

async function loadData() {
  const [storesResult, jobsResult, expensesResult] = await Promise.all([
    sbClient
      .from('stores')
      .select('id,name,sort_order')
      .eq('is_active', true)
      .order('sort_order'),

    sbClient
      .from('jobs')
      .select('id,job_date,slot,client_name,phone,address,mount_price,status,payment_status,comment,store_id,stores(name)')
      .order('job_date')
      .order('slot'),

    sbClient
      .from('day_expenses')
      .select('day_date,amount,comment')
  ]);

  if (storesResult.error) throw storesResult.error;
  if (jobsResult.error) throw jobsResult.error;
  if (expensesResult.error) throw expensesResult.error;

  state.stores = storesResult.data || [];

  state.jobs = (jobsResult.data || []).map((row) => ({
    id: row.id,
    date: row.job_date,
    slot: row.slot,
    client: row.client_name,
    phone: row.phone || '',
    address: row.address || '',
    price: Number(row.mount_price || 0),
    status: row.status,
    payment: row.payment_status,
    comment: row.comment || '',
    store_id: row.store_id || '',
    store: row.stores?.name || ''
  }));

  state.expenses = {};
  (expensesResult.data || []).forEach((row) => {
    state.expenses[row.day_date] = {
      amount: Number(row.amount || 0),
      comment: row.comment || ''
    };
  });

  const years = getYears();
  if (!years.includes(state.reportYear)) {
    state.reportYear = years[years.length - 1];
  }
}

async function signIn(event) {
  event.preventDefault();

  showAuthMessage('Вход...');

  const { error } = await sbClient.auth.signInWithPassword({
    email: els.authEmail.value.trim(),
    password: els.authPassword.value
  });

  if (error) {
    showAuthMessage(error.message, true);
  } else {
    showAuthMessage('');
  }
}

async function signUp() {
  showAuthMessage('Создание доступа...');

  const { error } = await sbClient.auth.signUp({
    email: els.authEmail.value.trim(),
    password: els.authPassword.value,
    options: {
      emailRedirectTo: 'https://montaji.vercel.app/'
    }
  });

  if (error) {
    showAuthMessage(error.message, true);
  } else {
    showAuthMessage('Пользователь создан. Теперь войди.');
  }
}

function showAuthMessage(text, isError = false) {
  els.authMessage.textContent = text || '';
  els.authMessage.className =
    'auth-message muted' + (isError ? ' auth-message--error' : ' auth-message--success');
}

function renderAll() {
  populateStoreFields();
  populateFilterFields();
  populateYearField();
  renderCalendar();
  renderReports();
  toggleAdminUi();
}

function toggleAdminUi() {
  const isAdmin = state.profile?.role === 'admin';
  els.addJobBtn.classList.toggle('hidden', !isAdmin);
  els.saveDayExpenseBtn.classList.toggle('hidden', !isAdmin);
}

function populateStoreFields() {
  els.jobStore.innerHTML =
    '<option value="">Не выбран</option>' +
    state.stores.map((store) => `<option value="${store.id}">${escapeHtml(store.name)}</option>`).join('');
}

function populateFilterFields() {
  els.filterStore.innerHTML =
    '<option value="all">Все</option>' +
    state.stores.map((store) => `<option value="${store.id}">${escapeHtml(store.name)}</option>`).join('');

  els.filterStatus.innerHTML =
    '<option value="all">Все</option>' +
    STATUS_OPTIONS.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');

  els.filterPayment.innerHTML =
    '<option value="all">Все</option>' +
    PAYMENT_OPTIONS.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');

  els.filterStore.value = state.filters.store;
  els.filterStatus.value = state.filters.status;
  els.filterPayment.value = state.filters.payment;
  els.filterFill.value = state.filters.fill;
}

function populateYearField() {
  const years = getYears();
  els.reportYear.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join('');
  els.reportMonth.value = String(state.reportMonth);
  els.reportYear.value = String(state.reportYear);
}

function getYears() {
  const years = new Set([new Date().getFullYear()]);
  state.jobs.forEach((job) => years.add(Number(job.date.slice(0, 4))));
  Object.keys(state.expenses).forEach((date) => years.add(Number(date.slice(0, 4))));
  return [...years].sort((a, b) => a - b);
}

function shiftMonth(step) {
  let month = state.currentMonth + step;
  let year = state.currentYear;

  if (month < 0) {
    month = 11;
    year -= 1;
  }

  if (month > 11) {
    month = 0;
    year += 1;
  }

  state.currentMonth = month;
  state.currentYear = year;

  renderCalendar();
}

function renderCalendar() {
  els.monthTitle.textContent = capitalize(
    new Date(state.currentYear, state.currentMonth, 1).toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric'
    })
  );

  const firstDay = new Date(state.currentYear, state.currentMonth, 1);
  const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0);

  let weekday = firstDay.getDay();
  weekday = weekday === 0 ? 7 : weekday;

  const leading = weekday - 1;
  const prevMonthLastDate = new Date(state.currentYear, state.currentMonth, 0).getDate();

  const cells = [];

  for (let i = leading - 1; i >= 0; i--) {
    cells.push(renderDayCell(new Date(state.currentYear, state.currentMonth - 1, prevMonthLastDate - i), true));
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    cells.push(renderDayCell(new Date(state.currentYear, state.currentMonth, day), false));
  }

  const trailing = Math.ceil(cells.length / 7) * 7 - cells.length;
  for (let day = 1; day <= trailing; day++) {
    cells.push(renderDayCell(new Date(state.currentYear, state.currentMonth + 1, day), true));
  }

  els.calendarGrid.innerHTML = cells.join('');

  els.calendarGrid.querySelectorAll('.calendar-day').forEach((node) => {
    node.addEventListener('click', () => openDaySheet(node.dataset.date));
  });
}

function renderDayCell(date, muted) {
  const key = formatDate(date);
  const jobs = getJobsForDate(key).filter(matchesFiltersAndSearch);
  const count = jobs.length;

  if (!matchesFillFilter(count)) {
    return '<div class="calendar-day hidden"></div>';
  }

  const fillClass =
    count >= 4 ? 'full' :
    count === 3 ? 'busy' :
    count > 0 ? 'partial' :
    'free';

  const usedSlots = new Set(jobs.map((job) => job.slot));
  const indicators = SLOTS.map((slot) => {
    return `<span class="slot-indicator ${usedSlots.has(slot.id) ? 'slot-indicator--busy' : ''}"></span>`;
  }).join('');

  const expense = state.expenses[key]?.amount || 0;

  return `
    <button type="button" class="calendar-day ${muted ? 'calendar-day--muted' : ''} calendar-day--${fillClass}" data-date="${key}">
      <div class="calendar-day__top">
        <span class="calendar-day__num">${date.getDate()}</span>
        <span class="calendar-day__count">${count}/4</span>
      </div>
      <div class="calendar-day__slots">${indicators}</div>
      <div class="calendar-day__expense">${expense ? `Расх. ${formatMoney(expense)}` : '&nbsp;'}</div>
    </button>
  `;
}

function matchesFiltersAndSearch(job) {
  if (state.search) {
    const text = [job.client, job.phone, job.address].join(' ').toLowerCase();
    if (!text.includes(state.search)) return false;
  }

  if (state.filters.store !== 'all' && job.store_id !== state.filters.store) return false;
  if (state.filters.status !== 'all' && job.status !== state.filters.status) return false;
  if (state.filters.payment !== 'all' && job.payment !== state.filters.payment) return false;

  return true;
}

function matchesFillFilter(count) {
  if (state.filters.fill === 'free') return count === 0;
  if (state.filters.fill === 'partial') return count > 0 && count < 4;
  if (state.filters.fill === 'full') return count === 4;
  return true;
}

function getJobsForDate(date) {
  return state.jobs
    .filter((job) => job.date === date && job.status !== 'Отменён')
    .sort((a, b) => a.slot - b.slot);
}

function openJobSheet(date = state.selectedDate, jobId = '') {
  if (state.profile?.role !== 'admin') return;

  els.jobForm.reset();
  els.jobId.value = '';
  els.jobDate.value = date;
  els.jobSlot.value = '1';
  els.jobStatus.value = 'Бронь';
  els.jobPayment.value = 'Не оплачено';
  els.jobSheetTitle.textContent = 'Новый монтаж';
  els.deleteJobBtn.hidden = true;

  if (jobId) {
    const job = state.jobs.find((item) => item.id === jobId);
    if (job) {
      els.jobId.value = job.id;
      els.jobDate.value = job.date;
      els.jobSlot.value = String(job.slot);
      els.jobClient.value = job.client;
      els.jobPhone.value = job.phone;
      els.jobAddress.value = job.address;
      els.jobStore.value = job.store_id || '';
      els.jobPrice.value = String(job.price || '');
      els.jobStatus.value = job.status;
      els.jobPayment.value = job.payment;
      els.jobComment.value = job.comment;
      els.jobSheetTitle.textContent = 'Редактировать монтаж';
      els.deleteJobBtn.hidden = false;
    }
  }

  openSheet('jobSheet');
}

async function saveJob(event) {
  event.preventDefault();

  if (state.profile?.role !== 'admin') return;

  if (!els.jobDate.value || !els.jobClient.value.trim()) {
    alert('Заполни дату и ФИО клиента.');
    return;
  }

  const payload = {
    job_date: els.jobDate.value,
    slot: Number(els.jobSlot.value),
    client_name: els.jobClient.value.trim(),
    phone: els.jobPhone.value.trim() || null,
    address: els.jobAddress.value.trim() || null,
    store_id: els.jobStore.value || null,
    mount_price: Number(els.jobPrice.value || 0),
    status: els.jobStatus.value,
    payment_status: els.jobPayment.value,
    comment: els.jobComment.value.trim() || null,
    updated_by: state.profile?.id || null
  };

  const collision = state.jobs.find((job) => {
    return (
      job.id !== els.jobId.value &&
      job.date === payload.job_date &&
      Number(job.slot) === Number(payload.slot) &&
      job.status !== 'Отменён'
    );
  });

  if (collision) {
    alert('Этот слот уже занят.');
    return;
  }

  try {
    let result;

    if (els.jobId.value) {
      result = await sbClient
        .from('jobs')
        .update(payload)
        .eq('id', els.jobId.value)
        .select('id')
        .single();
    } else {
      result = await sbClient
        .from('jobs')
        .insert({
          ...payload,
          created_by: state.profile?.id || null
        })
        .select('id')
        .single();
    }

    if (result.error) throw result.error;

    closeSheet('jobSheet');
    await loadData();
    renderAll();
    openDaySheet(payload.job_date);
  } catch (error) {
    console.error('saveJob error', error);

    if (
      String(error.message || '').toLowerCase().includes('duplicate') ||
      String(error.message || '').toLowerCase().includes('unique')
    ) {
      alert('Этот слот уже занят.');
      return;
    }

    alert(error.message || 'Не удалось сохранить монтаж.');
  }
}

async function deleteJob() {
  if (state.profile?.role !== 'admin' || !els.jobId.value) return;
  if (!confirm('Удалить запись?')) return;

  const { error } = await sbClient
    .from('jobs')
    .delete()
    .eq('id', els.jobId.value);

  if (error) {
    alert(error.message || 'Не удалось удалить запись.');
    return;
  }

  closeSheet('jobSheet');
  await loadData();
  renderAll();
}

function openDaySheet(date) {
  state.selectedDate = date;

  els.daySheetTitle.textContent = capitalize(
    new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  );

  const expense = state.expenses[date] || { amount: '', comment: '' };
  els.dayExpenseInput.value = expense.amount ?? '';
  els.dayExpenseComment.value = expense.comment ?? '';

  const jobs = getJobsForDate(date);

  els.daySlots.innerHTML = SLOTS.map((slot) => {
    return renderSlotBlock(date, slot, jobs.find((job) => Number(job.slot) === Number(slot.id)));
  }).join('');

  els.dayStats.innerHTML = renderDayStats(date, jobs);

  els.daySlots.querySelectorAll('[data-edit]').forEach((node) => {
    node.addEventListener('click', () => openJobSheet(date, node.dataset.edit));
  });

  els.daySlots.querySelectorAll('[data-add]').forEach((node) => {
    node.addEventListener('click', () => {
      openJobSheet(date);
      els.jobSlot.value = node.dataset.add;
    });
  });

  openSheet('daySheet');
}

function renderSlotBlock(date, slot, job) {
  if (!job) {
    return `
      <section class="slot-block">
        <div class="slot-block__head">
          <h3>${slot.label} <span class="muted">· ${slot.subtitle}</span></h3>
          ${state.profile?.role === 'admin' ? `<button type="button" class="ghost-btn" data-add="${slot.id}">Добавить</button>` : ''}
        </div>
        <div class="slot-empty">Свободно</div>
      </section>
    `;
  }

  const actions = [];

  if (job.phone) {
    actions.push(`<a class="action-link" href="tel:${job.phone.replace(/[^\d+]/g, '')}">Позвонить</a>`);
  }

  if (job.address) {
    actions.push(`<a class="action-link" href="https://maps.google.com/?q=${encodeURIComponent(job.address)}" target="_blank" rel="noopener">Карта</a>`);
  }

  if (state.profile?.role === 'admin') {
    actions.push(`<button type="button" class="action-link" data-edit="${job.id}">Изменить</button>`);
  }

  return `
    <section class="slot-block">
      <div class="slot-block__head">
        <h3>${slot.label} <span class="muted">· ${slot.subtitle}</span></h3>
      </div>

      <article class="job-card">
        <div class="job-card__top">
          <div>
            <h4 class="job-card__client">${escapeHtml(job.client)}</h4>
            <div class="job-card__meta">${slot.subtitle}</div>
          </div>
          <span class="pill" data-status="${escapeHtml(job.status)}">${escapeHtml(job.status)}</span>
        </div>

        <div class="job-card__details">
          ${
            [
              job.phone ? `📞 ${escapeHtml(job.phone)}` : '',
              job.address ? `📍 ${escapeHtml(job.address)}` : '',
              job.store ? `🏪 ${escapeHtml(job.store)}` : '',
              `💰 ${formatMoney(job.price)} · ${escapeHtml(job.payment)}`,
              job.comment ? `📝 ${escapeHtml(job.comment)}` : ''
            ]
              .filter(Boolean)
              .map((line) => `<div>${line}</div>`)
              .join('')
          }
        </div>

        <div class="job-card__actions">${actions.join('')}</div>
      </article>
    </section>
  `;
}

function renderDayStats(date, jobs) {
  const revenue = jobs.reduce((sum, job) => sum + job.price, 0);
  const expense = Number(state.expenses[date]?.amount || 0);
  const net = revenue - expense;

  return [
    ['Монтажей', jobs.length],
    ['Выручка', formatMoney(revenue)],
    ['Расходка', formatMoney(expense)],
    ['Чистыми', formatMoney(net)]
  ]
    .map(([label, value]) => {
      return `
        <div class="mini-stat">
          <div class="mini-stat__label">${label}</div>
          <div class="mini-stat__value">${value}</div>
        </div>
      `;
    })
    .join('');
}

async function saveExpense() {
  if (state.profile?.role !== 'admin') return;

  const date = state.selectedDate;
  const exists = Boolean(state.expenses[date]);

  try {
    let result;

    if (exists) {
      result = await sbClient
        .from('day_expenses')
        .update({
          amount: Number(els.dayExpenseInput.value || 0),
          comment: els.dayExpenseComment.value.trim() || null,
          updated_by: state.profile?.id || null
        })
        .eq('day_date', date)
        .select('day_date')
        .single();
    } else {
      result = await sbClient
        .from('day_expenses')
        .insert({
          day_date: date,
          amount: Number(els.dayExpenseInput.value || 0),
          comment: els.dayExpenseComment.value.trim() || null,
          created_by: state.profile?.id || null,
          updated_by: state.profile?.id || null
        })
        .select('day_date')
        .single();
    }

    if (result.error) throw result.error;

    await loadData();
    renderAll();
    openDaySheet(date);
  } catch (error) {
    console.error('saveExpense error', error);
    alert(error.message || 'Не удалось сохранить расходку.');
  }
}

function renderReports() {
  populateYearField();

  const month = state.reportMonth;
  const year = state.reportYear;

  const monthJobs = state.jobs.filter((job) => {
    return (
      job.status !== 'Отменён' &&
      Number(job.date.slice(0, 4)) === year &&
      Number(job.date.slice(5, 7)) === month
    );
  });

  const monthExpenses = Object.entries(state.expenses)
    .filter(([date]) => Number(date.slice(0, 4)) === year && Number(date.slice(5, 7)) === month)
    .reduce((sum, [, value]) => sum + Number(value.amount || 0), 0);

  const monthRevenue = monthJobs.reduce((sum, job) => sum + job.price, 0);

  const yearJobs = state.jobs.filter((job) => {
    return job.status !== 'Отменён' && Number(job.date.slice(0, 4)) === year;
  });

  const yearExpenses = Object.entries(state.expenses)
    .filter(([date]) => Number(date.slice(0, 4)) === year)
    .reduce((sum, [, value]) => sum + Number(value.amount || 0), 0);

  const yearRevenue = yearJobs.reduce((sum, job) => sum + job.price, 0);

  els.statsGrid.innerHTML = [
    ['Монтажей за месяц', monthJobs.length],
    ['Выручка за месяц', formatMoney(monthRevenue)],
    ['Расходка за месяц', formatMoney(monthExpenses)],
    ['Чистыми за месяц', formatMoney(monthRevenue - monthExpenses)],
    ['Монтажей за год', yearJobs.length],
    ['Выручка за год', formatMoney(yearRevenue)],
    ['Расходка за год', formatMoney(yearExpenses)],
    ['Чистыми за год', formatMoney(yearRevenue - yearExpenses)]
  ]
    .map(([label, value]) => {
      return `
        <div class="stat-card">
          <div class="stat-card__label">${label}</div>
          <div class="stat-card__value">${value}</div>
        </div>
      `;
    })
    .join('');

  renderArchive();
}

function renderArchive() {
  els.archiveList.innerHTML = getYears()
    .slice()
    .reverse()
    .map((year) => {
      const jobs = state.jobs.filter((job) => {
        return job.status !== 'Отменён' && Number(job.date.slice(0, 4)) === year;
      });

      const revenue = jobs.reduce((sum, job) => sum + job.price, 0);

      const expense = Object.entries(state.expenses)
        .filter(([date]) => Number(date.slice(0, 4)) === year)
        .reduce((sum, [, value]) => sum + Number(value.amount || 0), 0);

      return `
        <div class="archive-item">
          <div>
            <div><strong>${year}</strong></div>
            <div class="archive-item__stats">${jobs.length} монтажей · выручка ${formatMoney(revenue)} · чистыми ${formatMoney(revenue - expense)}</div>
          </div>
          <button type="button" class="ghost-btn" data-year="${year}">CSV</button>
        </div>
      `;
    })
    .join('');

  els.archiveList.querySelectorAll('[data-year]').forEach((node) => {
    node.addEventListener('click', () => exportCsv(true, Number(node.dataset.year)));
  });
}

function exportCsv(yearOnly = false, forcedYear = state.reportYear) {
  const rows = (
    yearOnly
      ? state.jobs.filter((job) => job.status !== 'Отменён' && Number(job.date.slice(0, 4)) === forcedYear)
      : state.jobs.filter((job) => {
          return (
            job.status !== 'Отменён' &&
            Number(job.date.slice(0, 4)) === state.reportYear &&
            Number(job.date.slice(5, 7)) === state.reportMonth
          );
        })
  )
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot)
    .map((job) => ({
      Дата: job.date,
      Слот: job.slot,
      Клиент: job.client,
      Телефон: job.phone,
      Адрес: job.address,
      Магазин: job.store,
      Цена: job.price,
      Статус: job.status,
      Оплата: job.payment,
      Комментарий: job.comment,
      Расходка_дня: state.expenses[job.date]?.amount || 0
    }));

  const headers = rows.length ? Object.keys(rows[0]) : ['Пусто'];

  const csv = [
    headers.join(';'),
    ...rows.map((row) => {
      return headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(';');
    })
  ].join('\r\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = yearOnly
    ? `montazhi-${forcedYear}.csv`
    : `montazhi-${state.reportYear}-${String(state.reportMonth).padStart(2, '0')}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
}

function switchScreen(id) {
  document.querySelectorAll('.screen').forEach((node) => node.classList.remove('screen--active'));
  document.querySelectorAll('.nav-item').forEach((node) => node.classList.remove('nav-item--active'));

  $(id).classList.add('screen--active');
  document.querySelector(`.nav-item[data-screen="${id}"]`).classList.add('nav-item--active');
}

function openSheet(id) {
  const node = $(id);
  if (!node) return;
  node.classList.add('is-open');
  node.setAttribute('aria-hidden', 'false');
}

function closeSheet(id) {
  const node = $(id);
  if (!node) return;
  node.classList.remove('is-open');
  node.setAttribute('aria-hidden', 'true');
}

function formatDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value || 0)) + ' ₽';
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}