(() => {
  const KEY = 'astera-v3-data';
  const uid = () => (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0)) + ' ₽';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {jobs:[], expenses:{}}; } catch { return {jobs:[], expenses:{}}; } };
  const write = state => { localStorage.setItem(KEY, JSON.stringify(state)); location.reload(); };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const esc = s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  const style = document.createElement('style');
  style.textContent = `
    .quick-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .quick-actions button{border:1px solid #e2e3dd;background:#f5f6f0;color:#20211d;border-radius:14px;padding:10px 12px;font:600 14px/1 inherit}
    .quick-actions .done{background:#68734d;color:#fff;border-color:#68734d}
    .quick-actions .move{background:#fff}
    .quick-actions .edit-done{background:#eef0e8;color:#68734d;border-color:#d9ddcf}
    .quick-income,.quick-expense{margin-left:auto;border:0;color:#fff;border-radius:12px;padding:8px 12px;font:700 14px/1 inherit}
    .quick-income{background:#68734d}.quick-expense{background:#34352f;margin-left:0}
    .daily-expenses{margin:12px 0 22px;padding:16px 18px;background:#f1f2ec;border-radius:20px}
    .daily-expenses .de-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;font-size:14px}
    .daily-expenses .de-total{border-top:1px solid #d8dbd0;margin-top:6px;padding-top:10px;font-weight:800}
    .extra-sheet{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end}
    .extra-sheet .back{position:absolute;inset:0;background:rgba(0,0,0,.35)}
    .extra-sheet .panel{position:relative;width:100%;max-height:88vh;overflow:auto;background:#fff;border-radius:28px 28px 0 0;padding:24px 20px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.2)}
    .extra-sheet h2{margin:0 0 18px;font-size:24px}
    .extra-sheet label{display:block;font-weight:600;margin:12px 0 6px}
    .extra-sheet input,.extra-sheet textarea,.extra-sheet select{box-sizing:border-box;width:100%;border:1px solid #ddd;background:#f7f7f3;border-radius:14px;padding:13px;font:inherit}
    .extra-sheet .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .extra-sheet .actions{display:flex;gap:10px;margin-top:18px}
    .extra-sheet button{border:0;border-radius:15px;padding:14px 16px;font:700 16px/1 inherit}
    .extra-sheet .primary{flex:1;background:#68734d;color:#fff}
    .extra-sheet .secondary{background:#eee;color:#222}
    .extra-note{font-size:13px;color:#777;margin-top:8px}
  `;
  document.head.appendChild(style);

  function openSheet(html, onReady) {
    document.querySelector('.extra-sheet')?.remove();
    const el = document.createElement('div');
    el.className = 'extra-sheet';
    el.innerHTML = `<div class="back"></div><div class="panel">${html}</div>`;
    document.body.appendChild(el);
    el.querySelector('.back').onclick = () => el.remove();
    onReady?.(el);
  }

  function addExtraIncome() {
    openSheet(`<h2>Добавить доход</h2>
      <div class="row"><div><label>Дата</label><input id="exDate" type="date" value="${today()}"></div>
      <div><label>Сумма</label><input id="exPrice" type="number" min="0" step="100" placeholder="5000"></div></div>
      <label>Что сделали</label><input id="exClient" placeholder="Например: Вскрытие замка">
      <label>Комментарий</label><textarea id="exComment" rows="2" placeholder="Дополнительная работа"></textarea>
      <div class="extra-note">Не занимает слот и не считается монтажом. Попадает в День / Неделю / Месяц / Всё.</div>
      <div class="actions"><button class="secondary" id="exCancel">Отмена</button><button class="primary" id="exSave">Добавить 0 ₽</button></div>`, el => {
      const price = el.querySelector('#exPrice'), save = el.querySelector('#exSave');
      const sync = () => save.textContent = `Добавить ${money(price.value || 0)}`;
      price.oninput = sync; sync();
      el.querySelector('#exCancel').onclick = () => el.remove();
      save.onclick = () => {
        const amount = Number(price.value || 0), client = el.querySelector('#exClient').value.trim();
        if (!amount || !client) return alert('Укажи сумму и что сделали.');
        const s = read(); s.jobs = Array.isArray(s.jobs) ? s.jobs : [];
        s.jobs.push({id:uid(), date:el.querySelector('#exDate').value || today(), slot:'0', type:'Сервис', client, phone:'', price:amount, address:'', store:'', status:'Выполнен', comment:el.querySelector('#exComment').value.trim()});
        write(s);
      };
    });
  }

  function addExpense() {
    openSheet(`<h2>Расход за день</h2>
      <div class="row"><div><label>Дата</label><input id="xpDate" type="date" value="${today()}"></div>
      <div><label>Сумма</label><input id="xpPrice" type="number" min="0" step="50" placeholder="1000"></div></div>
      <label>Категория</label><select id="xpType"><option value="Транспорт">🚗 Транспорт</option><option value="Питание">🍴 Питание</option><option value="Другое">Другое</option></select>
      <label>Комментарий</label><input id="xpComment" placeholder="Например: бензин / обед">
      <div class="extra-note">Можно добавлять сколько угодно расходов за один день. Все они вычитаются из чистого заработка.</div>
      <div class="actions"><button class="secondary" id="xpCancel">Отмена</button><button class="primary" id="xpSave">Сохранить расход</button></div>`, el => {
        el.querySelector('#xpCancel').onclick = () => el.remove();
        el.querySelector('#xpSave').onclick = () => {
          const date = el.querySelector('#xpDate').value || today(), amount = Number(el.querySelector('#xpPrice').value || 0);
          if (!amount) return alert('Укажи сумму расхода.');
          const category = el.querySelector('#xpType').value, comment = el.querySelector('#xpComment').value.trim();
          const s = read(); s.expenses = s.expenses && typeof s.expenses === 'object' ? s.expenses : {};
          const existing = s.expenses[date];
          const bucket = Array.isArray(existing) ? {amount: existing.reduce((a,x)=>a+Number(x.amount||0),0), items: existing} : (existing || {amount:0,items:[]});
          bucket.amount = Number(bucket.amount || 0) + amount;
          bucket.items = Array.isArray(bucket.items) ? bucket.items : [];
          bucket.items.push({id:uid(),amount,category,comment});
          s.expenses[date] = bucket;
          write(s);
        };
      });
  }

  function completeJob(id) {
    const s = read(), j = s.jobs.find(x => x.id === id); if (!j) return;
    if (Number(j.price || 0) <= 0) {
      alert('Сначала открой выезд и укажи фактическую сумму. После сохранения поставь статус «Выполнен».');
      document.querySelector(`.edit[data-id="${CSS.escape(id)}"]`)?.click(); return;
    }
    j.status = 'Выполнен'; write(s);
  }

  function reopenJob(id) {
    const s = read(), j = s.jobs.find(x => x.id === id); if (!j) return;
    j.status = 'Запланирован'; write(s);
  }

  function rescheduleJob(id) {
    const s = read(), j = s.jobs.find(x => x.id === id); if (!j) return;
    openSheet(`<h2>Перенести выезд</h2><div class="extra-note">Было: ${esc(j.date)} · ${esc(j.client)}</div>
      <label>Новая дата</label><input id="mvDate" type="date" value="${esc(j.date)}">
      <label>Время</label><select id="mvSlot"><option value="1">10:00–12:00</option><option value="2">14:00–16:00</option><option value="3">3-й слот / резерв</option></select>
      <div class="actions"><button class="secondary" id="mvCancel">Отмена</button><button class="primary" id="mvSave">Перенести</button></div>`, el => {
        el.querySelector('#mvSlot').value = j.slot || '1';
        el.querySelector('#mvCancel').onclick = () => el.remove();
        el.querySelector('#mvSave').onclick = () => {
          const date = el.querySelector('#mvDate').value, slot = el.querySelector('#mvSlot').value;
          if (!date) return alert('Выбери дату.');
          const clash = s.jobs.find(x => x.id !== id && x.date === date && x.slot === slot && x.status !== 'Отменён');
          if (clash) return alert('Этот слот уже занят.');
          if (j.type === 'Монтаж' && s.jobs.filter(x => x.id !== id && x.date === date && x.type === 'Монтаж' && x.status !== 'Отменён').length >= 3) return alert('На этот день уже 3 монтажа.');
          j.date = date; j.slot = slot; j.status = 'Запланирован'; write(s);
        };
      });
  }

  function enhanceCards() {
    document.querySelectorAll('.job-card[data-id]').forEach(card => {
      if (card.querySelector('.quick-actions')) return;
      const id = card.dataset.id, s = read(), j = s.jobs.find(x => x.id === id); if (!j || j.status === 'Отменён') return;
      const actions = document.createElement('div'); actions.className = 'quick-actions';
      if (j.status !== 'Выполнен') {
        const done = document.createElement('button'); done.className='done'; done.textContent='✓ Выполнено'; done.onclick=()=>completeJob(id); actions.appendChild(done);
      } else {
        const editDone = document.createElement('button'); editDone.className='edit-done'; editDone.textContent='✓ Выполнен · Изменить'; editDone.onclick=()=>document.querySelector(`.edit[data-id="${CSS.escape(id)}"]`)?.click(); actions.appendChild(editDone);
        const reopen = document.createElement('button'); reopen.className='move'; reopen.textContent='↺ Вернуть в работу'; reopen.onclick=()=>reopenJob(id); actions.appendChild(reopen);
      }
      if ((j.type === 'Монтаж' || j.type === 'Сервис') && j.status !== 'Выполнен') {
        const move = document.createElement('button'); move.className='move'; move.textContent='↗ Перенести'; move.onclick=()=>rescheduleJob(id); actions.appendChild(move);
      }
      card.appendChild(actions);
    });
  }

  function mountButtons() {
    const heads = document.querySelectorAll('.section-head');
    const head = [...heads].find(x => x.querySelector('h2')?.textContent.trim() === 'Выезды');
    if (head) {
      if (!head.querySelector('.quick-income')) { const b=document.createElement('button'); b.className='quick-income'; b.textContent='+ Доход'; b.onclick=addExtraIncome; head.appendChild(b); }
      if (!head.querySelector('.quick-expense')) { const b=document.createElement('button'); b.className='quick-expense'; b.textContent='− Расход'; b.onclick=addExpense; head.appendChild(b); }
    }
    const ds=today(), s=read(), bucket=s.expenses?.[ds];
    const items=Array.isArray(bucket)?bucket:(bucket?.items||[]), total=Number(bucket?.amount||items.reduce((a,x)=>a+Number(x.amount||0),0));
    document.querySelector('.daily-expenses')?.remove();
    if (total || items.length) {
      const box=document.createElement('div'); box.className='daily-expenses';
      box.innerHTML=`<div><b>Расходы сегодня</b></div>${items.map(x=>`<div class="de-row"><span>${esc(x.category||'Расход')}${x.comment?' · '+esc(x.comment):''}</span><b>− ${money(x.amount)}</b></div>`).join('')}<div class="de-row de-total"><span>Итого</span><b>− ${money(total)}</b></div>`;
      const list=document.querySelector('#todayList'); if(list) list.after(box);
    }
  }

  const observer = new MutationObserver(() => { enhanceCards(); mountButtons(); });
  window.addEventListener('load', () => { observer.observe(document.body,{childList:true,subtree:true}); enhanceCards(); mountButtons(); });
})();