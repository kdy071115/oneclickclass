import { apiClient } from './client';
import type { AuthSession, LoginRequest, SignupRequest } from '../types/auth';
import type { ApplicantUpdate, AttendanceRow, PageQuery, PageResponse, QrSession } from '../types/api';
import { applicants, certificates, classDetail, classes, dashboard, examQuestions, faqs, notifications, notificationSettings, paymentSummary, settlementSummary, surveyQuestions, wishlistItems } from '../constants/mockData';
import type { Applicant, CertificateItem, ClassDetail, ClassDraft, ClassItem, Dashboard, ExamQuestion, FaqItem, MarketClass, NotificationItem, NotificationSetting, PaymentSummary, SettlementSummary, SurveyQuestion } from '../types/class';
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
  wishlist: (): Promise<MarketClass[]> => mock ? delay(wishlistItems) : apiClient.get<MarketClass[]>('/me/wishlist').then(r=>r.data),
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
