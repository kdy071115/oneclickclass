import { describe, expect, it } from 'vitest';
import type { OneClickLearnRoom, OneClickLesson } from '../api/oneclick';
import { getResumeLessonIndex, hasLessonContent, isPlayableLesson } from './learnerPlayback';

const lesson = (overrides: Partial<OneClickLesson> = {}): OneClickLesson => ({
  lessonId: 'lesson-1',
  title: '첫 차시',
  durationText: '30분',
  progress: 0,
  locked: false,
  completed: false,
  playable: true,
  contentProvider: 'YOUTUBE',
  contentUrl: 'https://www.youtube.com/watch?v=test',
  ...overrides,
});

const room = (lessons: OneClickLesson[], overrides: Partial<OneClickLearnRoom> = {}) =>
  ({
    memberSeq: 'member-1',
    courseApplySeq: 'apply-1',
    courseActiveSeq: 'course-1',
    learnerName: '수강생',
    applyStatusCd: 'APPLY_STATUS::002',
    applicationStatus: 'APPROVED',
    paymentStatus: 'NOT_REQUIRED',
    enrollmentStatus: 'AVAILABLE',
    canLearn: true,
    accessReason: 'AVAILABLE',
    progress: 0,
    lastPosition: '1강 0분 0초',
    courseTitle: '테스트 강의',
    courseSummary: '',
    lessons,
    tools: { noticeCount: 0, resourceCount: 0, examCount: 0, surveyCount: 0 },
    notices: [],
    resources: [],
    assessments: [],
    ...overrides,
  }) satisfies OneClickLearnRoom;

describe('수강생 이어보기 차시 선택', () => {
  it('콘텐츠가 없거나 잠긴 차시는 재생 가능하지 않다', () => {
    expect(hasLessonContent(lesson({ contentUrl: undefined }))).toBe(false);
    expect(isPlayableLesson(lesson({ locked: true }))).toBe(false);
  });

  it('저장된 차시가 재생 가능하면 해당 위치를 우선한다', () => {
    expect(
      getResumeLessonIndex(
        room([lesson(), lesson({ lessonId: 'lesson-2' })], { resumeLessonId: 'lesson-2' }),
      ),
    ).toBe(1);
  });

  it('저장된 차시가 준비 중이면 다음 재생 가능한 차시를 찾는다', () => {
    expect(
      getResumeLessonIndex(
        room(
          [
            lesson({ contentUrl: undefined }),
            lesson({ lessonId: 'lesson-2', currentSeconds: 120 }),
          ],
          { resumeLessonId: 'lesson-1' },
        ),
      ),
    ).toBe(1);
  });

  it('재생 가능한 차시가 없으면 잘못된 첫 차시 대신 -1을 반환한다', () => {
    expect(
      getResumeLessonIndex(
        room([
          lesson({ contentUrl: undefined }),
          lesson({ lessonId: 'lesson-2', playable: false }),
        ]),
      ),
    ).toBe(-1);
  });
});
