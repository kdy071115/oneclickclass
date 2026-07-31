import { describe, expect, it } from 'vitest';
import {
  combineClassSchedule,
  formatClassSchedule,
  isValidYouTubeUrl,
  scheduleDateValue,
  scheduleTimeValue,
} from './classCreation';

describe('isValidYouTubeUrl', () => {
  it('YouTube 영상 주소만 허용한다', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE')).toBe(true);
    expect(isValidYouTubeUrl('https://youtu.be/M7lc1UVf-VE')).toBe(true);
    expect(isValidYouTubeUrl('https://example.com/watch?v=M7lc1UVf-VE')).toBe(false);
    expect(isValidYouTubeUrl('youtube.com/watch?v=M7lc1UVf-VE')).toBe(false);
  });
});

describe('class schedule helpers', () => {
  it('저장된 날짜와 ISO 일정에서 날짜 입력값을 추출한다', () => {
    expect(scheduleDateValue('2026-08-01')).toBe('2026-08-01');
    expect(scheduleDateValue('2026-08-01T14:30')).toBe('2026-08-01');
    expect(scheduleDateValue('2026-02-30')).toBe('');
    expect(scheduleDateValue('8월 1일')).toBe('');
  });

  it('시간이 포함된 ISO 일정에서 시간 입력값을 추출한다', () => {
    expect(scheduleTimeValue('2026-08-01T04:05')).toBe('04:05');
    expect(scheduleTimeValue('2026-08-01T23:59:30+09:00')).toBe('23:59');
    expect(scheduleTimeValue('2026-08-01')).toBe('');
    expect(scheduleTimeValue('2026-08-01T24:00')).toBe('');
  });

  it('날짜와 시간이 모두 있으면 ISO 일정으로 결합한다', () => {
    expect(combineClassSchedule('2026-08-01', '14:30')).toBe('2026-08-01T14:30');
    expect(combineClassSchedule('2026-08-01', '')).toBe('2026-08-01');
    expect(combineClassSchedule('', '14:30')).toBe('');
    expect(combineClassSchedule('2026-02-30', '14:30')).toBe('');
  });

  it('유효한 일정을 한국어 표시값으로 변환한다', () => {
    expect(formatClassSchedule('2026-08-01')).toBe('2026년 8월 1일');
    expect(formatClassSchedule('2026-08-01T14:30')).toBe('2026년 8월 1일 오후 2:30');
    expect(formatClassSchedule('2026-08-01T00:30:00Z')).toBe(
      '2026년 8월 1일 오전 9:30',
    );
  });

  it('빈 일정과 해석할 수 없는 표시값을 안전하게 유지한다', () => {
    expect(formatClassSchedule('')).toBe('일정 미정');
    expect(formatClassSchedule('   ')).toBe('일정 미정');
    expect(formatClassSchedule('8월 중 오픈')).toBe('8월 중 오픈');
    expect(formatClassSchedule('2026-02-30')).toBe('2026-02-30');
  });
});
