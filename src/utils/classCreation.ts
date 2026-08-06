import { classCreationDefaults, classCreationFileTypes } from '../constants/classCreation';
import type { CurriculumLesson } from '../types/class';
import { getYouTubeVideoId, isSupportedVideoProvider, type ContentProvider } from './content';

export { getYouTubeVideoId } from './content';

export type ClassSourceCurriculumInput = {
  kind: 'none' | 'video-url' | 'links' | 'video' | 'documents' | 'mixed';
  classTitle: string;
  classSummary: string;
  videoUrl?: string;
  videoTitle?: string;
  videoDurationSeconds?: number;
  links?: Array<{
    id?: string;
    url: string;
    title?: string;
    provider: ContentProvider;
    durationSeconds?: number;
  }>;
  materials: Array<{
    id?: string;
    name: string;
    url?: string;
    contentType?: 'video' | 'document';
    durationSeconds?: number;
  }>;
  sourceOrder?: string[];
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

  const sourceOrder = new Map(input.sourceOrder?.map((id, index) => [id, index]));
  const orderedSources = [
    ...(input.links ?? [])
      .filter((link) => link.provider !== 'SOCIAL')
      .map((value, fallbackIndex) => ({
        kind: 'link' as const,
        value,
        fallbackIndex,
      })),
    ...(input.kind === 'video' || input.kind === 'documents' || input.kind === 'mixed'
      ? input.materials
          .filter((material) => Boolean(material.url))
          .map((value, materialIndex) => ({
            kind: 'material' as const,
            value,
            fallbackIndex: (input.links?.length ?? 0) + materialIndex,
          }))
      : []),
  ].sort((left, right) => {
    const leftOrder = left.value.id ? sourceOrder.get(left.value.id) : undefined;
    const rightOrder = right.value.id ? sourceOrder.get(right.value.id) : undefined;
    if (leftOrder === undefined && rightOrder === undefined) {
      return left.fallbackIndex - right.fallbackIndex;
    }
    if (leftOrder === undefined) return 1;
    if (rightOrder === undefined) return -1;
    return leftOrder - rightOrder;
  });

  const lessons: Array<Omit<CurriculumLesson, 'id'>> = [];
  orderedSources.forEach((source) => {
    if (source.kind === 'link') {
      const link = source.value;
      const providerIsVideo = isSupportedVideoProvider(link.provider);
      lessons.push({
        ...common,
        title: link.title?.trim() || `${input.classTitle.trim()} ${lessons.length + 1}`,
        contentType: providerIsVideo ? 'video' : 'document',
        contentUrl: link.url,
        durationMinutes: sourceDurationMinutes(link.durationSeconds),
      });
      return;
    }
    const material = source.value;
    lessons.push({
      ...common,
      title: sourceTitle(material.name) || input.classTitle.trim(),
      contentType: material.contentType ?? (input.kind === 'video' ? 'video' : 'document'),
      contentUrl: material.url!,
      durationMinutes: sourceDurationMinutes(material.durationSeconds),
    });
  });
  if (input.kind === 'video-url' && input.videoUrl) {
    lessons.push({
      ...common,
      title: input.videoTitle?.trim() || input.classTitle.trim(),
      contentType: 'video',
      contentUrl: input.videoUrl,
      durationMinutes: sourceDurationMinutes(input.videoDurationSeconds),
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
