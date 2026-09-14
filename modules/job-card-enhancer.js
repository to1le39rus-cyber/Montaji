const STYLE_ID = 'montaji-job-card-enhancer-style';
const FIREBASE_VERSION = '10.14.1';
const SHARED_DOC = ['appData', 'shared'];
const esc = s => String(s ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

function addStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .job-card-note { margin:10px 0 0; padding:11px 12px; border-radius:14px; background:var(--surface-2,#f6f6f4); font-size:14px; line-height:1.35; color:var(--text,#25262d); }
    .job-card-note__label { display:block; margin-bottom:4px; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--muted,#858994); }
    .job-card-note__text { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:pre-line; }
    .job-card-note.expanded .job-card-note__text { display:block; -webkit-line-clamp:unset; }
    .job-card-note__toggle { margin-top:6px; border:0; background:none; padding:0; font:inherit; font-size:13px; font-weight:700; color:#5c63d9; }
    .test-delete-btn { width:100%; margin-top:8px; border:1px solid #e5b9b0; border-radius:14px; padding:13px 16px; background:#fff4f1; color:#a54b3e; font:inherit; font-weight:700; }
  `;
  document.head.append(style);
}

let jobsById = new Map();
let loadInFlight = false;

async function firebaseContext() {
  const [appMod, fsMod, authMod] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
  ]);
  const app = appMod.getApps().find(a => a.name === 'montaji-aa-production') || appMod.getApps()[0];
  if (!app) return null;
  const auth = authMod.getAuth(app);
  if (!auth.currentUser) return null;
  return { fsMod, db: fsMod.getFirestore(app) };
}

async function loadJobs() {
  if (loadInFlight) return;
  loadInFlight = true;
  try {
    const ctx = await firebaseContext();
    if (!ctx) return;
    const snap = await ctx.fsMod.getDoc(ctx.fsMod.doc(ctx.db, ...SHARED_DOC));
    const data = snap.exists() ? snap.data()?.data || {} : {};
    jobsById = new Map((Array.isArray(data.jobs) ? data.jobs : []).map(j => [j.id, j]));
    enhanceCards();
    enhanceDeleteControl();
  } catch (e) {
    console.warn('Job card enhancer unavailable', e);
  } finally {
    loadInFlight = false;
  }
}

function enhanceCards() {
  document.querySelectorAll('[data-job-card]').forEach(card => {
    const job = jobsById.get(card.dataset.jobCard);
    if (!job?.comment || card.querySelector('.job-card-note')) return;
    const box = document.createElement('div');
    box.className = 'job-card-note';
    const long = job.comment.length > 110 || job.comment.split(/\n/).length > 2;
    box.innerHTML = `<span class="job-card-note__label">Важно</span><span class="job-card-note__text">${esc(job.comment)}</span>${long ? '<button type="button" class="job-card-note__toggle">Показать полностью</button>' : ''}`;
    const details = card.querySelector('.job-details');
    (details || card.querySelector('.job-top'))?.after(box);
    box.querySelector('.job-card-note__toggle')?.addEventListener('click', () => {
      const expanded = box.classList.toggle('expanded');
      box.querySelector('.job-card-note__toggle').textContent = expanded ? 'Свернуть' : 'Показать полностью';
    });
  });
}

function isTestJob(job) {
  return /тест/i.test(job?.client || '') || /тест/i.test(job?.comment || '');
}

async function permanentlyDeleteTestJob(id) {
  const job = jobsById.get(id);
  if (!id || !isTestJob(job)) return;
  if (!confirm(`Удалить тестовый выезд «${job.client || 'без клиента'}» навсегда?\n\nЗапись будет удалена без возможности восстановления.`)) return;
  try {
    const ctx = await firebaseContext();
    if (!ctx) throw new Error('Не выполнен вход');
    await ctx.fsMod.runTransaction(ctx.db, async tx => {
      const ref = ctx.fsMod.doc(ctx.db, ...SHARED_DOC);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Общая база недоступна');
      const data = snap.data()?.data || {};
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      if (!jobs.some(j => j.id === id)) throw new Error('Выезд уже отсутствует');
      tx.set(ref, { data: { ...data, jobs: jobs.filter(j => j.id !== id) } }, { merge: true });
    });
    document.querySelector('.modal.open')?.remove();
    jobsById.delete(id);
    const toast = document.createElement('div');
    toast.textContent = 'Тестовый выезд удалён';
    toast.style.cssText = 'position:fixed;left:16px;right:16px;bottom:96px;z-index:99999;padding:14px 16px;border-radius:14px;background:#24252a;color:#fff;text-align:center;font-weight:700';
    document.body.append(toast);
    setTimeout(() => toast.remove(), 2800);
  } catch (e) {
    console.error(e);
    alert('Не удалось удалить тестовый выезд.');
  }
}

function enhanceDeleteControl() {
  const modal = document.getElementById('jobModal');
  if (!modal?.classList.contains('open')) return;
  const id = modal.querySelector('#jobId')?.value;
  const job = id ? jobsById.get(id) : null;
  modal.querySelector('.test-delete-btn')?.remove();
  if (!id || !isTestJob(job)) return;
  const anchor = modal.querySelector('#deleteBtn');
  if (!anchor) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'test-delete-btn';
  btn.textContent = 'Удалить тестовый выезд';
  btn.onclick = () => permanentlyDeleteTestJob(id);
  anchor.after(btn);
}

function boot() {
  addStyles();
  const observer = new MutationObserver(() => {
    enhanceCards();
    enhanceDeleteControl();
    if (document.querySelector('[data-job-card]') && !jobsById.size) loadJobs();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  loadJobs();
  setInterval(loadJobs, 15000);
}

if (typeof document !== 'undefined') boot();
