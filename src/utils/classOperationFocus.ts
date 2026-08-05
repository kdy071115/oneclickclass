import type { ClassLifecycleStatus, ClassStatus } from '../types/class';

export type ClassOperationFocusKind = 'prepare' | 'publish' | 'recruit' | 'operate' | 'complete';

export interface ClassOperationFocus {
  kind: ClassOperationFocusKind;
  title: string;
  description: string;
  primary: { label: string; to: string };
  secondary: { label: string; to: string };
}

interface ClassOperationContext {
  id: string;
  lifecycleStatus?: ClassLifecycleStatus;
  status: ClassStatus;
  publicOn?: boolean;
  publishedLessons: number;
  enrolled: number;
  supportsAttendance: boolean;
  sharePath: string;
}

export function getClassOperationFocus({
  id,
  lifecycleStatus,
  status,
  publicOn,
  publishedLessons,
  enrolled,
  supportsAttendance,
  sharePath,
}: ClassOperationContext): ClassOperationFocus {
  if (lifecycleStatus === 'ENDED' || status === '종료') {
    return {
      kind: 'complete',
      title: '수료 기준을 확인하고 운영을 마무리하세요',
      description: '발급 대상을 확인하고 수강생 후기를 다음 강의에 활용할 수 있어요.',
      primary: { label: '수료증 발급', to: `/classes/${id}/certificates` },
      secondary: { label: '후기 확인', to: `/classes/${id}/survey` },
    };
  }

  if (lifecycleStatus === 'IN_PROGRESS' || status === '진행중') {
    return {
      kind: 'operate',
      title: supportsAttendance ? '오늘 운영할 회차를 확인하세요' : '수강 현황을 확인하세요',
      description: supportsAttendance
        ? '출석 현황과 수강생 진행 상황을 확인할 차례예요.'
        : '수강생 현황과 공개된 차시를 확인해 학습 흐름을 관리하세요.',
      primary: {
        label: supportsAttendance ? '출석 관리' : '수강생 확인',
        to: supportsAttendance ? `/classes/${id}/attendance` : `/classes/${id}/applicants`,
      },
      secondary: { label: '커리큘럼 확인', to: `/classes/${id}/curriculum` },
    };
  }

  if (publishedLessons === 0 || lifecycleStatus === 'DRAFT' || lifecycleStatus === 'CURRICULUM') {
    return {
      kind: 'prepare',
      title: '첫 차시를 등록해 강의를 준비하세요',
      description: '차시를 공개하면 신청 페이지를 열고 수강생을 모집할 수 있어요.',
      primary: { label: '첫 차시 등록', to: `/classes/${id}/curriculum?setup=1` },
      secondary: { label: '강의 정보 수정', to: `/classes/new?edit=${id}` },
    };
  }

  if (publicOn !== true || lifecycleStatus === 'READY') {
    return {
      kind: 'publish',
      title: '신청 페이지를 공개할 준비가 됐어요',
      description: '수강생 화면을 확인한 뒤 공개 상태와 모집 조건을 설정하세요.',
      primary: { label: '공개 설정 확인', to: `/classes/${id}/manage` },
      secondary: { label: '수강생 화면 미리보기', to: `/classes/${id}/preview` },
    };
  }

  return {
    kind: 'recruit',
    title: enrolled
      ? '신청자를 확인하고 모집을 이어가세요'
      : '신청 페이지를 확인하고 첫 수강생을 모집하세요',
    description: enrolled
      ? `${enrolled}명이 신청했어요. 남은 자리와 모집 마감일을 함께 확인하세요.`
      : '신청 페이지를 확인한 뒤 필요한 채널로 링크를 공유하세요.',
    primary: enrolled
      ? { label: '신청자 확인', to: `/classes/${id}/applicants` }
      : { label: '신청 페이지 확인', to: sharePath },
    secondary: { label: '모집 설정', to: `/classes/${id}/manage` },
  };
}
