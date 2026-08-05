import { beforeEach, describe, expect, it } from 'vitest';
import { getClassThumbnail, saveClassThumbnail } from './classThumbnail';

describe('class thumbnail persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps a saved thumbnail available outside the current tab session', () => {
    saveClassThumbnail('course-1', 'https://cdn.example.com/course-1.webp');

    expect(localStorage.getItem('oneclick.class-thumbnail.course-1')).toBe(
      'https://cdn.example.com/course-1.webp',
    );
    expect(getClassThumbnail('course-1')).toBe('https://cdn.example.com/course-1.webp');
  });

  it('migrates an existing session thumbnail to persistent storage', () => {
    sessionStorage.setItem(
      'oneclick.class-thumbnail.course-1',
      'https://cdn.example.com/legacy.webp',
    );

    expect(getClassThumbnail('course-1')).toBe('https://cdn.example.com/legacy.webp');
    expect(localStorage.getItem('oneclick.class-thumbnail.course-1')).toBe(
      'https://cdn.example.com/legacy.webp',
    );
    expect(sessionStorage.getItem('oneclick.class-thumbnail.course-1')).toBeNull();
  });
});
