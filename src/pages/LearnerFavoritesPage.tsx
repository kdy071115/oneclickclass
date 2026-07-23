import { ArrowLeft, Heart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { oneclickService, type OneClickShare } from '../api/oneclick';
import { AsyncState } from '../components/common/AsyncState';
import { useAsync } from '../hooks/useAsync';

export function LearnerFavoritesPage() {
  const navigate = useNavigate();
  const load = useCallback(() => oneclickService.courseBookmarks(), []);
  const { data, loading, error, retry } = useAsync(load);
  const [courses, setCourses] = useState<OneClickShare[]>([]);
  const [removingId, setRemovingId] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (data) setCourses(data);
  }, [data]);

  const remove = async (courseActiveSeq: string) => {
    if (removingId) return;
    setRemovingId(courseActiveSeq);
    setActionError('');
    try {
      await oneclickService.removeCourseBookmark(courseActiveSeq);
      setCourses((current) => current.filter((course) => course.courseActiveSeq !== courseActiveSeq));
    } catch {
      setActionError('관심 클래스를 해제하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setRemovingId('');
    }
  };

  return (
    <div className="learner-shell learner-favorites-shell">
      <header className="learner-room-topbar">
        <button className="learner-back-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft />
          <span>뒤로</span>
        </button>
        <b>관심 클래스</b>
        <span>{courses.length}개</span>
      </header>
      <main className="learner-favorites-main">
        <div className="learner-favorites-heading">
          <Heart fill="currentColor" />
          <div>
            <h1>다시 보고 싶은 클래스를 모았어요.</h1>
            <p>관심 등록한 클래스의 모집 정보와 커리큘럼을 바로 확인할 수 있어요.</p>
          </div>
        </div>
        <AsyncState
          loading={loading}
          error={error}
          onRetry={retry}
        />
        {actionError && <p className="learner-bookmark-error" role="status">{actionError}</p>}
        {!loading && !error && courses.length === 0 && (
          <section className="learner-favorites-empty">
            <Heart />
            <h2>아직 관심 클래스가 없어요.</h2>
            <p>수강 중인 강의나 신청 페이지에서 하트를 눌러 저장해 보세요.</p>
          </section>
        )}
        {courses.length > 0 && (
          <section className="learner-favorites-grid" aria-label="관심 클래스 목록">
            {courses.map((course) => (
              <article key={course.courseActiveSeq}>
                <div className="learner-favorite-cover">
                  <span>{course.recruitmentStatus === 'OPEN' ? '모집중' : '모집 마감'}</span>
                  <button
                    type="button"
                    aria-label={`${course.title} 관심 클래스 해제`}
                    disabled={removingId === course.courseActiveSeq}
                    onClick={() => void remove(course.courseActiveSeq)}
                  >
                    <Heart fill="currentColor" />
                  </button>
                </div>
                <div>
                  <h2>{course.title}</h2>
                  <p>{course.summary}</p>
                  <small>
                    {course.instructorName} · {course.scheduleText}
                  </small>
                  <Link to={`/s/${course.shareToken}`}>강의 정보 보기</Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
