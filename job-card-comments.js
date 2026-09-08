const FIREBASE_VERSION = '10.14.1';
const CONFIG_URL = 'https://cdn.jsdelivr.net/gh/to1le39rus-cyber/Montaji@a467a5e4b009ab67b5e4e70513259d45f4b11081/firebase-config.js';
const SHARED_DOC = ['appData', 'shared'];

const esc = value => String(value ?? '').replace(/[&<>\"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;'
}[ch]));

function installStyles() {
  if (document.getElementById('job-card-comments-style')) return;
  const style = document.createElement('style');
  style.id = 'job-card-comments-style';
  style.textContent = `
    .job-comment{display:grid;gap:4px;margin:2px 0 1px;padding:9px 10px;border:1px solid rgba(104,119,91,.16);border-radius:13px;background:#f5f7f2;color:#4f584f;font-size:11px;line-height:1.35;overflow-wrap:anywhere}
    .job-comment__label{font-size:9px;font-weight:750;letter-spacing:.05em;text-transform:uppercase;color:#718067}
    .job-comment__text{white-space:pre-wrap;color:#343b35}
    .job-comment--important{border-color:#f0c8b8;background:#fff6f2}
    .job-comment--important .job-comment__label{color:#a34b38}
    .job-comment--important .job-comment__text{color:#663b32;font-weight:650}
    @media(max-width:520px){.job-comment{font-size:10px;padding:8px 9px}.job-comment__label{font-size:8px}}
  `;
  document.head.appendChild(style);
}

function isImportant(text) {
  return /не\s+забыть|купить|взять|нужно|важно|перед\s+монтаж|подготов|материал|пластин|крепеж/i.test(text);
}

let jobsById = new Map();
let listObserver = null;
let renderQueued = false;

function renderComments() {
  const cards = document.querySelectorAll('.job-card[data-job-card]');
  if (!cards.length) return;

  cards.forEach(card => {
    const job = jobsById.get(card.dataset.jobCard);
    const comment = String(job?.comment ?? '').trim();
    const existing = card.querySelector('.job-comment');

    if (!comment) {
      existing?.remove();
      return;
    }

    const important = isImportant(comment);
    const signature = `${important ? 'important' : 'normal'}:${comment}`;
    if (existing?.dataset.signature === signature) return;
    existing?.remove();

    const details = card.querySelector('.job-details');
    const status = details?.querySelector('.card-status');
    if (!details) return;

    const block = document.createElement('div');
    block.className = `job-comment${important ? ' job-comment--important' : ''}`;
    block.dataset.signature = signature;
    block.innerHTML = `<span class="job-comment__label">${important ? '⚠️ Важно перед выездом' : '💬 Комментарий'}</span><span class="job-comment__text">${esc(comment)}</span>`;
    if (status) details.insertBefore(block, status);
    else details.appendChild(block);
  });
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  setTimeout(() => {
    renderQueued = false;
    renderComments();
  }, 80);
}

function watchJobCards() {
  if (listObserver) return;
  listObserver = new MutationObserver(mutations => {
    const hasNewJobCard = mutations.some(mutation => [...mutation.addedNodes].some(node => {
      if (node.nodeType !== 1) return false;
      return node.matches?.('.job-card[data-job-card]') || !!node.querySelector?.('.job-card[data-job-card]');
    }));
    if (hasNewJobCard) queueRender();
  });
  listObserver.observe(document.body, { childList: true, subtree: true });
  renderComments();
}

async function waitForApp(getApp) {
  for (let i = 0; i < 60; i += 1) {
    try { return getApp('montaji-aa-production'); } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Montaji Firebase app was not initialized in time');
}

(async () => {
  try {
    installStyles();
    const [appMod, authMod, fs, configMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
      import(CONFIG_URL)
    ]);
    const app = await waitForApp(appMod.getApp);
    const auth = authMod.getAuth(app);
    const db = fs.getFirestore(app);
    const config = configMod.firebaseConfig;
    if (!config) throw new Error('Firebase config unavailable');

    authMod.onAuthStateChanged(auth, user => {
      if (!user) return;
      fs.onSnapshot(fs.doc(db, ...SHARED_DOC), snap => {
        const data = snap.exists() ? snap.data()?.data : null;
        const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
        jobsById = new Map(jobs.map(job => [job.id, job]));
        renderComments();
      }, error => console.warn('Job comment layer: realtime sync failed', error));
    });

    watchJobCards();
  } catch (error) {
    console.warn('Job comment layer disabled:', error);
  }
})();
