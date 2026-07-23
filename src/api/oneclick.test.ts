import { beforeEach, describe, expect, it } from 'vitest';
import {
  detectContentProvider,
  lx2ProgressMeasureToPercent,
  oneclickService,
} from './oneclick';

const verifiedApply = async (
  shareToken: string,
  input: Omit<Parameters<typeof oneclickService.apply>[1], 'verificationCode'>,
) => {
  const share = await oneclickService.share(shareToken);
  const verification = await oneclickService.requestVerification(share.courseActiveSeq, input.phone);
  return oneclickService.apply(shareToken, {
    ...input,
    verificationCode: verification.debugCode ?? '',
  });
};

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

    const enrollment = await verifiedApply(share.shareToken, {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
    });
    expect(enrollment).toMatchObject({
      applyStatusCd: 'APPLY_STATUS::002',
      applicationStatus: 'APPROVED',
      paymentStatus: 'NOT_REQUIRED',
      enrollmentStatus: 'AVAILABLE',
      canLearn: true,
      accessReason: 'AVAILABLE',
    });
  });

  it('keeps paid applications pending until payment completes', async () => {
    localStorage.setItem(
      'oneclick-class-preview:paid-course',
      JSON.stringify({
        _schemaVersion: 2,
        title: '유료 테스트 강의',
        payment: 'paid',
        price: 45000,
        capacity: 20,
      }),
    );
    const enrollment = await verifiedApply('paid-course', {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
      paymentConsent: true,
    });

    expect(enrollment).toMatchObject({
      applicationStatus: 'APPROVED',
      paymentStatus: 'PENDING',
      enrollmentStatus: 'PENDING',
      canLearn: false,
      accessReason: 'AWAITING_PAYMENT',
    });

    await expect(
      oneclickService.completePayment(enrollment.courseActiveSeq, enrollment.courseApplySeq),
    ).resolves.toMatchObject({
      paymentStatus: 'PAID',
      enrollmentStatus: 'AVAILABLE',
      canLearn: true,
      accessReason: 'AVAILABLE',
    });
  });

  it('uses only the saved information for a newly created learner share', async () => {
    localStorage.setItem(
      'oneclick-class-preview:custom-course',
      JSON.stringify({
        _schemaVersion: 2,
        title: '직접 만든 강의',
        type: 'online',
        summary: '직접 입력한 강의 소개',
        payment: 'paid',
        price: 30000,
        capacity: 10,
        startDate: '2026-08-09',
      }),
    );

    await expect(oneclickService.share('custom-course')).resolves.toMatchObject({
      title: '직접 만든 강의',
      summary: '직접 입력한 강의 소개',
      price: 30000,
      paymentType: 'PAID',
      scheduleText: '2026-08-09',
      capacity: 10,
    });
  });

  it('detects supported video providers from the curriculum URL', () => {
    expect(detectContentProvider('https://youtu.be/abc123', 'video')).toBe('YOUTUBE');
    expect(detectContentProvider('https://vimeo.com/123456', 'video')).toBe('VIMEO');
    expect(detectContentProvider('https://cdn.example.com/video.mp4', 'video')).toBe('FILE');
    expect(detectContentProvider('https://meet.example.com/room', 'live')).toBe('LIVE');
  });

  it('keeps LX2 lesson references and converts progressMeasure to percent', async () => {
    localStorage.setItem(
      'oneclick.enrollment.lx2-reference-course',
      JSON.stringify({
        memberSeq: '501',
        courseApplySeq: '8301',
        courseActiveSeq: 'lx2-reference-course',
        learnerName: '김수강',
        applyStatusCd: 'APPLY_STATUS::002',
        applicationStatus: 'APPROVED',
        paymentStatus: 'NOT_REQUIRED',
        enrollmentStatus: 'AVAILABLE',
        canLearn: true,
        accessReason: 'AVAILABLE',
        progress: 0,
        lastPosition: '1강 0분 0초',
      }),
    );
    localStorage.setItem(
      'oneclick.curriculum.lx2-reference-course',
      JSON.stringify([
        {
          id: 'organization-10',
          title: '기본 과정',
          lessons: [
            {
              id: 'lesson-20',
              organizationSeq: '10',
              itemSeq: '20',
              activeElementSeq: '30',
              contentsSeq: '40',
              title: 'LX2 차시',
              durationMinutes: 10,
              published: true,
              contentUrl: 'https://cdn.example.com/lesson.mp4',
            },
          ],
        },
      ]),
    );

    const room = await oneclickService.learnRoom('lx2-reference-course');
    expect(room?.lessons[0]).toMatchObject({
      lessonId: 'lesson-20',
      organizationSeq: '10',
      itemSeq: '20',
      activeElementSeq: '30',
      contentsSeq: '40',
    });
    expect(lx2ProgressMeasureToPercent(0.62)).toBe(62);
    expect(lx2ProgressMeasureToPercent(1.2)).toBe(100);
  });

  it('stores learner course bookmarks separately from course data', async () => {
    await expect(oneclickService.courseBookmark('bookmark-course')).resolves.toEqual({
      courseActiveSeq: 'bookmark-course',
      bookmarked: false,
    });
    await expect(oneclickService.saveCourseBookmark('bookmark-course')).resolves.toMatchObject({
      bookmarked: true,
    });
    await expect(oneclickService.courseBookmark('bookmark-course')).resolves.toMatchObject({
      bookmarked: true,
    });
    await expect(oneclickService.courseBookmarks()).resolves.toEqual([
      expect.objectContaining({ courseActiveSeq: 'bookmark-course' }),
    ]);
    await expect(oneclickService.removeCourseBookmark('bookmark-course')).resolves.toMatchObject({
      bookmarked: false,
    });
    await expect(oneclickService.courseBookmarks()).resolves.toEqual([]);
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
              markers: [
                {
                  id: 'marker-1',
                  timeSeconds: 15,
                  type: 'TEXT',
                  title: '핵심 개념',
                  content: '이 부분을 기억해 주세요.',
                },
              ],
            },
          ],
        },
      ]),
    );

    const share = await oneclickService.share('course-with-curriculum');
    expect(share.curriculum).toEqual([
      expect.objectContaining({ lessonId: 'lesson-1', title: '첫 강의', durationText: '15분' }),
    ]);

    await verifiedApply(share.shareToken, {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
    });
    const room = await oneclickService.learnRoom(share.courseActiveSeq);
    expect(room?.lessons[0]).toMatchObject({
      lessonId: 'lesson-1',
      contentUrl: 'https://example.com/lesson.mp4',
      markers: [expect.objectContaining({ id: 'marker-1', timeSeconds: 15, type: 'TEXT' })],
    });
  });

  it('maps the notion public token to the instructor course curriculum', async () => {
    localStorage.setItem(
      'oneclick.curriculum.notion',
      JSON.stringify([
        {
          id: 'section-1',
          title: '공개 과정',
          lessons: [
            {
              id: 'saved-lesson',
              title: '강의자가 저장한 차시',
              durationMinutes: 20,
              published: true,
              contentType: 'video',
              contentUrl: 'https://example.com/saved.mp4',
            },
          ],
        },
      ]),
    );

    await expect(oneclickService.share('notion-auto')).resolves.toMatchObject({
      courseActiveSeq: 'notion',
      curriculum: [expect.objectContaining({ lessonId: 'saved-lesson' })],
    });
  });

  it('does not inject demo lessons into a new course without curriculum', async () => {
    const share = await oneclickService.share('course-without-curriculum');
    await verifiedApply(share.shareToken, {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
    });

    await expect(oneclickService.learnRoom(share.courseActiveSeq)).resolves.toMatchObject({
      lessons: [],
      tools: { noticeCount: 0, resourceCount: 0, examCount: 0, surveyCount: 0 },
    });
  });

  it('keeps the YouTube demo lessons available after editing the demo course', async () => {
    localStorage.setItem(
      'oneclick-class-preview:notion',
      JSON.stringify({ title: '노션으로 시작하는 업무 자동화' }),
    );
    const verification = await oneclickService.requestVerification('notion', '010-1234-5678');
    await oneclickService.continueWithPhone(
      'notion',
      '010-1234-5678',
      verification.debugCode ?? '',
    );

    const room = await oneclickService.learnRoom('notion');
    expect(room?.lessons[0]).toMatchObject({
      contentProvider: 'YOUTUBE',
      contentUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      playable: true,
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
    const enrollment = await verifiedApply('heartbeat-course', {
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

    await oneclickService.heartbeat('heartbeat-course', {
      courseApplySeq: enrollment.courseApplySeq,
      lessonId: 'lesson-1',
      currentSeconds: 270,
      durationSeconds: 300,
      playing: false,
    });

    await expect(oneclickService.learnRoom('heartbeat-course')).resolves.toMatchObject({
      progress: 90,
      lessons: [expect.objectContaining({ progress: 90, completed: true })],
    });
  });

  it('unlocks a sequential lesson after the previous lesson is complete', async () => {
    localStorage.setItem(
      'oneclick.curriculum.sequential-course',
      JSON.stringify([
        {
          id: 'section-1',
          title: '순차 과정',
          lessons: [
            {
              id: 'lesson-1',
              title: '첫 강의',
              durationMinutes: 10,
              published: true,
              contentUrl: 'https://example.com/first.mp4',
            },
            {
              id: 'lesson-2',
              title: '두 번째 강의',
              durationMinutes: 10,
              published: true,
              sequential: true,
              contentUrl: 'https://example.com/second.mp4',
            },
          ],
        },
      ]),
    );
    const enrollment = await verifiedApply('sequential-course', {
      name: '김수강',
      phone: '010-1234-5678',
      privacyConsent: true,
    });

    await expect(oneclickService.learnRoom('sequential-course')).resolves.toMatchObject({
      lessons: [expect.objectContaining({ locked: false }), expect.objectContaining({ locked: true })],
    });

    await oneclickService.heartbeat('sequential-course', {
      courseApplySeq: enrollment.courseApplySeq,
      lessonId: 'lesson-1',
      currentSeconds: 100,
      durationSeconds: 100,
      playing: false,
    });

    await expect(oneclickService.learnRoom('sequential-course')).resolves.toMatchObject({
      lessons: [
        expect.objectContaining({ completed: true }),
        expect.objectContaining({ locked: false, playable: true }),
      ],
    });
  });
});
