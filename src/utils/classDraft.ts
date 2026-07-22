import type { ClassDraft } from '../types/class';

export const CLASS_DRAFT_KEY = 'oneclick-class-draft';
const CLASS_PREVIEW_KEY = 'oneclick-class-preview';

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
  try {
    sessionStorage.setItem(CLASS_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    sessionStorage.setItem(CLASS_DRAFT_KEY, JSON.stringify({ ...draft, thumbnail: '' }));
  }
}

export function clearClassDraft() {
  sessionStorage.removeItem(CLASS_DRAFT_KEY);
}

export function saveClassPreview(id: string, draft: ClassDraft) {
  try {
    localStorage.setItem(`${CLASS_PREVIEW_KEY}:${id}`, JSON.stringify(draft));
  } catch {
    localStorage.setItem(`${CLASS_PREVIEW_KEY}:${id}`, JSON.stringify({ ...draft, thumbnail: '' }));
  }
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
