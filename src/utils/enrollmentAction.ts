import type { OneClickEnrollment } from '../api/oneclick';

type EnrollmentState = Pick<OneClickEnrollment, 'accessReason' | 'canLearn' | 'progress'>;

type EnrollmentActionInput = {
  applicationStarted: boolean;
  enrollment?: EnrollmentState | null;
  existingChecked: boolean;
  hasPlayableLesson: boolean;
  hasShare: boolean;
  priceText: string;
};

export const getEnrollmentAction = ({
  applicationStarted,
  enrollment,
  existingChecked,
  hasPlayableLesson,
  hasShare,
  priceText,
}: EnrollmentActionInput) => {
  if (!hasShare || !existingChecked) {
    return {
      disabled: true,
      label: '신청 상태',
      text: '신청 정보 확인 중...',
      value: '확인 중',
    };
  }
  if (enrollment?.canLearn) {
    if (!hasPlayableLesson) {
      return {
        disabled: false,
        label: '강의 상태',
        text: '강의 준비 현황 보기',
        value: '준비 중',
      };
    }
    return {
      disabled: false,
      label: '수강 진행률',
      text: '바로 이어보기',
      value: `${Math.round(Math.max(0, Math.min(100, enrollment.progress)))}%`,
    };
  }
  if (enrollment) {
    const pendingPayment = enrollment.accessReason === 'AWAITING_PAYMENT';
    return {
      disabled: false,
      label: pendingPayment ? '결제 상태' : '신청 상태',
      text: '신청 상태 확인하기',
      value: pendingPayment
        ? '결제 대기'
        : enrollment.accessReason === 'AWAITING_APPROVAL'
          ? '승인 대기'
          : '확인 필요',
    };
  }
  return {
    disabled: false,
    label: '수강료',
    text: applicationStarted ? '신청서로 돌아가기' : '신청하기',
    value: priceText,
  };
};
