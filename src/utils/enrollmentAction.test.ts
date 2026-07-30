import { describe, expect, it } from 'vitest';
import { getEnrollmentAction } from './enrollmentAction';

const base = {
  applicationStarted: false,
  existingChecked: true,
  hasShare: true,
  priceText: '45,000원',
  showCurriculum: true,
};

describe('모바일 수강 CTA', () => {
  it('신청 전·수강 중·결제 대기 상태의 정보와 버튼을 함께 변경한다', () => {
    expect(getEnrollmentAction(base)).toMatchObject({
      label: '수강료',
      text: '신청하기',
      value: '45,000원',
    });
    expect(
      getEnrollmentAction({
        ...base,
        enrollment: { accessReason: 'AVAILABLE', canLearn: true, progress: 35 },
      }),
    ).toMatchObject({
      label: '수강 진행률',
      text: '바로 이어보기',
      value: '35%',
    });
    expect(
      getEnrollmentAction({
        ...base,
        enrollment: { accessReason: 'AWAITING_PAYMENT', canLearn: false, progress: 0 },
      }),
    ).toMatchObject({
      label: '결제 상태',
      text: '신청 상태 확인하기',
      value: '결제 대기',
    });
  });
});
