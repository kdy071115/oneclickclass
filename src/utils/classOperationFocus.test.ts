import { describe, expect, it } from 'vitest';
import { getClassOperationFocus } from './classOperationFocus';

const base = {
  id: 'class-1',
  status: '모집중' as const,
  publicOn: true,
  publishedLessons: 2,
  enrolled: 3,
  capacity: 10,
  recruitEndDate: '8월 10일',
  supportsAttendance: false,
  sharePath: '/s/class-1',
};

describe('getClassOperationFocus', () => {
  it('guides an unfinished class to its first lesson', () => {
    const focus = getClassOperationFocus({ ...base, publishedLessons: 0 });

    expect(focus.kind).toBe('prepare');
    expect(focus.primary.to).toContain('/curriculum?setup=1');
  });

  it('guides a ready private class to publication settings', () => {
    const focus = getClassOperationFocus({
      ...base,
      lifecycleStatus: 'READY',
      publicOn: false,
    });

    expect(focus.kind).toBe('publish');
    expect(focus.primary.to).toBe('/classes/class-1/manage');
  });

  it('prioritizes applicants while recruiting', () => {
    const focus = getClassOperationFocus({ ...base, lifecycleStatus: 'RECRUITING' });

    expect(focus.kind).toBe('recruit');
    expect(focus.primary.label).toBe('신청자 확인');
    expect(focus.description).toContain('7자리가 남았어요');
  });

  it('prioritizes applicants when a ready class is already public', () => {
    const focus = getClassOperationFocus({ ...base, lifecycleStatus: 'READY' });

    expect(focus.kind).toBe('recruit');
    expect(focus.primary.label).toBe('신청자 확인');
  });

  it('does not tell a full class to continue recruiting', () => {
    const focus = getClassOperationFocus({
      ...base,
      status: '모집 마감',
      enrolled: 10,
    });

    expect(focus.title).toBe('정원 10명이 모두 찼어요');
    expect(focus.primary.label).toBe('신청자 확인');
  });

  it('uses attendance as the primary action for an offline class in progress', () => {
    const focus = getClassOperationFocus({
      ...base,
      lifecycleStatus: 'IN_PROGRESS',
      status: '진행중',
      supportsAttendance: true,
    });

    expect(focus.kind).toBe('operate');
    expect(focus.primary.to).toBe('/classes/class-1/attendance');
  });

  it('guides an ended class to certificate issuance', () => {
    const focus = getClassOperationFocus({
      ...base,
      lifecycleStatus: 'ENDED',
      status: '종료',
    });

    expect(focus.kind).toBe('complete');
    expect(focus.primary.to).toBe('/classes/class-1/certificates');
  });
});
