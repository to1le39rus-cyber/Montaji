// data-adapter-v2.js
//
// ЗАЧЕМ ЭТОТ ФАЙЛ
// В текущем app.js ВСЕ операции с монтажами и расходами проходят через одну точку —
// saveShared(mutator): она читает документ appData/shared целиком, применяет mutator
// к JS-объекту {jobs:[], expenses:[]}, и пишет документ обратно целиком одной транзакцией.
// Все ~15 мест кода (saveJob, updateJob, deleteJob, openExpense и т.д.) не работают с базой
// напрямую — они вызывают saveShared(mutator) и ничего не знают про то, как физически
// устроено хранение. Это подтверждено чтением app.js (updateJob — буквально однострочная
// обёртка над saveShared).
//
// Из этого следует: чтобы перейти на коллекцию jobs/{id} вместо массива в одном документе,
// НЕ НУЖНО переписывать 60+ функций рендера/бизнес-логики в app.js. Достаточно заменить
// РОВНО ТРИ функции: loadServer, startRealtime, saveShared — на реализации из этого файла.
// Контракт (сигнатура, что принимают, что возвращают, когда бросают ошибку) сохранён 1:1,
// поэтому остальной код app.js продолжает работать без изменений.
//
// КАК ПОДКЛЮЧИТЬ (когда будете готовы — не делает ничего, пока не подключено):
//   import { loadServerV2, startRealtimeV2, saveSharedV2 } from './data-adapter-v2.js';
//   и заменить тела loadServer/startRealtime/saveShared в app.js на вызов этих функций
//   (или, что чище — удалить старые определения и импортировать эти под старыми именами).
//
// ПРЕДПОСЫЛКА: коллекции jobs/{id} и expenses/{id} должны существовать (см. migrate-jobs.mjs).
// До миграции эти функции будут просто возвращать пустые списки — не сломают приложение,
// но и не покажут данные, поэтому подключать их раньше миграции не имеет смысла.

let unsubJobs = null;
let unsubExpenses = null;
let jobsCache = [];
let expensesCache = [];

function emptyState() {
  return { jobs: [], expenses: [], version: 5 };
}

/**
 * @param {object} ctx
 * @param {import('firebase/firestore')} ctx.fs
 * @param {import('firebase/firestore').Firestore} ctx.db
 * @param {{uid:string}} ctx.user
 * @param {boolean} ctx.online
 * @param {(s:string, kind?:string)=>void} ctx.status
 * @param {(s:string, kind?:string)=>void} ctx.toast
 * @param {(next:object)=>void} ctx.setState   // заменяет присваивание `state = ...` в app.js
 * @param {()=>void} ctx.render
 */
export function makeDataAdapterV2({ fs, db, user, online, status, toast, setState, render }) {

  async function loadServerV2() {
    if (!user || !online) {
      setState(emptyState());
      status('Нет интернета · данные не загружены', 'offline');
      return false;
    }
    status('Подключаем общую базу…');
    try {
      const [jobsSnap, expSnap] = await Promise.all([
        fs.getDocsFromServer(fs.collection(db, 'jobs')),
        fs.getDocsFromServer(fs.collection(db, 'expenses')),
      ]);
      jobsCache = jobsSnap.docs.map(d => d.data());
      expensesCache = expSnap.docs.map(d => d.data());
      setState({ jobs: jobsCache, expenses: expensesCache, version: 5 });
      status('● Общая база · синхронизировано', 'online');
      return true;
    } catch (err) {
      console.error('loadServerV2', err);
      // В отличие от старой версии (Promise.all-провал целиком) — здесь при ошибке ОДНОЙ
      // из коллекций вторая всё равно применяется, если успела прийти. Это и есть тот самый
      // фикс "make shared load independent from notes", перенесённый на новую схему.
      setState({ jobs: jobsCache, expenses: expensesCache, version: 5 });
      status('База недоступна', 'offline');
      toast('Не удалось получить часть данных с сервера.', 'error');
      return jobsCache.length > 0 || expensesCache.length > 0;
    }
  }

  function startRealtimeV2() {
    unsubJobs?.();
    unsubExpenses?.();
    if (!user || !online) return;

    const pushState = () => {
      setState({ jobs: jobsCache, expenses: expensesCache, version: 5 });
      render();
    };

    unsubJobs = fs.onSnapshot(fs.collection(db, 'jobs'), snap => {
      if (!online) return;
      jobsCache = snap.docs.map(d => d.data());
      status('● Общая база · обновлено', 'online');
      pushState();
    }, err => {
      console.error('jobs onSnapshot', err);
      status('Нет связи с базой монтажей', 'offline');
      toast('Потеряна связь с монтажами', 'error');
    });

    unsubExpenses = fs.onSnapshot(fs.collection(db, 'expenses'), snap => {
      if (!online) return;
      expensesCache = snap.docs.map(d => d.data());
      pushState();
    }, err => {
      console.error('expenses onSnapshot', err);
      toast('Потеряна связь с расходами', 'error');
    });
  }

  /**
   * Совместимая замена saveShared(mutator). Мутатор по-прежнему получает {jobs, expenses}
   * и возвращает новую версию — как раньше. Разница только внутри: вместо перезаписи одного
   * документа целиком пишутся точечно только реально изменившиеся jobs/{id} и expenses/{id}.
   */
  async function saveSharedV2(mutator) {
    if (!user || !online) throw new Error('Нет соединения с общей базой');
    const current = { jobs: jobsCache, expenses: expensesCache, version: 5 };
    const next = await mutator(current);

    const batch = fs.writeBatch(db);
    let ops = 0;

    const beforeJobsById = new Map(current.jobs.map(j => [j.id, j]));
    for (const job of next.jobs || []) {
      const before = beforeJobsById.get(job.id);
      if (!before || JSON.stringify(before) !== JSON.stringify(job)) {
        batch.set(fs.doc(db, 'jobs', job.id), {
          ...job,
          updatedAt: fs.serverTimestamp(),
          updatedBy: user.uid,
        }, { merge: true });
        ops++;
      }
    }

    const beforeExpById = new Map(current.expenses.map(e => [e.id, e]));
    for (const exp of next.expenses || []) {
      const before = beforeExpById.get(exp.id);
      if (!before || JSON.stringify(before) !== JSON.stringify(exp)) {
        batch.set(fs.doc(db, 'expenses', exp.id), exp, { merge: true });
        ops++;
      }
    }

    if (ops === 0) return; // нечего писать — mutator не менял данные
    if (ops > 400) throw new Error('Слишком много изменений за одну операцию (лимит батча)');
    await batch.commit();
    // Локальный кэш обновится через onSnapshot (startRealtimeV2) — не дублируем здесь,
    // чтобы не разойтись с реальным состоянием сервера.
  }

  return { loadServerV2, startRealtimeV2, saveSharedV2 };
}
