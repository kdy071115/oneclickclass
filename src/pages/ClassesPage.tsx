import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <>
      <div className="oc-web-page">
        <div className="oc-web-head">
          <h1>클래스</h1>
          <p>{mode === 'mine' ? '내가 연 강의를 관리하세요' : '수강 중인 클래스를 확인하세요'}</p>
        </div>
        <div className="oc-filters">
          <button className={mode === 'mine' ? 'active' : ''} onClick={() => setMode('mine')}>
            내가 연 강의 {data.length}
          </button>
          <button className={mode === 'watch' ? 'active' : ''} onClick={() => setMode('watch')}>
            수강 중인 강의 2
          </button>
        </div>
        <div className="oc-filters">
          {(['전체', '모집중', '진행중', '종료'] as const).map((x) => (
            <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>
              {x}
            </button>
          ))}
        </div>
        <AsyncState loading={loading} error={error} empty={!loading && !error && !shown.length} onRetry={retry} />
        {!loading && !error && !!shown.length && (
          <div className="oc-table">
            <div className="oc-table-head">
              <span>클래스</span>
              <span>유형/일정</span>
              <span>신청 현황</span>
              <span>상태</span>
              <span />
            </div>
            {shown.map((c) => (
              <Link className="oc-table-row" to={mode === 'watch' ? `/learn/classes/${c.id}` : `/classes/${c.id}`} key={c.id}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <i
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: `linear-gradient(135deg,${c.color},color-mix(in srgb, ${c.color}, white 35%))`,
                    }}
                  />
                  <strong>{c.title}</strong>
                </span>
                <span>
                  {c.type} · {c.date}
                </span>
                <span>
                  {c.enrolled} / {c.capacity}명
                </span>
                <span
                  className="oc-status"
                  style={{
                    color: c.status === '모집중' ? '#3182f6' : c.status === '진행중' ? '#0ca678' : '#868e96',
                    background: c.status === '모집중' ? '#eff6ff' : c.status === '진행중' ? '#e6f9f1' : '#f1f3f5',
                  }}
                >
                  {c.status}
                </span>
                <span>›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
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
        <AsyncState loading={loading} error={error} empty={!loading && !error && !shown.length} onRetry={retry} />
        {shown.map((c) => (
          <ClassCard item={c} to={mode === 'watch' ? `/learn/classes/${c.id}` : undefined} key={c.id} />
        ))}
      </div>
    </>
  );
}
