import type { ClassDraft } from '../types/class';

export const CLASS_DRAFT_KEY = 'oneclick-class-draft';
const CLASS_PREVIEW_KEY = 'oneclick-class-preview';

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
