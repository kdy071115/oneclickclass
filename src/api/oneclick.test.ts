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
    const enrollment = await verifiedApply('calligraphy', {
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

  it('keeps canonical course information in the learner share', async () => {
    localStorage.setItem(
      'oneclick-class-preview:calligraphy',
      JSON.stringify({
        type: 'online',
        summary: '오래된 기본 소개',
        payment: 'free',
      }),
    );

    await expect(oneclickService.share('calligraphy')).resolves.toMatchObject({
      title: '주말 원데이 캘리그라피 클래스',
      summary: expect.stringContaining('손글씨'),
      price: 45000,
      paymentType: 'PAID',
      scheduleText: '8월 9일 · 토',
      locationText: '서울 마포구 연남로 12',
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
    await expect(oneclickService.removeCourseBookmark('bookmark-course')).resolves.toMatchObject({
      bookmarked: false,
    });
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

    await verifiedApply(share.shareToken, {
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
