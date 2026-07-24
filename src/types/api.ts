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
