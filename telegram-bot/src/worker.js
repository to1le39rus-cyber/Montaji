const STATUS = ['Бронь', 'Подтверждён', 'Выполнен', 'Перенос', 'Отменён'];
const PAYMENT = ['Не оплачено', 'Частично', 'Оплачено'];
const SLOTS = [
  { id: 1, label: '11:00–12:00' },
  { id: 2, label: '14:00–16:00' },
  { id: 3, label: 'Без времени' },
  { id: 4, label: 'Без времени' },
];

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Montaji bot is running.');
    const update = await request.json();
    try {
      await handleUpdate(update, env);
      return new Response('ok');
    } catch (error) {
      console.error(error);
      return new Response('ok');
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runReminders(env));
  },
};

async function handleUpdate(update, env) {
  if (update.callback_query) {
    await handleCallback(update.callback_query, env);
    return;
  }
  if (!update.message) return;
  const chatId = update.message.chat.id;
  const from = update.message.from;
  const text = (update.message.text || '').trim();

  const workspace = await ensureUser(from, env);
  if (!workspace) {
    await sendMessage(env, chatId, 'Не удалось создать рабочее пространство. Попробуй ещё раз через минуту.');
    return;
  }

  const session = await getSession(from.id, env);

  if (text.startsWith('/start')) {
    const invite = text.split(' ')[1];
    if (invite) await acceptInvite(from, invite, env);
    await showHome(chatId, env);
    return;
  }

  if (text === '/today' || text === '🔨 Сегодня') {
    await showToday(chatId, env);
    return;
  }
  if (text === '/new' || text === '➕ Новый монтаж') {
    await startNewJob(chatId, from.id, env);
    return;
  }
  if (text === '/calendar' || text === '📆 Календарь') {
    await showCalendar(chatId, new Date(), env);
    return;
  }
  if (text === '/all' || text === '📋 Все монтажи') {
    await showUpcoming(chatId, env);
    return;
  }
  if (text === '/search' || text === '🔎 Поиск') {
    await setSession(from.id, workspace.id, 'search', {}, env);
    await sendMessage(env, chatId, '🔎 Напиши фамилию, имя, телефон или адрес:');
    return;
  }
  if (text === '/partner' || text === '👥 Напарник') {
    await showPartner(chatId, from.id, workspace.id, env);
    return;
  }
  if (text === '/cancel') {
    await clearSession(from.id, env);
    await showHome(chatId, env);
    return;
  }

  if (session?.state === 'search') {
    await searchJobs(chatId, text, env);
    await clearSession(from.id, env);
    return;
  }

  if (session?.state?.startsWith('new_')) {
    await handleNewJobText(chatId, from.id, session, text, env);
    return;
  }

  await showHome(chatId, env);
}

async function handleCallback(query, env) {
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  await answerCallback(env, query.id);
  const data = query.data || '';

  if (data === 'home') return showHome(chatId, env);
  if (data === 'today') return showToday(chatId, env);
  if (data === 'new') return startNewJob(chatId, telegramId, env);
  if (data === 'calendar') return showCalendar(chatId, new Date(), env);
  if (data === 'upcoming') return showUpcoming(chatId, env);
  if (data === 'partner') {
    const ws = await getWorkspaceForUser(telegramId, env);
    return showPartner(chatId, telegramId, ws.id, env);
  }
  if (data.startsWith('cal:')) return handleCalendarCallback(chatId, data, env);
  if (data.startsWith('job:')) return handleJobCallback(chatId, telegramId, data, env);
  if (data.startsWith('new:')) return handleNewJobCallback(chatId, telegramId, data, env);
  if (data.startsWith('invite:')) return showPartner(chatId, telegramId, data.slice(7), env, true);
}

async function showHome(chatId, env) {
  const jobs = await getJobsForDate(todayISO(env), env);
  const open = jobs.filter(j => j.status !== 'Отменён' && j.status !== 'Выполнен').length;
  const text = `🔨 <b>МОНТАЖИ</b>\n\nСегодня: <b>${open}</b> открытых монтажей\n\nВыбери действие:`;
  await sendMessage(env, chatId, text, mainKeyboard());
}

function mainKeyboard() {
  return { inline_keyboard: [
    [{ text: '🔨 Сегодня', callback_data: 'today' }, { text: '➕ Новый монтаж', callback_data: 'new' }],
    [{ text: '📆 Календарь', callback_data: 'calendar' }, { text: '📋 Ближайшие', callback_data: 'upcoming' }],
    [{ text: '👥 Напарник', callback_data: 'partner' }],
  ] };
}

async function showToday(chatId, env) {
  return showJobsForDate(chatId, todayISO(env), '🔨 <b>МОНТАЖИ СЕГОДНЯ</b>', env);
}

async function showJobsForDate(chatId, date, title, env) {
  const jobs = await getJobsForDate(date, env);
  if (!jobs.length) {
    await sendMessage(env, chatId, `${title}\n\nСегодня монтажей нет.`, { inline_keyboard: [[{ text: '➕ Добавить монтаж', callback_data: 'new' }], [{ text: '⬅️ Меню', callback_data: 'home' }]] });
    return;
  }
  const sorted = jobs.sort((a,b) => Number(a.slot) - Number(b.slot));
  const lines = sorted.map((j, i) => `${statusEmoji(j.status)} <b>${i + 1}. ${slotLabel(j.slot)}</b> — ${escape(j.client_name)}\n📍 ${escape(j.address || 'Адрес не указан')}\n🏪 ${escape(j.stores?.name || 'Магазин не указан')}\n💰 ${money(j.mount_price)} ₽`).join('\n\n');
  const keyboard = sorted.map(j => [{ text: `${statusEmoji(j.status)} ${j.client_name}`, callback_data: `job:${j.id}` }]);
  keyboard.push([{ text: '➕ Новый монтаж', callback_data: 'new' }, { text: '⬅️ Меню', callback_data: 'home' }]);
  await sendMessage(env, `${title}\n\n${lines}`, { inline_keyboard: keyboard });
}

async function showUpcoming(chatId, env) {
  const today = todayISO(env);
  const jobs = await getJobsFrom(env, today);
  const upcoming = jobs.filter(j => j.status !== 'Отменён' && j.status !== 'Выполнен').slice(0, 15);
  if (!upcoming.length) return sendMessage(env, chatId, '📋 <b>БЛИЖАЙШИЕ</b>\n\nОткрытых монтажей нет.', backKeyboard());
  const groups = {};
  for (const j of upcoming) (groups[j.job_date] ||= []).push(j);
  let text = '📋 <b>БЛИЖАЙШИЕ МОНТАЖИ</b>\n\n';
  const keyboard = [];
  for (const date of Object.keys(groups).sort()) {
    text += `<b>${formatDate(date)}</b>\n`;
    for (const j of groups[date]) text += `${statusEmoji(j.status)} ${slotLabel(j.slot)} — ${escape(j.client_name)} — ${money(j.mount_price)} ₽\n`;
    text += '\n';
    for (const j of groups[date]) keyboard.push([{ text: `${formatDate(date)} · ${j.client_name}`, callback_data: `job:${j.id}` }]);
  }
  keyboard.push([{ text: '⬅️ Меню', callback_data: 'home' }]);
  await sendMessage(env, text, { inline_keyboard: keyboard });
}

async function showCalendar(chatId, date, env) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const jobs = await getJobsForMonth(year, month + 1, env);
  const counts = {};
  for (const j of jobs) counts[j.job_date] = (counts[j.job_date] || 0) + 1;
  let text = `📆 <b>${first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase()}</b>\n\n`;
  for (let d = 1; d <= days; d++) {
    const iso = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (counts[iso]) text += `• <b>${d}</b> — ${counts[iso]} монтаж${plural(counts[iso])}\n`;
  }
  if (!Object.keys(counts).length) text += 'Монтажей в этом месяце нет.\n';
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  await sendMessage(env, text, { inline_keyboard: [
    [{ text: '‹', callback_data: `cal:${prev.getFullYear()}-${prev.getMonth()+1}` }, { text: '›', callback_data: `cal:${next.getFullYear()}-${next.getMonth()+1}` }],
    [{ text: '⬅️ Меню', callback_data: 'home' }]
  ] });
}

async function handleCalendarCallback(chatId, data, env) {
  const [, y, m] = data.split(':')[1].split('-').map(Number);
  return showCalendar(chatId, new Date(y, m - 1, 1), env);
}

async function startNewJob(chatId, telegramId, env) {
  const ws = await getWorkspaceForUser(telegramId, env);
  await setSession(telegramId, ws.id, 'new_date', {}, env);
  await sendMessage(env, '➕ <b>НОВЫЙ МОНТАЖ</b>\n\nНа какую дату?', { inline_keyboard: [
    [{ text: 'Сегодня', callback_data: 'new:date:today' }, { text: 'Завтра', callback_data: 'new:date:tomorrow' }],
    [{ text: 'Ввести дату', callback_data: 'new:date:manual' }],
    [{ text: '❌ Отмена', callback_data: 'home' }]
  ] });
}

async function handleNewJobCallback(chatId, telegramId, data, env) {
  const parts = data.split(':');
  if (parts[1] === 'date') {
    let date = null;
    if (parts[2] === 'today') date = todayISO(env);
    if (parts[2] === 'tomorrow') date = addDays(todayISO(env), 1);
    if (date) {
      await setSession(telegramId, (await getWorkspaceForUser(telegramId, env)).id, 'new_slot', { date }, env);
      return askSlot(chatId, env);
    }
    await setSession(telegramId, (await getWorkspaceForUser(telegramId, env)).id, 'new_date_manual', {}, env);
    return sendMessage(env, chatId, 'Введите дату в формате <b>12.08.2026</b>');
  }
  if (parts[1] === 'slot') {
    const ws = await getWorkspaceForUser(telegramId, env);
    const session = await getSession(telegramId, env);
    await setSession(telegramId, ws.id, 'new_client', { ...session.payload, slot: Number(parts[2]) }, env);
    return sendMessage(env, chatId, '👤 Введите ФИО клиента:');
  }
  if (parts[1] === 'store') {
    const ws = await getWorkspaceForUser(telegramId, env);
    const session = await getSession(telegramId, env);
    await setSession(telegramId, ws.id, 'new_price', { ...session.payload, store_id: parts[2] }, env);
    return sendMessage(env, chatId, '💰 Стоимость монтажа (только число):');
  }
  if (parts[1] === 'confirm') {
    return createJobFromSession(chatId, telegramId, env);
  }
}

async function askSlot(chatId, env) {
  await sendMessage(env, '🕐 Выбери время:', { inline_keyboard: SLOTS.map(s => [{ text: s.label, callback_data: `new:slot:${s.id}` }]) });
}

async function handleNewJobText(chatId, telegramId, session, text, env) {
  const ws = await getWorkspaceForUser(telegramId, env);
  const p = session.payload || {};
  switch (session.state) {
    case 'new_date_manual': {
      const date = parseRuDate(text);
      if (!date) return sendMessage(env, chatId, 'Не понял дату. Пример: <b>12.08.2026</b>');
      await setSession(telegramId, ws.id, 'new_slot', { date }, env);
      return askSlot(chatId, env);
    }
    case 'new_client':
      if (!text) return sendMessage(env, chatId, 'Введите ФИО клиента.');
      await setSession(telegramId, ws.id, 'new_phone', { ...p, client_name: text }, env);
      return sendMessage(env, chatId, '📞 Телефон клиента (или «пропустить»):');
    case 'new_phone':
      await setSession(telegramId, ws.id, 'new_address', { ...p, phone: text.toLowerCase() === 'пропустить' ? null : text }, env);
      return sendMessage(env, chatId, '📍 Адрес монтажа:');
    case 'new_address':
      await setSession(telegramId, ws.id, 'new_store', { ...p, address: text }, env);
      return askStore(chatId, env);
    case 'new_price': {
      const price = Number(text.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(price)) return sendMessage(env, chatId, 'Введите стоимость числом, например <b>8000</b>.');
      await setSession(telegramId, ws.id, 'new_comment', { ...p, mount_price: price }, env);
      return sendMessage(env, chatId, '📝 Комментарий (или «пропустить»):');
    }
    case 'new_comment':
      await setSession(telegramId, ws.id, 'new_confirm', { ...p, comment: text.toLowerCase() === 'пропустить' ? null : text }, env);
      return showDraft(chatId, { ...p, comment: text.toLowerCase() === 'пропустить' ? null : text }, env);
    case 'new_search':
      return null;
  }
}

async function askStore(chatId, env) {
  const stores = await getStores(env);
  const rows = [];
  for (let i = 0; i < stores.length; i += 2) {
    rows.push(stores.slice(i, i + 2).map(s => ({ text: s.name, callback_data: `new:store:${s.id}` })));
  }
  rows.push([{ text: 'Без магазина', callback_data: 'new:store:null' }]);
  await sendMessage(env, '🏪 Выбери магазин:', { inline_keyboard: rows });
}

async function showDraft(chatId, p, env) {
  const storeName = p.store_id ? ((await getStore(p.store_id, env))?.name || '—') : '—';
  const text = `🔨 <b>ПРОВЕРЬ МОНТАЖ</b>\n\n📅 ${formatDate(p.date)}\n🕐 ${slotLabel(p.slot)}\n👤 ${escape(p.client_name)}\n📞 ${escape(p.phone || '—')}\n📍 ${escape(p.address || '—')}\n🏪 ${escape(storeName)}\n💰 ${money(p.mount_price)} ₽\n📝 ${escape(p.comment || '—')}`;
  await sendMessage(env, text, { inline_keyboard: [[{ text: '✅ Сохранить', callback_data: 'new:confirm:yes' }], [{ text: '❌ Отмена', callback_data: 'home' }]] });
}

async function createJobFromSession(chatId, telegramId, env) {
  const session = await getSession(telegramId, env);
  const p = session?.payload;
  if (!p?.date || !p?.client_name || !p?.slot) return sendMessage(env, chatId, 'Сессия заполнения устарела. Начни заново: /new');
  const existing = await getJobsForDate(p.date, env);
  if (existing.some(j => Number(j.slot) === Number(p.slot) && j.status !== 'Отменён')) {
    return sendMessage(env, chatId, '⚠️ Этот слот уже занят. Выбери другой слот: /new');
  }
  const row = {
    job_date: p.date,
    slot: p.slot,
    client_name: p.client_name,
    phone: p.phone,
    address: p.address,
    store_id: p.store_id === 'null' ? null : p.store_id,
    mount_price: p.mount_price || 0,
    status: 'Бронь',
    payment_status: 'Не оплачено',
    comment: p.comment,
  };
  await supabase(env, 'jobs', { method: 'POST', body: row });
  await clearSession(telegramId, env);
  await sendMessage(env, chatId, '✅ <b>Монтаж добавлен</b>\n\n' + `${formatDate(p.date)} · ${slotLabel(p.slot)}\n${escape(p.client_name)}\n📍 ${escape(p.address)}`, { inline_keyboard: [[{ text: '🔨 Сегодня', callback_data: 'today' }, { text: '⬅️ Меню', callback_data: 'home' }]] });
}

async function handleJobCallback(chatId, telegramId, data, env) {
  const parts = data.split(':');
  const id = parts[1];
  if (parts.length === 2) return showJob(chatId, id, env);
  const action = parts[2];
  if (action === 'done') return updateJobStatus(chatId, id, 'Выполнен', env);
  if (action === 'cancel') return updateJobStatus(chatId, id, 'Отменён', env);
  if (action === 'confirm') return updateJobStatus(chatId, id, 'Подтверждён', env);
  if (action === 'pay') return updateJobPayment(chatId, id, 'Оплачено', env);
  if (action === 'route') {
    const job = await getJob(id, env);
    if (job?.address) return sendMessage(env, chatId, `🗺 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}">Открыть маршрут</a>`, backKeyboard());
  }
}

async function showJob(chatId, id, env) {
  const j = await getJob(id, env);
  if (!j) return sendMessage(env, chatId, 'Монтаж не найден.', backKeyboard());
  const text = `🔨 <b>МОНТАЖ</b>\n\n📅 ${formatDate(j.job_date)}\n🕐 ${slotLabel(j.slot)}\n\n👤 ${escape(j.client_name)}\n📞 ${escape(j.phone || '—')}\n📍 ${escape(j.address || '—')}\n🏪 ${escape(j.stores?.name || '—')}\n💰 ${money(j.mount_price)} ₽\n📌 ${escape(j.status)}\n💳 ${escape(j.payment_status)}\n📝 ${escape(j.comment || '—')}`;
  await sendMessage(env, text, { inline_keyboard: [
    [{ text: '📍 Маршрут', callback_data: `job:${id}:route` }, { text: '📞 Позвонить', url: j.phone ? `tel:${j.phone}` : 'https://t.me/' }],
    [{ text: '🟢 Подтвердить', callback_data: `job:${id}:confirm` }, { text: '✅ Выполнен', callback_data: `job:${id}:done` }],
    [{ text: '💳 Оплачено', callback_data: `job:${id}:pay` }, { text: '❌ Отменить', callback_data: `job:${id}:cancel` }],
    [{ text: '⬅️ Назад', callback_data: 'today' }],
  ] });
}

async function updateJobStatus(chatId, id, status, env) {
  await supabase(env, `jobs?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } });
  await showJob(chatId, id, env);
}
async function updateJobPayment(chatId, id, payment_status, env) {
  await supabase(env, `jobs?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { payment_status } });
  await showJob(chatId, id, env);
}

async function showPartner(chatId, telegramId, workspaceId, env, fromInvite = false) {
  if (fromInvite) return acceptInviteByCode(chatId, telegramId, workspaceId, env);
  const members = await supabase(env, `telegram_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=telegram_id,role`, { method: 'GET' });
  const me = members.find(m => Number(m.telegram_id) === Number(telegramId));
  if (!me || me.role !== 'owner') return sendMessage(env, chatId, '👥 Напарника может приглашать только владелец.', backKeyboard());
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  await supabase(env, `telegram_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&telegram_id=eq.${telegramId}`, { method: 'PATCH', body: { invite_code: code } });
  const bot = env.BOT_USERNAME || 'MontajiBot';
  await sendMessage(env, chatId, `👥 <b>ПРИГЛАШЕНИЕ НАПАРНИКА</b>\n\nОтправь ему эту ссылку:\n\nhttps://t.me/${bot}?start=invite_${code}\n\nПосле перехода он увидит те же монтажи.`, backKeyboard());
}

async function acceptInvite(from, code, env) {
  if (!code.startsWith('invite_')) return;
  const inviteCode = code.slice(7);
  const rows = await supabase(env, `telegram_members?invite_code=eq.${encodeURIComponent(inviteCode)}&select=workspace_id`, { method: 'GET' });
  if (!rows.length) return;
  const workspaceId = rows[0].workspace_id;
  await supabase(env, 'telegram_users', { method: 'POST', body: { telegram_id: from.id, username: from.username || null, first_name: from.first_name || null, last_name: from.last_name || null }, upsert: true });
  await supabase(env, 'telegram_members', { method: 'POST', body: { workspace_id: workspaceId, telegram_id: from.id, role: 'member' }, upsert: true });
  await setSession(from.id, workspaceId, 'idle', {}, env);
}

async function acceptInviteByCode(chatId, telegramId, code, env) {
  return sendMessage(env, chatId, 'Приглашение используется через ссылку из сообщения владельца.', backKeyboard());
}

async function ensureUser(from, env) {
  await supabase(env, 'telegram_users', { method: 'POST', body: { telegram_id: from.id, username: from.username || null, first_name: from.first_name || null, last_name: from.last_name || null }, upsert: true });
  let memberships = await supabase(env, `telegram_members?telegram_id=eq.${from.id}&select=workspace_id,role`, { method: 'GET' });
  if (memberships.length) return getWorkspace(memberships[0].workspace_id, env);
  let workspaces = await supabase(env, 'telegram_workspaces?select=id&order=created_at.asc&limit=1', { method: 'GET' });
  let workspace;
  if (!workspaces.length) {
    const created = await supabase(env, 'telegram_workspaces', { method: 'POST', body: { name: 'Монтажи' }, prefer: 'return=representation' });
    workspace = created[0];
  } else workspace = workspaces[0];
  const existingOwners = await supabase(env, `telegram_members?workspace_id=eq.${workspace.id}&role=eq.owner&select=telegram_id`, { method: 'GET' });
  const role = existingOwners.length ? 'member' : 'owner';
  await supabase(env, 'telegram_members', { method: 'POST', body: { workspace_id: workspace.id, telegram_id: from.id, role }, upsert: true });
  return workspace;
}

async function getWorkspaceForUser(telegramId, env) {
  const rows = await supabase(env, `telegram_members?telegram_id=eq.${telegramId}&select=workspace_id`, { method: 'GET' });
  if (!rows.length) throw new Error('User has no workspace');
  return getWorkspace(rows[0].workspace_id, env);
}
async function getWorkspace(id, env) {
  const rows = await supabase(env, `telegram_workspaces?id=eq.${encodeURIComponent(id)}&select=*`, { method: 'GET' });
  return rows[0];
}

async function getSession(telegramId, env) {
  const rows = await supabase(env, `telegram_sessions?telegram_id=eq.${telegramId}&select=*`, { method: 'GET' });
  return rows[0] || null;
}
async function setSession(telegramId, workspaceId, state, payload, env) {
  await supabase(env, 'telegram_sessions', { method: 'POST', body: { telegram_id: telegramId, workspace_id: workspaceId, state, payload }, upsert: true });
}
async function clearSession(telegramId, env) {
  await supabase(env, `telegram_sessions?telegram_id=eq.${telegramId}`, { method: 'PATCH', body: { state: 'idle', payload: {} } });
}

async function getJobsForDate(date, env) { return getJobsFrom(env, date, date); }
async function getJobsFrom(env, from, to = null) {
  let q = `jobs?job_date=gte.${from}&status=neq.Отменён&select=*,stores(name)&order=job_date.asc,slot.asc`;
  if (to) q += `&job_date=lte.${to}`;
  return supabase(env, q, { method: 'GET' });
}
async function getJobsForMonth(year, month, env) {
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const endDate = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2,'0')}-${String(endDate).padStart(2,'0')}`;
  return getJobsFrom(env, start, end);
}
async function getJob(id, env) { const rows = await supabase(env, `jobs?id=eq.${encodeURIComponent(id)}&select=*,stores(name)`, { method: 'GET' }); return rows[0]; }
async function getStores(env) { return supabase(env, 'stores?is_active=eq.true&select=id,name&order=sort_order.asc,name.asc', { method: 'GET' }); }
async function getStore(id, env) { if (!id || id === 'null') return null; const rows = await supabase(env, `stores?id=eq.${encodeURIComponent(id)}&select=id,name`, { method: 'GET' }); return rows[0]; }

async function searchJobs(chatId, query, env) {
  const jobs = await getJobsFrom(env, '2000-01-01');
  const q = query.toLowerCase();
  const found = jobs.filter(j => [j.client_name, j.phone, j.address].some(v => String(v || '').toLowerCase().includes(q))).slice(0, 15);
  if (!found.length) return sendMessage(env, 'Ничего не найдено.', backKeyboard());
  const text = found.map(j => `${statusEmoji(j.status)} <b>${escape(j.client_name)}</b>\n${formatDate(j.job_date)} · ${slotLabel(j.slot)}\n📍 ${escape(j.address || '—')}`).join('\n\n');
  const kb = found.map(j => [{ text: j.client_name, callback_data: `job:${j.id}` }]);
  kb.push([{ text: '⬅️ Меню', callback_data: 'home' }]);
  await sendMessage(env, text, { inline_keyboard: kb });
}

async function runReminders(env) {
  const tz = env.TIMEZONE || 'Europe/Kaliningrad';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  const hour = Number(p.hour), minute = Number(p.minute);
  const jobs = await getJobsForDate(date, env);
  const members = await supabase(env, 'telegram_members?select=telegram_id', { method: 'GET' });
  if (!members.length) return;

  if (hour === 8 && minute < 5) {
    const open = jobs.filter(j => j.status !== 'Выполнен' && j.status !== 'Отменён');
    if (open.length) {
      const text = `☀️ <b>ДОБРОЕ УТРО</b>\n\nСегодня ${open.length} монтаж${plural(open.length)}:\n\n${open.map(j => `🔨 ${slotLabel(j.slot)} — ${escape(j.client_name)}`).join('\n')}`;
      for (const m of members) await sendMessage(env, m.telegram_id, text);
    }
  }

  for (const j of jobs) {
    if (j.status === 'Выполнен' || j.status === 'Отменён') continue;
    const slotMinutes = Number(j.slot) === 1 ? 11 * 60 : Number(j.slot) === 2 ? 14 * 60 : null;
    if (slotMinutes === null) continue;
    const diff = slotMinutes - (hour * 60 + minute);
    if (diff >= 55 && diff <= 65) {
      const key = `${j.id}|one_hour|${date}`;
      const already = await supabase(env, `telegram_reminders?job_id=eq.${j.id}&reminder_type=eq.one_hour&reminder_date=eq.${date}&select=job_id`, { method: 'GET' });
      if (already.length) continue;
      await supabase(env, 'telegram_reminders', { method: 'POST', body: { job_id: j.id, reminder_type: 'one_hour', reminder_date: date }, upsert: true });
      const text = `⏰ <b>МОНТАЖ ЧЕРЕЗ ЧАС</b>\n\n👤 ${escape(j.client_name)}\n📍 ${escape(j.address || '—')}\n🕐 ${slotLabel(j.slot)}\n🏪 ${escape(j.stores?.name || '—')}`;
      for (const m of members) await sendMessage(env, m.telegram_id, text, { inline_keyboard: [[{ text: '📍 Маршрут', callback_data: `job:${j.id}:route` }], [{ text: 'Открыть монтаж', callback_data: `job:${j.id}` }]] });
    }
  }
}

async function sendMessage(env, chatId, text, replyMarkup) {
  return telegram(env, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}
async function answerCallback(env, id) { return telegram(env, 'answerCallbackQuery', { callback_query_id: id }); }
async function telegram(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Telegram ${method}: ${await res.text()}`);
  return res.json();
}
async function supabase(env, path, options = {}) {
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', Prefer: options.prefer || 'return=representation' };
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { method: options.method || 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  if (!res.ok) throw new Error(`Supabase ${path}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

function todayISO(env) { return new Intl.DateTimeFormat('en-CA', { timeZone: env.TIMEZONE || 'Europe/Kaliningrad' }).format(new Date()); }
function addDays(iso, days) { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10); }
function parseRuDate(s) { const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); if (!m) return null; return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`; }
function formatDate(iso) { return new Date(`${iso}T12:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); }
function slotLabel(slot) { return SLOTS.find(s => Number(s.id) === Number(slot))?.label || 'Без времени'; }
function statusEmoji(s) { return ({ 'Бронь': '🟡', 'Подтверждён': '🟢', 'Выполнен': '✅', 'Перенос': '🔄', 'Отменён': '🔴' })[s] || '⚪'; }
function money(n) { return Number(n || 0).toLocaleString('ru-RU'); }
function plural(n) { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return 'ей'; if (b === 1) return 'й'; if (b >= 2 && b <= 4) return 'я'; return 'ей'; }
function escape(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function backKeyboard() { return { inline_keyboard: [[{ text: '⬅️ Меню', callback_data: 'home' }]] }; }
