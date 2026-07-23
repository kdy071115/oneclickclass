import type { ClassDraft, CurriculumSection } from '../types/class';
import { validateContentUrl } from './content';

export type PublishIssue = {
  id: string;
  label: string;
  area: 'basic' | 'curriculum';
};

export function getPublishIssues(draft: ClassDraft, sections: CurriculumSection[]) {
  const issues: PublishIssue[] = [];
  if (!draft.title.trim()) issues.push({ id: 'title', label: '강의 제목을 입력해 주세요.', area: 'basic' });
  if (!draft.summary.trim()) issues.push({ id: 'summary', label: '한 줄 소개를 입력해 주세요.', area: 'basic' });
  if (!draft.startDate) issues.push({ id: 'schedule', label: '강의 일정을 정해 주세요.', area: 'basic' });
  if ((draft.type === 'offline' || draft.type === 'hybrid') && !draft.address.trim())
    issues.push({ id: 'location', label: '진행 장소를 입력해 주세요.', area: 'basic' });
  if (draft.payment === 'paid' && draft.price <= 0)
    issues.push({ id: 'price', label: '유료 강의의 참가비를 입력해 주세요.', area: 'basic' });

  const published = sections.flatMap((section) => section.lessons).filter((lesson) => lesson.published);
  if (!published.length)
    issues.push({ id: 'lesson', label: '공개할 차시를 1개 이상 만들어 주세요.', area: 'curriculum' });
  else if (published.some((lesson) => !lesson.contentUrl.trim() || validateContentUrl(lesson.contentUrl, lesson.contentType)))
    issues.push({ id: 'content', label: '공개 차시의 콘텐츠 주소를 확인해 주세요.', area: 'curriculum' });
  return issues;
}
