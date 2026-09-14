/**
 * Step 4.1 visual layer.
 * Keeps the data model and action wiring untouched while making the
 * mobile hierarchy match STEP4-UX-CONTRACT.md.
 */

const STYLE_ID = 'montaji-step4-ux-style';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Calendar: one primary workload metric. */
    .day > span { display: none !important; }
    .day > i { font-size: 9px; line-height: 1.25; }

    /* Today: decision-critical card only. Operational actions stay in Day Sheet. */
    .job-list > .job-card .job-details .detail-line { display: none !important; }
    .job-list > .job-card .actions .map-chip,
    .job-list > .job-card .actions .action-chip:not(.primary-chip),
    .job-list > .job-card .quick-actions { display: none !important; }
    .job-list > .job-card .actions { margin-top: 10px; }
  `;
  document.head.append(style);
}
