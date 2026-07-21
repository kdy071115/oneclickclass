import { Award, BookOpen, CreditCard, Grid2X2, Heart, Home, UserRound, Users } from 'lucide-react';

export const mobileNav = [
  ['/dashboard', Home, '홈'],
  ['/classes', Grid2X2, '클래스'],
  ['/applicants', Users, '신청자'],
  ['/my', UserRound, '마이'],
] as const;

export const teacherNav = [
  ['/dashboard', Home, '홈'],
  ['/classes', BookOpen, '클래스'],
  ['/applicants', Users, '신청자', '3'],
  ['/settlements', CreditCard, '정산 관리'],
  ['/my/certificates', Award, '수료증'],
] as const;

export const studentNav = [
  ['/dashboard', Home, '홈'],
  ['/classes', BookOpen, '클래스'],
  ['/wishlist', Heart, '관심 클래스'],
  ['/my/certificates', Award, '수료증'],
] as const;
