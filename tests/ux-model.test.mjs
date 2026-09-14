import test from 'node:test';
import assert from 'node:assert/strict';
import { actionFeedbackState, daySheetModel, jobCardModel, workloadSummary } from '../modules/ux-model.js';

test('job card stays compact and preserves core fields', () => {
  const model = jobCardModel({ id: 'j1', client: 'Иван', type: 'Монтаж', date: '2026-09-14', slot: 2, price: 6500, status: 'Подтверждён', paid: 'yes', address: 'hidden here' });
  assert.deepEqual(model, {
    id: 'j1', client: 'Иван', type: 'Монтаж', date: '2026-09-14', slot: '2', time: '', price: 6500, status: 'Подтверждён', paid: true,
  });
  assert.equal('address' in model, false);
});

test('day sheet contains operational details', () => {
  const model = daySheetModel({ client: 'Иван', phone: '+79990000000', address: 'ул. Лесная, 1', comment: 'Доборы', measureLink: 'm1' });
  assert.equal(model.phone, '+79990000000');
  assert.equal(model.address, 'ул. Лесная, 1');
  assert.equal(model.comment, 'Доборы');
  assert.equal(model.measureLink, 'm1');
});

test('workload does not turn three into a capacity limit', () => {
  for (const count of [3, 4, 6, 10]) {
    const summary = workloadSummary({ actualCount: count, averageLoad: 3, freePlanningSlots: [] });
    assert.equal(summary.actualCount, count);
    assert.equal(summary.aboveAverage, count > 3);
    assert.notEqual(summary.label, 'День полностью загружен');
  }
});

test('action feedback has one explicit state machine', () => {
  assert.equal(actionFeedbackState('idle'), 'idle');
  assert.equal(actionFeedbackState('pending'), 'pending');
  assert.equal(actionFeedbackState('success'), 'success');
  assert.equal(actionFeedbackState('error'), 'error');
  assert.equal(actionFeedbackState('unknown'), 'idle');
});
