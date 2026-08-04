import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialClassDraft } from '../constants/classDraft';
import {
  CLASS_DRAFT_KEY,
  clearClassData,
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

  it('강의를 삭제하면 강의별 로컬 데이터도 함께 정리한다', () => {
    localStorage.setItem('oneclick-class-preview:course-1', '{}');
    localStorage.setItem('oneclick.curriculum.course-1', '[]');
    localStorage.setItem('oneclick.lesson-progress.course-1.lesson-1', '100');
    sessionStorage.setItem('oneclick.assessment.course-1.exam', 'done');
    sessionStorage.setItem('oneclick.class-thumbnail.course-1', 'data:image/png;base64,dGVzdA==');

    clearClassData('course-1');

    expect(localStorage.getItem('oneclick-class-preview:course-1')).toBeNull();
    expect(localStorage.getItem('oneclick.curriculum.course-1')).toBeNull();
    expect(localStorage.getItem('oneclick.lesson-progress.course-1.lesson-1')).toBeNull();
    expect(sessionStorage.getItem('oneclick.assessment.course-1.exam')).toBeNull();
    expect(sessionStorage.getItem('oneclick.class-thumbnail.course-1')).toBeNull();
  });
});
