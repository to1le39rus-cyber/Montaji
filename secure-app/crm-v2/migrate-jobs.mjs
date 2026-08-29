// migrate-jobs.mjs
// Разовая миграция appData/shared.jobs[] / expenses[] -> коллекции jobs/{id}, expenses/{id}.
// НЕ удаляет и не изменяет исходный документ appData/shared — только читает.
// Запуск: node migrate-jobs.mjs --dry-run   (сначала обязательно так, посмотреть план)
//         node migrate-jobs.mjs --apply     (реальная запись)
//
// Требует service account с правами на Firestore (GOOGLE_APPLICATION_CREDENTIALS),
// либо firebase-admin, авторизованный через `firebase login` локально.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');

initializeApp({ credential: applicationDefault(), projectId: 'montaj-39' });
const db = getFirestore();

function normalizeJob(j, migratedBy) {
  return {
    id: j.id,
    date: j.date ?? null,
    slot: String(j.slot ?? '1'),
    time: j.time ?? null,
    type: j.type ?? 'Монтаж',
    client: j.client ?? '',
    phone: j.phone ?? '',
    price: Number(j.price ?? 0),
    address: j.address ?? '',
    store: j.store ?? '',
    storeId: null,                       // заполняется вручную/отдельным шагом сопоставления
    comment: j.comment ?? '',
    status: j.status ?? 'Запланирован',
    paid: j.paid !== false,
    completedDate: j.completedDate ?? null,
    measurePrice: j.measurePrice ?? null,
    measurePaid: j.measurePaid ?? null,
    measureCredit: j.measureCredit ?? null,
    convertedToJobId: j.convertedToJobId ?? null,
    convertedFromMeasureId: j.convertedFromMeasureId ?? null,
    createdVia: 'manual',
    bookedByStore: false,
    assignedInstallerUid: null,
    createdBy: 'migration',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: migratedBy,
  };
}

function normalizeExpense(e) {
  return {
    id: e.id,
    date: e.date ?? null,
    amount: Number(e.amount ?? 0),
    category: e.category ?? '',
    comment: e.comment ?? '',
    cancelled: e.cancelled === true,
    createdAt: FieldValue.serverTimestamp(),
  };
}

async function main() {
  const sharedSnap = await db.doc('appData/shared').get();
  if (!sharedSnap.exists) throw new Error('appData/shared не найден — нечего мигрировать.');
  const data = sharedSnap.data()?.data ?? sharedSnap.data();
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];

  console.log(`Найдено монтажей: ${jobs.length}, расходов: ${expenses.length}`);
  console.log(APPLY ? 'РЕЖИМ: запись в Firestore' : 'РЕЖИМ: dry-run (ничего не пишем)');

  if (!APPLY) {
    console.log('Пример первой записи:', JSON.stringify(normalizeJob(jobs[0] ?? {}, 'preview'), null, 2));
    console.log('Добавьте --apply, когда план подтверждён.');
    return;
  }

  const batchSize = 400; // лимит батча Firestore — 500 операций
  let written = 0;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = db.batch();
    for (const j of jobs.slice(i, i + batchSize)) {
      if (!j.id) continue;
      batch.set(db.doc(`jobs/${j.id}`), normalizeJob(j, 'migration'), { merge: false });
      written++;
    }
    await batch.commit();
  }

  let writtenExpenses = 0;
  for (let i = 0; i < expenses.length; i += batchSize) {
    const batch = db.batch();
    for (const e of expenses.slice(i, i + batchSize)) {
      if (!e.id) continue;
      batch.set(db.doc(`expenses/${e.id}`), normalizeExpense(e), { merge: false });
      writtenExpenses++;
    }
    await batch.commit();
  }

  console.log(`Перенесено монтажей: ${written}/${jobs.length}`);
  console.log(`Перенесено расходов: ${writtenExpenses}/${expenses.length}`);

  // Сверка сумм — простой контроль целостности после миграции.
  const sumBefore = jobs.reduce((s, j) => s + Number(j.price || 0), 0);
  const migratedSnap = await db.collection('jobs').get();
  const sumAfter = migratedSnap.docs.reduce((s, d) => s + Number(d.data().price || 0), 0);
  console.log(`Контроль сумм price: было ${sumBefore}, стало ${sumAfter}`, sumBefore === sumAfter ? '✓' : '⚠ РАСХОЖДЕНИЕ');
}

main().catch(err => { console.error(err); process.exit(1); });
