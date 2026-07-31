import type { Applicant } from '../types/class';

const normalize = (value: string) => value.toLocaleLowerCase('ko-KR').replace(/[\s-]/g, '');

export const matchesApplicantSearch = (applicant: Applicant, query: string) => {
  const keyword = normalize(query);
  return (
    !keyword ||
    normalize(`${applicant.name}${applicant.classTitle}${applicant.phone}`).includes(keyword)
  );
};
