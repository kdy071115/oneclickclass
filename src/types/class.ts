export type ClassStatus = '준비중' | '모집중' | '진행중' | '종료';
export type ClassLifecycleStatus =
  | 'DRAFT'
  | 'CURRICULUM'
  | 'READY'
  | 'RECRUITING'
  | 'IN_PROGRESS'
  | 'ENDED';
export interface ClassItem {
  id: string;
  courseMasterSeq?: string;
  courseActiveSeq?: string;
  lifecycleStatus?: ClassLifecycleStatus;
  title: string;
  status: ClassStatus;
  type: string;
  date: string;
  enrolled: number;
  capacity: number;
  color: string;
  thumbnail?: string;
}
export interface Applicant {
  id: string;
  classId?: string;
  name: string;
  classTitle: string;
  appliedAt: string;
  payment: '결제대기' | '결제완료' | '환불';
  amount: number;
  phone: string;
  email: string;
  answers: { label: string; value: string }[];
}
export interface Dashboard {
  newApplicants: number;
  todayClasses: number;
  pendingPayments: number;
  pendingAmount: number;
  classes: ClassItem[];
  applicants: Applicant[];
  studentStats?: StatItem[];
  studentInProgress?: StudentClassProgress[];
}
export interface StudentClassProgress {
  id: string;
  title: string;
  meta: string;
  progress: number;
  color: string;
}
export interface ClassDraft {
  type: 'online' | 'live' | 'offline' | 'hybrid';
  title: string;
  summary: string;
  description: string;
  thumbnail: string;
  startDate: string;
  recruitEndDate: string;
  capacity: number;
  payment: 'free' | 'paid';
  price: number;
  questions: string[];
  url: string;
  address: string;
  detailedAddress: string;
}
export interface ClassDetail extends ClassItem {
  summary: string;
  description: string;
  instructor: string;
  price: number;
  recruitEndDate: string;
  sessions: number;
  location: string;
  rating: number;
  reviewCount: number;
  completionRate: number;
  shareToken: string;
  publicOn?: boolean;
  recruitmentClosed?: boolean;
  applicantTrend: number[];
  curriculum: {
    id: string;
    sectionId?: string;
    sectionTitle?: string;
    title: string;
    description: string;
    durationText: string;
    published: boolean;
  }[];
  recentActivities: {
    id: string;
    type: 'applicant' | 'completion' | 'review';
    label: string;
    occurredAt: string;
  }[];
}
export type LessonContentType = 'video' | 'live' | 'document' | 'assignment';
export type LessonMarkerType = 'TEXT' | 'IMAGE' | 'QUIZ';
export interface LessonMarker {
  id: string;
  markerSeq?: string;
  timeSeconds: number;
  type: LessonMarkerType;
  title: string;
  content: string;
  imageUrl?: string;
  choices?: string[];
  answerIndex?: number;
}
export interface CurriculumLesson {
  id: string;
  organizationSeq?: string;
  itemSeq?: string;
  activeElementSeq?: string;
  contentsSeq?: string;
  title: string;
  description: string;
  contentType: LessonContentType;
  contentUrl: string;
  durationMinutes: number;
  preview: boolean;
  published: boolean;
  required?: boolean;
  sequential?: boolean;
  markers?: LessonMarker[];
}
export interface CurriculumSection {
  id: string;
  title: string;
  lessons: CurriculumLesson[];
}
export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'choice' | 'rating' | 'text';
  options?: string[];
}
export interface ExamQuestion {
  id: string;
  text: string;
  choices: string[];
  answer: number;
}
export interface CertificateItem {
  id: string;
  title: string;
  completedAt: string;
  attendance: number;
  score: number;
  color: string;
}
export interface StatItem {
  label: string;
  value: string;
  color: string;
}
export interface NotificationItem {
  id: string;
  group: string;
  type: 'apply' | 'pay' | 'review' | 'settle' | 'notice';
  title: string;
  message: string;
  time: string;
  unread: boolean;
  target: string;
}
export interface SettlementRow {
  id: string;
  title: string;
  date: string;
  amount: string;
  status: 'wait' | 'done';
}
export interface SettlementSummary {
  availableAmount: number;
  expectedAmount: number;
  stats: StatItem[];
  account: string;
  rows: SettlementRow[];
}
export interface NotificationSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  group: 'push' | 'marketing';
}
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  brandInitial: string;
  brandBg: string;
  brandColor: string;
  isDefault: boolean;
}
export interface BillingHistory {
  id: string;
  description: string;
  date: string;
  method: string;
  amount: string;
}
export interface PaymentSummary {
  plan: string;
  price: string;
  nextBillingDate: string;
  methods: PaymentMethod[];
  history: BillingHistory[];
}
