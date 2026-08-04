import { ChevronDown, Play } from 'lucide-react';
import {
  formatSectionSummary,
  type DisplayCurriculumGroup,
  type DisplayCurriculumItem,
} from '../../utils/curriculumDisplay';

type CourseCurriculumProps<T extends DisplayCurriculumItem> = {
  groups: DisplayCurriculumGroup<T>[];
  className?: string;
  linkedLessonIds?: readonly string[];
  maxLessons?: number;
  ariaLabel?: string;
};

export function CourseCurriculum<T extends DisplayCurriculumItem>({
  groups,
  className = '',
  linkedLessonIds = [],
  maxLessons,
  ariaLabel = '커리큘럼 차시',
}: CourseCurriculumProps<T>) {
  let visibleLessonCount = 0;

  return (
    <div className={`learner-curriculum ${className}`.trim()} role="list" aria-label={ariaLabel}>
      {groups.map((section, sectionIndex) => {
        const visibleItems = section.items.filter(() => {
          if (maxLessons === undefined || visibleLessonCount < maxLessons) {
            visibleLessonCount += 1;
            return true;
          }
          return false;
        });

        if (!visibleItems.length) return null;

        return (
          <details className="learner-curriculum-group" key={section.key} open>
            <summary className="learner-curriculum-section">
              <span>{String(sectionIndex + 1).padStart(2, '0')}</span>
              <strong>{section.title}</strong>
              <small>{formatSectionSummary(section.items.length, section.totalMinutes)}</small>
              <ChevronDown aria-hidden="true" />
            </summary>
            {visibleItems.map((lesson, lessonIndex) => (
              <article
                className={`learner-curriculum-row ${
                  linkedLessonIds.includes(lesson.lessonId) ? 'is-linked' : ''
                }`}
                role="listitem"
                key={lesson.lessonId}
              >
                <i>
                  <Play size={14} fill="currentColor" />
                </i>
                <span>
                  <b>
                    {sectionIndex + 1}-{lessonIndex + 1}차시 · {lesson.title}
                  </b>
                  {lesson.description && <small>{lesson.description}</small>}
                </span>
                <em>{lesson.durationText}</em>
              </article>
            ))}
          </details>
        );
      })}
    </div>
  );
}
