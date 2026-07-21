import { apiClient } from './client';
import type { AuthSession, LoginRequest, SignupRequest } from '../types/auth';
import type { ApplicantUpdate, AttendanceRow, PageQuery, PageResponse, QrSession } from '../types/api';
import { applicants, certificates, classDetail, classes, dashboard, examQuestions, faqs, notifications, notificationSettings, paymentSummary, settlementSummary, surveyQuestions } from '../constants/mockData';
import type { Applicant, CertificateItem, ClassDetail, ClassDraft, ClassItem, Dashboard, ExamQuestion, FaqItem, NotificationItem, NotificationSetting, PaymentSummary, SettlementSummary, SurveyQuestion } from '../types/class';
const mock = import.meta.env.VITE_USE_MOCK !== 'false';
const delay = <T,>(data:T) => new Promise<T>((resolve)=>setTimeout(()=>resolve(data),350));
const pageItems = <T,>(items: T[], query: PageQuery = {}): PageResponse<T> => {
  const page = Math.max(1, query.page ?? 1);
  const size = Math.max(1, query.size ?? 20);
  const start = (page - 1) * size;
  return { items: items.slice(start, start + size), page, size, total: items.length, totalPages: Math.ceil(items.length / size) };
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
    return (await apiClient.post<Pick<AuthSession, 'accessToken'>>('/auth/refresh', { refreshToken })).data;
  },
  async logout(refreshToken?: string) {
    if (mock) return delay(undefined);
    await apiClient.post('/auth/logout', { refreshToken });
  },
};
export const classService = {
  dashboard: ():Promise<Dashboard> => mock ? delay(dashboard) : apiClient.get<Dashboard>('/dashboard').then(r=>r.data),
  list: ():Promise<ClassItem[]> => mock ? delay(classes) : apiClient.get<ClassItem[]>('/classes').then(r=>r.data),
  listPage: (query: PageQuery = {}): Promise<PageResponse<ClassItem>> => mock ? delay(pageItems(classes, query)) : apiClient.get<PageResponse<ClassItem>>('/classes', { params: query }).then(r=>r.data),
  get: (id:string):Promise<ClassItem> => mock ? delay(classes.find(c=>c.id===id) ?? classes[0]) : apiClient.get<ClassItem>(`/classes/${id}`).then(r=>r.data),
  create: (draft:ClassDraft):Promise<ClassItem> => mock ? delay({...classes[0],id:crypto.randomUUID(),title:draft.title,capacity:draft.capacity,enrolled:0,thumbnail:draft.thumbnail}) : apiClient.post<ClassItem>('/classes',draft).then(r=>r.data),
  update: (id:string, draft:Partial<ClassDraft>):Promise<ClassItem> => mock ? delay({...classes[0],...draft,id}) : apiClient.patch<ClassItem>(`/classes/${id}`,draft).then(r=>r.data),
  remove: (id:string):Promise<void> => mock ? delay(undefined) : apiClient.delete<void>(`/classes/${id}`).then(r=>r.data),
  uploadImage: (file:File):Promise<{url:string}> => {
    if (mock) return delay({url:URL.createObjectURL(file)});
    const form = new FormData(); form.append('file',file);
    return apiClient.post<{url:string}>('/classes/images',form,{headers:{'Content-Type':'multipart/form-data'}}).then(r=>r.data);
  },
};
export const applicantService = {
  list: ():Promise<Applicant[]> => mock ? delay(applicants) : apiClient.get<Applicant[]>('/applicants').then(r=>r.data),
  listPage: (query:PageQuery = {}):Promise<PageResponse<Applicant>> => mock ? delay(pageItems(applicants,query)) : apiClient.get<PageResponse<Applicant>>('/applicants',{params:query}).then(r=>r.data),
  get: (id:string):Promise<Applicant> => mock ? delay(applicants.find(a=>a.id===id) ?? applicants[0]) : apiClient.get<Applicant>(`/applicants/${id}`).then(r=>r.data),
  updatePayment: (id:string, update:ApplicantUpdate):Promise<Applicant> => mock ? delay({...applicants.find(a=>a.id===id) ?? applicants[0],payment:update.payment}) : apiClient.patch<Applicant>(`/applicants/${id}/payment`,update).then(r=>r.data),
  sendMessage: (id:string, message:string):Promise<void> => mock ? delay(undefined) : apiClient.post<void>(`/applicants/${id}/messages`,{message}).then(r=>r.data),
};
export const detailService={
  getClass:(id:string):Promise<ClassDetail>=>mock?delay({...classDetail,id}):apiClient.get<ClassDetail>(`/classes/${id}/detail`).then(r=>r.data),
  surveyQuestions:():Promise<SurveyQuestion[]>=>mock?delay(surveyQuestions):apiClient.get<SurveyQuestion[]>('/surveys/current/questions').then(r=>r.data),
  examQuestions:():Promise<ExamQuestion[]>=>mock?delay(examQuestions):apiClient.get<ExamQuestion[]>('/exams/current/questions').then(r=>r.data),
  certificates:():Promise<CertificateItem[]>=>mock?delay(certificates):apiClient.get<CertificateItem[]>('/certificates').then(r=>r.data),
};
export const userService = {
  notifications: (): Promise<NotificationItem[]> => mock ? delay(notifications) : apiClient.get<NotificationItem[]>('/me/notifications').then(r=>r.data),
  markNotificationsRead: (): Promise<void> => mock ? delay(undefined) : apiClient.post<void>('/me/notifications/read').then(r=>r.data),
  settlement: (): Promise<SettlementSummary> => mock ? delay(settlementSummary) : apiClient.get<SettlementSummary>('/me/settlement').then(r=>r.data),
  notificationSettings: (): Promise<NotificationSetting[]> => mock ? delay(notificationSettings) : apiClient.get<NotificationSetting[]>('/me/notification-settings').then(r=>r.data),
  updateNotificationSetting: (key:string, enabled:boolean): Promise<NotificationSetting> => mock ? delay({...(notificationSettings.find(s=>s.key===key) ?? notificationSettings[0]), enabled}) : apiClient.patch<NotificationSetting>(`/me/notification-settings/${key}`, { enabled }).then(r=>r.data),
  faqs: (): Promise<FaqItem[]> => mock ? delay(faqs) : apiClient.get<FaqItem[]>('/support/faqs').then(r=>r.data),
  payment: (): Promise<PaymentSummary> => mock ? delay(paymentSummary) : apiClient.get<PaymentSummary>('/me/payment').then(r=>r.data),
  setDefaultPaymentMethod: (id:string): Promise<PaymentSummary> => mock ? delay({...paymentSummary, methods: paymentSummary.methods.map(m=>({...m, isDefault:m.id===id}))}) : apiClient.patch<PaymentSummary>('/me/payment/default-method', { id }).then(r=>r.data),
};

const attendanceRows: AttendanceRow[] = applicants.map((item, index) => ({ id: item.id, name: item.name, checkedAt: index === 3 ? undefined : `10:0${index}`, status: index === 3 ? '결석' : index === 2 ? '지각' : '출석' }));

export const attendanceService = {
  issueQr: (classId:string):Promise<QrSession> => mock ? delay({token:crypto.randomUUID(),expiresAt:new Date(Date.now()+300000).toISOString()}) : apiClient.post<QrSession>(`/classes/${classId}/attendance/qr`).then(r=>r.data),
  refreshQr: (classId:string):Promise<QrSession> => mock ? delay({token:crypto.randomUUID(),expiresAt:new Date(Date.now()+300000).toISOString()}) : apiClient.post<QrSession>(`/classes/${classId}/attendance/qr/refresh`).then(r=>r.data),
  checkins: (classId:string):Promise<AttendanceRow[]> => mock ? delay(attendanceRows) : apiClient.get<AttendanceRow[]>(`/classes/${classId}/attendance/checkins`).then(r=>r.data),
  subscribe: (classId:string, onCheckin:(row:AttendanceRow)=>void) => {
    if (mock) return () => undefined;
    const source = new EventSource(`${import.meta.env.VITE_API_BASE_URL ?? ''}/classes/${classId}/attendance/stream`);
    source.onmessage = (event) => onCheckin(JSON.parse(event.data) as AttendanceRow);
    return () => source.close();
  },
};

export const surveyService = {
  create: (classId:string, payload:unknown) => mock ? delay({id:crypto.randomUUID(),classId,payload}) : apiClient.post(`/classes/${classId}/surveys`,payload).then(r=>r.data),
  responses: (surveyId:string) => mock ? delay([]) : apiClient.get(`/surveys/${surveyId}/responses`).then(r=>r.data),
  summary: (surveyId:string) => mock ? delay({surveyId,responses:0}) : apiClient.get(`/surveys/${surveyId}/summary`).then(r=>r.data),
};

export const examService = {
  create: (classId:string, payload:unknown) => mock ? delay({id:crypto.randomUUID(),classId,payload}) : apiClient.post(`/classes/${classId}/exams`,payload).then(r=>r.data),
  responses: (examId:string) => mock ? delay([]) : apiClient.get(`/exams/${examId}/responses`).then(r=>r.data),
  summary: (examId:string) => mock ? delay({examId,responses:0}) : apiClient.get(`/exams/${examId}/summary`).then(r=>r.data),
};

export const certificateService = {
  recipients: (classId:string):Promise<Applicant[]> => mock ? delay(applicants.slice(1)) : apiClient.get<Applicant[]>(`/classes/${classId}/certificates/recipients`).then(r=>r.data),
  issue: (classId:string, applicantIds:string[]):Promise<void> => mock ? delay(undefined) : apiClient.post<void>(`/classes/${classId}/certificates`,{applicantIds}).then(r=>r.data),
  download: (certificateId:string):Promise<Blob> => apiClient.get(`/certificates/${certificateId}/pdf`,{responseType:'blob'}).then(r=>r.data),
};

export const settlementService = {
  summary: ():Promise<SettlementSummary> => userService.settlement(),
  updateAccount: (account:string):Promise<SettlementSummary> => mock ? delay({...settlementSummary,account}) : apiClient.put<SettlementSummary>('/settlements/account',{account}).then(r=>r.data),
  exportCsv: ():Promise<Blob> => mock ? delay(new Blob([['클래스,정산일,정산액',...settlementSummary.rows.map(row=>`${row.title},${row.date},${row.amount}`)].join('\n')],{type:'text/csv;charset=utf-8'})) : apiClient.get('/settlements/export',{responseType:'blob'}).then(r=>r.data),
};

export const notificationService = {
  list: userService.notifications,
  markAllRead: userService.markNotificationsRead,
  settings: userService.notificationSettings,
  updateSetting: userService.updateNotificationSetting,
  subscribe: (onNotification:(item:NotificationItem)=>void) => {
    if (mock) return () => undefined;
    const source = new EventSource(`${import.meta.env.VITE_API_BASE_URL ?? ''}/notifications/stream`);
    source.onmessage = (event) => onNotification(JSON.parse(event.data) as NotificationItem);
    return () => source.close();
  },
};

export const dashboardService = { get: classService.dashboard };

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
};

export type OneClickEnrollment = {
  memberSeq: string;
  courseApplySeq: string;
  courseActiveSeq: string;
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

const oneclickEnrollmentKey = (courseActiveSeq:string) => `oneclick.enrollment.${courseActiveSeq}`;

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? value as Record<string, unknown> : {});
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
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
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
const normalizeApplyStatus = (value: string): OneClickShare['applyStatus'] => (
  value === 'CLOSED' || value === 'N' || value.includes('CLOSE') ? 'CLOSED' : 'OPEN'
);
const normalizePaymentType = (price: number, value: string): OneClickShare['paymentType'] => (
  price > 0 || value === 'PAID' || value.includes('PAY') ? 'PAID' : 'FREE'
);

const normalizeShare = (raw: unknown, shareToken: string): OneClickShare => {
  const root = asRecord(raw);
  const courseActive = pickRecord(root, ['courseActive', 'active', 'courseActiveVO']);
  const courseMaster = pickRecord(root, ['courseMaster', 'master']);
  const instructor = pickRecord(root, ['instructor', 'teacher', 'professor', 'member']);
  const merged = { ...root, ...courseMaster, ...courseActive };
  const title = pickString(merged, ['title', 'courseActiveTitle', 'courseMasterTitle', 'courseTitle'], mockShare(shareToken).title);
  const price = pickNumber(merged, ['price', 'educationCost', 'tuition', 'coursePrice'], mockShare(shareToken).price);
  return {
    shareToken: pickString(root, ['shareToken', 'token'], shareToken),
    courseActiveSeq: pickString(merged, ['courseActiveSeq', 'course_active_seq', 'activeSeq'], mockShare(shareToken).courseActiveSeq),
    courseMasterSeq: pickString(merged, ['courseMasterSeq', 'course_master_seq', 'masterSeq'], mockShare(shareToken).courseMasterSeq),
    title,
    summary: pickString(merged, ['summary', 'courseActiveSummary', 'courseSummary', 'subtitle'], mockShare(shareToken).summary),
    description: pickString(merged, ['description', 'courseActiveDescription', 'intro', 'contents'], mockShare(shareToken).description),
    price,
    capacity: pickNumber(merged, ['capacity', 'courseMemberCnt', 'limitCnt', 'recruitCnt'], mockShare(shareToken).capacity),
    enrolled: pickNumber(merged, ['enrolled', 'applyCnt', 'takeCnt', 'memberCnt'], mockShare(shareToken).enrolled),
    applyStatus: normalizeApplyStatus(pickString(merged, ['applyStatus', 'applyYn', 'recruitStatusCd'], 'OPEN')),
    paymentType: normalizePaymentType(price, pickString(merged, ['paymentType', 'paymentTypeCd', 'priceTypeCd'], '')),
    instructorName: pickString(instructor, ['instructorName', 'memberFullName', 'profName', 'name'], mockShare(shareToken).instructorName),
    scheduleText: pickString(merged, ['scheduleText', 'studyPeriodText', 'coursePeriodText', 'schedule'], mockShare(shareToken).scheduleText),
    locationText: pickString(merged, ['locationText', 'educationPlace', 'place', 'classroom'], mockShare(shareToken).locationText),
  };
};

const normalizeEnrollment = (raw: unknown, fallbackCourseActiveSeq: string, fallbackName = '수강생'): OneClickEnrollment => {
  const root = asRecord(raw);
  const apply = pickRecord(root, ['apply', 'courseApply', 'courseApplyVO', 'enrollment']);
  const member = pickRecord(root, ['member', 'user', 'learner']);
  const merged = { ...root, ...apply };
  return {
    memberSeq: pickString({ ...merged, ...member }, ['memberSeq', 'userId', 'memberId'], ''),
    courseApplySeq: pickString(merged, ['courseApplySeq', 'enrollmentId', 'applySeq'], ''),
    courseActiveSeq: pickString(merged, ['courseActiveSeq', 'course_active_seq', 'activeSeq'], fallbackCourseActiveSeq),
    learnerName: pickString({ ...member, ...merged }, ['learnerName', 'memberFullName', 'name', 'memberName'], fallbackName),
    applyStatusCd: pickString(merged, ['applyStatusCd', 'applyStatus', 'status'], 'APPLY_STATUS::002') as OneClickEnrollment['applyStatusCd'],
    progress: Math.min(100, Math.max(0, pickNumber(merged, ['progress', 'progressRate', 'totalProgress', 'appMyRateScore'], 0))),
    lastPosition: pickString(merged, ['lastPosition', 'lastStudyPosition', 'resumeText'], '1강 0분 0초'),
  };
};

const fallbackLessons = (): OneClickLesson[] => [
  ['1', '업무 구조 잡기', '흩어진 업무를 수강생 상황에 맞게 정리합니다.', '42분', 100],
  ['2', '자동화 흐름 만들기', '반복 입력, 알림, 상태 변경을 자동화합니다.', '52분', 62],
  ['3', '팀 협업 템플릿 완성', '함께 쓰기 좋은 권한과 보드 구조를 만듭니다.', '48분', 0],
].map(([step, title, description, durationText, progress], index) => ({
  lessonId: String(step),
  title: String(title),
  description: String(description),
  durationText: String(durationText),
  progress: Number(progress),
  locked: index >= 2,
  completed: Number(progress) >= 100,
  playable: index < 2,
}));

const normalizeLessons = (raw: unknown): OneClickLesson[] => {
  const root = asRecord(raw);
  const list = firstArray(root, ['lessons', 'curriculum', 'elementList', 'listElement', 'list']);
  if (!list.length) return fallbackLessons();
  return list.map((item, index) => {
    const record = asRecord(item);
    const progress = Math.min(100, Math.max(0, pickNumber(record, ['progress', 'progressRate', 'rate', 'completeRate'], index === 0 ? 100 : 0)));
    const locked = pickBoolean(record, ['locked', 'lockYn'], false) || pickString(record, ['useYn', 'playableYn'], 'Y') === 'N';
    return {
      lessonId: pickString(record, ['lessonId', 'activeElementSeq', 'organizationSeq', 'itemSeq', 'seq'], String(index + 1)),
      title: pickString(record, ['title', 'elementTitle', 'organizationTitle', 'itemTitle', 'name'], `${index + 1}강`),
      description: pickString(record, ['description', 'summary', 'contents'], ''),
      durationText: pickString(record, ['durationText', 'studyTimeText', 'learningTimeText'], `${pickNumber(record, ['durationMinutes', 'studyTime', 'learningTime'], 0)}분`),
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
    noticeCount: pickNumber(root, ['noticeCount', 'noticeCnt'], firstArray(root, ['noticeList', 'listNotice']).length),
    resourceCount: pickNumber(root, ['resourceCount', 'resourceCnt'], firstArray(root, ['resourceList', 'listResource']).length),
    examCount: pickNumber(root, ['examCount', 'examCnt'], firstArray(root, ['examList', 'listExamPaper']).length),
    surveyCount: pickNumber(root, ['surveyCount', 'surveyCnt'], firstArray(root, ['surveyList', 'listSurveyPaper']).length),
  };
};

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

const mockShare = (shareToken:string): OneClickShare => {
  const draft = classes[0];
  return {
    shareToken,
    courseActiveSeq: shareToken === '7KpX92Lm' ? '104' : 'notion',
    courseMasterSeq: 'notion-master',
    title: draft.title,
    summary: '반복 업무를 자동화하는 실전 4주 과정',
    description: '데이터베이스 설계부터 반복 업무 자동화, 팀 협업 템플릿까지 직접 만들며 배웁니다.',
    price: 45000,
    capacity: draft.capacity,
    enrolled: draft.enrolled,
    applyStatus: 'OPEN',
    paymentType: 'PAID',
    instructorName: '이지훈',
    scheduleText: '자유 수강',
    locationText: '온라인 강의실',
  };
};

export const oneclickService = {
  share: (shareToken:string): Promise<OneClickShare> =>
    mock ? delay(mockShare(shareToken)) : apiClient.get<unknown>(`/oneclick/shares/${shareToken}`).then(r=>normalizeShare(r.data, shareToken)),
  apply: (shareToken:string, input:{name:string; phone:string; email?:string}): Promise<OneClickEnrollment> => {
    if (!mock) return apiClient.post<unknown>(`/oneclick/shares/${shareToken}/apply`, input).then(r=>normalizeEnrollment(r.data, '', input.name));
    const share = mockShare(shareToken);
    const enrollment = {
      memberSeq: crypto.randomUUID(),
      courseApplySeq: crypto.randomUUID(),
      courseActiveSeq: share.courseActiveSeq,
      learnerName: input.name,
      applyStatusCd: 'APPLY_STATUS::002' as const,
      progress: 62,
      lastPosition: '3강 14분 27초',
    };
    localStorage.setItem(oneclickEnrollmentKey(share.courseActiveSeq), JSON.stringify(enrollment));
    return delay(enrollment);
  },
  enrollment: (courseActiveSeq:string): Promise<OneClickEnrollment | null> => {
    if (!mock) return apiClient.get<unknown>(`/oneclick/learn/${courseActiveSeq}`).then(r=>normalizeEnrollment(r.data, courseActiveSeq)).catch(()=>null);
    const value = localStorage.getItem(oneclickEnrollmentKey(courseActiveSeq));
    if (!value) return delay(null);
    const enrollment = JSON.parse(value) as OneClickEnrollment;
    return delay({ ...enrollment, courseActiveSeq: enrollment.courseActiveSeq || courseActiveSeq });
  },
  learnRoom: (courseActiveSeq:string): Promise<OneClickLearnRoom | null> => {
    if (!mock) return apiClient.get<unknown>(`/oneclick/learn/${courseActiveSeq}/room`).then(r=>normalizeLearnRoom(r.data, courseActiveSeq)).catch(()=>null);
    const value = localStorage.getItem(oneclickEnrollmentKey(courseActiveSeq));
    if (!value) return delay(null);
    const enrollment = JSON.parse(value) as OneClickEnrollment;
    return delay({
      ...enrollment,
      courseActiveSeq: enrollment.courseActiveSeq || courseActiveSeq,
      courseTitle: mockShare(courseActiveSeq).title,
      courseSummary: mockShare(courseActiveSeq).summary,
      lessons: fallbackLessons(),
      tools: { noticeCount: 1, resourceCount: 3, examCount: 1, surveyCount: 1 },
    });
  },
  continueWithPhone: (courseActiveSeq:string, phone:string): Promise<OneClickEnrollment> => {
    if (!mock) return apiClient.post<unknown>(`/oneclick/learn/${courseActiveSeq}/continue`, { phone }).then(r=>normalizeEnrollment(r.data, courseActiveSeq));
    const enrollment = {
      memberSeq: crypto.randomUUID(),
      courseApplySeq: crypto.randomUUID(),
      courseActiveSeq,
      learnerName: '수강생',
      applyStatusCd: 'APPLY_STATUS::002' as const,
      progress: 62,
      lastPosition: '3강 14분 27초',
    };
    localStorage.setItem(oneclickEnrollmentKey(courseActiveSeq), JSON.stringify(enrollment));
    return delay(enrollment);
  },
  heartbeat: (courseActiveSeq:string, input:{courseApplySeq:string; lessonId:string; currentSeconds:number; playing:boolean}): Promise<void> => {
    if (mock) return delay(undefined);
    return apiClient.post<void>(`/oneclick/learn/${courseActiveSeq}/heartbeat`, input).then(r=>r.data);
  },
};
