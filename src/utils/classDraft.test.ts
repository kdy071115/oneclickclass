import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialClassDraft } from '../constants/classDraft';
import {
  CLASS_DRAFT_KEY,
  loadClassDraft,
  loadClassPreview,
  saveClassDraft,
  saveClassPreview,
} from './classDraft';

describe('class draft persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('썸네일 URL과 초점 위치를 초안과 미리보기에 함께 저장한다', () => {
    const draft = {
      ...initialClassDraft,
      title: '저장 테스트',
      thumbnail: 'https://cdn.example.com/class.webp',
      thumbnailPosition: 'top' as const,
    };

    saveClassDraft(draft);
    saveClassPreview('course-1', draft);

    expect(loadClassDraft(initialClassDraft)).toMatchObject(draft);
    expect(loadClassPreview('course-1', initialClassDraft)).toMatchObject(draft);
  });

  it('저장소 오류가 발생하면 썸네일을 몰래 지우고 성공 처리하지 않는다', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      });

    expect(() => saveClassDraft(initialClassDraft)).toThrow('quota exceeded');
    expect(setItem).toHaveBeenCalledWith(CLASS_DRAFT_KEY, expect.any(String));
  });
});
