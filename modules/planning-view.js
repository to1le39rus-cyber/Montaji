import {
  PLANNING_SLOTS,
  actualMontageCount,
  averageMontageLoad,
  freePlanningSlots,
  workloadLabel,
} from './planning.js';

/**
 * Pure UI view-model for planning surfaces.
 * No persistence or DOM side effects: app.js can render this model without duplicating business semantics.
 */
export function planningViewModel(jobs = [], date, average = 3) {
  const count = actualMontageCount(jobs, date);
  const freeSlots = freePlanningSlots(jobs, date);
  return {
    date,
    actualCount: count,
    averageLoad: average,
    workload: workloadLabel(count, average),
    freeSlots,
    planningSlots: PLANNING_SLOTS,
    hasFreePresetSlot: freeSlots.length > 0,
    overAverage: count > average,
    unlimited: true,
  };
}

export function planningPeriodViewModel(jobs = [], dates = [], average = 3) {
  return {
    averageLoad: averageMontageLoad(jobs, dates),
    days: dates.map(date => planningViewModel(jobs, date, average)),
    unlimited: true,
  };
}
