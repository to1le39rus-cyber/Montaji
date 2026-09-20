import { esc } from '../ui/format.js';
export const createNoteForm = ({ note = {}, onSubmit }) => {
  const form = document.createElement('form');
  form.className = 'simple-form';
  form.innerHTML = '<label>Название<input name="title" value="'+esc(note.title||'')+'" placeholder="Что нужно запомнить?" maxlength="180" required></label><label>Подробности<textarea name="text" placeholder="Детали, которые пригодятся позже">'+esc(note.text||'')+'</textarea></label><label>Срок, если нужен<input type="date" name="dueDate" value="'+esc(note.dueDate||'')+'"></label><div class="toggle-row"><span>Срочная задача<small style="display:block;color:var(--muted);font-size:12px;margin-top:4px">Показывать сверху на главной</small></span><button type="button" role="switch" class="toggle-control" aria-label="Срочная задача" aria-checked="'+String(note.urgent===true)+'"><span></span></button></div><button class="button primary" type="submit">'+(note.id?'Сохранить заметку':'Добавить заметку')+'</button>';
  const toggle = form.querySelector('[role="switch"]');
  toggle.onclick = () => toggle.setAttribute('aria-checked', String(toggle.getAttribute('aria-checked') !== 'true'));
  const values = () => ({ title: form.elements.title.value.trim(), text: form.elements.text.value.trim(), dueDate: form.elements.dueDate.value, urgent: toggle.getAttribute('aria-checked') === 'true' });
  const initial = values();
  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    const current = values();
    try { await onSubmit(note.id ? Object.fromEntries(Object.entries(current).filter(([key, val]) => val !== initial[key])) : current); }
    finally { submit.disabled = false; }
  };
  return form;
};
