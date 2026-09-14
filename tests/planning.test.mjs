import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANNING_SLOTS,
  actualMontageCount,
  averageMontageLoad,
  freePlanningSlots,
  workloadLabel,
} from '../modules/planning.js';

const jobs = [
  { id: '1', type: 'Монтаж', date: '2026-09-14', slot: '1', status: 'Запланирован' },
  { id: '2', type: 'Монтаж', date: '2026-09-14', slot: '2', status: 'В пути' },
  { id: '3', type: 'Монтаж', date: '2026-09-14', slot: '3', status: 'Запланирован' },
  { id: '4', type: 'Монтаж', date: '2026-09-14', slot: '4', status: 'Запланирован' },
  { id: '5', type: 'Замер', date: '2026-09-14', slot: '1', status: 'Запланирован' },
  { id: '6', type: 'Монтаж', date: '2026-09-14', slot: '5', status: 'Отменён' },
  { id: '7', type: 'Монтаж', date: '2026-09-14', slot: '6', status: 'Выполнен' },
];

test('3 planning windows are presets, not a daily montage limit', () => {
  assert.equal(actualMontageCount(jobs, '2026-09-14'), 4);
  assert.deepEqual(Object.keys(PLANNING_SLOTS), ['1', '2', '3']);
});

test('extra montages do not disappear from the business metric', () => {
  const extra = [...jobs, { id: '8', type: 'Монтаж', date: '2026-09-14', slot: '7', status: 'Запланирован' }];
  assert.equal(actualMontageCount(extra, '2026-09-14'), 5);
});

test('average load is an indicator, not a constraint', () => {
  assert.equal(averageMontageLoad(jobs, ['2026-09-14', '2026-09-15']), 2);
  assert.equal(averageMontageLoad(jobs, []), 0);
});

test('free planning slots only describes the three presets', () => {
  assert.deepEqual(freePlanningSlots(jobs, '2026-09-14'), []);
});

test('workload label distinguishes above-average load', () => {
  assert.equal(workloadLabel(3), 'Средняя нагрузка · 3');
  assert.equal(workloadLabel(4), 'Выше средней · 4');
});
