// Hybrid data adapter: use migrated jobs/expenses collections when available,
// but transparently fall back to the proven legacy appData/shared store while
// Firebase rules / migration are being rolled out. This keeps production writable.
let unsubJobs = null;
let unsubExpenses = null;
let unsubLegacy = null;
let jobsCache = [];
let expensesCache = [];
let legacyCache = { jobs: [], expenses: [] };

function emptyState() { return { jobs: [], expenses: [], version: 5 }; }
function mergeById(primary, legacy) {
  const map = new Map();
  for (const item of legacy || []) if (item?.id) map.set(item.id, item);
  for (const item of primary || []) if (item?.id) map.set(item.id, item);
  return [...map.values()];
}
function mergedState() {
  return { jobs: mergeById(jobsCache, legacyCache.jobs), expenses: mergeById(expensesCache, legacyCache.expenses), version: 5 };
}

export function makeDataAdapterV2({ fs, db, user, online, status, toast, setState, render }) {
  async function loadLegacy() {
    try {
      const snap = await fs.getDocFromServer(fs.doc(db, 'appData', 'shared'));
      const data = snap.exists() ? (snap.data()?.data || snap.data() || {}) : {};
      legacyCache = { jobs: Array.isArray(data.jobs) ? data.jobs : [], expenses: Array.isArray(data.expenses) ? data.expenses : [] };
      return true;
    } catch (err) {
      console.warn('legacy shared load failed', err);
      return false;
    }
  }

  async function loadServerV2() {
    if (!user || !online) {
      setState(emptyState());
      status('Нет интернета · данные не загружены', 'offline');
      return false;
    }
    status('Подключаем общую базу…');
    let collectionOk = false;
    try {
      const [jobsSnap, expSnap] = await Promise.all([
        fs.getDocsFromServer(fs.collection(db, 'jobs')),
        fs.getDocsFromServer(fs.collection(db, 'expenses')),
      ]);
      jobsCache = jobsSnap.docs.map(d => d.data());
      expensesCache = expSnap.docs.map(d => d.data());
      collectionOk = true;
    } catch (err) {
      console.warn('collections unavailable; trying legacy shared', err);
    }
    await loadLegacy();
    const next = mergedState();
    setState(next);
    if (collectionOk || legacyCache.jobs.length || legacyCache.expenses.length) {
      status('● Общая база · синхронизировано', 'online');
      return true;
    }
    status('База недоступна', 'offline');
    toast('Не удалось получить общую базу.', 'error');
    return false;
  }

  function pushState() {
    setState(mergedState());
    render();
  }

  function startRealtimeV2() {
    unsubJobs?.(); unsubExpenses?.(); unsubLegacy?.();
    if (!user || !online) return;

    unsubJobs = fs.onSnapshot(fs.collection(db, 'jobs'), snap => {
      if (!online) return;
      jobsCache = snap.docs.map(d => d.data());
      status('● Общая база · обновлено', 'online');
      pushState();
    }, err => console.warn('jobs onSnapshot unavailable', err));

    unsubExpenses = fs.onSnapshot(fs.collection(db, 'expenses'), snap => {
      if (!online) return;
      expensesCache = snap.docs.map(d => d.data());
      pushState();
    }, err => console.warn('expenses onSnapshot unavailable', err));

    unsubLegacy = fs.onSnapshot(fs.doc(db, 'appData', 'shared'), snap => {
      if (!online || !snap.exists()) return;
      const data = snap.data()?.data || snap.data() || {};
      legacyCache = { jobs: Array.isArray(data.jobs) ? data.jobs : [], expenses: Array.isArray(data.expenses) ? data.expenses : [] };
      pushState();
    }, err => console.warn('legacy onSnapshot unavailable', err));
  }

  async function saveLegacy(next) {
    const ref = fs.doc(db, 'appData', 'shared');
    await fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? (snap.data()?.data || snap.data() || {}) : {};
      tx.set(ref, {
        data: { ...data, jobs: next.jobs || [], expenses: next.expenses || [] },
        version: 5,
        updatedAt: fs.serverTimestamp(),
        updatedBy: user.uid,
      }, { merge: true });
    });
    legacyCache = { jobs: next.jobs || [], expenses: next.expenses || [] };
  }

  async function saveSharedV2(mutator) {
    if (!user || !online) throw new Error('Нет соединения с общей базой');
    const current = mergedState();
    const next = await mutator(current);
    const normalized = { jobs: Array.isArray(next?.jobs) ? next.jobs : [], expenses: Array.isArray(next?.expenses) ? next.expenses : [], version: 5 };

    try {
      const batch = fs.writeBatch(db);
      let ops = 0;
      const beforeJobs = new Map(current.jobs.map(j => [j.id, j]));
      for (const job of normalized.jobs) {
        const before = beforeJobs.get(job.id);
        if (!before || JSON.stringify(before) !== JSON.stringify(job)) {
          batch.set(fs.doc(db, 'jobs', job.id), { ...job, updatedAt: fs.serverTimestamp(), updatedBy: user.uid }, { merge: true });
          ops++;
        }
      }
      const beforeExpenses = new Map(current.expenses.map(e => [e.id, e]));
      for (const exp of normalized.expenses) {
        const before = beforeExpenses.get(exp.id);
        if (!before || JSON.stringify(before) !== JSON.stringify(exp)) {
          batch.set(fs.doc(db, 'expenses', exp.id), exp, { merge: true });
          ops++;
        }
      }
      if (ops > 400) throw new Error('Слишком много изменений за одну операцию');
      if (ops) await batch.commit();
      jobsCache = normalized.jobs;
      expensesCache = normalized.expenses;
      setState(normalized);
      render();
      return;
    } catch (collectionErr) {
      console.warn('Collection write failed; falling back to legacy appData/shared.', collectionErr);
      try {
        await saveLegacy(normalized);
        jobsCache = normalized.jobs;
        expensesCache = normalized.expenses;
        setState(normalized);
        render();
        status('● Сохранено в общую базу', 'online');
        return;
      } catch (legacyErr) {
        console.error('Both collection and legacy writes failed', collectionErr, legacyErr);
        const code = collectionErr?.code || legacyErr?.code || '';
        throw new Error(code ? `Ошибка сохранения [${code}]` : 'Не удалось сохранить данные');
      }
    }
  }

  return { loadServerV2, startRealtimeV2, saveSharedV2 };
}
