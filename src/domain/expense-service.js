import { createExpense } from './expenses.js';
import { normalizeShared } from './normalize.js';

export const createExpenseService = ({ repository, makeId = () => crypto.randomUUID() }) => ({
  async create(input) {
    const expense = createExpense(input, makeId());
    if (!expense.date || expense.amount <= 0) throw new Error('Укажите дату и сумму расхода');
    return repository.transact(current => ({ ...current, expenses: [...(current?.expenses || []), expense] }), normalizeShared);
  }
});
