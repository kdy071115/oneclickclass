import { useCallback, useState } from 'react';
import { classService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { ClassCard } from '../components/feature/ClassCard';
import { useAsync } from '../hooks/useAsync';
import type { ClassStatus } from '../types/class';
export function ClassesPage() {
  const load = useCallback(() => classService.list(), []);
  const { data = [], loading, error, retry } = useAsync(load);
  const [mode, setMode] = useState<'mine' | 'watch'>('mine');
  const [filter, setFilter] = useState<'전체' | ClassStatus>('전체');
  const base = mode === 'mine' ? data : data.slice(0, 2);
  const shown = filter === '전체' ? base : base.filter((x) => x.status === filter);
  return (
    <div className="page">
      <div className="title-row">
        <h1>클래스</h1>
      </div>
      <div className="segments">
        <button className={mode === 'mine' ? 'active' : ''} onClick={() => setMode('mine')}>
          내가 연 강의 <b>{data.length}</b>
        </button>
        <button className={mode === 'watch' ? 'active' : ''} onClick={() => setMode('watch')}>
          수강 중인 강의 <b>2</b>
        </button>
      </div>
      <div className="chips">
        {(['전체', '모집중', '진행중', '종료'] as const).map((x) => (
          <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>
            {x}
          </button>
        ))}
      </div>
      <AsyncState
        loading={loading}
        error={error}
        empty={!loading && !error && !shown.length}
        onRetry={retry}
      />
      {shown.map((c) => (
        <ClassCard
          item={c}
          to={mode === 'watch' ? `/learn/classes/${c.id}` : undefined}
          key={c.id}
        />
      ))}
    </div>
  );
}
