export const APP_TIME_ZONE = 'Asia/Colombo';
const APP_OFFSET = '+05:30';

export function parseAppDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw) || /[+-]\d{4}$/.test(raw)) {
    const zoned = new Date(raw);
    return Number.isNaN(zoned.getTime()) ? null : zoned;
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const local = new Date(`${normalized}${APP_OFFSET}`);
  return Number.isNaN(local.getTime()) ? null : local;
}

export function formatAppDate(value, options = {}) {
  const date = parseAppDate(value);
  if (!date) return '';
  const { year = 'numeric', ...rest } = options;
  const resolved = {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    ...rest
  };
  if (year) resolved.year = year;
  return date.toLocaleDateString('en-GB', resolved);
}

export function formatAppTime(value, withSeconds = false) {
  const date = parseAppDate(value);
  if (!date) return '';
  return date.toLocaleTimeString('en-GB', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: true
  });
}

export function formatAppDateTime(value, options = {}) {
  const date = parseAppDate(value);
  if (!date) return '';
  const { year = 'numeric', ...rest } = options;
  const resolved = {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...rest
  };
  if (year) resolved.year = year;
  return date.toLocaleString('en-GB', resolved);
}
