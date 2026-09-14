import test from 'node:test';
import assert from 'node:assert/strict';
import { actualMontageCount, averageMontageLoad, workloadLabel } from '../modules/planning.js';

const date = '2026-09-14';

const montage = (id, status = 'Запланирован', slot = id) => ({
  id: String(id), type: 'Монтаж', date, slot: String(slot), status,
});

test('business semantics allow more than three montages on one date', () => {
  const jobs = [1, 2, 3, 4, 5, 6].map(id => montage(id));
  assert.equal(actualMontageCount(jobs, date), 6);
  assert.equal(workloadLabel(6), 'Выше средней · 6');
});

test('completed and cancelled work does not inflate current planning load', () => {
  const jobs = [montage(1), montage(2, 'Выполнен'), montage(3, 'Отменён')];
  assert.equal(actualMontageCount(jobs, date), 1);
});

test('average load is calculated separately from actual daily count', () => {
  const jobs = [montage(1), montage(2), montage(3), montage(4)];
  assert.equal(actualMontageCount(jobs, date), 4);
  assert.equal(averageMontageLoad(jobs, [date, '2026-09-15']), 2);
});
