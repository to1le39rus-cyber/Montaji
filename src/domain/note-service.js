// Uses the existing notes transaction and record schema. UI only sends dirty fields.
export const createNoteService = ({ repository, actor = {}, makeId = () => crypto.randomUUID(), now = () => new Date().toISOString() }) => ({
  async create(input) {
    const stamp = now();
    const note = { id: makeId(), title: String(input.title || '').trim(), text: String(input.text || '').trim(), urgent: input.urgent === true, dueDate: input.dueDate || '', done: false, archived: false, authorUid: actor.uid || '', authorName: actor.displayName || actor.email || '', createdAt: stamp, updatedAt: stamp };
    if (!note.title && !note.text) throw new Error('Напишите текст заметки');
    return repository.transact(current => ({ ...current, notes: [...(current.notes || []), note] }));
  },
  async update(id, patch) {
    const allowed = Object.fromEntries(Object.entries(patch).filter(([key]) => ['title', 'text', 'urgent', 'dueDate', 'done', 'archived'].includes(key)));
    return repository.transact(current => {
      if (!(current.notes || []).some(note => note.id === id)) throw new Error('Заметка больше недоступна');
      return { ...current, notes: current.notes.map(note => note.id === id ? { ...note, ...allowed, id, updatedAt: now() } : note) };
    });
  }
});
