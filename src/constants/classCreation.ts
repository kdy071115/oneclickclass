import type { ClassDraft } from '../types/class';

export const classCreationFlowSteps = [
  {
    label: '진행 방식',
    title: '어떤 방식으로 클래스를 진행하시나요?',
    description: '진행 방식에 따라 필요한 정보를 알맞게 준비해 드릴게요.',
  },
  {
    label: '클래스 정보',
    title: '클래스 정보를 준비해 볼까요?',
    description: '자료를 올리면 제목, 소개와 내용을 빠르게 준비해 드려요.',
  },
  {
    label: '세부 설정',
    title: '클래스 운영에 필요한 정보를 설정해 주세요',
    description: '진행 방식에 꼭 필요한 항목만 간단히 확인할게요.',
  },
  {
    label: '미리보기',
    title: '클래스가 이렇게 보여요',
    description: '수정하고 싶은 내용을 클릭해 바로 변경할 수 있어요.',
  },
  {
    label: '완료',
    title: '클래스가 완성되었습니다!',
    description: '이제 링크를 공유하면 누구나 클래스를 확인하고 신청할 수 있어요.',
  },
] as const;

export const classCreationSteps = classCreationFlowSteps.map(
  ({ title, description }) => [title, description] as const,
);

export const classTypeOptions = [
  {
    value: 'online',
    label: '온라인',
    description: '녹화 영상을 원하는 시간에 시청하는 클래스',
    detail: 'YouTube 영상 또는 강의 영상 활용',
  },
  {
    value: 'live',
    label: '라이브',
    description: '정해진 시간에 실시간으로 진행하는 클래스',
    detail: '온라인 실시간 수업 또는 웨비나',
  },
  {
    value: 'offline',
    label: '오프라인',
    description: '정해진 장소에서 직접 만나는 클래스',
    detail: '강의실, 스튜디오, 모임 공간 등',
  },
] as const satisfies readonly {
  value: Exclude<ClassDraft['type'], 'hybrid'>;
  label: string;
  description: string;
  detail: string;
}[];

export const classCreationLimits = {
  title: 50,
  summary: 200,
  price: 100_000_000,
  capacity: 10_000,
  thumbnailBytes: 5 * 1024 * 1024,
  videoBytes: 2 * 1024 * 1024 * 1024,
  documentBytes: 50 * 1024 * 1024,
} as const;

export const classCreationFileTypes = {
  video: {
    accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm',
    extensions: ['mp4', 'mov', 'webm'],
    label: 'MP4, MOV, WEBM',
  },
  document: {
    accept: '.pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.txt',
    extensions: ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt'],
    label: 'PDF, PPT, DOC, 이미지, TXT',
  },
} as const;

export const classThumbnailPositionOptions = [
  { value: 'top', label: '위쪽' },
  { value: 'center', label: '가운데' },
  { value: 'bottom', label: '아래쪽' },
] as const;

export const classExampleContent: Record<
  Exclude<ClassDraft['type'], 'hybrid'>,
  Pick<ClassDraft, 'title' | 'summary' | 'description'>
> = {
  online: {
    title: '처음 시작하는 React 웹 개발',
    summary: 'React의 핵심 개념부터 실제 웹페이지 제작까지 차근차근 배우는 입문 클래스입니다.',
    description:
      'React를 처음 접하는 학습자를 위해 컴포넌트, Props, State, 이벤트 처리 등 필수 개념을 실습 중심으로 설명합니다.\n\n강의를 마치면 간단한 웹 애플리케이션을 직접 만들 수 있습니다.',
  },
  live: {
    title: '실시간으로 완성하는 나만의 포트폴리오',
    summary: '현업 디자이너와 함께 내 강점을 보여 주는 포트폴리오를 완성하는 라이브 클래스입니다.',
    description:
      '좋은 사례를 함께 살펴보고, 실시간 피드백을 받으며 포트폴리오의 흐름과 핵심 프로젝트 설명을 다듬습니다.\n\n수업이 끝나면 바로 지원에 활용할 수 있는 한 편의 포트폴리오를 완성합니다.',
  },
  offline: {
    title: '나만의 향수 만들기 원데이 클래스',
    summary: '좋아하는 향을 조합해 세상에 하나뿐인 향수를 만들어 보는 오프라인 클래스입니다.',
    description:
      '향의 기본 구조와 조향 방법을 가볍게 익힌 뒤, 여러 향료를 직접 시향하고 나만의 레시피를 만듭니다.\n\n완성한 30ml 향수는 당일 포장해 가져갈 수 있습니다.',
  },
};
