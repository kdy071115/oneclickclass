import { beforeEach, describe, expect, it } from 'vitest';
import { oneclickService } from './oneclick';

describe('oneclick review service', () => {
  beforeEach(() => localStorage.clear());

  it('creates, lists, and removes one review per course', async () => {
    const saved = await oneclickService.saveReview('review-course', {
      courseApplySeq: 'apply-1',
      rating: 5,
      content: '실습 내용을 바로 적용할 수 있어서 좋았어요.',
    });

    expect(await oneclickService.myReview('review-course')).toEqual(saved);
    expect(await oneclickService.reviews('review-course')).toEqual([saved]);

    await oneclickService.removeReview('review-course');
    expect(await oneclickService.myReview('review-course')).toBeNull();
  });
});
