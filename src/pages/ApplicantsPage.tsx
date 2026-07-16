import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicantService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { ApplicantRow } from '../components/feature/ApplicantRow';
import { Avatar, Badge, SearchInput, Table, type TableColumn } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import type { Applicant } from '../types/class';
import { won } from '../utils/format';
import { getStatusTone } from '../utils/status';

const filters = ['전체', '결제완료', '결제대기', '환불'] as const;

export function ApplicantsPage() {
  const load = useCallback(() => applicantService.list(), []);
  const { data = [], loading, error, retry } = useAsync(load);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]>('전체');
  const [sort, setSort] = useState<'name' | 'payment'>('name');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const shown = data.filter((x) => {
    const matchesQuery = (x.name + x.classTitle).includes(query);
    const matchesFilter = filter === '전체' || x.payment === filter;
    return matchesQuery && matchesFilter;
  });
  const sorted = [...shown].sort((a, b) => a[sort].localeCompare(b[sort]) * (direction === 'asc' ? 1 : -1));
  const columns: TableColumn<Applicant>[] = [
    { key: 'name', header: '신청자', sortable: true, render: (item) => <Link className="ui-person-cell" to={`/applicants/${item.id}`}><Avatar name={item.name} /><strong>{item.name}</strong></Link> },
    { key: 'class', header: '클래스', render: (item) => item.classTitle },
    { key: 'date', header: '신청일', render: (item) => item.appliedAt },
    { key: 'payment', header: '결제', sortable: true, render: (item) => <Badge tone={getStatusTone(item.payment)}>{item.payment}</Badge> },
    { key: 'amount', header: '금액', render: (item) => won(item.amount) },
  ];
  const handleSort = (key: string) => {
    if (key !== 'name' && key !== 'payment') return;
    if (sort === key) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setDirection('asc'); }
  };

  return (
    <>
      <div className="oc-web-page">
        <div className="oc-web-head">
          <h1>신청자</h1>
          <p>신청 현황과 결제 상태를 확인하세요</p>
        </div>
        <div className="oc-search-limit"><SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·클래스로 검색" /></div>
        <div className="oc-filters">
          {filters.map((x) => (
            <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>
              {x} {x === '전체' ? data.length : data.filter((a) => a.payment === x).length}
            </button>
          ))}
        </div>
        {error ? <AsyncState loading={false} error={error} onRetry={retry} /> : <Table columns={columns} rows={sorted} rowKey={(item) => item.id} loading={loading} sortKey={sort} sortDirection={direction} onSort={handleSort} />}
      </div>
      <div className="page">
        <h1>신청자</h1>
        <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·전화번호로 검색" />
        <AsyncState loading={loading} error={error} empty={!loading && !error && !shown.length} onRetry={retry} />
        <div className="group-label">오늘</div>
        {shown.slice(0, 2).map((a, i) => (
          <Link to={`/applicants/${a.id}`} key={a.id}>
            <ApplicantRow item={a} index={i} />
          </Link>
        ))}
        <div className="group-label">어제</div>
        {shown.slice(2).map((a, i) => (
          <Link to={`/applicants/${a.id}`} key={a.id}>
            <ApplicantRow item={a} index={i + 2} />
          </Link>
        ))}
      </div>
    </>
  );
}
