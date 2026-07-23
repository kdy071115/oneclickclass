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
      sessions: 1,
      curriculum: [expect.objectContaining({ id: 'lesson-1', title: '첫 강의' })],
    });
  });

  it('keeps applicants scoped to their course', async () => {
    await expect(applicantService.listByClass('notion')).resolves.toHaveLength(2);
    await expect(applicantService.listByClass('calligraphy')).resolves.toHaveLength(1);
  });

  it('keeps each course detail content scoped to that course', async () => {
    await expect(detailService.getClass('calligraphy')).resolves.toMatchObject({
      title: '주말 원데이 캘리그라피 클래스',
      summary: expect.stringContaining('손글씨'),
      location: '서울 마포구 연남로 12',
    });
    await expect(detailService.getClass('photo')).resolves.toMatchObject({
      title: '스마트폰 사진 보정 클래스',
      summary: expect.stringContaining('사진'),
    });
  });

  it('does not let a partial saved draft replace canonical course detail', async () => {
    localStorage.setItem(
      'oneclick-class-preview:calligraphy',
      JSON.stringify({ title: '수정 중인 제목' }),
    );

    await expect(detailService.getClass('calligraphy')).resolves.toMatchObject({
      summary: expect.stringContaining('손글씨'),
      location: '서울 마포구 연남로 12',
      recruitEndDate: '8월 7일',
    });
  });

  it('applies a current saved draft to canonical course detail', async () => {
    localStorage.setItem(
      'oneclick-class-preview:calligraphy',
      JSON.stringify({
        _schemaVersion: 2,
        type: 'offline',
        summary: '수정한 캘리그라피 소개',
        address: '서울 마포구 새 주소 1',
      }),
    );

    await expect(detailService.getClass('calligraphy')).resolves.toMatchObject({
      summary: '수정한 캘리그라피 소개',
      location: '서울 마포구 새 주소 1',
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
    await expect(attendanceService.checkins('calligraphy')).resolves.toEqual([
      expect.objectContaining({ name: '이준호' }),
    ]);
    await expect(certificateService.recipients('notion')).resolves.toHaveLength(2);
    await expect(certificateService.recipients('calligraphy')).resolves.toEqual([
      expect.objectContaining({ name: '이준호' }),
    ]);
  });
});
