/* Montaji AA — AA Date Field v2. One date component for every modal. */
(() => {
  const pad = n => String(n).padStart(2,'0');
  const calendarIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 9h18"/></svg>';

  const formatValue = (value, kind) => {
    if (!value) return '';
    const d = kind === 'date' ? new Date(`${value}T12:00:00`) : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const date = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(d);
    return kind === 'datetime' ? `${date} · ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
  };

  const enhance = input => {
    if (!input || !/^(date|datetime-local)$/.test(input.type) || input.dataset.montajiDateReady === '1') return;
    input.dataset.montajiDateReady = '1';
    const kind = input.type === 'date' ? 'date' : 'datetime';

    let field = input.closest('.quick-task-field');
    if (!field) {
      field = document.createElement('div');
      field.className = 'montaji-date-field';
      input.parentElement?.insertBefore(field,input);
      field.appendChild(input);
    }
    field.classList.add('montaji-date-field');
    field.dataset.kind = kind;

    const display = document.createElement('span');
    display.className = 'montaji-date-display';
    display.innerHTML = `<span class="montaji-date-icon">${calendarIcon}</span><span class="montaji-date-text"></span><span class="montaji-date-chevron" aria-hidden="true"></span>`;
    field.insertBefore(display,input);
    input.classList.add('montaji-date-input');

    const text = display.querySelector('.montaji-date-text');
    const placeholder = kind === 'datetime' ? 'Выбрать дату и время' : 'Выбрать дату';
    const sync = () => {
      const valueText = formatValue(input.value,kind);
      text.textContent = valueText || placeholder;
      display.classList.toggle('is-placeholder',!valueText);
      field.dataset.hasValue = valueText ? '1' : '0';
      field.setAttribute('aria-label',valueText || placeholder);
    };

    input.addEventListener('input',sync);
    input.addEventListener('change',sync);
    sync();
  };

  const refresh = root => {
    const scope = root || document;
    if (scope.matches?.('input[type="date"],input[type="datetime-local"]')) enhance(scope);
    scope.querySelectorAll?.('input[type="date"],input[type="datetime-local"]').forEach(enhance);
  };

  const boot = () => {
    refresh(document);
    document.addEventListener('focusin',e=>enhance(e.target),true);
    document.addEventListener('click',e=>{const input=e.target.closest?.('input[type="date"],input[type="datetime-local"]');if(input)enhance(input);},true);

    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) refresh(node);
      }));
    });
    if (document.body) observer.observe(document.body,{childList:true,subtree:true});

    globalThis.MontajiDateFields = { refresh, enhance };
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
