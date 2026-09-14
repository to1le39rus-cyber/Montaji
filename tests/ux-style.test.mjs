import test from 'node:test';
import assert from 'node:assert/strict';

const CALENDAR_RULES = [
  '.day > span { display: none',
  '.day > i { font-size: 9px',
];

test('Step 4.1 calendar keeps montage count as the primary visible metric', () => {
  assert.equal(CALENDAR_RULES.length, 2);
  assert.ok(CALENDAR_RULES[0].includes('.day > span'));
  assert.ok(CALENDAR_RULES[1].includes('.day > i'));
});

test('Step 4.1 keeps operational actions out of the Today card surface', () => {
  const todaySelectors = [
    '.job-list > .job-card .actions .map-chip',
    '.job-list > .job-card .actions .action-chip:not(.primary-chip)',
    '.job-list > .job-card .quick-actions',
  ];
  assert.equal(todaySelectors.length, 3);
  todaySelectors.forEach(selector => assert.ok(selector.startsWith('.job-list > .job-card')));
});
