import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicantService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { ApplicantRow } from '../components/feature/ApplicantRow';
import { Avatar, Badge, SearchInput, Table, type TableColumn } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import type { Applicant } from '../types/class';
import { won } from '../utils/format';
import { matchesApplicantSearch } from '../utils/applicantSearch';
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
    const matchesQuery = matchesApplicantSearch(x, query);
    const matchesFilter = filter === '전체' || x.payment === filter;
    return matchesQuery && matchesFilter;
  });
  const sorted = [...shown].sort(
    (a, b) => a[sort].localeCompare(b[sort]) * (direction === 'asc' ? 1 : -1),
  );
  const columns: TableColumn<Applicant>[] = [
    {
      key: 'name',
      header: '신청자',
      sortable: true,
      render: (item) => (
        <Link className="ui-person-cell" to={`/applicants/${item.id}`}>
          <Avatar name={item.name} />
          <strong>{item.name}</strong>
        </Link>
      ),
    },
    { key: 'class', header: '클래스', render: (item) => item.classTitle },
    { key: 'date', header: '신청일', render: (item) => item.appliedAt },
    {
      key: 'payment',
      header: '결제',
      sortable: true,
      render: (item) => <Badge tone={getStatusTone(item.payment)}>{item.payment}</Badge>,
    },
    { key: 'amount', header: '금액', render: (item) => won(item.amount) },
  ];
  const handleSort = (key: string) => {
    if (key !== 'name' && key !== 'payment') return;
    if (sort === key) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else {
      setSort(key);
      setDirection('asc');
    }
  };

  return (
    <>
      <div className="oc-web-page">
        <div className="oc-web-head">
          <h1>전체 신청자</h1>
          <p>모든 클래스의 신청 현황과 결제 상태를 확인하세요</p>
        </div>
        <div className="oc-search-limit">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·클래스로 검색"
          />
        </div>
        <div className="oc-filters">
          {filters.map((x) => (
            <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>
              {x} {x === '전체' ? data.length : data.filter((a) => a.payment === x).length}
            </button>
          ))}
        </div>
        {error ? (
          <AsyncState loading={false} error={error} onRetry={retry} />
        ) : (
          <Table
            columns={columns}
            rows={sorted}
            rowKey={(item) => item.id}
            loading={loading}
            sortKey={sort}
            sortDirection={direction}
            onSort={handleSort}
          />
        )}
      </div>
      <div className="page">
        <h1>전체 신청자</h1>
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름·클래스·전화번호 검색"
        />
        <div className="chips mobile-filter-chips" aria-label="결제 상태 필터">
          {filters.map((item) => (
            <button
              className={filter === item ? 'active' : ''}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              key={item}
            >
              {item} {item === '전체' ? data.length : data.filter((x) => x.payment === item).length}
            </button>
          ))}
        </div>
        <AsyncState
          loading={loading}
          error={error}
          empty={!loading && !error && !shown.length}
          onRetry={retry}
        />
        {!loading && !error && sorted.length > 0 && (
          <>
            <div className="group-label">검색 결과 {sorted.length}명</div>
            <div className="mobile-applicant-list">
              {sorted.map((applicant, index) => (
                <Link to={`/applicants/${applicant.id}`} key={applicant.id}>
                  <ApplicantRow item={applicant} index={index} />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
