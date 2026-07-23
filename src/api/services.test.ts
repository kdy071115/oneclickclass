import { beforeEach, describe, expect, it } from 'vitest';
import {
  applicantService,
  attendanceService,
  certificateService,
  classService,
  detailService,
  examService,
  surveyService,
} from './services';
import { initialClassDraft } from '../constants/classDraft';

describe('instructor mock services', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('restores a course that still has curriculum data', async () => {
    localStorage.setItem(
      'oneclick.curriculum.recovered-course',
      JSON.stringify([
        {
          id: 'section-1',
          title: '첫 섹션',
          lessons: [
            {
              id: 'lesson-1',
              title: '첫 강의',
              description: '복구된 강의',
              durationMinutes: 20,
              published: true,
              contentType: 'video',
              contentUrl: '',
              preview: false,
            },
          ],
        },
      ]),
    );

    await expect(classService.list()).resolves.toContainEqual(
      expect.objectContaining({ id: 'recovered-course' }),
    );
    await expect(detailService.getClass('recovered-course')).resolves.toMatchObject({
      title: '제목 없는 클래스',
      rating: 0,
      reviewCount: 0,
      sessions: 1,
      curriculum: [expect.objectContaining({ id: 'lesson-1', title: '첫 강의' })],
    });
  });

  it('does not substitute another applicant when an id is missing', async () => {
    await expect(applicantService.get('missing-applicant')).rejects.toThrow(
      'applicant not found',
    );
  });

  it('keeps applicants scoped to their course', async () => {
    await expect(applicantService.listByClass('notion')).resolves.toHaveLength(2);
    await expect(applicantService.listByClass('unknown-course')).resolves.toEqual([]);
  });

  it('applies saved detail only to its own course', async () => {
    localStorage.setItem(
      'oneclick-class-preview:custom-course',
      JSON.stringify({
        _schemaVersion: 2,
        type: 'offline',
        title: '직접 만든 강의',
        summary: '직접 입력한 소개',
        address: '서울 마포구 새 주소 1',
      }),
    );

    await expect(detailService.getClass('custom-course')).resolves.toMatchObject({
      title: '직접 만든 강의',
      summary: '직접 입력한 소개',
      location: '서울 마포구 새 주소 1',
      rating: 0,
    });
  });

  it('persists capacity and visibility settings in the course detail', async () => {
    await classService.updateSettings('notion', {
      capacity: 40,
      publicOn: false,
      recruitmentClosed: true,
    });

    await expect(detailService.getClass('notion')).resolves.toMatchObject({
      capacity: 40,
      publicOn: false,
      recruitmentClosed: true,
    });
  });

  it('creates a course privately and marks it public only after publishing', async () => {
    const created = await classService.create({
      ...initialClassDraft,
      title: '새 강의',
      startDate: '2026-08-01',
    });

    expect(created).toMatchObject({
      courseActiveSeq: created.id,
      status: '준비중',
      lifecycleStatus: 'DRAFT',
    });
    expect(created.courseMasterSeq).toBeTruthy();
    await expect(detailService.getClass(created.id)).resolves.toMatchObject({
      publicOn: false,
      status: '준비중',
    });
    await classService.publish(created.id);
    await expect(detailService.getClass(created.id)).resolves.toMatchObject({
      publicOn: true,
      status: '모집중',
      lifecycleStatus: 'RECRUITING',
    });
  });

  it('updates payment state for an enrolled learner', async () => {
    localStorage.setItem(
      'oneclick.enrollment.enrolled-course',
      JSON.stringify({
        courseApplySeq: 'apply-1',
        learnerName: '김수강',
        applyStatusCd: 'APPLY_STATUS::004',
      }),
    );

    const updated = await applicantService.updatePayment(
      'apply-1',
      { payment: '결제완료' },
      'enrolled-course',
    );

    expect(updated.payment).toBe('결제완료');
    expect(JSON.parse(localStorage.getItem('oneclick.enrollment.enrolled-course') || '{}')).toMatchObject(
      { applyStatusCd: 'APPLY_STATUS::002' },
    );
  });

  it('keeps surveys and exams scoped to the course that created them', async () => {
    await expect(surveyService.list('new-course')).resolves.toEqual([]);

    await surveyService.create('new-course', { title: '첫 설문', questions: [{ id: 1 }] });
    await examService.create('new-course', {
      title: '첫 시험',
      questions: [{ id: 1 }, { id: 2 }],
      passScore: 80,
    });

    await expect(surveyService.list('new-course')).resolves.toEqual([
      expect.objectContaining({ type: '시험', title: '첫 시험', meta: '2문항 · 80점 이상 통과' }),
      expect.objectContaining({ type: '설문', title: '첫 설문', meta: '1문항 · 익명' }),
    ]);
    await expect(surveyService.list('other-course')).resolves.toEqual([]);
  });

  it('uses only the selected course applicants for attendance and certificates', async () => {
    await expect(attendanceService.checkins('unknown-course')).resolves.toEqual([]);
    await expect(certificateService.recipients('notion')).resolves.toHaveLength(2);
    await expect(certificateService.recipients('unknown-course')).resolves.toEqual([]);
  });
});
