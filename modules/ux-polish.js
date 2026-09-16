const STYLE_ID = 'montaji-ux-polish';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --ui-border: var(--ui-line);
      --ui-motion: 180ms;
      --ui-motion-sheet: 240ms;
    }

    /* The hero progress is an average-load reference, not a capacity limit. */
    .hero-card .progress {
      position: relative;
      margin-top: 24px;
    }
    .hero-card .progress::before {
      content: 'Нагрузка относительно средней';
      position: absolute;
      left: 0;
      bottom: calc(100% + 6px);
      color: rgba(255,255,255,.42);
      font-size: 8px;
      line-height: 1;
      letter-spacing: .04em;
    }

    /* Keep the useful comment visible on Today without returning operational clutter. */
    .job-list > .job-card .job-details .note-line {
      display: block !important;
      margin-top: 8px;
      padding: 9px 10px;
      color: var(--ui-text-2);
      line-height: 1.35;
      background: #f8f9f6;
      border: 1px solid #e3e6e0;
      border-left: 2px solid #77866c;
      border-radius: 12px;
    }
    .job-list > .job-card .job-details .note-line::before {
      content: 'Комментарий';
      display: block;
      margin-bottom: 3px;
      color: var(--ui-text-3);
      font-size: 8px;
      font-weight: 750;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    /* Primary action remains easy to hit on a phone. */
    .job-list > .job-card .actions .primary-chip {
      min-height: 34px;
      padding: 8px 12px;
    }

    @media (max-width: 390px) {
      .main { padding-left: 14px; padding-right: 14px; }
      .hero-card { padding-left: 18px; padding-right: 18px; }
      .job-card { padding: 13px; }
      .job-client { font-size: 15px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .job-card, .progress span { transition: none !important; }
    }
  `;
  document.head.append(style);
}
