export const createReadOnlyAudit = ({app,sharedRepository,notesRepository}) => ({
  async run(){
    const snapshot=await app.readOnlySnapshot();
    return {
      ...snapshot,
      counts:{
        jobs:snapshot.shared.jobs.length,
        expenses:snapshot.shared.expenses.length,
        notes:snapshot.notes.length
      }
    };
  }
});
