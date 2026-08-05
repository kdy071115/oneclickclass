import {
  classCreationDefaults,
  classCreationFileTypes,
} from '../constants/classCreation';
import type { CurriculumLesson } from '../types/class';
import { getYouTubeVideoId } from './content';

export { getYouTubeVideoId } from './content';

export type ClassSourceCurriculumInput = {
  kind: 'none' | 'video-url' | 'video' | 'documents';
  classTitle: string;
  classSummary: string;
  videoUrl?: string;
  videoTitle?: string;
  videoDurationSeconds?: number;
  materials: Array<{
    name: string;
    url?: string;
    durationSeconds?: number;
  }>;
};

export type ClassSourceCurriculumDraft = {
  sectionTitle: string;
  lessons: Array<Omit<CurriculumLesson, 'id'>>;
};

const sourceTitle = (name: string) => {
  const trimmed = name.trim();
  const extensionIndex = trimmed.lastIndexOf('.');
  return extensionIndex > 0 ? trimmed.slice(0, extensionIndex) : trimmed;
};

const sourceDurationMinutes = (seconds?: number) =>
  seconds && Number.isFinite(seconds)
    ? Math.max(1, Math.ceil(seconds / 60))
    : classCreationDefaults.lessonDurationMinutes;

export function buildSourceCurriculum(
  input: ClassSourceCurriculumInput,
): ClassSourceCurriculumDraft {
  const common = {
    description: input.classSummary.trim(),
    preview: false,
    published: true,
    required: true,
    sequential: false,
    markers: [],
    resources: [],
  } satisfies Partial<Omit<CurriculumLesson, 'id'>>;

  const lessons: Array<Omit<CurriculumLesson, 'id'>> = [];
  if (input.kind === 'video-url' && input.videoUrl) {
    lessons.push({
      ...common,
      title: input.videoTitle?.trim() || input.classTitle.trim(),
      contentType: 'video',
      contentUrl: input.videoUrl,
      durationMinutes: sourceDurationMinutes(input.videoDurationSeconds),
    });
  } else if (input.kind === 'video' || input.kind === 'documents') {
    input.materials.forEach((material) => {
      if (!material.url) return;
      lessons.push({
        ...common,
        title: sourceTitle(material.name) || input.classTitle.trim(),
        contentType: input.kind === 'video' ? 'video' : 'document',
        contentUrl: material.url,
        durationMinutes: sourceDurationMinutes(material.durationSeconds),
      });
    });
  }

  return {
    sectionTitle: input.classTitle.trim(),
    lessons,
  };
}

export function isValidYouTubeUrl(value: string) {
  return Boolean(getYouTubeVideoId(value));
}

export function isSupportedClassSourceFile(file: File, kind: 'video' | 'document') {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const rule = classCreationFileTypes[kind];
  return rule.extensions.some((allowed) => allowed === extension);
}

export function formatMediaDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function readVideoDuration(file: File) {
  return new Promise<number | undefined>((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const finish = (duration?: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(), 10_000);
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      finish(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : undefined);
    video.onerror = () => finish();
    video.src = objectUrl;
  });
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

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue, zone] = match;
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
    .map((part, index) =>
      index === 0 ? String(part).padStart(4, '0') : String(part).padStart(2, '0'),
    )
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

export function localDateInputValue(value = new Date()): string {
  const localValue = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 10);
}

export function isPastClassSchedule(value: string, now = new Date()): boolean {
  const parts = parseSchedule(value);
  if (!parts || parts.hour === undefined || parts.minute === undefined) return false;

  const scheduledAt = parts.zone
    ? new Date(value.trim())
    : new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second ?? 0);
  return !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() < now.getTime();
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
