import type { ClassStatus } from '../types/class';

export type StatusTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple';
export type PaymentStatus = '결제완료' | '결제대기' | '환불';
export type AttendanceStatus = '출석' | '지각' | '결석';

const statusTone: Record<ClassStatus | PaymentStatus | AttendanceStatus, StatusTone> = {
  준비중: 'warning',
  모집중: 'primary',
  진행중: 'success',
  종료: 'neutral',
  결제완료: 'success',
  결제대기: 'warning',
  환불: 'danger',
  출석: 'success',
  지각: 'warning',
  결석: 'danger',
};

export const getStatusTone = (status: string): StatusTone =>
  statusTone[status as keyof typeof statusTone] ?? 'neutral';
