/* Montaji AA — one date/time presentation layer for every modal. */
(() => {
  const pad = n => String(n).padStart(2,'0');
  const formatValue = (value, kind) => {
    if (!value) return '';
    const d = kind === 'date' ? new Date(`${value}T12:00:00`) : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const date = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(d);
    if (kind === 'datetime') return `${date} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return date;
  };
  const enhance = input => {
    if (!input || !/^(date|datetime-local)$/.test(input.type) || input.dataset.montajiDateReady === '1') return;
    input.dataset.montajiDateReady = '1';
    const kind = input.type === 'date' ? 'date' : 'datetime';
    const field = input.closest('.quick-task-field') || input.parentElement;
    if (!field) return;
    field.classList.add('montaji-date-field');
    field.dataset.kind = kind;
    const display = document.createElement('span');
    display.className = 'montaji-date-display';
    const placeholder = kind === 'datetime' ? 'Выбрать дату и время' : 'Выбрать дату';
    const sync = () => {
      const text = formatValue(input.value,kind);
      display.textContent = text || placeholder;
      display.classList.toggle('is-placeholder',!text);
      field.dataset.hasValue = text ? '1' : '0';
    };
    display.textContent = placeholder;
    display.classList.add('is-placeholder');
    field.insertBefore(display,input);
    input.classList.add('montaji-date-input');
    input.addEventListener('input',sync);
    input.addEventListener('change',sync);
    sync();
  };
  const refresh = root => (root || document).querySelectorAll?.('input[type="date"],input[type="datetime-local"]').forEach(enhance);
  const boot = () => {
    refresh(document);
    document.addEventListener('focusin',e=>enhance(e.target),true);
    document.addEventListener('click',e=>{const input=e.target.closest?.('input[type="date"],input[type="datetime-local"]');if(input)enhance(input);},true);
    globalThis.MontajiDateFields = { refresh, enhance };
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
