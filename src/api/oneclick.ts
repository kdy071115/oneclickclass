import { apiClient } from './client';
import { classes } from '../constants/mockData';
import { initialClassDraft } from '../constants/classDraft';
import { loadClassPreview } from '../utils/classDraft';

const mock = import.meta.env.VITE_USE_MOCK !== 'false';
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
};

export type OneClickEnrollment = {
  memberSeq: string;
  courseApplySeq: string;
  courseActiveSeq: string;
  shareToken?: string;
  learnerName: string;
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
};

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
export const shareTokenFromCourseActiveSeq = (courseActiveSeq: string) =>
  courseActiveSeq === '104' ? '7KpX92Lm' : 'notion-auto';

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

const normalizeApplyStatus = (value: string): OneClickShare['applyStatus'] =>
  value === 'CLOSED' || value === 'N' || value.includes('CLOSE') ? 'CLOSED' : 'OPEN';

const normalizePaymentType = (price: number, value: string): OneClickShare['paymentType'] =>
  price > 0 || value === 'PAID' || value.includes('PAY') ? 'PAID' : 'FREE';

const mockShare = (shareToken: string): OneClickShare => {
  const classItem = classes[0];
  const draft = loadClassPreview(shareToken, initialClassDraft);
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
    price: draft.payment === 'paid' ? draft.price : shareToken === 'notion-auto' ? 45000 : 0,
    capacity: draft.title ? draft.capacity : classItem.capacity,
    enrolled: draft.title ? 0 : classItem.enrolled,
    applyStatus: 'OPEN',
    paymentType: draft.title ? (draft.payment === 'paid' ? 'PAID' : 'FREE') : 'PAID',
    instructorName: '이지훈',
    scheduleText: draft.startDate || '자유 수강',
    locationText:
      draft.type === 'offline' || draft.type === 'hybrid'
        ? [draft.address, draft.detailedAddress].filter(Boolean).join(' ')
        : draft.url || '온라인 강의실',
    requiresApproval: false,
  };
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
  }));
};

const normalizeLessons = (raw: unknown): OneClickLesson[] => {
  const root = asRecord(raw);
  const list = firstArray(root, ['lessons', 'curriculum', 'elementList', 'listElement', 'list']);
  if (!list.length) return fallbackLessons();
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
      playable: !locked,
      currentSeconds: pickNumber(record, ['currentSeconds', 'lastSeconds'], 0),
    };
  });
};

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
    const publishedDraft = loadClassPreview(courseActiveSeq, initialClassDraft);
    return delay({
      ...enrollment,
      courseActiveSeq: enrollment.courseActiveSeq || courseActiveSeq,
      courseTitle: mockShare(courseActiveSeq).title,
      courseSummary: mockShare(courseActiveSeq).summary,
      lessons: publishedDraft.title ? [] : fallbackLessons(enrollment.progress),
      tools: publishedDraft.title
        ? { noticeCount: 0, resourceCount: 0, examCount: 0, surveyCount: 0 }
        : { noticeCount: 1, resourceCount: 3, examCount: 1, surveyCount: 1 },
    });
  },
  continueWithPhone: (courseActiveSeq: string, phone: string): Promise<OneClickEnrollment> => {
    if (!mock)
      return apiClient
        .post<unknown>(`/oneclick/learn/${courseActiveSeq}/continue`, { phone })
        .then((r) => normalizeEnrollment(r.data, courseActiveSeq));
    const enrollment = {
      memberSeq: crypto.randomUUID(),
      courseApplySeq: crypto.randomUUID(),
      courseActiveSeq,
      shareToken: shareTokenFromCourseActiveSeq(courseActiveSeq),
      learnerName: '수강생',
      applyStatusCd: 'APPLY_STATUS::002' as const,
      progress: 62,
      lastPosition: '3강 14분 27초',
    };
    localStorage.setItem(oneclickEnrollmentKey(courseActiveSeq), JSON.stringify(enrollment));
    return delay(enrollment);
  },
  heartbeat: (courseActiveSeq: string, input: OneClickHeartbeatInput): Promise<void> => {
    if (mock) return delay(undefined);
    return apiClient
      .post<void>(`/oneclick/learn/${courseActiveSeq}/heartbeat`, input)
      .then((r) => r.data);
  },
  reviews: (shareToken: string): Promise<OneClickReview[]> => {
    if (!mock)
      return apiClient
        .get<unknown>(`/oneclick/shares/${shareToken}/reviews`)
        .then((r) => normalizeReviews(r.data, ''));
    const courseActiveSeq = mockShare(shareToken).courseActiveSeq;
    const saved = localStorage.getItem(oneclickReviewKey(courseActiveSeq));
    const samples = ['notion', 'notion-auto', '104', '7KpX92Lm'].includes(shareToken)
      ? defaultReviews(courseActiveSeq)
      : [];
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
