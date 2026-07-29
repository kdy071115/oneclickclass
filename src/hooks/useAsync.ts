import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const load = useCallback(() => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    loader()
      .then((value) => {
        if (currentRequest === requestId.current) setData(value);
      })
      .catch(() => {
        if (currentRequest === requestId.current) setError('데이터를 불러오지 못했어요.');
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [loader]);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return { data, loading, error, retry: load };
}
