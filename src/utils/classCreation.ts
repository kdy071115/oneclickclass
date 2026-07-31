export function isValidYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return Boolean(url.pathname.slice(1));
    return (
      (host === 'youtube.com' || host === 'm.youtube.com') &&
      (Boolean(url.searchParams.get('v')) || url.pathname.startsWith('/shorts/'))
    );
  } catch {
    return false;
  }
}

const schedulePattern =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

type ScheduleParts = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  zone?: string;
};

const parseSchedule = (value: string): ScheduleParts | null => {
  const match = schedulePattern.exec(value.trim());
  if (!match) return null;

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue, zone] =
    match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = hourValue === undefined ? undefined : Number(hourValue);
  const minute = minuteValue === undefined ? undefined : Number(minuteValue);
  const second = secondValue === undefined ? undefined : Number(secondValue);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  calendarDate.setUTCHours(0, 0, 0, 0);

  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day ||
    (hour !== undefined && (hour < 0 || hour > 23)) ||
    (minute !== undefined && (minute < 0 || minute > 59)) ||
    (second !== undefined && (second < 0 || second > 59))
  ) {
    return null;
  }

  return { year, month, day, hour, minute, second, zone };
};

const scheduleDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const scheduleDateTimeFormatter = (timeZone: 'UTC' | 'Asia/Seoul') =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });

export function scheduleDateValue(value: string): string {
  const parts = parseSchedule(value);
  if (!parts) return '';
  return [parts.year, parts.month, parts.day]
    .map((part, index) => (index === 0 ? String(part).padStart(4, '0') : String(part).padStart(2, '0')))
    .join('-');
}

export function scheduleTimeValue(value: string): string {
  const parts = parseSchedule(value);
  if (parts?.hour === undefined || parts.minute === undefined) return '';
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export function combineClassSchedule(date: string, time: string): string {
  const normalizedDate = scheduleDateValue(date);
  if (!normalizedDate) return '';
  const normalizedTime = timePattern.test(time.trim()) ? time.trim() : '';
  return normalizedTime ? `${normalizedDate}T${normalizedTime}` : normalizedDate;
}

export function formatClassSchedule(value: string): string {
  if (!value.trim()) return '일정 미정';

  const parts = parseSchedule(value);
  if (!parts) return value;

  const { year, month, day, hour, minute, second = 0, zone } = parts;
  if (hour === undefined || minute === undefined) {
    return scheduleDateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
  }

  const date = zone
    ? new Date(value.trim())
    : new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (Number.isNaN(date.getTime())) return value;

  return scheduleDateTimeFormatter(zone ? 'Asia/Seoul' : 'UTC')
    .format(date)
    .replace(/\bAM\b/, '오전')
    .replace(/\bPM\b/, '오후');
}
