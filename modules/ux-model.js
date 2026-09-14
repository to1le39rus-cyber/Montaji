/**
 * Pure UX helpers for Step 4.
 * No DOM, Firebase, storage or side effects.
 */

export function jobCardModel(job = {}) {
  return {
    id: job.id ?? '',
    client: String(job.client ?? job.title ?? 'Без клиента'),
    type: String(job.type ?? 'Монтаж'),
    date: String(job.date ?? ''),
    slot: job.slot == null ? '' : String(job.slot),
    time: String(job.time ?? ''),
    price: Number(job.price || 0),
    status: String(job.status ?? 'Запланирован'),
    paid: job.paid === true || job.paid === 'yes',
  };
}

export function daySheetModel(job = {}) {
  const card = jobCardModel(job);
  return {
    ...card,
    phone: String(job.phone ?? ''),
    address: String(job.address ?? ''),
    store: String(job.store ?? ''),
    comment: String(job.comment ?? ''),
    completedDate: String(job.completedDate ?? ''),
    measureLink: String(job.measureLink ?? ''),
  };
}

export function workloadSummary({ actualCount = 0, averageLoad = 3, freePlanningSlots = [] } = {}) {
  const count = Math.max(0, Number(actualCount) || 0);
  const average = Math.max(0, Number(averageLoad) || 0);
  const free = Array.isArray(freePlanningSlots) ? freePlanningSlots : [];

  return {
    actualCount: count,
    averageLoad: average,
    freePlanningSlots: free,
    aboveAverage: count > average,
    label: count === 0
      ? 'Нет монтажей'
      : count === 1
        ? '1 монтаж'
        : `${count} монтажей`,
  };
}

export function actionFeedbackState(state = 'idle') {
  const allowed = new Set(['idle', 'pending', 'success', 'error']);
  return allowed.has(state) ? state : 'idle';
}
