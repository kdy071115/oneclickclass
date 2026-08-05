import type { ClassDraft } from '../types/class';

export const CLASS_DRAFT_KEY = 'oneclick-class-draft';
const CLASS_PREVIEW_KEY = 'oneclick-class-preview';
const CLASS_PREVIEW_SCHEMA_VERSION = 2;

export type ClassPreviewPatch = Partial<ClassDraft> & { _schemaVersion?: number };

export function listClassPreviewIds() {
  const prefixes = [
    `${CLASS_PREVIEW_KEY}:`,
    'oneclick.curriculum.',
    'oneclick.enrollment.',
    'oneclick.class-settings.',
  ];
  const ids = new Set<string>();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    const prefix = prefixes.find((value) => key?.startsWith(value));
    if (key && prefix) ids.add(key.slice(prefix.length));
  }
  return [...ids];
}

export function loadClassDraft(fallback: ClassDraft) {
  try {
    const saved = sessionStorage.getItem(CLASS_DRAFT_KEY);
    return saved ? ({ ...fallback, ...JSON.parse(saved) } as ClassDraft) : fallback;
  } catch {
    return fallback;
  }
}

export function saveClassDraft(draft: ClassDraft) {
  sessionStorage.setItem(CLASS_DRAFT_KEY, JSON.stringify(draft));
}

export function clearClassDraft() {
  sessionStorage.removeItem(CLASS_DRAFT_KEY);
}

const classStorageKeys = (id: string) => [
  `${CLASS_PREVIEW_KEY}:${id}`,
  `oneclick.curriculum.${id}`,
  `oneclick.enrollment.${id}`,
  `oneclick.class-settings.${id}`,
  `oneclick.surveys.${id}`,
  `oneclick.certificate-policy.${id}`,
  `oneclick.certificate-issuances.${id}`,
  `oneclick.review.${id}`,
  `oneclick.course-bookmark.${id}`,
  `oneclick.exam-result.${id}`,
  `oneclick.class-thumbnail.${id}`,
];

const classStoragePrefixes = (id: string) => [
  `oneclick.verification.${id}.`,
  `oneclick.assessment.${id}.`,
  `oneclick.notice-read.${id}.`,
  `oneclick.lesson-progress.${id}.`,
];

function clearClassStorage(storage: Storage, id: string) {
  classStorageKeys(id).forEach((key) => storage.removeItem(key));
  const prefixes = classStoragePrefixes(id);
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) storage.removeItem(key);
  }
}

export function clearClassData(id: string) {
  clearClassStorage(localStorage, id);
  clearClassStorage(sessionStorage, id);
}

export function saveClassPreview(id: string, draft: ClassDraft) {
  const preview = { ...draft, _schemaVersion: CLASS_PREVIEW_SCHEMA_VERSION };
  localStorage.setItem(`${CLASS_PREVIEW_KEY}:${id}`, JSON.stringify(preview));
}

export function loadClassPreview(id: string, fallback: ClassDraft) {
  try {
    const key = `${CLASS_PREVIEW_KEY}:${id}`;
    const saved = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (saved && !localStorage.getItem(key)) localStorage.setItem(key, saved);
    return saved ? ({ ...fallback, ...JSON.parse(saved) } as ClassDraft) : fallback;
  } catch {
    return fallback;
  }
}

export function loadClassPreviewPatch(id: string): ClassPreviewPatch | undefined {
  try {
    const key = `${CLASS_PREVIEW_KEY}:${id}`;
    const saved = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!saved) return undefined;
    if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    return JSON.parse(saved) as ClassPreviewPatch;
  } catch {
    return undefined;
  }
}

export function hasClassPreview(id: string) {
  const key = `${CLASS_PREVIEW_KEY}:${id}`;
  return Boolean(localStorage.getItem(key) || sessionStorage.getItem(key));
}

export function hasClassData(id: string) {
  return (
    hasClassPreview(id) ||
    ['oneclick.curriculum.', 'oneclick.enrollment.', 'oneclick.class-settings.'].some((prefix) =>
      Boolean(localStorage.getItem(`${prefix}${id}`)),
    )
  );
}
