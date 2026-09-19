export const BUSINESS_TIMEZONE = 'Europe/Kaliningrad';
export function businessDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: BUSINESS_TIMEZONE, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function addDays(date, days) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0,10);
}
export function validDay(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
