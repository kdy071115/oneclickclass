import { beforeEach, describe, expect, it } from 'vitest';
import { detectContentProvider, oneclickService } from './oneclick';

describe('oneclick learner service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

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

  it('treats an unpublished zero-price share as free', async () => {
    const share = await oneclickService.share('new-free-course');
    expect(share.price).toBe(0);
    expect(share.paymentType).toBe('FREE');

    const enrollment = await oneclickService.apply(share.shareToken, {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
    });
    expect(enrollment.applyStatusCd).toBe('APPLY_STATUS::002');
  });

  it('detects supported video providers from the curriculum URL', () => {
    expect(detectContentProvider('https://youtu.be/abc123', 'video')).toBe('YOUTUBE');
    expect(detectContentProvider('https://vimeo.com/123456', 'video')).toBe('VIMEO');
    expect(detectContentProvider('https://cdn.example.com/video.mp4', 'video')).toBe('FILE');
    expect(detectContentProvider('https://meet.example.com/room', 'live')).toBe('LIVE');
  });

  it('requires the verification code before restoring a learner session', async () => {
    const verification = await oneclickService.requestVerification('notion', '010-1234-5678');
    await expect(
      oneclickService.continueWithPhone('notion', '010-1234-5678', '111111'),
    ).rejects.toThrow();
    await expect(
      oneclickService.continueWithPhone('notion', '010-1234-5678', verification.debugCode ?? ''),
    ).resolves.toMatchObject({ applyStatusCd: 'APPLY_STATUS::002' });
  });

  it('scores the learner exam from submitted answers', async () => {
    const questions = await oneclickService.examQuestions('notion');
    const result = await oneclickService.submitExam('notion', {
      [questions[0].id]: questions[0].answer ?? -1,
      [questions[1].id]: questions[1].answer ?? -1,
      [questions[2].id]: -1,
    });

    expect(result).toMatchObject({ correctCount: 2, totalCount: 3, score: 67, passed: false });
    await expect(oneclickService.examResult('notion')).resolves.toEqual(result);
  });

  it('uses the curriculum saved by the instructor in public and learner views', async () => {
    localStorage.setItem(
      'oneclick.curriculum.course-with-curriculum',
      JSON.stringify([
        {
          id: 'section-1',
          title: '기초 과정',
          lessons: [
            {
              id: 'lesson-1',
              title: '첫 강의',
              description: '연결된 커리큘럼',
              durationMinutes: 15,
              published: true,
              contentUrl: 'https://example.com/lesson.mp4',
            },
          ],
        },
      ]),
    );

    const share = await oneclickService.share('course-with-curriculum');
    expect(share.curriculum).toEqual([
      expect.objectContaining({ lessonId: 'lesson-1', title: '첫 강의', durationText: '15분' }),
    ]);

    await oneclickService.apply(share.shareToken, {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
    });
    const room = await oneclickService.learnRoom(share.courseActiveSeq);
    expect(room?.lessons[0]).toMatchObject({
      lessonId: 'lesson-1',
      contentUrl: 'https://example.com/lesson.mp4',
    });
  });

  it('does not inject demo lessons into a new course without curriculum', async () => {
    const share = await oneclickService.share('course-without-curriculum');
    await oneclickService.apply(share.shareToken, {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
    });

    await expect(oneclickService.learnRoom(share.courseActiveSeq)).resolves.toMatchObject({
      lessons: [],
      tools: { noticeCount: 0, resourceCount: 0, examCount: 0, surveyCount: 0 },
    });
  });

  it('keeps a notice read after the learner room is loaded again', async () => {
    const verification = await oneclickService.requestVerification('notion', '010-1234-5678');
    await oneclickService.continueWithPhone(
      'notion',
      '010-1234-5678',
      verification.debugCode ?? '',
    );

    await oneclickService.readNotice('notion', 'notice-1');
    const room = await oneclickService.learnRoom('notion');

    expect(room?.tools.noticeCount).toBe(0);
    expect(room?.notices[0].read).toBe(true);
  });

  it('updates the saved learner position from a playback heartbeat', async () => {
    localStorage.setItem(
      'oneclick.curriculum.heartbeat-course',
      JSON.stringify([
        {
          id: 'section-1',
          title: '테스트 과정',
          lessons: [
            {
              id: 'lesson-1',
              title: '테스트 강의',
              durationMinutes: 10,
              published: true,
              contentUrl: 'https://example.com/video.mp4',
            },
          ],
        },
      ]),
    );
    const enrollment = await oneclickService.apply('heartbeat-course', {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
    });

    await oneclickService.heartbeat('heartbeat-course', {
      courseApplySeq: enrollment.courseApplySeq,
      lessonId: 'lesson-1',
      currentSeconds: 87,
      durationSeconds: 300,
      playing: false,
    });

    await expect(oneclickService.enrollment('heartbeat-course')).resolves.toMatchObject({
      lastPosition: '1강 1분 27초',
      progress: 29,
    });
    await expect(oneclickService.learnRoom('heartbeat-course')).resolves.toMatchObject({
      progress: 29,
      lessons: [expect.objectContaining({ progress: 29, currentSeconds: 87 })],
    });

    await oneclickService.heartbeat('heartbeat-course', {
      courseApplySeq: enrollment.courseApplySeq,
      lessonId: 'lesson-1',
      currentSeconds: 30,
      durationSeconds: 300,
      playing: false,
    });

    await expect(oneclickService.learnRoom('heartbeat-course')).resolves.toMatchObject({
      progress: 29,
      lessons: [expect.objectContaining({ progress: 29, currentSeconds: 30 })],
    });
  });
});
