import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const KEY = 'astera-v3-data';
const META_KEY = 'astera-v3-sync-meta';
const clientId = localStorage.getItem('astera-v3-client') || crypto.randomUUID();
localStorage.setItem('astera-v3-client', clientId);
let applyingRemote = false;
let pushTimer = null;
let localUpdatedAt = Number(localStorage.getItem(META_KEY) || 0);

function setStatus(text) {
  const el = document.querySelector('#syncStatus');
  if (el) el.textContent = text;
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

function schedulePush() {
  if (applyingRemote || !window.__asteraFirebaseReady) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushLocal, 450);
}

async function pushLocal() {
  if (!window.__asteraFirebaseReady || applyingRemote) return;
  const data = readLocal();
  if (!data?.jobs) return;
  const updatedAt = Date.now();
  localUpdatedAt = updatedAt;
  localStorage.setItem(META_KEY, String(updatedAt));
  try {
    await setDoc(doc(window.__asteraDb, 'appData', 'shared'), {
      data,
      updatedAt,
      updatedBy: clientId
    });
    setStatus('Синхронизировано · Firebase');
  } catch (error) {
    console.warn('ASTERA sync push failed', error);
    setStatus('Офлайн · данные сохранены на телефоне');
  }
}

function applyRemote(payload) {
  if (!payload?.data?.jobs) return;
  const remoteTime = Number(payload.updatedAt || 0);
  if (!remoteTime || remoteTime <= localUpdatedAt) return;
  applyingRemote = true;
  localUpdatedAt = remoteTime;
  localStorage.setItem(META_KEY, String(remoteTime));
  localStorage.setItem(KEY, JSON.stringify(payload.data));
  applyingRemote = false;
  setStatus('Получены обновления · перезагружаем…');
  setTimeout(() => location.reload(), 120);
}

async function start() {
  if (!firebaseConfig?.projectId) {
    setStatus('Локальный режим · Firebase не настроен');
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    window.__asteraDb = db;
    await signInAnonymously(auth);
    window.__asteraFirebaseReady = true;
    setStatus('Подключение к Firebase…');

    const ref = doc(db, 'appData', 'shared');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const remote = snap.data();
      const remoteTime = Number(remote.updatedAt || 0);
      if (remoteTime > localUpdatedAt && remote.data?.jobs) {
        applyRemote(remote);
      }
    } else if (readLocal()?.jobs) {
      await pushLocal();
    }

    onSnapshot(ref, snapshot => {
      if (snapshot.exists()) applyRemote(snapshot.data());
    }, error => {
      console.warn('ASTERA realtime sync failed', error);
      setStatus('Офлайн · локальные данные доступны');
    });
  } catch (error) {
    console.warn('ASTERA Firebase unavailable', error);
    setStatus('Офлайн · данные сохраняются мгновенно');
  }
}

const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  originalSetItem.call(this, key, value);
  if (this === localStorage && key === KEY) schedulePush();
};

window.addEventListener('online', () => {
  if (window.__asteraFirebaseReady) schedulePush();
});

start();
