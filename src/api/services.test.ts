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
      sessions: 1,
      curriculum: [expect.objectContaining({ id: 'lesson-1', title: '첫 강의' })],
    });
  });

  it('keeps applicants scoped to their course', async () => {
    await expect(applicantService.listByClass('notion')).resolves.toHaveLength(2);
    await expect(applicantService.listByClass('calligraphy')).resolves.toHaveLength(1);
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
    await expect(attendanceService.checkins('calligraphy')).resolves.toEqual([
      expect.objectContaining({ name: '이준호' }),
    ]);
    await expect(certificateService.recipients('notion')).resolves.toHaveLength(2);
    await expect(certificateService.recipients('calligraphy')).resolves.toEqual([
      expect.objectContaining({ name: '이준호' }),
    ]);
  });
});
