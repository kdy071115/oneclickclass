import { describe, expect, it } from 'vitest';
import { initialClassDraft } from '../constants/classDraft';
import { getPublishIssues } from './classReadiness';

describe('class publish readiness', () => {
  it('lists missing operating information and curriculum', () => {
    expect(getPublishIssues(initialClassDraft, []).map((issue) => issue.id)).toEqual([
      'title',
      'summary',
      'schedule',
      'lesson',
    ]);
  });

  it('accepts a complete course with a published playable lesson', () => {
    const issues = getPublishIssues(
      {
        ...initialClassDraft,
        title: '강의',
        summary: '한 줄 소개',
        startDate: '2026-08-01',
      },
      [
        {
          id: 'section-1',
          title: '시작하기',
          lessons: [
            {
              id: 'lesson-1',
              title: '첫 강의',
              description: '',
              contentType: 'video',
              contentUrl: 'https://youtu.be/abc123',
              durationMinutes: 30,
              preview: false,
              published: true,
            },
          ],
        },
      ],
    );
    expect(issues).toEqual([]);
  });
});
