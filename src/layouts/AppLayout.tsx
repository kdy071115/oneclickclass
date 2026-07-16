import {
  Bell,
  Heart,
  LogOut,
  Plus,
  Search,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { clearSession, getSession } from '../auth/session';
import { StatusBar } from '../components/common/StatusBar';
import { NotificationPopover } from '../components/feature/NotificationPopover';
import { mobileNav, studentNav, teacherNav } from '../constants/navigation';
import { useRole } from '../hooks/useRole';
import { useProfileImage } from '../hooks/useProfileImage';

export function AppLayout() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = getSession()?.user;
  const teacher = role === 'teacher';
  const webNav = teacher ? teacherNav : studentNav;
  const [title, subtitle] = getPageTitle(pathname, teacher);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileImage = useProfileImage();

  return (
    <main className="stage oc-app">
      <section className="phone oc-shell">
        <StatusBar />
        <aside className="oc-sidebar web-only">
          <Link className="oc-brand" to="/dashboard">
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
              <NavLink key={to} to={to} end={to === '/dashboard'}>
                <Icon size={21} />
                <span>{label}</span>
                {badge && <em>{badge}</em>}
              </NavLink>
            ))}
          </nav>
          <div className="oc-user">
            <span>{profileImage ? <img src={profileImage} alt="프로필" /> : (user?.name.slice(0, 1) ?? '지')}</span>
            <b>{user?.name ?? '김지훈'}<small>{teacher ? '스탠다드 플랜' : '수강생'}</small></b>
            <Link to="/settings" aria-label="설정" title="설정"><Settings size={17} /></Link>
            <button aria-label="로그아웃" onClick={() => { clearSession(); navigate('/login', { replace: true }); }}>
              <LogOut size={17} />
            </button>
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
            <div className="oc-notification-menu">
              <button className="oc-icon-link unread" aria-label="알림" aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
                <Bell size={20} />
              </button>
              {notificationsOpen && <NotificationPopover onClose={() => setNotificationsOpen(false)} />}
            </div>
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
            <NavLink key={to} to={to} end={to === '/dashboard'}>
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
  if (pathname === '/' || pathname === '/dashboard') return teacher ? ['대시보드', '오늘 강의 2개, 신규 신청 3건이 있어요'] : ['홈', '이어서 들을 강의를 확인하세요'];
  if (pathname.startsWith('/classes')) return ['클래스', teacher ? '내가 연 강의를 관리하세요' : '수강 중인 클래스를 확인하세요'];
  if (pathname.startsWith('/learn/classes')) return ['학습', '수강 중인 클래스를 이어서 학습하세요'];
  if (pathname.startsWith('/applicants')) return ['신청자', '신청 현황과 결제 상태를 확인하세요'];
  if (pathname.startsWith('/settlement')) return ['정산 관리', '매출과 정산 예정 금액을 확인하세요'];
  if (pathname.startsWith('/my/certificates')) return ['수료증', teacher ? '클래스별 수료증을 발급·관리하세요' : '받은 수료증을 모아봤어요'];
  if (pathname.startsWith('/my')) return ['마이', '계정과 이용 현황을 확인하세요'];
  return ['원클릭 클래스', '클래스 운영을 한 곳에서 관리하세요'];
}
