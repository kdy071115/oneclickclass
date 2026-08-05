import { describe, expect, it } from 'vitest';
import { getClassTiming } from './dashboard';

describe('getClassTiming', () => {
  it('수업 전에는 남은 시간과 준비 상태를 반환한다', () => {
    expect(getClassTiming('20:00', new Date(2026, 7, 5, 9, 15))).toEqual({
      canStartAttendance: false,
      label: '수업까지 10시간 45분',
    });
  });

  it('수업 시작 시간이 되면 출석을 시작할 수 있다', () => {
    expect(getClassTiming('20:00', new Date(2026, 7, 5, 20, 0))).toEqual({
      canStartAttendance: true,
      label: '수업 시작 시간 도달',
    });
  });

  it('잘못된 시간은 안전하게 처리한다', () => {
    expect(getClassTiming('25:00')).toEqual({
      canStartAttendance: false,
      label: '시작 시간 확인 필요',
    });
  });
});
