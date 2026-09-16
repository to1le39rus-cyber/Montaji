const STYLE_ID = 'montaji-job-card-enhancer-style';
const FIREBASE_VERSION = '10.14.1';
const SHARED_DOC = ['appData', 'shared'];

let jobsById = new Map();
let firebaseConnecting = false;
let unsubscribeJobs = null;
let retryTimer = null;

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

function applyJobs(data) {
  jobsById = new Map((Array.isArray(data?.jobs) ? data.jobs : []).map(j => [j.id, j]));
  syncNativeComments();
  enhanceDeleteControl();
}

function syncNativeComments() {
  document.querySelectorAll('[data-job-card]').forEach(card => {
    const job = jobsById.get(card.dataset.jobCard);
    const note = card.querySelector('.note-line');
    if (note && job?.comment) note.textContent = job.comment;
  });
}

async function connectRealtime() {
  if (firebaseConnecting || unsubscribeJobs) return;
  firebaseConnecting = true;
  try {
    const ctx = await firebaseContext();
    if (!ctx) return;
    unsubscribeJobs = ctx.fsMod.onSnapshot(
      ctx.fsMod.doc(ctx.db, ...SHARED_DOC),
      snap => applyJobs(snap.exists() ? snap.data()?.data || {} : {}),
      error => {
        console.warn('Job card realtime comments unavailable', error);
        unsubscribeJobs = null;
        scheduleFirebaseRetry();
      }
    );
  } catch (e) {
    console.warn('Job card realtime comments unavailable', e);
    scheduleFirebaseRetry();
  } finally {
    firebaseConnecting = false;
  }
}

function scheduleFirebaseRetry() {
  if (retryTimer || unsubscribeJobs) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectRealtime();
  }, 300);
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
  const existing = modal.querySelector('.test-delete-btn');

  if (!id || !isTestJob(job)) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const anchor = modal.querySelector('#deleteBtn');
  if (!anchor) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'test-delete-btn';
  btn.textContent = 'Удалить тестовый выезд';
  btn.onclick = () => permanentlyDeleteTestJob(id);
  anchor.after(btn);
}

let observerQueued = false;
function scheduleEnhance() {
  if (observerQueued) return;
  observerQueued = true;
  queueMicrotask(() => {
    observerQueued = false;
    syncNativeComments();
    enhanceDeleteControl();
    if (!unsubscribeJobs) connectRealtime();
  });
}

function boot() {
  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
  connectRealtime();
}

if (typeof document !== 'undefined') boot();
