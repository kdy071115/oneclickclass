import { useCallback, useEffect, useState } from 'react';
import { oneclickService } from '../api/oneclick';

export function useCourseBookmark(courseActiveSeq?: string, enabled = true) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!courseActiveSeq || !enabled) {
      setBookmarked(false);
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    oneclickService
      .courseBookmark(courseActiveSeq)
      .then((result) => {
        if (alive) setBookmarked(result.bookmarked);
      })
      .catch(() => {
        if (alive) setError('관심 상태를 확인하지 못했어요.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [courseActiveSeq, enabled]);

  const toggle = useCallback(async () => {
    if (!courseActiveSeq || loading) return;
    const previous = bookmarked;
    setBookmarked(!previous);
    setLoading(true);
    setError('');
    try {
      const result = previous
        ? await oneclickService.removeCourseBookmark(courseActiveSeq)
        : await oneclickService.saveCourseBookmark(courseActiveSeq);
      setBookmarked(result.bookmarked);
    } catch {
      setBookmarked(previous);
      setError('관심 상태를 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [bookmarked, courseActiveSeq, loading]);

  return { bookmarked, loading, error, toggle };
}
