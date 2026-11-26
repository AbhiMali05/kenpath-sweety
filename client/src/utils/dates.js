export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCalendarDate(value, options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return value || '';
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, options).format(date);
}
