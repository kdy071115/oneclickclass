import { useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { applicantService, classService, settlementService } from '../api/services';
import { getSession } from '../auth/session';
import { AsyncState } from '../components/common/AsyncState';
import { useAsync } from '../hooks/useAsync';
import { useLogout } from '../hooks/useLogout';
import { won } from '../utils/format';

export function MyPage() {
  const logout = useLogout();
  const user = getSession()?.user;
  const load = useCallback(
    () => Promise.all([classService.list(), applicantService.list(), settlementService.summary()]),
    [],
  );
  const { data, loading, error, retry } = useAsync(load);

  if (loading || error || !data) {
    return (
      <div className="page">
        <h1>마이</h1>
        <AsyncState loading={loading} error={error} onRetry={retry} />
      </div>
    );
  }

  const [classes, applicants, settlement] = data;
  const activeClasses = classes.filter(
    ({ status }) => status === '모집중' || status === '진행중',
  ).length;
  const menus = [
    ['/settlements', '정산 관리', `${won(settlement.expectedAmount)} 정산 예정`, 'green'],
    ['/payment', '결제 관리', '', ''],
    ['/notification-settings', '알림 설정', '', ''],
    ['/support', '고객센터', '', ''],
    ['/settings', '설정', '', ''],
  ] as const;
  const name = user?.name || '강사';

  return (
    <div className="page">
      <h1>마이</h1>
      <div className="profile original">
        <span>{name.slice(0, 1)}</span>
        <div>
          <strong>{name}</strong>
          <small>{user?.email || '계정 정보를 확인해 주세요'}</small>
        </div>
      </div>
      <div className="stats my-stats">
        <div>
          <b>{classes.length}</b>
          <small>전체 클래스</small>
        </div>
        <div>
          <b>{applicants.length}</b>
          <small>누적 신청자</small>
        </div>
        <div>
          <b>{activeClasses}</b>
          <small>운영 중</small>
        </div>
      </div>
      <div className="menu-box">
        {menus.map(([to, label, meta, tone]) => (
          <Link className="menu-row" to={to} key={label}>
            <span>{label}</span>
            {meta && <em className={tone}>{meta}</em>}
            <ChevronRight size={18} />
          </Link>
        ))}
      </div>
      <button className="logout" type="button" onClick={() => void logout()}>
        로그아웃
      </button>
    </div>
  );
}
