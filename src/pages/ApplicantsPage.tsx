import { Search } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicantService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { ApplicantRow } from '../components/feature/ApplicantRow';
import { useAsync } from '../hooks/useAsync';
import { won } from '../utils/format';

const filters = ['전체', '결제완료', '결제대기', '환불'] as const;

export function ApplicantsPage() {
  const load = useCallback(() => applicantService.list(), []);
  const { data = [], loading, error, retry } = useAsync(load);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]>('전체');
  const shown = data.filter((x) => {
    const matchesQuery = (x.name + x.classTitle).includes(query);
    const matchesFilter = filter === '전체' || x.payment === filter;
    return matchesQuery && matchesFilter;
  });

  return (
    <>
      <div className="oc-web-page">
        <div className="oc-web-head">
          <h1>신청자</h1>
          <p>신청 현황과 결제 상태를 확인하세요</p>
        </div>
        <label className="search" style={{ maxWidth: 420 }}>
          <Search size={18} />
          <input aria-label="신청자 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·클래스로 검색" />
        </label>
        <div className="oc-filters">
          {filters.map((x) => (
            <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>
              {x} {x === '전체' ? data.length : data.filter((a) => a.payment === x).length}
            </button>
          ))}
        </div>
        <AsyncState loading={loading} error={error} empty={!loading && !error && !shown.length} onRetry={retry} />
        {!loading && !error && !!shown.length && (
          <div className="oc-table">
            <div className="oc-table-head">
              <span>신청자</span>
              <span>클래스</span>
              <span>신청일</span>
              <span>결제</span>
              <span>금액</span>
            </div>
            {shown.map((a, index) => (
              <Link className="oc-table-row" to={`/applicants/${a.id}`} key={a.id}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="oc-avatar" style={{ background: ['#ffe9d9', '#e7f0ff', '#edebff'][index % 3], color: ['#e8590c', '#1b64da', '#6741d9'][index % 3] }}>
                    {a.name[0]}
                  </span>
                  <strong>{a.name}</strong>
                </span>
                <span>{a.classTitle}</span>
                <span>{a.appliedAt}</span>
                <span
                  className="oc-status"
                  style={{
                    color: a.payment === '결제완료' ? '#0ca678' : a.payment === '결제대기' ? '#e8590c' : '#f03e3e',
                    background: a.payment === '결제완료' ? '#e6f9f1' : a.payment === '결제대기' ? '#fff4ec' : '#fff0f0',
                  }}
                >
                  {a.payment}
                </span>
                <span>{won(a.amount)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="page">
        <h1>신청자</h1>
        <label className="search">
          <Search size={18} />
          <input aria-label="신청자 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·전화번호로 검색" />
        </label>
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
