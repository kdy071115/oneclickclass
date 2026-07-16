import type { ClassDraft } from '../types/class';

export const CLASS_DRAFT_KEY = 'oneclick-class-draft';

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
