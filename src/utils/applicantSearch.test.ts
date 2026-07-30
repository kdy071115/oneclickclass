import { describe, expect, it } from 'vitest';
import type { Applicant } from '../types/class';
import { matchesApplicantSearch } from './applicantSearch';

const applicant: Applicant = {
  id: '1',
  name: '김서연',
  classTitle: '노션 업무 자동화',
  appliedAt: '방금',
  payment: '결제대기',
  amount: 45000,
  phone: '010-2345-6789',
  email: 'seoyeon@example.com',
  answers: [],
};

describe('신청자 검색', () => {
  it('이름·클래스·하이픈 없는 전화번호를 모두 찾는다', () => {
    expect(matchesApplicantSearch(applicant, '서연')).toBe(true);
    expect(matchesApplicantSearch(applicant, '업무 자동화')).toBe(true);
    expect(matchesApplicantSearch(applicant, '01023456789')).toBe(true);
    expect(matchesApplicantSearch(applicant, '파이썬')).toBe(false);
  });
});
