import { useCallback, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { classService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { ClassCard } from '../components/feature/ClassCard';
import { Badge, IconButton, Table, type TableColumn } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import type { ClassItem, ClassStatus } from '../types/class';
import { getStatusTone } from '../utils/status';
import { getClassThumbnail } from '../utils/classThumbnail';
export function ClassesPage() {
  const load = useCallback(() => classService.list(), []);
  const { data = [], loading, error, retry } = useAsync(load);
  const [mode, setMode] = useState<'mine' | 'watch'>('mine');
  const [filter, setFilter] = useState<'전체' | ClassStatus>('전체');
  const [sort, setSort] = useState<'title' | 'status'>('title');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [view, setView] = useState<'table' | 'cards'>('cards');
  const [favorites, setFavorites] = useState<string[]>([]);
  const base = mode === 'mine' ? data : data.slice(0, 2);
  const shown = filter === '전체' ? base : base.filter((x) => x.status === filter);
  const sorted = [...shown].sort((a, b) => a[sort].localeCompare(b[sort]) * (direction === 'asc' ? 1 : -1));
  const columns: TableColumn<ClassItem>[] = [
    { key: 'title', header: '클래스', sortable: true, render: (item) => { const thumbnail = item.thumbnail || getClassThumbnail(item.id); return <Link className="class-table-title" to={mode === 'watch' ? `/learn/classes/${item.id}` : `/classes/${item.id}`}><i style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : { background: item.color }} /><strong>{item.title}</strong></Link>; } },
    { key: 'schedule', header: '유형/일정', render: (item) => <>{item.type} · {item.date}</> },
    { key: 'enrolled', header: '신청 현황', render: (item) => <>{item.enrolled} / {item.capacity}명</> },
    { key: 'status', header: '상태', sortable: true, render: (item) => <Badge tone={getStatusTone(item.status)}>{item.status}</Badge> },
  ];
  const handleSort = (key: string) => {
    if (key !== 'title' && key !== 'status') return;
    if (sort === key) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setDirection('asc'); }
  };
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
        <div className="class-list-toolbar">
          <div className="oc-filters">
            {(['전체', '모집중', '진행중', '종료'] as const).map((x) => <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>{x}</button>)}
          </div>
          <div className="class-view-switch" aria-label="보기 방식">
            <IconButton label="카드로 보기" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}><LayoutGrid size={18} /></IconButton>
            <IconButton label="표로 보기" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><List size={19} /></IconButton>
          </div>
        </div>
        {error ? <AsyncState loading={false} error={error} onRetry={retry} /> : view === 'table' ? <Table columns={columns} rows={sorted} rowKey={(item) => item.id} loading={loading} sortKey={sort} sortDirection={direction} onSort={handleSort} /> : <div className="class-web-grid">{sorted.map((item) => <ClassCard item={item} variant="grid" to={mode === 'watch' ? `/learn/classes/${item.id}` : undefined} favorite={mode === 'watch' && !favorites.includes(item.id)} onFavorite={() => setFavorites([...favorites, item.id])} key={item.id} />)}</div>}
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
