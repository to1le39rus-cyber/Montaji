import { createExpense, cancelExpense } from './expenses.js';
import { normalizeShared } from './normalize.js';

export const createExpenseService = ({ repository, makeId = () => crypto.randomUUID() }) => ({
  async create(input) {
    const expense = createExpense(input, makeId());
    if (!expense.date || expense.amount <= 0) throw new Error('Укажите дату и сумму расхода');
    return repository.transact(current => ({ ...current, expenses: [...(current?.expenses || []), expense] }), normalizeShared);
  },
  async update(id, patch) {
    return repository.transact(current => {
      const expenses = current?.expenses || [];
      const existing = expenses.find(expense => expense.id === id && !expense.cancelled);
      if (!existing) throw new Error('Расход не найден');
      const next = createExpense({ ...existing, ...patch }, id);
      if (!next.date || next.amount <= 0) throw new Error('Укажите дату и сумму расхода');
      return { ...current, expenses: expenses.map(expense => expense.id === id ? next : expense) };
    }, normalizeShared);
  },
  async remove(id) {
    return repository.transact(current => {
      const expenses = current?.expenses || [];
      const existing = expenses.find(expense => expense.id === id && !expense.cancelled);
      if (!existing) throw new Error('Расход не найден');
      return { ...current, expenses: expenses.map(expense => expense.id === id ? cancelExpense(expense) : expense) };
    }, normalizeShared);
  }
});
