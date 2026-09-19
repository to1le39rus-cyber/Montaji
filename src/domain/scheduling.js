export const SLOT_PRESETS = Object.freeze({
  '1':'10:00–12:00',
  '2':'14:00–16:00',
  '3':'3-й слот / резерв'
});
export const nextPresetSlot = (jobs,date) => {
  const used=new Set((Array.isArray(jobs)?jobs:[]).filter(j=>j?.date===date&&j?.type==='Монтаж'&&j?.status!=='Отменен').map(j=>String(j.slot)));
  return Object.keys(SLOT_PRESETS).find(slot=>!used.has(slot)) || '3';
};
export const sortBySchedule = jobs => [...(Array.isArray(jobs)?jobs:[])].sort((a,b)=>String(a?.slot||'').localeCompare(String(b?.slot||'')));
