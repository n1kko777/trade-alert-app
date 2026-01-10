export const clampNumber = (value: string, min: number, max: number, fallback: number) => {
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

export const clampInteger = (value: string, min: number, max: number, fallback: number) => {
  return Math.round(clampNumber(value, min, max, fallback));
};

export const parseOptionalNumber = (value: string, min: number, max: number) => {
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(parsed, min), max);
};

export const parseSymbols = (input: string) => {
  return input
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => symbol.length > 0);
};

export const formatPrice = (price?: number) => {
  if (!Number.isFinite(price)) return '--';
  if (price >= 1000) return price.toFixed(2);
  if (price >= 100) return price.toFixed(3);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
};

export const formatClock = (ts?: number) => {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const parseTimeToMinutes = (value: string) => {
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
};

export const normalizeTimeInput = (value: string, fallback: string) => {
  const minutes = parseTimeToMinutes(value);
  const normalizedMinutes = minutes ?? parseTimeToMinutes(fallback);
  if (normalizedMinutes === null) return fallback;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const isWithinQuietHours = (date: Date, start: string, end: string) => {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return false;
  }
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
};
