import {
  Bell,
  BookOpen,
  CreditCard,
  Grid2X2,
  Heart,
  Home,
  LogOut,
  Plus,
  Search,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { StatusBar } from '../components/common/StatusBar';
import { useRole } from '../hooks/useRole';

const mobileNav = [
  ['/', Home, '홈'],
  ['/classes', Grid2X2, '클래스'],
  ['/applicants', Users, '신청자'],
  ['/my', UserRound, '마이'],
] as const;

const teacherNav = [
  ['/', Grid2X2, '대시보드'],
  ['/classes', BookOpen, '클래스'],
  ['/applicants', Users, '신청자', '3'],
  ['/settlement', CreditCard, '정산 관리'],
  ['/my/certificates', Heart, '수료증'],
  ['/settings', Settings, '설정'],
] as const;

const studentNav = [
  ['/', Home, '홈'],
  ['/classes', BookOpen, '클래스'],
  ['/wishlist', Heart, '관심 클래스'],
  ['/my/certificates', Heart, '수료증'],
  ['/settings', Settings, '설정'],
] as const;

export function AppLayout() {
  const { role, setRole } = useRole();
  const { pathname } = useLocation();
  const teacher = role === 'teacher';
  const webNav = teacher ? teacherNav : studentNav;
  const [title, subtitle] = getPageTitle(pathname, teacher);

  return (
    <main className="stage oc-app">
      <section className="phone oc-shell">
        <StatusBar />
        <aside className="oc-sidebar web-only">
          <Link className="oc-brand" to="/">
            <span>✓</span>
            원클릭 클래스
          </Link>
          <div className="oc-role-switch">
            <button className={teacher ? 'active' : ''} onClick={() => setRole('teacher')}>
              강의자
            </button>
            <button className={!teacher ? 'active' : ''} onClick={() => setRole('student')}>
              수강생
            </button>
          </div>
          <nav className="oc-side-nav">
            {webNav.map(([to, Icon, label, badge]) => (
              <NavLink key={to} to={to} end={to === '/'}>
                <Icon size={21} />
                <span>{label}</span>
                {badge && <em>{badge}</em>}
              </NavLink>
            ))}
          </nav>
          <div className="oc-user">
            <span>지</span>
            <b>김지훈<small>{teacher ? '스탠다드 플랜' : '수강생'}</small></b>
            <Link to="/login" aria-label="로그아웃">
              <LogOut size={17} />
            </Link>
          </div>
        </aside>
        <div className="oc-main">
          <header className="oc-topbar web-only">
            <div className="oc-top-title">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <label>
              <Search size={17} />
              <input placeholder="클래스·신청자 검색" />
            </label>
            <Link className="oc-icon-link" to="/settings" aria-label="설정">
              <Settings size={20} />
            </Link>
            <Link className="oc-icon-link unread" to="/notifications" aria-label="알림">
              <Bell size={20} />
            </Link>
            {teacher && (
              <Link className="oc-create" to="/classes/new">
                <Plus size={18} />
                강의 만들기
              </Link>
            )}
          </header>
          <div className="scroll">
            <Outlet />
          </div>
        </div>
        <nav className={`five-nav ${teacher ? '' : 'student-nav'} app-only`}>
          {mobileNav.slice(0, 2).map(([to, Icon, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={22} />
              <small>{label}</small>
            </NavLink>
          ))}
          {teacher ? (
            <Link className="nav-create" to="/classes/new" aria-label="강의 만들기">
              <Plus size={27} />
            </Link>
          ) : (
            <NavLink to="/wishlist">
              <Heart size={22} />
              <small>관심</small>
            </NavLink>
          )}
          {teacher && (
            <NavLink to="/applicants">
              <Users size={22} />
              <small>신청자</small>
            </NavLink>
          )}
          <NavLink to="/my">
            <UserRound size={22} />
            <small>마이</small>
          </NavLink>
        </nav>
      </section>
    </main>
  );
}

function getPageTitle(pathname: string, teacher: boolean) {
  if (pathname === '/') return teacher ? ['대시보드', '오늘 강의 2개, 신규 신청 3건이 있어요'] : ['홈', '이어서 들을 강의를 확인하세요'];
  if (pathname.startsWith('/classes')) return ['클래스', teacher ? '내가 연 강의를 관리하세요' : '수강 중인 클래스를 확인하세요'];
  if (pathname.startsWith('/applicants')) return ['신청자', '신청 현황과 결제 상태를 확인하세요'];
  if (pathname.startsWith('/settlement')) return ['정산 관리', '매출과 정산 예정 금액을 확인하세요'];
  if (pathname.startsWith('/my/certificates')) return ['수료증', teacher ? '클래스별 수료증을 발급·관리하세요' : '받은 수료증을 모아봤어요'];
  if (pathname.startsWith('/my')) return ['마이', '계정과 이용 현황을 확인하세요'];
  return ['원클릭 클래스', '클래스 운영을 한 곳에서 관리하세요'];
}
