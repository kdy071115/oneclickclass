import { apiClient } from './client';
import {
  classDetail,
  classes,
  examQuestions,
  surveyQuestions,
} from '../constants/mockData';
import { initialClassDraft } from '../constants/classDraft';
import { loadClassPreviewPatch } from '../utils/classDraft';
import type { ExamQuestion, LessonMarker, SurveyQuestion } from '../types/class';
import {
  detectContentProvider,
  type ContentProvider,
} from '../utils/content';

export { detectContentProvider };

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
  confirmedCount: number;
  heldCount: number;
  remainingSeats: number;
  recruitmentStatus: 'PRIVATE' | 'OPEN' | 'CLOSED' | 'FULL';
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
  organizationSeq?: string;
  itemSeq?: string;
  activeElementSeq?: string;
  contentsSeq?: string;
  title: string;
  description: string;
  durationText: string;
  contentUrl?: string;
  contentProvider: OneClickContentProvider;
  required?: boolean;
  sequential?: boolean;
  markers?: LessonMarker[];
};

export type OneClickContentProvider = ContentProvider;

export type OneClickApplicationStatus = 'APPLIED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type OneClickPaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED';
export type OneClickEnrollmentStatus =
  | 'PENDING'
  | 'AVAILABLE'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'REVOKED';
export type OneClickAccessReason =
  | 'AVAILABLE'
  | 'AWAITING_APPROVAL'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'SUSPENDED'
  | 'COURSE_UNAVAILABLE';

export type OneClickEnrollment = {
  memberSeq: string;
  courseApplySeq: string;
  courseActiveSeq: string;
  shareToken?: string;
  learnerName: string;
  phone?: string;
  email?: string;
  applyStatusCd: 'APPLY_STATUS::001' | 'APPLY_STATUS::002' | 'APPLY_STATUS::004';
  applicationStatus: OneClickApplicationStatus;
  paymentStatus: OneClickPaymentStatus;
  enrollmentStatus: OneClickEnrollmentStatus;
  canLearn: boolean;
  accessReason: OneClickAccessReason;
  progress: number;
  lastPosition: string;
};

export type OneClickLesson = {
  lessonId: string;
  organizationSeq?: string;
  itemSeq?: string;
  activeElementSeq?: string;
  contentsSeq?: string;
  title: string;
  description?: string;
  durationText: string;
  progress: number;
  locked: boolean;
  completed: boolean;
  playable: boolean;
  currentSeconds?: number;
  durationSeconds?: number;
  progressPercent?: number;
  completedAt?: string | null;
  completionReason?: 'WATCH_THRESHOLD' | 'ENDED' | 'MANUAL' | 'ATTENDANCE' | 'SUBMISSION' | null;
  contentUrl?: string;
  contentProvider: OneClickContentProvider;
  required?: boolean;
  sequential?: boolean;
  markers?: LessonMarker[];
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
  courseMasterSeq?: string;
  courseTitle: string;
  courseSummary: string;
  lessons: OneClickLesson[];
  tools: OneClickToolSummary;
  notices: OneClickToolItem[];
  resources: OneClickToolItem[];
  assessments: OneClickAssessment[];
};

export type OneClickCourseBookmark = {
  courseActiveSeq: string;
  bookmarked: boolean;
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
  verificationCode: string;
};

type OneClickHeartbeatInput = {
  courseApplySeq: string;
  lessonId: string;
  currentSeconds: number;
  durationSeconds?: number;
  ended?: boolean;
  playing: boolean;
};

type OneClickReviewInput = {
  courseApplySeq: string;
  rating: number;
  content: string;
};

export const canEnterLearnerRoom = (enrollment?: OneClickEnrollment | null) =>
  enrollment?.canLearn === true;

export const isPaymentPending = (enrollment?: OneClickEnrollment | null) =>
  enrollment?.accessReason === 'AWAITING_PAYMENT';

export const isApprovalPending = (enrollment?: OneClickEnrollment | null) =>
  enrollment?.accessReason === 'AWAITING_APPROVAL';

export const lx2ProgressMeasureToPercent = (value: number) =>
  Math.min(100, Math.max(0, value * 100));

const legacyAccessState = (
  applyStatusCd: OneClickEnrollment['applyStatusCd'],
): Pick<
  OneClickEnrollment,
  'applicationStatus' | 'paymentStatus' | 'enrollmentStatus' | 'canLearn' | 'accessReason'
> => {
  if (applyStatusCd === 'APPLY_STATUS::001') {
    return {
      applicationStatus: 'APPLIED',
      paymentStatus: 'NOT_REQUIRED',
      enrollmentStatus: 'PENDING',
      canLearn: false,
      accessReason: 'AWAITING_APPROVAL',
    };
  }
  if (applyStatusCd === 'APPLY_STATUS::004') {
    return {
      applicationStatus: 'APPROVED',
      paymentStatus: 'PENDING',
      enrollmentStatus: 'PENDING',
      canLearn: false,
      accessReason: 'AWAITING_PAYMENT',
    };
  }
  return {
    applicationStatus: 'APPROVED',
    paymentStatus: 'NOT_REQUIRED',
    enrollmentStatus: 'AVAILABLE',
    canLearn: true,
    accessReason: 'AVAILABLE',
  };
};

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
const oneclickCourseBookmarkKey = (courseActiveSeq: string) =>
  `oneclick.course-bookmark.${courseActiveSeq}`;
const oneclickCourseBookmarkPrefix = 'oneclick.course-bookmark.';
export const shareTokenFromCourseActiveSeq = (courseActiveSeq: string) =>
  courseActiveSeq === '104' ? '7KpX92Lm' : courseActiveSeq;

const normalizeStoredEnrollment = (
  enrollment: OneClickEnrollment,
  courseActiveSeq: string,
): OneClickEnrollment => {
  const applyStatusCd = enrollment.applyStatusCd || 'APPLY_STATUS::002';
  const fallbackAccess = legacyAccessState(applyStatusCd);
  return {
  ...fallbackAccess,
  ...enrollment,
  courseActiveSeq: enrollment.courseActiveSeq || courseActiveSeq,
  shareToken: enrollment.shareToken || shareTokenFromCourseActiveSeq(courseActiveSeq),
  learnerName: enrollment.learnerName || '수강생',
  applyStatusCd,
  progress: Number.isFinite(enrollment.progress) ? enrollment.progress : 0,
  lastPosition: enrollment.lastPosition || '1강 0분 0초',
  };
};

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
  const courseActiveSeq =
    shareToken === '7KpX92Lm' ? '104' : shareToken === 'notion-auto' ? 'notion' : shareToken;
  const sourceId = courseActiveSeq === '104' ? 'notion' : courseActiveSeq;
  const canonicalItem = classes.find((item) => item.id === sourceId);
  const savedDraft =
    loadClassPreviewPatch(courseActiveSeq) || loadClassPreviewPatch(shareToken);
  const draftPatch = canonicalItem && savedDraft?._schemaVersion !== 2 ? undefined : savedDraft;
  const draft = { ...initialClassDraft, ...draftPatch };
  const baseDetail = canonicalItem
    ? classDetail
    : undefined;
  const price = draftPatch?.payment
    ? draft.payment === 'paid'
      ? draft.price
      : 0
    : baseDetail?.price || 0;
  const curriculum = mockCurriculum(courseActiveSeq);
  const capacity = draftPatch?.capacity ?? canonicalItem?.capacity ?? initialClassDraft.capacity;
  const enrolled = canonicalItem?.enrolled ?? 0;
  const location = draftPatch?.type
    ? draft.type === 'offline' || draft.type === 'hybrid'
      ? [draft.address, draft.detailedAddress].filter(Boolean).join(' ')
      : draft.type === 'live'
        ? '라이브 · 차시별 참여 링크'
        : '온라인 · 차시별 영상'
    : baseDetail?.location || '온라인 강의실';
  return {
    shareToken,
    courseActiveSeq,
    courseMasterSeq: canonicalItem?.courseMasterSeq || `${sourceId}-master`,
    title: draftPatch?.title?.trim() || canonicalItem?.title || '제목 없는 클래스',
    summary: draftPatch?.summary?.trim() || baseDetail?.summary || '강의 소개를 준비하고 있어요.',
    description:
      draftPatch?.description?.trim() || baseDetail?.description || '상세 강의 소개를 준비하고 있어요.',
    price,
    capacity,
    enrolled,
    confirmedCount: enrolled,
    heldCount: 0,
    remainingSeats: Math.max(
      0,
      capacity - enrolled,
    ),
    recruitmentStatus: 'OPEN',
    applyStatus: 'OPEN',
    paymentType: price > 0 ? 'PAID' : 'FREE',
    instructorName: baseDetail?.instructor || '이지훈',
    scheduleText: draftPatch?.startDate || canonicalItem?.date || '일정 미정',
    locationText: location,
    requiresApproval: false,
    difficulty: '초급',
    highlights: baseDetail?.description
      ? [baseDetail.description]
      : ['강의에서 다룰 핵심 내용을 준비하고 있어요.'],
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
          organizationSeq?: string;
          itemSeq?: string;
          activeElementSeq?: string;
          contentsSeq?: string;
          title?: string;
          description?: string;
          durationMinutes?: number;
          published?: boolean;
          contentUrl?: string;
          contentType?: string;
          required?: boolean;
          sequential?: boolean;
          markers?: LessonMarker[];
        }>;
      }>;
      return sections.flatMap((section) =>
        (section.lessons ?? [])
          .filter((lesson) => lesson.published !== false)
          .map((lesson, index) => ({
            lessonId: lesson.id || String(index + 1),
            organizationSeq: lesson.organizationSeq,
            itemSeq: lesson.itemSeq,
            activeElementSeq: lesson.activeElementSeq,
            contentsSeq: lesson.contentsSeq,
            title: lesson.title || `${index + 1}강`,
            description: lesson.description || '',
            durationText: `${lesson.durationMinutes || 0}분`,
            contentUrl: lesson.contentUrl || '',
            contentProvider: detectContentProvider(lesson.contentUrl, lesson.contentType),
            required: lesson.required ?? true,
            sequential: lesson.sequential ?? false,
            markers: lesson.markers ?? [],
          })),
      );
    }
  } catch {
    // Invalid local mock data falls back to the demo curriculum.
  }
  return demoCourseIds.has(courseActiveSeq)
    ? fallbackLessons(0).map(
        ({ lessonId, title, description = '', durationText, contentUrl, contentProvider }) => ({
        lessonId,
        title,
        description,
        durationText,
          contentUrl,
          contentProvider,
        }),
      )
    : [];
};

const normalizeMarkers = (source: Record<string, unknown>): LessonMarker[] =>
  firstArray(source, ['markers', 'markerList', 'listMarker']).map((item, index) => {
    const marker = asRecord(item);
    const choices = firstArray(marker, ['choices', 'options', 'answerList']).map((choice) =>
      typeof choice === 'string'
        ? choice
        : pickString(asRecord(choice), ['label', 'text', 'title'], ''),
    );
    const rawType = pickString(marker, ['type', 'markerType'], 'TEXT').toUpperCase();
    return {
      id: pickString(marker, ['id', 'markerSeq', 'seq'], `marker-${index + 1}`),
      markerSeq: pickString(marker, ['markerSeq'], '') || undefined,
      timeSeconds: pickNumber(marker, ['timeSeconds', 'time', 'playTime'], 0),
      type: rawType.includes('QUIZ') ? 'QUIZ' : rawType.includes('IMAGE') ? 'IMAGE' : 'TEXT',
      title: pickString(marker, ['title', 'markerTitle'], `마커 ${index + 1}`),
      content: pickString(marker, ['content', 'text', 'contents', 'question'], ''),
      imageUrl: pickString(marker, ['imageUrl', 'filePath', 'imagePath'], '') || undefined,
      choices: choices.length ? choices : undefined,
      answerIndex: pickNumber(marker, ['answerIndex', 'correctIndex'], 0),
    } satisfies LessonMarker;
  });

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
      required: pickBoolean(record, ['required', 'requiredYn', 'mandatoryYn'], true),
      sequential: pickBoolean(record, ['sequential', 'sequentialYn', 'orderLearningYn'], false),
      markers: normalizeMarkers(record),
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
  const capacity = pickNumber(
    merged,
    ['capacity', 'courseMemberCnt', 'limitCnt', 'recruitCnt'],
    fallback.capacity,
  );
  const confirmedCount = pickNumber(
    merged,
    ['confirmedCount', 'confirmedSeatCount', 'enrolled', 'takeCnt'],
    fallback.confirmedCount,
  );
  const heldCount = pickNumber(merged, ['heldCount', 'validHeldCount'], fallback.heldCount);
  const recruitmentStatus = pickString(
    merged,
    ['recruitmentStatus'],
    fallback.recruitmentStatus,
  ) as OneClickShare['recruitmentStatus'];
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
    capacity,
    enrolled: pickNumber(
      merged,
      ['enrolled', 'applyCnt', 'takeCnt', 'memberCnt'],
      confirmedCount,
    ),
    confirmedCount,
    heldCount,
    remainingSeats: pickNumber(
      merged,
      ['remainingSeats'],
      Math.max(0, capacity - confirmedCount - heldCount),
    ),
    recruitmentStatus,
    applyStatus: normalizeApplyStatus(
      pickString(
        merged,
        ['applyStatus', 'applyYn', 'recruitStatusCd'],
        recruitmentStatus === 'OPEN' ? 'OPEN' : 'CLOSED',
      ),
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
  const applyStatusCd = pickString(
    merged,
    ['applyStatusCd', 'legacyApplyStatusCd'],
    'APPLY_STATUS::002',
  ) as OneClickEnrollment['applyStatusCd'];
  const fallbackAccess = legacyAccessState(applyStatusCd);
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
    applyStatusCd,
    applicationStatus: pickString(
      merged,
      ['applicationStatus'],
      fallbackAccess.applicationStatus,
    ) as OneClickApplicationStatus,
    paymentStatus: pickString(
      merged,
      ['paymentStatus'],
      fallbackAccess.paymentStatus,
    ) as OneClickPaymentStatus,
    enrollmentStatus: pickString(
      merged,
      ['enrollmentStatus'],
      fallbackAccess.enrollmentStatus,
    ) as OneClickEnrollmentStatus,
    canLearn: pickBoolean(merged, ['canLearn'], fallbackAccess.canLearn),
    accessReason: pickString(
      merged,
      ['accessReason', 'reason'],
      fallbackAccess.accessReason,
    ) as OneClickAccessReason,
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
    {
      lessonId: '1',
      title: '업무 구조 잡기',
      description: '흩어진 업무를 수강생 상황에 맞게 정리합니다.',
      durationText: '42분',
    },
    {
      lessonId: '2',
      title: '자동화 흐름 만들기',
      description: '반복 입력, 알림, 상태 변경을 자동화합니다.',
      durationText: '52분',
    },
    {
      lessonId: '3',
      title: '팀 협업 템플릿 완성',
      description: '함께 쓰기 좋은 권한과 보드 구조를 만듭니다.',
      durationText: '48분',
    },
  ].map((lesson, index) => ({
    ...lesson,
    progress: lessonProgress[index],
    locked: index >= 2,
    completed: lessonProgress[index] >= 90,
    playable: index < 2,
    contentUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    contentProvider: 'YOUTUBE',
  }));
};

const normalizeLessons = (raw: unknown): OneClickLesson[] => {
  const root = asRecord(raw);
  const list = firstArray(root, ['lessons', 'curriculum', 'elementList', 'listElement', 'list']);
  if (!list.length) return [];
  return list.map((item, index) => {
    const record = asRecord(item);
    const rawProgress = pickNumber(
      record,
      ['progress', 'progressRate', 'rate', 'completeRate', 'progressMeasure'],
      index === 0 ? 100 : 0,
    );
    const progress = Math.min(
      100,
      Math.max(
        0,
        'progressMeasure' in record && rawProgress <= 1
          ? lx2ProgressMeasureToPercent(rawProgress)
          : rawProgress,
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
      organizationSeq: pickString(record, ['organizationSeq'], '') || undefined,
      itemSeq: pickString(record, ['itemSeq'], '') || undefined,
      activeElementSeq: pickString(record, ['activeElementSeq'], '') || undefined,
      contentsSeq: pickString(record, ['contentsSeq', 'contentSeq'], '') || undefined,
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
      completed: pickBoolean(record, ['completed', 'completeYn'], progress >= 90),
      playable: !locked && Boolean(contentUrl),
      currentSeconds: pickNumber(record, ['currentSeconds', 'lastSeconds'], 0),
      durationSeconds: pickNumber(record, ['durationSeconds', 'totalSeconds'], 0),
      progressPercent: progress,
      completedAt: pickString(record, ['completedAt', 'completeDate'], '') || null,
      completionReason:
        (pickString(record, ['completionReason'], '') as OneClickLesson['completionReason']) || null,
      contentUrl,
      contentProvider,
      markers: normalizeMarkers(record),
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
    const verificationValue = sessionStorage.getItem(
      oneclickVerificationKey(share.courseActiveSeq, input.phone),
    );
    const verification = verificationValue
      ? (JSON.parse(verificationValue) as { code: string; expiresAt: string })
      : null;
    if (
      !verification ||
      verification.code !== input.verificationCode ||
      Date.parse(verification.expiresAt) < Date.now()
    ) {
      return Promise.reject(new Error('invalid verification code'));
    }
    sessionStorage.removeItem(oneclickVerificationKey(share.courseActiveSeq, input.phone));
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
      applicationStatus: share.requiresApproval ? ('APPLIED' as const) : ('APPROVED' as const),
      paymentStatus: share.requiresApproval
        ? ('NOT_REQUIRED' as const)
        : share.paymentType === 'PAID'
          ? ('PENDING' as const)
          : ('NOT_REQUIRED' as const),
      enrollmentStatus:
        share.requiresApproval || share.paymentType === 'PAID'
          ? ('PENDING' as const)
          : ('AVAILABLE' as const),
      canLearn: !share.requiresApproval && share.paymentType === 'FREE',
      accessReason: share.requiresApproval
        ? ('AWAITING_APPROVAL' as const)
        : share.paymentType === 'PAID'
          ? ('AWAITING_PAYMENT' as const)
          : ('AVAILABLE' as const),
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
    const savedCurriculum = localStorage.getItem(`oneclick.curriculum.${courseActiveSeq}`)
      ? mockCurriculum(courseActiveSeq)
      : [];
    const useDemoContent = demoCourseIds.has(courseActiveSeq) && !savedCurriculum.length;
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
          locked: Boolean(lesson.sequential && index > 0 && lessonStates[index - 1].progress < 90),
          completed: lessonStates[index].progress >= 90,
          playable:
            Boolean(lesson.contentUrl) &&
            (!lesson.sequential || index === 0 || lessonStates[index - 1].progress >= 90),
        }))
      : useDemoContent
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
        useDemoContent
          ? {
              noticeCount: notices.filter((notice) => !notice.read).length,
              resourceCount: defaultResources.length,
              examCount: 1,
              surveyCount: 1,
            }
          : { noticeCount: 0, resourceCount: 0, examCount: 0, surveyCount: 0 },
      notices: useDemoContent ? notices : [],
      resources: useDemoContent ? defaultResources : [],
      assessments: useDemoContent ? assessments : [],
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
      applicationStatus: 'APPROVED' as const,
      paymentStatus: 'NOT_REQUIRED' as const,
      enrollmentStatus: 'AVAILABLE' as const,
      canLearn: true,
      accessReason: 'AVAILABLE' as const,
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
        const completed = Boolean(input.ended || measuredProgress >= 90 || previousProgress >= 90);
        const progress = Math.max(previousProgress, measuredProgress, completed ? 90 : 0);
        localStorage.setItem(
          oneclickLessonProgressKey(courseActiveSeq, input.lessonId),
          JSON.stringify({
            currentSeconds: Math.max(0, input.currentSeconds),
            durationSeconds: input.durationSeconds,
            progress,
            completed,
            completedAt: completed ? new Date().toISOString() : null,
            completionReason: input.ended ? 'ENDED' : completed ? 'WATCH_THRESHOLD' : null,
          }),
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
  courseBookmark: (courseActiveSeq: string): Promise<OneClickCourseBookmark> => {
    if (!mock)
      return apiClient
        .get<OneClickCourseBookmark>(`/oneclick/classes/${courseActiveSeq}/bookmark`)
        .then((r) => r.data);
    return delay({
      courseActiveSeq,
      bookmarked: localStorage.getItem(oneclickCourseBookmarkKey(courseActiveSeq)) === 'Y',
    });
  },
  courseBookmarks: (): Promise<OneClickShare[]> => {
    if (!mock)
      return apiClient.get<OneClickShare[]>('/oneclick/bookmarks').then((r) => r.data);
    const courseActiveSeqs = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    )
      .filter((key): key is string => Boolean(key?.startsWith(oneclickCourseBookmarkPrefix)))
      .filter((key) => localStorage.getItem(key) === 'Y')
      .map((key) => key.slice(oneclickCourseBookmarkPrefix.length));
    return delay(courseActiveSeqs.map((courseActiveSeq) => mockShare(courseActiveSeq)));
  },
  saveCourseBookmark: (courseActiveSeq: string): Promise<OneClickCourseBookmark> => {
    if (!mock)
      return apiClient
        .put<OneClickCourseBookmark>(`/oneclick/classes/${courseActiveSeq}/bookmark`)
        .then((r) => r.data);
    localStorage.setItem(oneclickCourseBookmarkKey(courseActiveSeq), 'Y');
    return delay({ courseActiveSeq, bookmarked: true });
  },
  removeCourseBookmark: (courseActiveSeq: string): Promise<OneClickCourseBookmark> => {
    if (!mock)
      return apiClient
        .delete<OneClickCourseBookmark>(`/oneclick/classes/${courseActiveSeq}/bookmark`)
        .then((r) => r.data);
    localStorage.removeItem(oneclickCourseBookmarkKey(courseActiveSeq));
    return delay({ courseActiveSeq, bookmarked: false });
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
          applicationStatus: 'APPROVED' as const,
          paymentStatus: 'PENDING' as const,
          enrollmentStatus: 'PENDING' as const,
          canLearn: false,
          accessReason: 'AWAITING_PAYMENT' as const,
          progress: 0,
          lastPosition: '1강 0분 0초',
        };
    const next = {
      ...enrollment,
      courseApplySeq: enrollment.courseApplySeq || courseApplySeq,
      applyStatusCd: 'APPLY_STATUS::002' as const,
      applicationStatus: 'APPROVED' as const,
      paymentStatus: 'PAID' as const,
      enrollmentStatus: 'AVAILABLE' as const,
      canLearn: true,
      accessReason: 'AVAILABLE' as const,
    };
    localStorage.setItem(oneclickEnrollmentKey(courseActiveSeq), JSON.stringify(next));
    return delay(next);
  },
};
