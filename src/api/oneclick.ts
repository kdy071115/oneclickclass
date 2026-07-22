import { apiClient } from './client';
import { classes, examQuestions, surveyQuestions } from '../constants/mockData';
import { initialClassDraft } from '../constants/classDraft';
import { hasClassPreview, loadClassPreview } from '../utils/classDraft';
import type { ExamQuestion, SurveyQuestion } from '../types/class';

const mock = import.meta.env.VITE_USE_MOCK !== 'false';
const demoCourseIds = new Set(['notion', 'notion-auto', '104', '7KpX92Lm']);
const delay = <T>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 350));

export type OneClickShare = {
  shareToken: string;
  courseActiveSeq: string;
  courseMasterSeq?: string;
  title: string;
  summary: string;
  description: string;
  price: number;
  capacity: number;
  enrolled: number;
  applyStatus: 'OPEN' | 'CLOSED';
  paymentType: 'FREE' | 'PAID';
  instructorName: string;
  scheduleText: string;
  locationText: string;
  requiresApproval: boolean;
  difficulty: string;
  highlights: string[];
  curriculum: OneClickCurriculumItem[];
};

export type OneClickCurriculumItem = {
  lessonId: string;
  title: string;
  description: string;
  durationText: string;
  contentUrl?: string;
  contentProvider: OneClickContentProvider;
};

export type OneClickContentProvider =
  'FILE' | 'YOUTUBE' | 'VIMEO' | 'LIVE' | 'DOCUMENT' | 'ASSIGNMENT' | 'EXTERNAL';

export type OneClickEnrollment = {
  memberSeq: string;
  courseApplySeq: string;
  courseActiveSeq: string;
  shareToken?: string;
  learnerName: string;
  phone?: string;
  email?: string;
  applyStatusCd: 'APPLY_STATUS::001' | 'APPLY_STATUS::002' | 'APPLY_STATUS::004';
  progress: number;
  lastPosition: string;
};

export type OneClickLesson = {
  lessonId: string;
  title: string;
  description?: string;
  durationText: string;
  progress: number;
  locked: boolean;
  completed: boolean;
  playable: boolean;
  currentSeconds?: number;
  contentUrl?: string;
  contentProvider: OneClickContentProvider;
};

export type OneClickToolItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  actionLabel?: string;
  url?: string;
  read?: boolean;
};

export type OneClickAssessment = OneClickToolItem & {
  type: 'SURVEY' | 'EXAM';
  required: boolean;
  completed: boolean;
};

export type OneClickToolSummary = {
  noticeCount: number;
  resourceCount: number;
  examCount: number;
  surveyCount: number;
};

export type OneClickLearnRoom = OneClickEnrollment & {
  courseTitle: string;
  courseSummary: string;
  lessons: OneClickLesson[];
  tools: OneClickToolSummary;
  notices: OneClickToolItem[];
  resources: OneClickToolItem[];
  assessments: OneClickAssessment[];
};

export type OneClickExamResult = {
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
};

export type OneClickExamQuestion = Omit<ExamQuestion, 'answer'> & { answer?: number };

export type OneClickReview = {
  reviewSeq: string;
  courseActiveSeq: string;
  learnerName: string;
  rating: number;
  content: string;
  createdAt: string;
  mine?: boolean;
};

type OneClickApplyInput = {
  name: string;
  phone: string;
  email?: string;
  privacyConsent: boolean;
  paymentConsent?: boolean;
};

type OneClickHeartbeatInput = {
  courseApplySeq: string;
  lessonId: string;
  currentSeconds: number;
  durationSeconds?: number;
  playing: boolean;
};

type OneClickReviewInput = {
  courseApplySeq: string;
  rating: number;
  content: string;
};

export const canEnterLearnerRoom = (enrollment?: OneClickEnrollment | null) =>
  enrollment?.applyStatusCd === 'APPLY_STATUS::002';

export const isPaymentPending = (enrollment?: OneClickEnrollment | null) =>
  enrollment?.applyStatusCd === 'APPLY_STATUS::004';

export const isApprovalPending = (enrollment?: OneClickEnrollment | null) =>
  enrollment?.applyStatusCd === 'APPLY_STATUS::001';

const oneclickEnrollmentKey = (courseActiveSeq: string) => `oneclick.enrollment.${courseActiveSeq}`;
const oneclickReviewKey = (courseActiveSeq: string) => `oneclick.review.${courseActiveSeq}`;
const oneclickVerificationKey = (courseActiveSeq: string, phone: string) =>
  `oneclick.verification.${courseActiveSeq}.${phone.replace(/\D/g, '')}`;
const oneclickExamResultKey = (courseActiveSeq: string) =>
  `oneclick.exam-result.${courseActiveSeq}`;
const oneclickAssessmentKey = (courseActiveSeq: string, type: 'survey' | 'exam') =>
  `oneclick.assessment.${courseActiveSeq}.${type}`;
const oneclickNoticeReadKey = (courseActiveSeq: string, noticeId: string) =>
  `oneclick.notice-read.${courseActiveSeq}.${noticeId}`;
const oneclickLessonProgressKey = (courseActiveSeq: string, lessonId: string) =>
  `oneclick.lesson-progress.${courseActiveSeq}.${lessonId}`;
export const shareTokenFromCourseActiveSeq = (courseActiveSeq: string) =>
  courseActiveSeq === '104' ? '7KpX92Lm' : courseActiveSeq;

export const detectContentProvider = (
  contentUrl = '',
  contentType = 'video',
): OneClickContentProvider => {
  const type = contentType.toLowerCase();
  if (type.includes('live')) return 'LIVE';
  if (type.includes('document')) return 'DOCUMENT';
  if (type.includes('assignment')) return 'ASSIGNMENT';
  if (/youtu\.be|youtube\.com/i.test(contentUrl)) return 'YOUTUBE';
  if (/vimeo\.com/i.test(contentUrl)) return 'VIMEO';
  return type.includes('video') ? 'FILE' : 'EXTERNAL';
};

const normalizeStoredEnrollment = (
  enrollment: OneClickEnrollment,
  courseActiveSeq: string,
): OneClickEnrollment => ({
  ...enrollment,
  courseActiveSeq: enrollment.courseActiveSeq || courseActiveSeq,
  shareToken: enrollment.shareToken || shareTokenFromCourseActiveSeq(courseActiveSeq),
  learnerName: enrollment.learnerName || '수강생',
  applyStatusCd: enrollment.applyStatusCd || 'APPLY_STATUS::002',
  progress: Number.isFinite(enrollment.progress) ? enrollment.progress : 0,
  lastPosition: enrollment.lastPosition || '1강 0분 0초',
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const pickRecord = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (value && typeof value === 'object') return value as Record<string, unknown>;
  }
  return {};
};

const pickString = (source: Record<string, unknown>, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return fallback;
};

const pickNumber = (source: Record<string, unknown>, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
      return Number(value);
  }
  return fallback;
};

const pickBoolean = (source: Record<string, unknown>, keys: string[], fallback = false) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') return value;
    if (value === 'Y') return true;
    if (value === 'N') return false;
  }
  return fallback;
};

const firstArray = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value;
    const record = asRecord(value);
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.list)) return record.list;
    if (Array.isArray(record.resultList)) return record.resultList;
  }
  return [];
};

const stringArray = (source: Record<string, unknown>, keys: string[]) =>
  firstArray(source, keys)
    .map((item) =>
      typeof item === 'string' ? item : pickString(asRecord(item), ['text', 'title']),
    )
    .filter(Boolean);

const normalizeApplyStatus = (value: string): OneClickShare['applyStatus'] =>
  value === 'CLOSED' || value === 'N' || value.includes('CLOSE') ? 'CLOSED' : 'OPEN';

const normalizePaymentType = (price: number, value: string): OneClickShare['paymentType'] =>
  price > 0 || value === 'PAID' || value.includes('PAY') ? 'PAID' : 'FREE';

const mockShare = (shareToken: string): OneClickShare => {
  const classItem = classes[0];
  const draft = loadClassPreview(shareToken, initialClassDraft);
  const price = draft.payment === 'paid' ? draft.price : shareToken === 'notion-auto' ? 45000 : 0;
  const curriculum = mockCurriculum(shareToken);
  return {
    shareToken,
    courseActiveSeq:
      shareToken === '7KpX92Lm' ? '104' : shareToken === 'notion-auto' ? 'notion' : shareToken,
    courseMasterSeq: 'notion-master',
    title: draft.title || classItem.title,
    summary: draft.summary || '반복 업무를 자동화하는 실전 4주 과정',
    description:
      draft.description ||
      '데이터베이스 설계부터 반복 업무 자동화, 팀 협업 템플릿까지 직접 만들며 배웁니다.',
    price,
    capacity: draft.title ? draft.capacity : classItem.capacity,
    enrolled: draft.title ? 0 : classItem.enrolled,
    applyStatus: 'OPEN',
    paymentType: price > 0 ? 'PAID' : 'FREE',
    instructorName: '이지훈',
    scheduleText: draft.startDate || '자유 수강',
    locationText:
      draft.type === 'offline' || draft.type === 'hybrid'
        ? [draft.address, draft.detailedAddress].filter(Boolean).join(' ')
        : draft.url || '온라인 강의실',
    requiresApproval: false,
    difficulty: '초급',
    highlights: [
      '업무 흐름을 기준으로 데이터베이스를 설계해요.',
      '반복 업무를 버튼과 자동화 도구로 줄여요.',
      '팀원이 바로 쓸 수 있는 운영 템플릿을 완성해요.',
    ],
    curriculum,
  };
};

const mockCurriculum = (courseActiveSeq: string): OneClickCurriculumItem[] => {
  try {
    const saved = localStorage.getItem(`oneclick.curriculum.${courseActiveSeq}`);
    if (saved) {
      const sections = JSON.parse(saved) as Array<{
        lessons?: Array<{
          id?: string;
          title?: string;
          description?: string;
          durationMinutes?: number;
          published?: boolean;
          contentUrl?: string;
          contentType?: string;
        }>;
      }>;
      return sections.flatMap((section) =>
        (section.lessons ?? [])
          .filter((lesson) => lesson.published !== false)
          .map((lesson, index) => ({
            lessonId: lesson.id || String(index + 1),
            title: lesson.title || `${index + 1}강`,
            description: lesson.description || '',
            durationText: `${lesson.durationMinutes || 0}분`,
            contentUrl: lesson.contentUrl || '',
            contentProvider: detectContentProvider(lesson.contentUrl, lesson.contentType),
          })),
      );
    }
  } catch {
    // Invalid local mock data falls back to the demo curriculum.
  }
  return demoCourseIds.has(courseActiveSeq)
    ? fallbackLessons(0).map(({ lessonId, title, description = '', durationText }) => ({
        lessonId,
        title,
        description,
        durationText,
        contentProvider: 'FILE',
      }))
    : [];
};

const normalizeCurriculum = (
  source: Record<string, unknown>,
  fallback: OneClickCurriculumItem[],
) => {
  const list = firstArray(source, ['curriculum', 'lessons', 'elementList', 'listElement']);
  if (!list.length) return fallback;
  return list.map((item, index) => {
    const record = asRecord(item);
    return {
      lessonId: pickString(
        record,
        ['lessonId', 'activeElementSeq', 'seq', 'id'],
        String(index + 1),
      ),
      title: pickString(record, ['title', 'elementTitle', 'name'], `${index + 1}강`),
      description: pickString(record, ['description', 'summary', 'contents'], ''),
      durationText: pickString(
        record,
        ['durationText', 'studyTimeText', 'learningTimeText'],
        `${pickNumber(record, ['durationMinutes', 'studyTime', 'learningTime'], 0)}분`,
      ),
      contentUrl: pickString(record, ['contentUrl', 'videoUrl', 'mediaUrl', 'url'], ''),
      contentProvider: detectContentProvider(
        pickString(record, ['contentUrl', 'videoUrl', 'mediaUrl', 'url'], ''),
        pickString(record, ['contentProvider', 'contentType', 'elementType'], 'video'),
      ),
    };
  });
};

const normalizeShare = (raw: unknown, shareToken: string): OneClickShare => {
  const root = asRecord(raw);
  const fallback = mockShare(shareToken);
  const courseActive = pickRecord(root, ['courseActive', 'active', 'courseActiveVO']);
  const courseMaster = pickRecord(root, ['courseMaster', 'master']);
  const instructor = pickRecord(root, ['instructor', 'teacher', 'professor', 'member']);
  const merged = { ...root, ...courseMaster, ...courseActive };
  const price = pickNumber(
    merged,
    ['price', 'educationCost', 'tuition', 'coursePrice'],
    fallback.price,
  );
  return {
    shareToken: pickString(root, ['shareToken', 'token'], shareToken),
    courseActiveSeq: pickString(
      merged,
      ['courseActiveSeq', 'course_active_seq', 'activeSeq'],
      fallback.courseActiveSeq,
    ),
    courseMasterSeq: pickString(
      merged,
      ['courseMasterSeq', 'course_master_seq', 'masterSeq'],
      fallback.courseMasterSeq,
    ),
    title: pickString(
      merged,
      ['title', 'courseActiveTitle', 'courseMasterTitle', 'courseTitle'],
      fallback.title,
    ),
    summary: pickString(
      merged,
      ['summary', 'courseActiveSummary', 'courseSummary', 'subtitle'],
      fallback.summary,
    ),
    description: pickString(
      merged,
      ['description', 'courseActiveDescription', 'intro', 'contents'],
      fallback.description,
    ),
    price,
    capacity: pickNumber(
      merged,
      ['capacity', 'courseMemberCnt', 'limitCnt', 'recruitCnt'],
      fallback.capacity,
    ),
    enrolled: pickNumber(
      merged,
      ['enrolled', 'applyCnt', 'takeCnt', 'memberCnt'],
      fallback.enrolled,
    ),
    applyStatus: normalizeApplyStatus(
      pickString(merged, ['applyStatus', 'applyYn', 'recruitStatusCd'], 'OPEN'),
    ),
    paymentType: normalizePaymentType(
      price,
      pickString(merged, ['paymentType', 'paymentTypeCd', 'priceTypeCd'], ''),
    ),
    instructorName: pickString(
      instructor,
      ['instructorName', 'memberFullName', 'profName', 'name'],
      fallback.instructorName,
    ),
    scheduleText: pickString(
      merged,
      ['scheduleText', 'studyPeriodText', 'coursePeriodText', 'schedule'],
      fallback.scheduleText,
    ),
    locationText: pickString(
      merged,
      ['locationText', 'educationPlace', 'place', 'classroom'],
      fallback.locationText,
    ),
    requiresApproval: pickBoolean(
      merged,
      ['requiresApproval', 'approvalYn'],
      fallback.requiresApproval,
    ),
    difficulty: pickString(
      merged,
      ['difficulty', 'difficultyName', 'levelName'],
      fallback.difficulty,
    ),
    highlights: stringArray(merged, ['highlights', 'learningPoints', 'objectives']).length
      ? stringArray(merged, ['highlights', 'learningPoints', 'objectives'])
      : fallback.highlights,
    curriculum: normalizeCurriculum(merged, fallback.curriculum),
  };
};

const normalizeEnrollment = (
  raw: unknown,
  fallbackCourseActiveSeq: string,
  fallbackName = '수강생',
): OneClickEnrollment => {
  const root = asRecord(raw);
  const apply = pickRecord(root, ['apply', 'courseApply', 'courseApplyVO', 'enrollment']);
  const member = pickRecord(root, ['member', 'user', 'learner']);
  const merged = { ...root, ...apply };
  return {
    memberSeq: pickString({ ...merged, ...member }, ['memberSeq', 'userId', 'memberId'], ''),
    courseApplySeq: pickString(merged, ['courseApplySeq', 'enrollmentId', 'applySeq'], ''),
    courseActiveSeq: pickString(
      merged,
      ['courseActiveSeq', 'course_active_seq', 'activeSeq'],
      fallbackCourseActiveSeq,
    ),
    shareToken: pickString(
      merged,
      ['shareToken', 'share_token'],
      shareTokenFromCourseActiveSeq(fallbackCourseActiveSeq),
    ),
    learnerName: pickString(
      { ...member, ...merged },
      ['learnerName', 'memberFullName', 'name', 'memberName'],
      fallbackName,
    ),
    applyStatusCd: pickString(
      merged,
      ['applyStatusCd', 'applyStatus', 'status'],
      'APPLY_STATUS::002',
    ) as OneClickEnrollment['applyStatusCd'],
    progress: Math.min(
      100,
      Math.max(
        0,
        pickNumber(merged, ['progress', 'progressRate', 'totalProgress', 'appMyRateScore'], 0),
      ),
    ),
    lastPosition: pickString(
      merged,
      ['lastPosition', 'lastStudyPosition', 'resumeText'],
      '1강 0분 0초',
    ),
  };
};

const fallbackLessons = (progress = 62): OneClickLesson[] => {
  const lessonProgress = progress <= 0 ? [0, 0, 0] : [100, progress, 0];
  return [
    ['1', '업무 구조 잡기', '흩어진 업무를 수강생 상황에 맞게 정리합니다.', '42분'],
    ['2', '자동화 흐름 만들기', '반복 입력, 알림, 상태 변경을 자동화합니다.', '52분'],
    ['3', '팀 협업 템플릿 완성', '함께 쓰기 좋은 권한과 보드 구조를 만듭니다.', '48분'],
  ].map(([step, title, description, durationText], index) => ({
    lessonId: String(step),
    title: String(title),
    description: String(description),
    durationText: String(durationText),
    progress: lessonProgress[index],
    locked: index >= 2,
    completed: lessonProgress[index] >= 100,
    playable: index < 2,
    contentProvider: 'FILE',
  }));
};

const normalizeLessons = (raw: unknown): OneClickLesson[] => {
  const root = asRecord(raw);
  const list = firstArray(root, ['lessons', 'curriculum', 'elementList', 'listElement', 'list']);
  if (!list.length) return [];
  return list.map((item, index) => {
    const record = asRecord(item);
    const progress = Math.min(
      100,
      Math.max(
        0,
        pickNumber(
          record,
          ['progress', 'progressRate', 'rate', 'completeRate'],
          index === 0 ? 100 : 0,
        ),
      ),
    );
    const locked =
      pickBoolean(record, ['locked', 'lockYn'], false) ||
      pickString(record, ['useYn', 'playableYn'], 'Y') === 'N';
    const contentUrl = pickString(record, ['contentUrl', 'videoUrl', 'mediaUrl', 'url'], '');
    const contentProvider = detectContentProvider(
      contentUrl,
      pickString(record, ['contentProvider', 'contentType', 'elementType'], 'video'),
    );
    return {
      lessonId: pickString(
        record,
        ['lessonId', 'activeElementSeq', 'organizationSeq', 'itemSeq', 'seq'],
        String(index + 1),
      ),
      title: pickString(
        record,
        ['title', 'elementTitle', 'organizationTitle', 'itemTitle', 'name'],
        `${index + 1}강`,
      ),
      description: pickString(record, ['description', 'summary', 'contents'], ''),
      durationText: pickString(
        record,
        ['durationText', 'studyTimeText', 'learningTimeText'],
        `${pickNumber(record, ['durationMinutes', 'studyTime', 'learningTime'], 0)}분`,
      ),
      progress,
      locked,
      completed: pickBoolean(record, ['completed', 'completeYn'], progress >= 100),
      playable: !locked && Boolean(contentUrl),
      currentSeconds: pickNumber(record, ['currentSeconds', 'lastSeconds'], 0),
      contentUrl,
      contentProvider,
    };
  });
};

const normalizeToolItems = (
  raw: unknown,
  keys: string[],
  fallback: OneClickToolItem[] = [],
): OneClickToolItem[] => {
  const list = firstArray(asRecord(raw), keys);
  if (!list.length) return fallback;
  return list.map((item, index) => {
    const record = asRecord(item);
    return {
      id: pickString(record, ['id', 'seq', 'noticeSeq', 'resourceSeq'], String(index + 1)),
      label: pickString(record, ['label', 'typeName', 'fileType'], '안내'),
      title: pickString(record, ['title', 'name', 'subject'], '제목 없음'),
      description: pickString(record, ['description', 'content', 'contents'], ''),
      actionLabel: pickString(record, ['actionLabel'], ''),
      url: pickString(record, ['url', 'fileUrl', 'downloadUrl'], ''),
      read: pickBoolean(record, ['read', 'readYn'], false),
    };
  });
};

const defaultNotices: OneClickToolItem[] = [
  {
    id: 'notice-1',
    label: '필독',
    title: '수강 전 확인해 주세요',
    description: '강의 자료와 실습 파일은 각 강의 시작 전에 순서대로 열립니다.',
    actionLabel: '읽음 표시',
  },
];

const defaultResources: OneClickToolItem[] = [
  {
    id: 'resource-1',
    label: 'PDF',
    title: '1강 업무 구조 체크리스트',
    description: '강의 전에 현재 업무 흐름을 정리하는 자료입니다.',
    actionLabel: '열기',
  },
  {
    id: 'resource-2',
    label: '템플릿',
    title: '자동화 실습 템플릿',
    description: '2강에서 사용할 버튼, 알림, 상태 변경 예제입니다.',
    actionLabel: '다운로드',
  },
];

const normalizeAssessments = (raw: unknown, fallback: OneClickAssessment[] = []) => {
  const list = firstArray(asRecord(raw), ['assessments', 'assessmentList', 'surveyExamList']);
  if (!list.length) return fallback;
  return list.map((item, index) => {
    const record = asRecord(item);
    const type = pickString(record, ['type', 'assessmentType', 'paperType'], 'SURVEY');
    return {
      id: pickString(record, ['id', 'seq', 'paperSeq'], String(index + 1)),
      label: pickString(record, ['label'], type.includes('EXAM') ? '퀴즈' : '설문'),
      title: pickString(
        record,
        ['title', 'name'],
        type.includes('EXAM') ? '학습 확인' : '수강 설문',
      ),
      description: pickString(record, ['description', 'contents'], ''),
      actionLabel: pickString(record, ['actionLabel'], ''),
      type: type.includes('EXAM') ? ('EXAM' as const) : ('SURVEY' as const),
      required: pickBoolean(record, ['required', 'requiredYn'], false),
      completed: pickBoolean(record, ['completed', 'completeYn'], false),
    };
  });
};

const defaultAssessments: OneClickAssessment[] = [
  {
    id: 'survey-1',
    label: '필수',
    title: '수강 전 설문',
    description: '현재 업무 자동화 경험을 확인해 강의 예제를 추천해요.',
    type: 'SURVEY',
    required: true,
    completed: false,
  },
  {
    id: 'exam-1',
    label: '퀴즈',
    title: '1강 학습 확인',
    description: '업무 구조를 제대로 정리했는지 가볍게 확인합니다.',
    type: 'EXAM',
    required: false,
    completed: false,
  },
];

const normalizeTools = (raw: unknown): OneClickToolSummary => {
  const root = asRecord(raw);
  return {
    noticeCount: pickNumber(
      root,
      ['noticeCount', 'noticeCnt'],
      firstArray(root, ['noticeList', 'listNotice']).length,
    ),
    resourceCount: pickNumber(
      root,
      ['resourceCount', 'resourceCnt'],
      firstArray(root, ['resourceList', 'listResource']).length,
    ),
    examCount: pickNumber(
      root,
      ['examCount', 'examCnt'],
      firstArray(root, ['examList', 'listExamPaper']).length,
    ),
    surveyCount: pickNumber(
      root,
      ['surveyCount', 'surveyCnt'],
      firstArray(root, ['surveyList', 'listSurveyPaper']).length,
    ),
  };
};

const normalizeReview = (raw: unknown, courseActiveSeq: string): OneClickReview => {
  const record = asRecord(raw);
  return {
    reviewSeq: pickString(record, ['reviewSeq', 'courseReviewSeq', 'reviewId', 'seq'], ''),
    courseActiveSeq: pickString(record, ['courseActiveSeq', 'activeSeq'], courseActiveSeq),
    learnerName: pickString(record, ['learnerName', 'memberName', 'displayName', 'name'], '수강생'),
    rating: Math.min(5, Math.max(1, pickNumber(record, ['rating', 'score', 'reviewScore'], 5))),
    content: pickString(record, ['content', 'reviewContent', 'contents'], ''),
    createdAt: pickString(record, ['createdAt', 'regDttm', 'createDate'], ''),
    mine: pickBoolean(record, ['mine', 'myReviewYn'], false),
  };
};

const normalizeReviews = (raw: unknown, courseActiveSeq: string): OneClickReview[] => {
  const list = Array.isArray(raw)
    ? raw
    : firstArray(asRecord(raw), ['reviews', 'items', 'list', 'resultList']);
  return list.map((item) => normalizeReview(item, courseActiveSeq)).filter((item) => item.content);
};

const defaultReviews = (courseActiveSeq: string): OneClickReview[] => [
  {
    reviewSeq: 'sample-1',
    courseActiveSeq,
    learnerName: '김**',
    rating: 5,
    content:
      '실제 업무에 바로 활용할 수 있어서 좋았어요. 신청부터 수강까지 막히는 부분이 없었습니다.',
    createdAt: '2026.07.12',
  },
  {
    reviewSeq: 'sample-2',
    courseActiveSeq,
    learnerName: '이**',
    rating: 5,
    content: '예제가 구체적이고 설명이 쉬워서 초반 진입 장벽이 낮았어요.',
    createdAt: '2026.07.08',
  },
];

const normalizeLearnRoom = (raw: unknown, fallbackCourseActiveSeq: string): OneClickLearnRoom => {
  const root = asRecord(raw);
  const enrollment = normalizeEnrollment(raw, fallbackCourseActiveSeq);
  const share = normalizeShare(raw, fallbackCourseActiveSeq);
  return {
    ...enrollment,
    progress: enrollment.progress || pickNumber(root, ['appMyRateScore', 'totalProgress'], 0),
    courseTitle: pickString(root, ['courseTitle', 'courseActiveTitle'], share.title),
    courseSummary: pickString(root, ['courseSummary', 'summary'], share.summary),
    lessons: normalizeLessons(raw),
    tools: normalizeTools(raw),
    notices: normalizeToolItems(raw, ['notices', 'noticeList', 'listNotice']),
    resources: normalizeToolItems(raw, ['resources', 'resourceList', 'listResource']),
    assessments: normalizeAssessments(raw),
  };
};

export const oneclickService = {
  share: (shareToken: string): Promise<OneClickShare> =>
    mock
      ? delay(mockShare(shareToken))
      : apiClient
          .get<unknown>(`/oneclick/shares/${shareToken}`)
          .then((r) => normalizeShare(r.data, shareToken)),
  apply: (shareToken: string, input: OneClickApplyInput): Promise<OneClickEnrollment> => {
    if (!mock)
      return apiClient
        .post<unknown>(`/oneclick/shares/${shareToken}/apply`, input)
        .then((r) => normalizeEnrollment(r.data, '', input.name));
    const share = mockShare(shareToken);
    const enrollment = {
      memberSeq: crypto.randomUUID(),
      courseApplySeq: crypto.randomUUID(),
      courseActiveSeq: share.courseActiveSeq,
      shareToken: share.shareToken,
      learnerName: input.name,
      phone: input.phone,
      email: input.email,
      applyStatusCd: share.requiresApproval
        ? ('APPLY_STATUS::001' as const)
        : share.paymentType === 'PAID'
          ? ('APPLY_STATUS::004' as const)
          : ('APPLY_STATUS::002' as const),
      progress: 0,
      lastPosition: '1강 0분 0초',
    };
    localStorage.setItem(oneclickEnrollmentKey(share.courseActiveSeq), JSON.stringify(enrollment));
    return delay(enrollment);
  },
  enrollment: (courseActiveSeq: string): Promise<OneClickEnrollment | null> => {
    if (!mock)
      return apiClient
        .get<unknown>(`/oneclick/learn/${courseActiveSeq}`)
        .then((r) => normalizeEnrollment(r.data, courseActiveSeq))
        .catch(() => null);
    const value = localStorage.getItem(oneclickEnrollmentKey(courseActiveSeq));
    if (!value) return delay(null);
    const enrollment = JSON.parse(value) as OneClickEnrollment;
    return delay(normalizeStoredEnrollment(enrollment, courseActiveSeq));
  },
  refreshEnrollment: (courseActiveSeq: string): Promise<OneClickEnrollment | null> => {
    if (!mock)
      return apiClient
        .get<unknown>(`/oneclick/learn/${courseActiveSeq}`)
        .then((r) => normalizeEnrollment(r.data, courseActiveSeq))
        .catch(() => null);
    const value = localStorage.getItem(oneclickEnrollmentKey(courseActiveSeq));
    return delay(
      value
        ? normalizeStoredEnrollment(JSON.parse(value) as OneClickEnrollment, courseActiveSeq)
        : null,
    );
  },
  learnRoom: (courseActiveSeq: string): Promise<OneClickLearnRoom | null> => {
    if (!mock)
      return apiClient
        .get<unknown>(`/oneclick/learn/${courseActiveSeq}/room`)
        .then((r) => normalizeLearnRoom(r.data, courseActiveSeq))
        .catch(() => null);
    const value = localStorage.getItem(oneclickEnrollmentKey(courseActiveSeq));
    if (!value) return delay(null);
    const enrollment = normalizeStoredEnrollment(
      JSON.parse(value) as OneClickEnrollment,
      courseActiveSeq,
    );
    const hasPublishedDraft = hasClassPreview(courseActiveSeq);
    const savedCurriculum = localStorage.getItem(`oneclick.curriculum.${courseActiveSeq}`)
      ? mockCurriculum(courseActiveSeq)
      : [];
    const assessments = defaultAssessments.map((assessment) => ({
      ...assessment,
      completed:
        sessionStorage.getItem(
          oneclickAssessmentKey(courseActiveSeq, assessment.type === 'SURVEY' ? 'survey' : 'exam'),
        ) === 'done',
    }));
    const notices = defaultNotices.map((notice) => ({
      ...notice,
      read: localStorage.getItem(oneclickNoticeReadKey(courseActiveSeq, notice.id)) === 'done',
    }));
    const lessonStates = savedCurriculum.map((lesson) => {
      const stored = localStorage.getItem(
        oneclickLessonProgressKey(courseActiveSeq, lesson.lessonId),
      );
      return stored
        ? (JSON.parse(stored) as { currentSeconds: number; progress: number })
        : { currentSeconds: 0, progress: 0 };
    });
    const lessons = savedCurriculum.length
      ? savedCurriculum.map((lesson, index) => ({
          ...lesson,
          currentSeconds: lessonStates[index].currentSeconds,
          progress: lessonStates[index].progress,
          locked: index > 0 && lessonStates[index - 1].progress < 100,
          completed: lessonStates[index].progress >= 100,
          playable:
            Boolean(lesson.contentUrl) && (index === 0 || lessonStates[index - 1].progress >= 100),
        }))
      : demoCourseIds.has(courseActiveSeq) && !hasPublishedDraft
        ? fallbackLessons(enrollment.progress)
        : [];
    const lastLessonNumber = Number.parseInt(enrollment.lastPosition, 10);
    const totalProgress = savedCurriculum.length
      ? Math.round(
          lessonStates.reduce((total, lesson) => total + lesson.progress, 0) /
            savedCurriculum.length,
        )
      : enrollment.progress;
    return delay({
      ...enrollment,
      progress: totalProgress,
      lastPosition:
        lessons.length && lastLessonNumber > lessons.length
          ? '1강 0분 0초'
          : enrollment.lastPosition,
      courseActiveSeq: enrollment.courseActiveSeq || courseActiveSeq,
      courseTitle: mockShare(courseActiveSeq).title,
      courseSummary: mockShare(courseActiveSeq).summary,
      lessons,
      tools:
        demoCourseIds.has(courseActiveSeq) && !hasPublishedDraft
          ? {
              noticeCount: notices.filter((notice) => !notice.read).length,
              resourceCount: defaultResources.length,
              examCount: 1,
              surveyCount: 1,
            }
          : { noticeCount: 0, resourceCount: 0, examCount: 0, surveyCount: 0 },
      notices: demoCourseIds.has(courseActiveSeq) && !hasPublishedDraft ? notices : [],
      resources: demoCourseIds.has(courseActiveSeq) && !hasPublishedDraft ? defaultResources : [],
      assessments: demoCourseIds.has(courseActiveSeq) && !hasPublishedDraft ? assessments : [],
    });
  },
  requestVerification: (
    courseActiveSeq: string,
    phone: string,
  ): Promise<{ expiresAt: string; debugCode?: string }> => {
    if (!mock)
      return apiClient
        .post<{ expiresAt: string }>(`/oneclick/learn/${courseActiveSeq}/verification-codes`, {
          phone,
        })
        .then((r) => r.data);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    sessionStorage.setItem(
      oneclickVerificationKey(courseActiveSeq, phone),
      JSON.stringify({ code, expiresAt }),
    );
    return delay({ expiresAt, debugCode: code });
  },
  continueWithPhone: (
    courseActiveSeq: string,
    phone: string,
    verificationCode: string,
  ): Promise<OneClickEnrollment> => {
    if (!mock)
      return apiClient
        .post<unknown>(`/oneclick/learn/${courseActiveSeq}/continue`, { phone, verificationCode })
        .then((r) => normalizeEnrollment(r.data, courseActiveSeq));
    const value = sessionStorage.getItem(oneclickVerificationKey(courseActiveSeq, phone));
    const verification = value ? (JSON.parse(value) as { code: string; expiresAt: string }) : null;
    if (
      !verification ||
      verification.code !== verificationCode ||
      Date.parse(verification.expiresAt) < Date.now()
    ) {
      return Promise.reject(new Error('invalid verification code'));
    }
    sessionStorage.removeItem(oneclickVerificationKey(courseActiveSeq, phone));
    const enrollment = {
      memberSeq: crypto.randomUUID(),
      courseApplySeq: crypto.randomUUID(),
      courseActiveSeq,
      shareToken: shareTokenFromCourseActiveSeq(courseActiveSeq),
      learnerName: '수강생',
      applyStatusCd: 'APPLY_STATUS::002' as const,
      progress: 62,
      lastPosition: '2강 14분 27초',
    };
    localStorage.setItem(oneclickEnrollmentKey(courseActiveSeq), JSON.stringify(enrollment));
    return delay(enrollment);
  },
  surveyQuestions: (courseActiveSeq: string): Promise<SurveyQuestion[]> =>
    mock
      ? delay(surveyQuestions)
      : apiClient
          .get<SurveyQuestion[]>(`/oneclick/learn/${courseActiveSeq}/survey/questions`)
          .then((r) => r.data),
  submitSurvey: (
    courseActiveSeq: string,
    answers: Record<string, number | string>,
  ): Promise<void> => {
    if (!mock)
      return apiClient
        .post<void>(`/oneclick/learn/${courseActiveSeq}/survey/responses`, { answers })
        .then((r) => r.data);
    sessionStorage.setItem(oneclickAssessmentKey(courseActiveSeq, 'survey'), 'done');
    return delay(undefined);
  },
  examQuestions: (courseActiveSeq: string): Promise<OneClickExamQuestion[]> =>
    mock
      ? delay(examQuestions)
      : apiClient
          .get<OneClickExamQuestion[]>(`/oneclick/learn/${courseActiveSeq}/exam/questions`)
          .then((r) => r.data),
  submitExam: (
    courseActiveSeq: string,
    answers: Record<string, number>,
  ): Promise<OneClickExamResult> => {
    if (!mock)
      return apiClient
        .post<OneClickExamResult>(`/oneclick/learn/${courseActiveSeq}/exam/submissions`, {
          answers,
        })
        .then((r) => r.data);
    const correctCount = examQuestions.filter(
      (question) => answers[question.id] === question.answer,
    ).length;
    const result = {
      score: Math.round((correctCount / examQuestions.length) * 100),
      correctCount,
      totalCount: examQuestions.length,
      passed: correctCount / examQuestions.length >= 0.7,
    };
    sessionStorage.setItem(oneclickExamResultKey(courseActiveSeq), JSON.stringify(result));
    sessionStorage.setItem(oneclickAssessmentKey(courseActiveSeq, 'exam'), 'done');
    return delay(result);
  },
  examResult: (courseActiveSeq: string): Promise<OneClickExamResult | null> => {
    if (!mock)
      return apiClient
        .get<OneClickExamResult>(`/oneclick/learn/${courseActiveSeq}/exam/result`)
        .then((r) => r.data)
        .catch(() => null);
    const value = sessionStorage.getItem(oneclickExamResultKey(courseActiveSeq));
    return delay(value ? (JSON.parse(value) as OneClickExamResult) : null);
  },
  heartbeat: (courseActiveSeq: string, input: OneClickHeartbeatInput): Promise<void> => {
    if (mock) {
      const value = localStorage.getItem(oneclickEnrollmentKey(courseActiveSeq));
      if (value) {
        const enrollment = normalizeStoredEnrollment(
          JSON.parse(value) as OneClickEnrollment,
          courseActiveSeq,
        );
        const curriculum = mockCurriculum(courseActiveSeq);
        const lessonIndex = curriculum.findIndex((lesson) => lesson.lessonId === input.lessonId);
        const progressValue = localStorage.getItem(
          oneclickLessonProgressKey(courseActiveSeq, input.lessonId),
        );
        const previousProgress = progressValue
          ? (JSON.parse(progressValue) as { progress: number }).progress
          : 0;
        const measuredProgress = input.durationSeconds
          ? Math.min(100, Math.round((input.currentSeconds / input.durationSeconds) * 100))
          : previousProgress;
        const progress = Math.max(previousProgress, measuredProgress);
        localStorage.setItem(
          oneclickLessonProgressKey(courseActiveSeq, input.lessonId),
          JSON.stringify({ currentSeconds: input.currentSeconds, progress }),
        );
        const totalProgress = curriculum.length
          ? Math.round(
              curriculum.reduce((total, lesson) => {
                const stored = localStorage.getItem(
                  oneclickLessonProgressKey(courseActiveSeq, lesson.lessonId),
                );
                return total + (stored ? (JSON.parse(stored) as { progress: number }).progress : 0);
              }, 0) / curriculum.length,
            )
          : enrollment.progress;
        const minutes = Math.floor(input.currentSeconds / 60);
        const seconds = Math.floor(input.currentSeconds % 60);
        localStorage.setItem(
          oneclickEnrollmentKey(courseActiveSeq),
          JSON.stringify({
            ...enrollment,
            progress: totalProgress,
            lastPosition: `${Math.max(0, lessonIndex) + 1}강 ${minutes}분 ${seconds}초`,
          }),
        );
      }
      return delay(undefined);
    }
    return apiClient
      .post<void>(`/oneclick/learn/${courseActiveSeq}/heartbeat`, input)
      .then((r) => r.data);
  },
  readNotice: (courseActiveSeq: string, noticeId: string): Promise<void> => {
    if (!mock)
      return apiClient
        .post<void>(`/oneclick/learn/${courseActiveSeq}/notices/${noticeId}/read`)
        .then((r) => r.data);
    localStorage.setItem(oneclickNoticeReadKey(courseActiveSeq, noticeId), 'done');
    return delay(undefined);
  },
  reviews: (shareToken: string): Promise<OneClickReview[]> => {
    if (!mock)
      return apiClient
        .get<unknown>(`/oneclick/shares/${shareToken}/reviews`)
        .then((r) => normalizeReviews(r.data, ''));
    const courseActiveSeq = mockShare(shareToken).courseActiveSeq;
    const saved = localStorage.getItem(oneclickReviewKey(courseActiveSeq));
    const samples = demoCourseIds.has(shareToken) ? defaultReviews(courseActiveSeq) : [];
    return delay(saved ? [JSON.parse(saved) as OneClickReview, ...samples] : samples);
  },
  myReview: (courseActiveSeq: string): Promise<OneClickReview | null> => {
    if (!mock)
      return apiClient
        .get<unknown>(`/oneclick/learn/${courseActiveSeq}/review`)
        .then((r) => normalizeReview(r.data, courseActiveSeq))
        .catch(() => null);
    const saved = localStorage.getItem(oneclickReviewKey(courseActiveSeq));
    return delay(saved ? (JSON.parse(saved) as OneClickReview) : null);
  },
  saveReview: (courseActiveSeq: string, input: OneClickReviewInput): Promise<OneClickReview> => {
    if (!mock)
      return apiClient
        .put<unknown>(`/oneclick/learn/${courseActiveSeq}/review`, input)
        .then((r) => normalizeReview(r.data, courseActiveSeq));
    const enrollmentValue = localStorage.getItem(oneclickEnrollmentKey(courseActiveSeq));
    const enrollment = enrollmentValue
      ? normalizeStoredEnrollment(
          JSON.parse(enrollmentValue) as OneClickEnrollment,
          courseActiveSeq,
        )
      : null;
    const review: OneClickReview = {
      reviewSeq: crypto.randomUUID(),
      courseActiveSeq,
      learnerName: `${(enrollment?.learnerName || '수강생')[0]}**`,
      rating: input.rating,
      content: input.content,
      createdAt: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      mine: true,
    };
    localStorage.setItem(oneclickReviewKey(courseActiveSeq), JSON.stringify(review));
    return delay(review);
  },
  removeReview: (courseActiveSeq: string): Promise<void> => {
    if (!mock)
      return apiClient
        .delete<void>(`/oneclick/learn/${courseActiveSeq}/review`)
        .then(() => undefined);
    localStorage.removeItem(oneclickReviewKey(courseActiveSeq));
    return delay(undefined);
  },
  completePayment: (
    courseActiveSeq: string,
    courseApplySeq: string,
  ): Promise<OneClickEnrollment> => {
    if (!mock)
      return apiClient
        .post<unknown>(`/oneclick/learn/${courseActiveSeq}/payment/complete`, { courseApplySeq })
        .then((r) => normalizeEnrollment(r.data, courseActiveSeq));
    const value = localStorage.getItem(oneclickEnrollmentKey(courseActiveSeq));
    const enrollment = value
      ? (JSON.parse(value) as OneClickEnrollment)
      : {
          memberSeq: crypto.randomUUID(),
          courseApplySeq,
          courseActiveSeq,
          learnerName: '수강생',
          applyStatusCd: 'APPLY_STATUS::004' as const,
          progress: 0,
          lastPosition: '1강 0분 0초',
        };
    const next = {
      ...enrollment,
      courseApplySeq: enrollment.courseApplySeq || courseApplySeq,
      applyStatusCd: 'APPLY_STATUS::002' as const,
    };
    localStorage.setItem(oneclickEnrollmentKey(courseActiveSeq), JSON.stringify(next));
    return delay(next);
  },
};
