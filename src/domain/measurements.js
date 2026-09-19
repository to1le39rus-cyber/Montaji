import { isMeasurement } from './jobs.js';
export const canConvertMeasurement = job => isMeasurement(job) && !job?.convertedToJobId && job?.status !== 'Отменен';
export const buildConvertedMontage = (measure, input, montageId) => ({
  ...input,
  id:montageId,
  type:'Монтаж',
  convertedFromMeasureId:measure.id,
  measurePrice:Number(measure.measurePrice||measure.price)||0,
  measurePaid:measure.measurePaid === true,
  measureCredit:Number(measure.measureCredit)||0,
  source:measure.source || measure.store || input?.source || ''
});
