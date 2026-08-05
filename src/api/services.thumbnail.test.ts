import { beforeEach, describe, expect, it } from 'vitest';
import { saveClassThumbnail } from '../utils/classThumbnail';
import { detailService } from './services';

describe('course detail thumbnail', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('restores the saved thumbnail and crop position', async () => {
    localStorage.setItem(
      'oneclick-class-preview:custom-course',
      JSON.stringify({
        _schemaVersion: 2,
        title: '썸네일 테스트 강의',
        thumbnailPosition: 'top',
      }),
    );
    saveClassThumbnail('custom-course', 'https://cdn.example.com/custom-course.webp');

    await expect(detailService.getClass('custom-course')).resolves.toMatchObject({
      thumbnail: 'https://cdn.example.com/custom-course.webp',
      thumbnailPosition: 'top',
    });
  });
});
