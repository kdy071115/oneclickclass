import type { ClassDraft } from '../types/class';

export const classCreationFlowSteps = [
  {
    label: '진행 방식',
    title: '어떤 방식으로 클래스를 진행하시나요?',
    description: '진행 방식에 따라 필요한 정보를 알맞게 준비해 드릴게요.',
  },
  {
    label: '자료 추가',
    title: '어떤 자료로 클래스를 만들까요?',
    description: '링크나 파일을 추가하면 AI가 모든 자료를 함께 분석해요.',
  },
  {
    label: '미리보기',
    title: 'AI가 클래스를 준비했어요',
    description: '그대로 게시하거나, 바꾸고 싶은 부분만 이 화면에서 수정하세요.',
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
    detail: 'YouTube, Vimeo 또는 강의 영상 파일 활용',
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

export const classCreationDefaults = {
  lessonDurationMinutes: 30,
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

export const classExampleContent: Record<
  Exclude<ClassDraft['type'], 'hybrid'>,
  Pick<ClassDraft, 'title' | 'summary' | 'description'>
> = {
  online: {
    title: '처음 시작하는 React 웹 개발',
    summary: 'React의 핵심 개념부터 실제 웹페이지 제작까지 차근차근 배우는 입문 클래스입니다.',
    description:
      '## 이런 분께 추천해요\n- React를 처음 배우는 입문자\n- 따라 하며 웹페이지를 완성하고 싶은 분\n\n## 배우는 내용\n- 컴포넌트와 Props로 화면 구성하기\n- State와 이벤트로 상호작용 만들기\n- 작은 웹 애플리케이션 완성하기\n\n## 완성 결과\n수업을 마치면 배운 개념을 활용해 간단한 React 웹 애플리케이션을 직접 만들 수 있습니다.',
  },
  live: {
    title: '실시간으로 완성하는 나만의 포트폴리오',
    summary: '현업 디자이너와 함께 내 강점을 보여 주는 포트폴리오를 완성하는 라이브 클래스입니다.',
    description:
      '## 이런 분께 추천해요\n- 포트폴리오의 흐름을 잡기 어려운 분\n- 프로젝트 설명에 현업 피드백이 필요한 분\n\n## 함께 완성해요\n- 나의 강점과 지원 목표 정리하기\n- 핵심 프로젝트의 문제와 해결 과정 다듬기\n- 실시간 피드백으로 최종 구성 완성하기\n\n## 완성 결과\n수업이 끝나면 바로 지원에 활용할 수 있는 한 편의 포트폴리오가 완성됩니다.',
  },
  offline: {
    title: '나만의 향수 만들기 원데이 클래스',
    summary: '좋아하는 향을 조합해 세상에 하나뿐인 향수를 만들어 보는 오프라인 클래스입니다.',
    description:
      '## 이런 분께 추천해요\n- 나에게 어울리는 향을 직접 찾고 싶은 분\n- 조향을 부담 없이 경험해 보고 싶은 분\n\n## 진행 순서\n- 향의 기본 구조와 조향 방법 익히기\n- 여러 향료를 직접 시향하고 조합하기\n- 나만의 레시피로 30ml 향수 완성하기\n\n## 완성 결과\n직접 만든 향수는 수업 당일 포장해 가져갈 수 있습니다.',
  },
};
