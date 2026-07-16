import { describe, expect, it } from 'vitest';
import { getStatusTone } from './status';

describe('getStatusTone', () => {
  it.each([
    ['모집중', 'primary'],
    ['진행중', 'success'],
    ['결제대기', 'warning'],
    ['환불', 'danger'],
    ['결석', 'danger'],
    ['알 수 없음', 'neutral'],
  ])('%s 상태를 %s 톤으로 매핑한다', (status, tone) => {
    expect(getStatusTone(status)).toBe(tone);
  });
});
