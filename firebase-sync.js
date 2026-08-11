import { firebaseConfig } from './firebase-shared-config.js';

const DATA_KEY = 'montaji-aa-data-v4';
const SYNC_KEY = 'montaji-aa-sync-at';
const CLIENT_KEY = 'montaji-aa-client';
const clientId = localStorage.getItem(CLIENT_KEY) || crypto.randomUUID();
localStorage.setItem(CLIENT_KEY, clientId);

let ready = false;
let reconciling = false;
let lastJson = localStorage.getItem(DATA_KEY) || '';
let lastRemoteAt = Number(localStorage.getItem(SYNC_KEY) || 0);

const status = text => {
  const el = document.querySelector('#syncStatus');
  if (el) el.textContent = text;
};

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(DATA_KEY) || 'null'); }
  catch { return null; }
};

const sameData = (a, b) => {
  try { return JSON.stringify(a) === JSON.stringify(b); }
  catch { return false; }
};

const normalize = data => ({
  jobs: Array.isArray(data?.jobs) ? data.jobs : [],
  expenses: Array.isArray(data?.expenses) ? data.expenses : [],
  version: 4
});

async function start() {
  if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
    status('Локально · Firebase не настроен');
    return;
  }

  try {
    const [appMod, authMod, fsMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);

    const app = appMod.initializeApp(firebaseConfig, 'montaji-aa-shared-sync');
    const auth = authMod.getAuth(app);
    const db = fsMod.getFirestore(app);
    status('Firebase · подключение…');
    await authMod.signInAnonymously(auth);
    ready = true;

    // Canonical shared document. Firestore rules already allow authenticated users here.
    const ref = fsMod.doc(db, 'appData', 'shared');
    const local = readLocal();
    const snap = await fsMod.getDoc(ref);

    if (snap.exists()) {
      const remote = snap.data() || {};
      const remoteData = normalize(remote.data);
      const remoteAt = Number(remote.updatedAt || 0);

      // First device wins if the shared document is still empty.
      if (local?.jobs?.length && !remoteData.jobs.length && !remoteData.expenses.length) {
        const at = Date.now();
        await fsMod.setDoc(ref, { data: normalize(local), updatedAt: at, updatedBy: clientId });
        lastRemoteAt = at;
        localStorage.setItem(SYNC_KEY, String(at));
      } else if (!sameData(local, remoteData)) {
        reconciling = true;
        localStorage.setItem(DATA_KEY, JSON.stringify(remoteData));
        localStorage.setItem(SYNC_KEY, String(remoteAt));
        lastJson = JSON.stringify(remoteData);
        lastRemoteAt = remoteAt;
        reconciling = false;
        location.reload();
        return;
      } else {
        lastRemoteAt = remoteAt;
        localStorage.setItem(SYNC_KEY, String(remoteAt));
      }
    } else if (local?.jobs) {
      const at = Date.now();
      await fsMod.setDoc(ref, { data: normalize(local), updatedAt: at, updatedBy: clientId });
      lastRemoteAt = at;
      localStorage.setItem(SYNC_KEY, String(at));
    }

    status('Firebase · синхронизация включена');

    // Realtime updates from the partner's phone.
    fsMod.onSnapshot(ref, snapshot => {
      if (!snapshot.exists() || reconciling) return;
      const remote = snapshot.data() || {};
      const remoteData = normalize(remote.data);
      const remoteAt = Number(remote.updatedAt || 0);
      const localNow = readLocal();

      if (remoteAt <= lastRemoteAt && sameData(localNow, remoteData)) return;
      lastRemoteAt = remoteAt;

      if (!sameData(localNow, remoteData)) {
        reconciling = true;
        localStorage.setItem(DATA_KEY, JSON.stringify(remoteData));
        localStorage.setItem(SYNC_KEY, String(remoteAt));
        lastJson = JSON.stringify(remoteData);
        reconciling = false;
        status('Firebase · обновление с телефона напарника');
        location.reload();
      } else {
        localStorage.setItem(SYNC_KEY, String(remoteAt));
      }
    });

    // Detect local changes (the main app saves to localStorage) and publish them.
    setInterval(async () => {
      if (!ready || reconciling || !navigator.onLine) return;
      const json = localStorage.getItem(DATA_KEY) || '';
      if (json === lastJson) return;

      try {
        const data = normalize(JSON.parse(json));
        const at = Date.now();
        lastJson = JSON.stringify(data);
        lastRemoteAt = at;
        localStorage.setItem(SYNC_KEY, String(at));
        await fsMod.setDoc(ref, { data, updatedAt: at, updatedBy: clientId });
        status('Firebase · сохранено для обоих телефонов');
      } catch (e) {
        console.warn('sync write', e);
        status('Офлайн · данные сохранены на телефоне');
      }
    }, 700);
  } catch (e) {
    console.warn('Firebase sync', e);
    status('Офлайн · данные сохранены на телефоне');
  }
}

start();
