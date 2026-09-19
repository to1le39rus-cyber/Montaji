import {applyIntent, DomainError} from '../domain/edit-intent.js';

// One authoritative stream; acknowledgements never replace state or append rows.
// Both Firestore and synthetic DEV use this exact repository and domain service.
export function createEntityRepository(transport) {
  return {
    subscribe: (...args) => transport.subscribe(...args),
    close: () => transport.close?.(),
    async commit({bucket, id, base, patch, create = false, operationId, validate, related}) {
      if (!operationId) throw new Error('Operation identity required');
      return transport.transact(bucket === 'notes' ? 'notes' : 'shared', document => {
        const operations = document.operations || [];
        const prior = operations.find(o => o.id === operationId);
        if (prior) return {document, result: prior.result};
        const items = document[bucket] || [];
        const current = items.find(item => item.id === id);
        if (create && current) throw new DomainError('duplicate-id', 'Запись с таким идентификатором уже существует.');
        const next = create ? {...patch, id, revision:1} : applyIntent(current, {base, patch});
        validate(next, document, current);
        let updated = {...document, [bucket]: create ? [...items, next] : items.map(item => item.id === id ? next : item)};
        if (related) updated = related(updated, next, current);
        const result = {id, revision:next.revision};
        updated.revision = (Number(document.revision) || 0) + 1;
        updated.operations = [...operations, {id:operationId, result}].slice(-100);
        return {document:updated, result};
      });
    }
  };
}
