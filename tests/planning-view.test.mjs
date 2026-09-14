import test from 'node:test';
import assert from 'node:assert/strict';
import { planningViewModel, planningPeriodViewModel } from '../modules/planning-view.js';

const date = '2026-09-14';
const montage = (id, slot) => ({
  id: String(id),
  type: 'Монтаж',
  date,
  slot: String(slot),
  status: 'Запланирован',
});

test('planning view model reports actual count independently of preset windows', () => {
  const jobs = [1, 2, 3, 4, 5].map(id => montage(id, id));
  const model = planningViewModel(jobs, date);

  assert.equal(model.actualCount, 5);
  assert.equal(model.unlimited, true);
  assert.equal(model.overAverage, true);
  assert.equal(model.hasFreePresetSlot, false);
  assert.equal(model.freeSlots.length, 0);
});

test('planning view model keeps a free preset window when one of three is unused', () => {
  const jobs = [montage(1, 1), montage(2, 2), montage(4, 4)];
  const model = planningViewModel(jobs, date);

  assert.equal(model.actualCount, 3);
  assert.deepEqual(model.freeSlots, ['3']);
  assert.equal(model.hasFreePresetSlot, true);
});

test('period view model separates average load from each day count', () => {
  const jobs = [
    montage(1, 1),
    montage(2, 2),
    montage(3, 3),
    montage(4, 4),
  ];
  const model = planningPeriodViewModel(jobs, [date, '2026-09-15']);

  assert.equal(model.averageLoad, 2);
  assert.equal(model.days[0].actualCount, 4);
  assert.equal(model.days[1].actualCount, 0);
  assert.equal(model.unlimited, true);
});
