import {dirtyPatch, DomainError} from './edit-intent.js';
import {businessDay, validDay} from './dates.js';
import {JOB_TYPES} from './jobs.js';

const fields = {
  jobs: ['date','slot','time','type','client','phone','address','source','store','storeId','storeNameSnapshot','comment','price','status','paid','completedDate','measurePrice','measurePaid','measureCredit','convertedToJobId','convertedFromMeasureId','cancelledAt','cancelReason'],
  stores: ['name','address','phone','contact','archived'],
  expenses: ['date','amount','category','comment','cancelled'],
  notes: ['title','text','dueDate','urgent','done','archived']
};
export const nameKey = name => String(name || '').trim().replace(/\s+/g,' ').normalize('NFKC').toLocaleLowerCase('ru');
const fail = message => { throw new DomainError('validation', message); };
const money = n => Number.isFinite(n) && n >= 0 && n <= 1e9 && Math.abs(n * 100 - Math.round(n * 100)) < 0.0001;
function validate(bucket, value, document, before) {
  for (const text of Object.values(value)) if (typeof text === 'string' && text.length > 10000) fail('Слишком длинный текст. Максимум 10 000 символов.');
  if (bucket === 'stores') {
    if (!nameKey(value.name)) fail('Укажите название магазина.');
    if (!value.archived && (document.stores || []).some(s => s.id !== value.id && !s.archived && nameKey(s.name) === nameKey(value.name))) fail('Магазин с таким названием уже есть.');
  }
  if (bucket === 'jobs') {
    if (!validDay(value.date)) fail('Укажите корректную дату.');
    if (!JOB_TYPES.includes(value.type)) fail('Выберите тип работы.');
    if (!String(value.client || '').trim() && value.type !== 'Доп. доход') fail('Укажите клиента.');
    if (!money(value.price) || !money(value.measurePrice || 0) || !money(value.measureCredit || 0)) fail('Укажите сумму от 0 до 1 000 000 000 ₽, не более двух знаков после запятой.');
    if (value.status === 'Выполнен' && !validDay(value.completedDate)) fail('Укажите дату выполнения.');
    if (value.storeId && value.storeId !== before?.storeId) {
      const store = (document.stores || []).find(s => s.id === value.storeId && !s.archived);
      if (!store) fail('Магазин больше недоступен. Выберите другой источник.');
      // Snapshot reflects the name the operator selected; concurrent rename requires review.
      if (value.storeNameSnapshot !== store.name) fail('Магазин переименован. Выберите его снова.');
    }
  }
  if (bucket === 'expenses' && (!validDay(value.date) || !money(value.amount) || value.amount === 0)) fail('Укажите дату и расход больше нуля.');
  if (bucket === 'notes') {
    if (!String(value.title || '').trim()) fail('Добавьте заголовок заметки.');
    if (value.dueDate && !validDay(value.dueDate)) fail('Проверьте срок заметки.');
  }
}
export function createWorkspaceService(repository, {uuid = () => crypto.randomUUID(), today = businessDay} = {}) {
  const pending = new Map();
  function save(bucket, base, values, {operationId = uuid(), id = base?.id || uuid(), related} = {}) {
    if (pending.has(operationId)) return pending.get(operationId);
    if (!fields[bucket]) throw new Error('Unknown collection');
    const allowed = Object.fromEntries(Object.entries(values).filter(([key]) => fields[bucket].includes(key)));
    const patch = base ? dirtyPatch(base, allowed) : allowed;
    if (bucket === 'jobs' && Object.hasOwn(patch,'paid')) patch.measurePaid = patch.paid;
    if (base && !Object.keys(patch).length) return Promise.resolve({id, unchanged:true});
    const promise = repository.commit({bucket, id, base, patch, create:!base, operationId, validate:(...args) => validate(bucket,...args), related});
    pending.set(operationId,promise);
    promise.finally(() => pending.delete(operationId)).catch(() => {});
    return promise;
  }
  return {
    save,
    complete: (job, options) => save('jobs', job, {status:'Выполнен', completedDate:today()}, options),
    paid: (job, paid, options) => save('jobs', job, {paid}, options),
    cancel: (job, reason, options) => save('jobs', job, {status:'Отменён', cancelledAt:new Date().toISOString(), cancelReason:reason || ''}, options),
    restore: (job, options) => save('jobs',job,{status:'Запланирован',completedDate:'',cancelledAt:'',cancelReason:''},options),
    convert: (measurement, values, options = {}) => {
      const id = options.id || uuid();
      return save('jobs', null, {...values,type:'Монтаж',convertedFromMeasureId:measurement.id}, {...options,id,related:(document) => {
        const source = document.jobs.find(j => j.id === measurement.id);
        if (!source || source.type !== 'Замер' || source.status !== 'Выполнен' || source.convertedToJobId) fail('Замер уже преобразован или недоступен. Откройте его заново.');
        return {...document,jobs:document.jobs.map(j => j.id === source.id ? {...j,convertedToJobId:id,revision:(j.revision || 0)+1} : j)};
      }});
    }
  };
}
