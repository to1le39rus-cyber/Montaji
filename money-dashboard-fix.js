(() => {
  const KEY = 'montaji-aa-data-v4';
  const money = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0)) + ' ₽';
  const key = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  const today = () => key(new Date());
  const completed = j => j && j.status === 'Выполнен';
  const cancelled = j => j && j.status === 'Отменён';
  const activityDate = j => completed(j) ? (j.completedDate || j.date) : j.date;
  const read = () => { try { const x = JSON.parse(localStorage.getItem(KEY) || '{}'); return { jobs: Array.isArray(x.jobs) ? x.jobs : [], expenses: Array.isArray(x.expenses) ? x.expenses : Object.entries(x.expenses || {}).map(([date,e]) => ({date, amount:Number(e.amount||0)})) }; } catch { return {jobs:[],expenses:[]}; } };
  const range = (type) => {
    const now = new Date();
    if (type === 'day') return [today(), today()];
    if (type === 'week') { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay()+6)%7)); const s=key(d); d.setDate(d.getDate()+6); return [s,key(d)]; }
    if (type === 'month') return [key(new Date(now.getFullYear(), now.getMonth(), 1)), key(new Date(now.getFullYear(), now.getMonth()+1, 0))];
    return ['0000-01-01','9999-12-31'];
  };
  const totals = (type) => {
    const {jobs,expenses} = read(); const [s,e] = range(type);
    const income = jobs.filter(j => !cancelled(j) && Number(j.price||0) > 0 && activityDate(j) >= s && activityDate(j) <= e).reduce((a,j)=>a+Number(j.price||0),0);
    const out = expenses.filter(x => x.date >= s && x.date <= e).reduce((a,x)=>a+Number(x.amount||0),0);
    return {income, out, net:income-out};
  };
  const installStyles = () => {
    if (document.getElementById('money-dashboard-fix-style')) return;
    const s=document.createElement('style'); s.id='money-dashboard-fix-style'; s.textContent=`
      .money-period-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
      .money-period-card{background:rgba(255,255,255,.12);border-radius:16px;padding:12px 14px}
      .money-period-card span{display:block;font-size:13px;opacity:.78;margin-bottom:4px}
      .money-period-card b{font-size:20px;letter-spacing:-.02em}
      .hero-card{cursor:pointer}
      .hero-income{line-height:1.02}
      .hero-day-label{margin-top:7px;font-size:15px;font-weight:500;opacity:.82}
      @media(max-width:520px){.money-period-card b{font-size:18px}}
    `; document.head.appendChild(s);
  };
  const renderHero = () => {
    const hero=document.querySelector('.hero-card'); if(!hero) return;
    installStyles();
    const d=totals('day'), w=totals('week'), m=totals('month');
    const value=hero.querySelector('#todayIncome'); if(value) value.textContent=money(d.net);
    const label=hero.querySelector('.hero-label'); if(label) { label.className='hero-label hero-day-label'; label.textContent='чистыми за сегодня'; }
    const old=hero.querySelector('.money-period-summary'); if(old) old.remove();
    const box=document.createElement('div'); box.className='money-period-summary';
    box.innerHTML=`<div class="money-period-card"><span>Неделя</span><b>${money(w.net)}</b></div><div class="money-period-card"><span>Месяц</span><b>${money(m.net)}</b></div>`;
    hero.appendChild(box);
    hero.title='Нажми — открыть все финансы';
    hero.onclick=()=>{ const nav=document.querySelector('.nav[data-screen="moneyScreen"]'); if(nav) nav.click(); setTimeout(()=>{ const day=document.querySelector('#periodTabs [data-period="day"]'); if(day) day.click(); },50); };
  };
  const forceDayInMoney = () => {
    const tab=document.querySelector('#periodTabs [data-period="day"]');
    const selected=document.querySelector('#periodTabs .selected');
    if(tab && selected && selected.dataset.period !== 'day') tab.click();
  };
  const observe = () => {
    const observer=new MutationObserver(()=>{ renderHero(); });
    const root=document.querySelector('#app') || document.body; observer.observe(root,{childList:true,subtree:true,characterData:true});
    window.addEventListener('storage',renderHero);
    setInterval(renderHero,1500);
  };
  const start=()=>{ renderHero(); observe(); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();