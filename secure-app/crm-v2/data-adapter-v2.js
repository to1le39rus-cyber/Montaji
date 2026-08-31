// Production-safe data adapter.
// The live Firebase rules authorize appData/shared. Keep the existing
// production storage contract until the v2 collections and their rules are
// deployed together. Do not touch jobs/{id} or expenses/{id} here.
let unsubLegacy = null;
let legacyCache = { jobs: [], expenses: [] };

function emptyState() { return { jobs: [], expenses: [], version: 5 }; }

export function makeDataAdapterV2({ fs, db, user, online, status, toast, setState, render }) {
  const sharedRef = () => fs.doc(db, 'appData', 'shared');

  function readData(snap) {
    if (!snap?.exists()) return emptyState();
    const raw = snap.data()?.data || {};
    return {
      jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
      expenses: Array.isArray(raw.expenses) ? raw.expenses : [],
      version: 5,
    };
  }

  async function loadServerV2() {
    if (!user || !online) {
      setState(emptyState());
      status('Нет интернета · данные не загружены', 'offline');
      return false;
    }
    status('Подключаем общую базу…');
    try {
      const snap = await fs.getDocFromServer(sharedRef());
      const next = readData(snap);
      legacyCache = { jobs: next.jobs, expenses: next.expenses };
      setState(next);
      status('● Общая база · синхронизировано', 'online');
      return true;
    } catch (err) {
      console.error('loadServerV2', err);
      setState(emptyState());
      status('База недоступна', 'offline');
      toast('Не удалось получить общую базу.', 'error');
      return false;
    }
  }

  function startRealtimeV2() {
    unsubLegacy?.();
    if (!user || !online) return;
    unsubLegacy = fs.onSnapshot(sharedRef(), snap => {
      if (!online) return;
      const next = readData(snap);
      legacyCache = { jobs: next.jobs, expenses: next.expenses };
      setState(next);
      render();
      status('● Общая база · обновлено', 'online');
    }, err => {
      console.error('shared onSnapshot', err);
      status('Нет связи с общей базой', 'offline');
      toast('Потеряна связь с общей базой', 'error');
    });
  }

  async function saveSharedV2(mutator) {
    if (!user || !online) throw new Error('Нет соединения с общей базой');
    const ref = sharedRef();
    try {
      await fs.runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        const current = readData(snap);
        const next = await mutator(current);
        const data = {
          jobs: Array.isArray(next?.jobs) ? next.jobs : [],
          expenses: Array.isArray(next?.expenses) ? next.expenses : [],
        };
        tx.set(ref, {
          data,
          version: 5,
          updatedAt: fs.serverTimestamp(),
          updatedBy: user.uid,
        }, { merge: true });
        legacyCache = data;
        setState({ ...data, version: 5 });
      });
      render();
    } catch (err) {
      console.error('saveSharedV2', err);
      throw err;
    }
  }

  return { loadServerV2, startRealtimeV2, saveSharedV2 };
}
