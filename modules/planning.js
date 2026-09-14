// Canonical planning/business metrics.
// IMPORTANT: planning windows are presets, not a daily capacity limit.

export const PLANNING_SLOTS = Object.freeze({
  '1': '10:00–12:00',
  '2': '14:00–16:00',
  '3': '3-й слот / резерв',
});

const active = job => job?.status !== 'Отменён' && job?.status !== 'Выполнен';

/** Number of planned montage visits for a day. There is intentionally no cap. */
export function actualMontageCount(jobs = [], date) {
  return jobs.filter(job => active(job) && job.type === 'Монтаж' && job.date === date).length;
}

/**
 * Average montage load per calendar day. This is a planning indicator only;
 * it never blocks creating additional work.
 */
export function averageMontageLoad(jobs = [], dates = []) {
  if (!dates.length) return 0;
  const total = dates.reduce((sum, date) => sum + actualMontageCount(jobs, date), 0);
  return total / dates.length;
}

/** Preset windows still useful for scheduling, but never imply a capacity limit. */
export function freePlanningSlots(jobs = [], date) {
  const used = new Set(
    jobs
      .filter(job => active(job) && job.type === 'Монтаж' && job.date === date)
      .map(job => String(job.slot || ''))
  );
  return Object.keys(PLANNING_SLOTS).filter(slot => !used.has(slot));
}

export function workloadLabel(count, average = 3) {
  if (count <= 0) return 'Свободный день';
  if (count < average) return `Нагрузка ниже средней · ${count}`;
  if (count === average) return `Средняя нагрузка · ${count}`;
  return `Выше средней · ${count}`;
}
