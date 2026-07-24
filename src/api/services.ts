import { apiClient } from './client';
import type { AuthSession, LoginRequest, SignupRequest } from '../types/auth';
import type {
  ApplicantUpdate,
  AttendanceRow,
  ClassSettingsUpdate,
  PageQuery,
  PageResponse,
  QrSession,
  SurveyOverviewItem,
} from '../types/api';
import {
  applicants,
  certificates,
  classDetail,
  classes,
  dashboard,
  examQuestions,
  faqs,
  notifications,
  notificationSettings,
  paymentSummary,
  settlementSummary,
  surveyQuestions,
} from '../constants/mockData';
import type {
  Applicant,
  CertificateItem,
  ClassDetail,
  ClassDraft,
  ClassItem,
  CurriculumLesson,
  CurriculumSection,
  Dashboard,
  ExamQuestion,
  FaqItem,
  NotificationItem,
  NotificationSetting,
  PaymentSummary,
  SettlementSummary,
  SurveyQuestion,
} from '../types/class';
import { initialClassDraft } from '../constants/classDraft';
import {
  hasClassData,
  hasClassPreview,
  listClassPreviewIds,
  loadClassPreview,
  loadClassPreviewPatch,
} from '../utils/classDraft';
const mock = import.meta.env.VITE_USE_MOCK !== 'false';
const delay = <T>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 350));
const MOCK_CLASSES_KEY = 'oneclick.mock.classes';
const LEGACY_MOCK_CLASS_IDS = new Set([
  'calligraphy',
  'branding',
  'photo',
  'policy-flow-test',
  'c40517c1-70ba-4b94-87db-980493423599',
  'c4a5efd9-5661-47ea-a9d6-67c6d69eb443',
]);
const mockSettingsKey = (classId: string) => `oneclick.class-settings.${classId}`;
const curriculumKey = (classId: string) => `oneclick.curriculum.${classId}`;
const surveyKey = (classId: string) => `oneclick.surveys.${classId}`;
const classTypeLabel: Record<ClassDraft['type'], string> = {
  online: '온라인',
  live: '라이브',
  offline: '오프라인',
  hybrid: '혼합형',
};
const untitledClassLabel = '강의 정보 준비 중';
const savedMockClasses = (): ClassItem[] => {
  try {
    const saved =
      localStorage.getItem(MOCK_CLASSES_KEY) || sessionStorage.getItem(MOCK_CLASSES_KEY) || '[]';
    if (saved !== '[]' && !localStorage.getItem(MOCK_CLASSES_KEY))
      localStorage.setItem(MOCK_CLASSES_KEY, saved);
    const items = JSON.parse(saved) as ClassItem[];
    const filtered = items.filter((item) => !LEGACY_MOCK_CLASS_IDS.has(item.id));
    if (filtered.length !== items.length)
      localStorage.setItem(MOCK_CLASSES_KEY, JSON.stringify(filtered));
    return filtered;
  } catch {
    return [];
  }
};
const previewClassItem = (id: string): ClassItem => {
  const draft = loadClassPreview(id, initialClassDraft);
  const settings = mockSettings(id, draft.capacity);
  const hasPublishedLesson = mockCurriculum(id).some((section) =>
    section.lessons.some((lesson) => lesson.published),
  );
  const hasEnrollment = Boolean(localStorage.getItem(`oneclick.enrollment.${id}`));
  let enrollmentTitle = '';
  try {
    const enrollment = JSON.parse(localStorage.getItem(`oneclick.enrollment.${id}`) || '{}') as {
      courseTitle?: string;
    };
    enrollmentTitle = enrollment.courseTitle || '';
  } catch {
    enrollmentTitle = '';
  }
  return {
    id,
    courseMasterSeq: id,
    courseActiveSeq: id,
    lifecycleStatus: settings.publicOn
      ? 'RECRUITING'
      : hasPublishedLesson
        ? 'READY'
        : 'CURRICULUM',
    title: draft.title || enrollmentTitle || untitledClassLabel,
    status: settings.publicOn ? '모집중' : '준비중',
    type: classTypeLabel[draft.type],
    date: draft.startDate || '일정 미정',
    enrolled: hasEnrollment ? 1 : 0,
    capacity: draft.capacity,
    color: '#3182f6',
    thumbnail: draft.thumbnail || undefined,
  };
};
const mockClasses = () => {
  const saved = savedMockClasses();
  const combined = [...saved, ...classes.filter((item) => !saved.some((row) => row.id === item.id))];
  for (const id of listClassPreviewIds()) {
    if (LEGACY_MOCK_CLASS_IDS.has(id)) continue;
    if (!combined.some((item) => item.id === id)) combined.unshift(previewClassItem(id));
  }
  return combined;
};
const saveMockClasses = (items: ClassItem[]) =>
  localStorage.setItem(
    MOCK_CLASSES_KEY,
    JSON.stringify(items.map((item) => ({ ...item, thumbnail: undefined }))),
  );
const defaultCurriculum = (classId: string): CurriculumSection[] =>
  classId === classDetail.id
    ? [
        {
          id: 'section-1',
          title: '전체 과정',
          lessons: classDetail.curriculum.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            contentType: 'video',
            contentUrl: '',
            durationMinutes: Number.parseInt(item.durationText, 10) || 0,
            preview: false,
            published: item.published,
          })),
        },
      ]
    : [];
const mockCurriculum = (classId: string): CurriculumSection[] => {
  try {
    const saved = localStorage.getItem(curriculumKey(classId));
    return saved ? (JSON.parse(saved) as CurriculumSection[]) : defaultCurriculum(classId);
  } catch {
    return defaultCurriculum(classId);
  }
};
const saveMockCurriculum = (classId: string, sections: CurriculumSection[]) => {
  localStorage.setItem(curriculumKey(classId), JSON.stringify(sections));
  return sections;
};
const mockSettings = (classId: string, capacity = 30): Required<ClassSettingsUpdate> => {
  try {
    const saved = JSON.parse(localStorage.getItem(mockSettingsKey(classId)) || '{}') as ClassSettingsUpdate;
    return {
      publicOn: saved.publicOn ?? true,
      recruitmentClosed: saved.recruitmentClosed ?? false,
      capacity: saved.capacity ?? capacity,
    };
  } catch {
    return { publicOn: true, recruitmentClosed: false, capacity };
  }
};
const saveMockSettings = (classId: string, update: ClassSettingsUpdate, capacity = 30) => {
  const next = { ...mockSettings(classId, capacity), ...update };
  localStorage.setItem(mockSettingsKey(classId), JSON.stringify(next));
  return next;
};
const enrollmentApplicant = (classId: string): Applicant | undefined => {
  try {
    const stored = localStorage.getItem(`oneclick.enrollment.${classId}`);
    if (!stored) return undefined;
    const enrollment = JSON.parse(stored) as {
      courseApplySeq?: string;
      learnerName?: string;
      phone?: string;
      email?: string;
      applyStatusCd?: string;
    };
    const item = mockClasses().find((current) => current.id === classId);
    const draft = loadClassPreview(classId, initialClassDraft);
    return {
      id: enrollment.courseApplySeq || `enrollment-${classId}`,
      classId,
      name: enrollment.learnerName || '수강생',
      classTitle: item?.title || draft.title,
      appliedAt: '최근 신청',
      payment: enrollment.applyStatusCd === 'APPLY_STATUS::004' ? '결제대기' : '결제완료',
      amount: draft.payment === 'paid' ? draft.price : 0,
      phone: enrollment.phone || '-',
      email: enrollment.email || '-',
      answers: [],
    };
  } catch {
    return undefined;
  }
};
const mockApplicantsByClass = (classId: string) => {
  const rows = applicants.filter((item) => item.classId === classId);
  const enrollment = enrollmentApplicant(classId);
  return enrollment && !rows.some((item) => item.id === enrollment.id)
    ? [enrollment, ...rows]
    : rows;
};
const allMockApplicants = () => {
  const rows = [...applicants];
  for (const classId of listClassPreviewIds()) {
    if (LEGACY_MOCK_CLASS_IDS.has(classId)) continue;
    const enrollment = enrollmentApplicant(classId);
    if (enrollment && !rows.some((item) => item.id === enrollment.id)) rows.unshift(enrollment);
  }
  return rows;
};
const demoSurveyItems: SurveyOverviewItem[] = [
  {
    id: 's1',
    type: '설문',
    title: '중간 만족도 설문',
    meta: '5문항 · 익명',
    status: '진행중',
    response: 65,
  },
  {
    id: 'e1',
    type: '시험',
    title: '3주차 퀴즈',
    meta: '10문항 · 70점 이상 통과',
    status: '마감',
    response: 90,
  },
  {
    id: 'e2',
    type: '시험',
    title: '최종 시험',
    meta: '20문항 · 60분',
    status: '예정',
    response: 0,
  },
  {
    id: 's2',
    type: '설문',
    title: '수료 후기 설문',
    meta: '3문항 · 공개',
    status: '진행중',
    response: 40,
  },
];
const mockSurveyItems = (classId: string): SurveyOverviewItem[] => {
  try {
    const stored = localStorage.getItem(surveyKey(classId));
    if (stored) return JSON.parse(stored) as SurveyOverviewItem[];
    return classId === 'notion' ? demoSurveyItems : [];
  } catch {
    return classId === 'notion' ? demoSurveyItems : [];
  }
};
const saveMockSurveyItem = (classId: string, item: SurveyOverviewItem) => {
  const items = [item, ...mockSurveyItems(classId)];
  localStorage.setItem(surveyKey(classId), JSON.stringify(items));
  return item;
};
const pageItems = <T>(items: T[], query: PageQuery = {}): PageResponse<T> => {
  const page = Math.max(1, query.page ?? 1);
  const size = Math.max(1, query.size ?? 20);
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    page,
    size,
    total: items.length,
    totalPages: Math.ceil(items.length / size),
  };
};
export const authService = {
  async login(input: LoginRequest) {
    if (!mock) return (await apiClient.post<AuthSession>('/auth/login', input)).data;
    return delay<AuthSession>({
      accessToken: crypto.randomUUID(),
      refreshToken: crypto.randomUUID(),
      user: { id: crypto.randomUUID(), name: '김지훈', email: input.email, role: 'teacher' },
    });
  },
  async signup(input: SignupRequest) {
    if (!mock) return (await apiClient.post<AuthSession>('/auth/signup', input)).data;
    return delay<AuthSession>({
      accessToken: crypto.randomUUID(),
      refreshToken: crypto.randomUUID(),
      user: { id: crypto.randomUUID(), name: input.name, email: input.email, role: input.role },
    });
  },
  async refresh(refreshToken: string) {
    return (
      await apiClient.post<Pick<AuthSession, 'accessToken'>>('/auth/refresh', { refreshToken })
    ).data;
  },
  async logout(refreshToken?: string) {
    if (mock) return delay(undefined);
    await apiClient.post('/auth/logout', { refreshToken });
  },
};
export const classService = {
  dashboard: (): Promise<Dashboard> =>
    mock
      ? delay({ ...dashboard, classes: mockClasses() })
      : apiClient.get<Dashboard>('/dashboard').then((r) => r.data),
  list: (): Promise<ClassItem[]> =>
    mock ? delay(mockClasses()) : apiClient.get<ClassItem[]>('/classes').then((r) => r.data),
  listPage: (query: PageQuery = {}): Promise<PageResponse<ClassItem>> =>
    mock
      ? delay(pageItems(mockClasses(), query))
      : apiClient.get<PageResponse<ClassItem>>('/classes', { params: query }).then((r) => r.data),
  get: (id: string): Promise<ClassItem> =>
    mock
      ? mockClasses().some((c) => c.id === id)
        ? delay(mockClasses().find((c) => c.id === id) as ClassItem)
        : Promise.reject(new Error('class not found'))
      : apiClient.get<ClassItem>(`/classes/${id}`).then((r) => r.data),
  create: (draft: ClassDraft): Promise<ClassItem> => {
    if (!mock) return apiClient.post<ClassItem>('/classes', draft).then((r) => r.data);
    const id = crypto.randomUUID();
    const item = {
      ...classes[0],
      id,
      courseMasterSeq: crypto.randomUUID(),
      courseActiveSeq: id,
      lifecycleStatus: 'DRAFT' as const,
      title: draft.title,
      status: '준비중' as const,
      type: classTypeLabel[draft.type],
      date: draft.startDate || '일정 미정',
      capacity: draft.capacity,
      enrolled: 0,
      thumbnail: draft.thumbnail,
    };
    saveMockClasses([item, ...savedMockClasses()]);
    saveMockSettings(item.id, { publicOn: false, recruitmentClosed: false }, item.capacity);
    return delay(item);
  },
  update: (id: string, draft: Partial<ClassDraft>): Promise<ClassItem> => {
    if (!mock) return apiClient.patch<ClassItem>(`/classes/${id}`, draft).then((r) => r.data);
    const current = mockClasses().find((c) => c.id === id) ?? classes[0];
    const item = {
      ...current,
      ...draft,
      id,
      type: draft.type ? classTypeLabel[draft.type] : current.type,
      date: draft.startDate || current.date,
    } as ClassItem;
    saveMockClasses([item, ...savedMockClasses().filter((saved) => saved.id !== id)]);
    return delay(item);
  },
  updateSettings: (id: string, update: ClassSettingsUpdate): Promise<void> => {
    if (!mock) return apiClient.patch<void>(`/classes/${id}/settings`, update).then((r) => r.data);
    const current = mockClasses().find((item) => item.id === id);
    const next = saveMockSettings(id, update, current?.capacity);
    if (current && next.capacity !== current.capacity) {
      saveMockClasses([
        { ...current, capacity: next.capacity },
        ...savedMockClasses().filter((item) => item.id !== id),
      ]);
    }
    return delay(undefined);
  },
  publish: (id: string): Promise<{ shareToken: string }> => {
    if (!mock)
      return apiClient.post<{ shareToken: string }>(`/classes/${id}/publish`).then((r) => r.data);
    saveMockSettings(id, { publicOn: true });
    const current = mockClasses().find((item) => item.id === id);
    if (current) {
      saveMockClasses([
        { ...current, status: '모집중', lifecycleStatus: 'RECRUITING' },
        ...savedMockClasses().filter((item) => item.id !== id),
      ]);
    }
    return delay({ shareToken: id });
  },
  remove: (id: string): Promise<void> => {
    if (!mock) return apiClient.delete<void>(`/classes/${id}`).then((r) => r.data);
    saveMockClasses(savedMockClasses().filter((item) => item.id !== id));
    return delay(undefined);
  },
  uploadImage: (file: File): Promise<{ url: string }> => {
    if (mock) return delay({ url: URL.createObjectURL(file) });
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<{ url: string }>('/classes/images', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  uploadFile: (file: File): Promise<{ url: string; name?: string; type?: string; size?: number }> => {
    if (mock) return delay({ url: URL.createObjectURL(file), name: file.name, type: file.type, size: file.size });
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<{ url: string; name?: string; type?: string; size?: number }>('/classes/files', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
export const applicantService = {
  list: (): Promise<Applicant[]> =>
    mock ? delay(allMockApplicants()) : apiClient.get<Applicant[]>('/applicants').then((r) => r.data),
  listPage: (query: PageQuery = {}): Promise<PageResponse<Applicant>> =>
    mock
      ? delay(pageItems(allMockApplicants(), query))
      : apiClient
          .get<PageResponse<Applicant>>('/applicants', { params: query })
          .then((r) => r.data),
  listByClass: (classId: string): Promise<Applicant[]> =>
    mock
      ? delay(mockApplicantsByClass(classId))
      : apiClient.get<Applicant[]>(`/classes/${classId}/applicants`).then((r) => r.data),
  get: (id: string, classId?: string): Promise<Applicant> =>
    mock
      ? (() => {
          const applicant = (classId ? mockApplicantsByClass(classId) : allMockApplicants()).find(
            (item) => item.id === id,
          );
          return applicant
            ? delay(applicant)
            : Promise.reject(new Error('applicant not found'));
        })()
      : apiClient.get<Applicant>(`/applicants/${id}`).then((r) => r.data),
  updatePayment: (id: string, update: ApplicantUpdate, classId?: string): Promise<Applicant> => {
    if (!mock)
      return apiClient.patch<Applicant>(`/applicants/${id}/payment`, update).then((r) => r.data);
    const source = classId ? mockApplicantsByClass(classId) : allMockApplicants();
    const applicant = source.find((item) => item.id === id);
    if (!applicant) return Promise.reject(new Error('applicant not found'));
    if (classId && !applicants.some((item) => item.id === id)) {
      const enrollmentKey = `oneclick.enrollment.${classId}`;
      const storedEnrollment = localStorage.getItem(enrollmentKey);
      if (storedEnrollment) {
        const enrollment = JSON.parse(storedEnrollment) as { applyStatusCd?: string };
        localStorage.setItem(
          enrollmentKey,
          JSON.stringify({
            ...enrollment,
            applyStatusCd:
              update.payment === '결제완료' ? 'APPLY_STATUS::002' : 'APPLY_STATUS::004',
          }),
        );
      }
    }
    return delay({ ...applicant, payment: update.payment });
  },
  sendMessage: (id: string, message: string): Promise<void> =>
    mock
      ? delay(undefined)
      : apiClient.post<void>(`/applicants/${id}/messages`, { message }).then((r) => r.data),
};
export const detailService = {
  getClass: (id: string): Promise<ClassDetail> => {
    if (!mock) return apiClient.get<ClassDetail>(`/classes/${id}/detail`).then((r) => r.data);
    const item = mockClasses().find((current) => current.id === id);
    if (!item && !hasClassData(id)) return Promise.reject(new Error('class not found'));
    const draft = loadClassPreview(id, initialClassDraft);
    const hasReview = Boolean(localStorage.getItem(`oneclick.review.${id}`));
    const savedCurriculum = mockCurriculum(id);
    const settings = mockSettings(id, item?.capacity || draft.capacity);
    const enrolled = Math.max(item?.enrolled || 0, mockApplicantsByClass(id).length);
    const canonicalDetail = id === classDetail.id;
    const baseDetail: ClassDetail = canonicalDetail
      ? classDetail
      : {
          id,
          courseMasterSeq: item?.courseMasterSeq || id,
          courseActiveSeq: item?.courseActiveSeq || id,
          lifecycleStatus: item?.lifecycleStatus || 'DRAFT',
          title: item?.title || draft.title || untitledClassLabel,
          status: item?.status || '준비중',
          type: item?.type || classTypeLabel[draft.type],
          date: item?.date || draft.startDate || '일정 미정',
          enrolled: item?.enrolled || 0,
          capacity: item?.capacity || draft.capacity,
          color: item?.color || '#3182f6',
          thumbnail: item?.thumbnail,
          summary: '강의 소개를 준비하고 있어요.',
          description: '강의 상세 내용을 입력해 주세요.',
          instructor: '김지훈',
          price: 0,
          recruitEndDate: draft.recruitEndDate || '미정',
          sessions: 0,
          location: '온라인 · 차시별 영상',
          rating: 0,
          reviewCount: 0,
          completionRate: 0,
          shareToken: id,
          applicantTrend: [],
          curriculum: [],
          recentActivities: [],
        };
    const hasDraft = hasClassPreview(id);
    const savedDraftPatch = loadClassPreviewPatch(id);
    const draftPatch = savedDraftPatch;
    const draftType = draftPatch?.type;
    const location = draftType
      ? draftType === 'offline' || draftType === 'hybrid'
        ? [draftPatch.address, draftPatch.detailedAddress].filter(Boolean).join(' ')
        : draftType === 'live'
          ? '라이브 · 차시별 참여 링크'
          : '온라인 · 차시별 영상'
      : baseDetail.location;
    return delay({
      ...baseDetail,
      ...item,
      id,
      courseMasterSeq: item?.courseMasterSeq || id,
      courseActiveSeq: item?.courseActiveSeq || id,
      lifecycleStatus: settings.publicOn
        ? 'RECRUITING'
        : savedCurriculum.some((section) => section.lessons.some((lesson) => lesson.published))
          ? 'READY'
          : hasDraft
            ? 'CURRICULUM'
            : baseDetail.lifecycleStatus,
      status: settings.publicOn ? (item?.status === '준비중' ? '모집중' : item?.status || baseDetail.status) : '준비중',
      title: item?.title ?? baseDetail.title,
      summary: draftPatch?.summary?.trim() ? draftPatch.summary : baseDetail.summary,
      description: draftPatch?.description?.trim() ? draftPatch.description : baseDetail.description,
      price: draftPatch?.payment
        ? draftPatch.payment === 'paid'
          ? draftPatch.price || 0
          : 0
        : baseDetail.price,
      recruitEndDate:
        draftPatch?.recruitEndDate?.trim() || baseDetail.recruitEndDate,
      location: location || baseDetail.location,
      shareToken: id === 'notion' ? 'notion-auto' : id,
      enrolled,
      capacity: settings.capacity,
      publicOn: settings.publicOn,
      recruitmentClosed: settings.recruitmentClosed,
      reviewCount: baseDetail.reviewCount + (hasReview ? 1 : 0),
      rating: hasReview ? 5 : baseDetail.rating,
      completionRate: baseDetail.completionRate,
      applicantTrend: baseDetail.applicantTrend,
      curriculum: savedCurriculum.length
        ? savedCurriculum.flatMap((section) =>
            section.lessons.map((lesson) => ({
              id: lesson.id,
              sectionId: section.id,
              sectionTitle: section.title,
              title: lesson.title,
              description: lesson.description,
              durationText: `${lesson.durationMinutes}분`,
              published: lesson.published,
            })),
          )
        : baseDetail.curriculum,
      sessions: savedCurriculum.length
        ? savedCurriculum.reduce((total, section) => total + section.lessons.length, 0)
        : baseDetail.sessions,
      recentActivities: enrolled
        ? [
            {
              id: 'a1',
              type: 'applicant' as const,
              label: `신청자 ${enrolled}명`,
              occurredAt: '최근 집계',
            },
          ]
        : [],
    });
  },
  surveyQuestions: (): Promise<SurveyQuestion[]> =>
    mock
      ? delay(surveyQuestions)
      : apiClient.get<SurveyQuestion[]>('/surveys/current/questions').then((r) => r.data),
  examQuestions: (): Promise<ExamQuestion[]> =>
    mock
      ? delay(examQuestions)
      : apiClient.get<ExamQuestion[]>('/exams/current/questions').then((r) => r.data),
  certificates: (): Promise<CertificateItem[]> =>
    mock
      ? delay(certificates)
      : apiClient.get<CertificateItem[]>('/certificates').then((r) => r.data),
};
export const curriculumService = {
  list: (classId: string): Promise<CurriculumSection[]> =>
    mock
      ? delay(mockCurriculum(classId))
      : apiClient
          .get<CurriculumSection[]>(`/classes/${classId}/curriculum`)
          .then((response) => response.data),
  createSection: (classId: string, title: string): Promise<CurriculumSection[]> => {
    if (!mock)
      return apiClient
        .post<CurriculumSection[]>(`/classes/${classId}/curriculum/sections`, { title })
        .then((response) => response.data);
    const sections = [...mockCurriculum(classId), { id: crypto.randomUUID(), title, lessons: [] }];
    return delay(saveMockCurriculum(classId, sections));
  },
  updateSection: (
    classId: string,
    sectionId: string,
    title: string,
  ): Promise<CurriculumSection[]> => {
    if (!mock)
      return apiClient
        .patch<CurriculumSection[]>(`/classes/${classId}/curriculum/sections/${sectionId}`, {
          title,
        })
        .then((response) => response.data);
    const sections = mockCurriculum(classId).map((section) =>
      section.id === sectionId ? { ...section, title } : section,
    );
    return delay(saveMockCurriculum(classId, sections));
  },
  deleteSection: (classId: string, sectionId: string): Promise<CurriculumSection[]> => {
    if (!mock)
      return apiClient
        .delete<CurriculumSection[]>(`/classes/${classId}/curriculum/sections/${sectionId}`)
        .then((response) => response.data);
    const sections = mockCurriculum(classId).filter((section) => section.id !== sectionId);
    return delay(saveMockCurriculum(classId, sections));
  },
  createLesson: (
    classId: string,
    sectionId: string,
    lesson: Omit<CurriculumLesson, 'id'>,
  ): Promise<CurriculumSection[]> => {
    if (!mock)
      return apiClient
        .post<CurriculumSection[]>(`/classes/${classId}/curriculum/lessons`, {
          sectionId,
          ...lesson,
        })
        .then((response) => response.data);
    const sections = mockCurriculum(classId).map((section) =>
      section.id === sectionId
        ? { ...section, lessons: [...section.lessons, { ...lesson, id: crypto.randomUUID() }] }
        : section,
    );
    return delay(saveMockCurriculum(classId, sections));
  },
  updateLesson: (
    classId: string,
    lessonId: string,
    lesson: Omit<CurriculumLesson, 'id'>,
  ): Promise<CurriculumSection[]> => {
    if (!mock)
      return apiClient
        .patch<CurriculumSection[]>(`/classes/${classId}/curriculum/lessons/${lessonId}`, lesson)
        .then((response) => response.data);
    const sections = mockCurriculum(classId).map((section) => ({
      ...section,
      lessons: section.lessons.map((item) =>
        item.id === lessonId ? { ...lesson, id: lessonId } : item,
      ),
    }));
    return delay(saveMockCurriculum(classId, sections));
  },
  deleteLesson: (classId: string, lessonId: string): Promise<CurriculumSection[]> => {
    if (!mock)
      return apiClient
        .delete<CurriculumSection[]>(`/classes/${classId}/curriculum/lessons/${lessonId}`)
        .then((response) => response.data);
    const sections = mockCurriculum(classId).map((section) => ({
      ...section,
      lessons: section.lessons.filter((lesson) => lesson.id !== lessonId),
    }));
    return delay(saveMockCurriculum(classId, sections));
  },
  reorder: (classId: string, sections: CurriculumSection[]): Promise<CurriculumSection[]> =>
    mock
      ? delay(saveMockCurriculum(classId, sections))
      : apiClient
          .put<CurriculumSection[]>(`/classes/${classId}/curriculum/order`, { sections })
          .then((response) => response.data),
};
export const userService = {
  notifications: (): Promise<NotificationItem[]> =>
    mock
      ? delay(notifications)
      : apiClient.get<NotificationItem[]>('/me/notifications').then((r) => r.data),
  markNotificationsRead: (): Promise<void> =>
    mock ? delay(undefined) : apiClient.post<void>('/me/notifications/read').then((r) => r.data),
  settlement: (): Promise<SettlementSummary> =>
    mock
      ? delay(settlementSummary)
      : apiClient.get<SettlementSummary>('/me/settlement').then((r) => r.data),
  notificationSettings: (): Promise<NotificationSetting[]> =>
    mock
      ? delay(notificationSettings)
      : apiClient.get<NotificationSetting[]>('/me/notification-settings').then((r) => r.data),
  updateNotificationSetting: (key: string, enabled: boolean): Promise<NotificationSetting> =>
    mock
      ? delay({
          ...(notificationSettings.find((s) => s.key === key) ?? notificationSettings[0]),
          enabled,
        })
      : apiClient
          .patch<NotificationSetting>(`/me/notification-settings/${key}`, { enabled })
          .then((r) => r.data),
  faqs: (): Promise<FaqItem[]> =>
    mock ? delay(faqs) : apiClient.get<FaqItem[]>('/support/faqs').then((r) => r.data),
  payment: (): Promise<PaymentSummary> =>
    mock ? delay(paymentSummary) : apiClient.get<PaymentSummary>('/me/payment').then((r) => r.data),
  setDefaultPaymentMethod: (id: string): Promise<PaymentSummary> =>
    mock
      ? delay({
          ...paymentSummary,
          methods: paymentSummary.methods.map((m) => ({ ...m, isDefault: m.id === id })),
        })
      : apiClient.patch<PaymentSummary>('/me/payment/default-method', { id }).then((r) => r.data),
};

const mockAttendanceRows = (classId: string): AttendanceRow[] =>
  mockApplicantsByClass(classId).map((item, index) => ({
    id: item.id,
    name: item.name,
    checkedAt: index % 4 === 3 ? undefined : `10:0${index}`,
    status: index % 4 === 3 ? '결석' : index % 4 === 2 ? '지각' : '출석',
  }));

export const attendanceService = {
  issueQr: (classId: string): Promise<QrSession> =>
    mock
      ? delay({
          token: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        })
      : apiClient.post<QrSession>(`/classes/${classId}/attendance/qr`).then((r) => r.data),
  refreshQr: (classId: string): Promise<QrSession> =>
    mock
      ? delay({
          token: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        })
      : apiClient.post<QrSession>(`/classes/${classId}/attendance/qr/refresh`).then((r) => r.data),
  checkins: (classId: string): Promise<AttendanceRow[]> =>
    mock
      ? delay(mockAttendanceRows(classId))
      : apiClient
          .get<AttendanceRow[]>(`/classes/${classId}/attendance/checkins`)
          .then((r) => r.data),
  subscribe: (classId: string, onCheckin: (row: AttendanceRow) => void) => {
    if (mock) return () => undefined;
    const source = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL ?? ''}/classes/${classId}/attendance/stream`,
    );
    source.onmessage = (event) => onCheckin(JSON.parse(event.data) as AttendanceRow);
    return () => source.close();
  },
};

export const surveyService = {
  list: (classId: string): Promise<SurveyOverviewItem[]> =>
    mock
      ? delay(mockSurveyItems(classId))
      : apiClient.get<SurveyOverviewItem[]>(`/classes/${classId}/surveys`).then((r) => r.data),
  create: (classId: string, payload: unknown): Promise<SurveyOverviewItem> => {
    if (!mock)
      return apiClient
        .post<SurveyOverviewItem>(`/classes/${classId}/surveys`, payload)
        .then((r) => r.data);
    const input = payload as { title?: string; questions?: unknown[] };
    return delay(
      saveMockSurveyItem(classId, {
        id: crypto.randomUUID(),
        type: '설문',
        title: input.title || '새 설문',
        meta: `${input.questions?.length || 0}문항 · 익명`,
        status: '예정',
        response: 0,
      }),
    );
  },
  responses: (surveyId: string) =>
    mock ? delay([]) : apiClient.get(`/surveys/${surveyId}/responses`).then((r) => r.data),
  summary: (surveyId: string) =>
    mock
      ? delay({ surveyId, responses: 0 })
      : apiClient.get(`/surveys/${surveyId}/summary`).then((r) => r.data),
};

export const examService = {
  create: (classId: string, payload: unknown): Promise<SurveyOverviewItem> => {
    if (!mock)
      return apiClient
        .post<SurveyOverviewItem>(`/classes/${classId}/exams`, payload)
        .then((r) => r.data);
    const input = payload as { title?: string; questions?: unknown[]; passScore?: number };
    return delay(
      saveMockSurveyItem(classId, {
        id: crypto.randomUUID(),
        type: '시험',
        title: input.title || '새 시험',
        meta: `${input.questions?.length || 0}문항 · ${input.passScore ?? 70}점 이상 통과`,
        status: '예정',
        response: 0,
      }),
    );
  },
  responses: (examId: string) =>
    mock ? delay([]) : apiClient.get(`/exams/${examId}/responses`).then((r) => r.data),
  summary: (examId: string) =>
    mock
      ? delay({ examId, responses: 0 })
      : apiClient.get(`/exams/${examId}/summary`).then((r) => r.data),
};

export const certificateService = {
  recipients: (classId: string): Promise<Applicant[]> =>
    mock
      ? delay(mockApplicantsByClass(classId))
      : apiClient
          .get<Applicant[]>(`/classes/${classId}/certificates/recipients`)
          .then((r) => r.data),
  issue: (classId: string, applicantIds: string[]): Promise<void> =>
    mock
      ? delay(undefined)
      : apiClient
          .post<void>(`/classes/${classId}/certificates`, { applicantIds })
          .then((r) => r.data),
  download: (certificateId: string): Promise<Blob> =>
    apiClient
      .get(`/certificates/${certificateId}/pdf`, { responseType: 'blob' })
      .then((r) => r.data),
};

export const settlementService = {
  summary: (): Promise<SettlementSummary> => userService.settlement(),
  updateAccount: (account: string): Promise<SettlementSummary> =>
    mock
      ? delay({ ...settlementSummary, account })
      : apiClient.put<SettlementSummary>('/settlements/account', { account }).then((r) => r.data),
  exportCsv: (): Promise<Blob> =>
    mock
      ? delay(
          new Blob(
            [
              [
                '클래스,정산일,정산액',
                ...settlementSummary.rows.map((row) => `${row.title},${row.date},${row.amount}`),
              ].join('\n'),
            ],
            { type: 'text/csv;charset=utf-8' },
          ),
        )
      : apiClient.get('/settlements/export', { responseType: 'blob' }).then((r) => r.data),
};

export const notificationService = {
  list: userService.notifications,
  markAllRead: userService.markNotificationsRead,
  settings: userService.notificationSettings,
  updateSetting: userService.updateNotificationSetting,
  subscribe: (onNotification: (item: NotificationItem) => void) => {
    if (mock) return () => undefined;
    const source = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL ?? ''}/notifications/stream`,
    );
    source.onmessage = (event) => onNotification(JSON.parse(event.data) as NotificationItem);
    return () => source.close();
  },
};

export const dashboardService = { get: classService.dashboard };

export { oneclickService } from './oneclick';
export type {
  OneClickEnrollment,
  OneClickLearnRoom,
  OneClickLesson,
  OneClickShare,
} from './oneclick';
