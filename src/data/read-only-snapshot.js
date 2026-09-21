import { normalizeShared, normalizeNotes } from '../domain/normalize.js';

export const createReadOnlySnapshot = async ({sharedRepository,notesRepository}) => {
  const [rawShared,rawNotes]=await Promise.all([
    sharedRepository.load(),
    notesRepository.load()
  ]);
  return {
    shared:normalizeShared(rawShared),
    notes:normalizeNotes({notes:rawNotes}),
    readOnly:true
  };
};

export const summarizeSnapshot = snapshot => ({
  jobs:snapshot.shared.jobs.length,
  expenses:snapshot.shared.expenses.length,
  notes:snapshot.notes.length,
  readOnly:snapshot.readOnly === true
});
