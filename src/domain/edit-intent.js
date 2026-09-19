// Compare only fields the user actually changed, against the version they saw.
// A transaction retry must rerun this comparison against the newest entity.
export class DomainError extends Error {
  constructor(code, message, details = {}) { super(message); this.code = code; this.details = details; }
}
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export function dirtyPatch(before, values) {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => key !== 'id' && !same(before[key], value)));
}
export function applyIntent(current, {base, patch}) {
  if (!current) throw new DomainError('deleted', 'Запись удалена на другом устройстве. Ваши изменения сохранены в форме.');
  const conflicts = Object.keys(patch).filter(key => !same(current[key], base[key]) && !same(current[key], patch[key]));
  if (conflicts.length) throw new DomainError('conflict', 'Эти поля уже изменились на другом устройстве.', {fields: conflicts, current});
  return {...current, ...patch, revision: (Number(current.revision) || 0) + 1};
}
