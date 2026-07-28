import type { AttendanceStatus, PaymentStatus } from '../utils/status';
import type { ClassLifecycleStatus, RecruitmentStatus } from './class';

export interface PageQuery {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, string>;
}

export interface QrSession {
  token: string;
  expiresAt: string;
}

export interface AttendanceRow {
  id: string;
  name: string;
  checkedAt?: string;
  status: AttendanceStatus;
}

export interface SurveyOverviewItem {
  id: string;
  type: '설문' | '시험';
  title: string;
  meta: string;
  status: '진행중' | '마감' | '예정';
  response: number;
}

export interface ClassSettingsUpdate {
  lifecycleStatus?: ClassLifecycleStatus;
  recruitmentStatus?: RecruitmentStatus;
  publicOn?: boolean;
  recruitmentClosed?: boolean;
  capacity?: number;
}

export interface ApplicantUpdate {
  payment: PaymentStatus;
}

export type CertificateIssueMode = 'MANUAL' | 'AUTO';
export type CertificateEligibility = 'ELIGIBLE' | 'INELIGIBLE' | 'ISSUED';
export type CertificateTemplate = 'CLASSIC' | 'MODERN' | 'MINIMAL';

export interface CertificatePolicy {
  minProgress: number;
  requireRequiredLessons: boolean;
  requireSurvey: boolean;
  requireExam: boolean;
  minExamScore: number;
  minAttendance: number | null;
  issueMode: CertificateIssueMode;
  message: string;
  issuer: string;
  signerName: string;
  template: CertificateTemplate;
  accentColor: string;
  sealImageUrl?: string;
}

export interface CertificateCandidate {
  applicantId: string;
  name: string;
  email: string;
  progress: number;
  requiredLessonsCompleted: number;
  requiredLessonsTotal: number;
  surveyCompleted: boolean;
  examScore: number | null;
  attendanceRate: number | null;
  eligibility: CertificateEligibility;
  reasons: string[];
  certificateId?: string;
  issuedAt?: string;
}

export interface CertificateIssueResult {
  issued: CertificateCandidate[];
  skipped: Array<{ applicantId: string; reason: string }>;
}
