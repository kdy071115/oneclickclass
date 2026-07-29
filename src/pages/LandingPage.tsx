import {
  ArrowRight,
  BatteryFull,
  Check,
  Signal,
  Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import attendanceScreen from '../assets/landing/attendance.png';
import createClassScreen from '../assets/landing/create-class.png';
import dashboardScreen from '../assets/landing/dashboard.png';
import enrollmentMobileScreen from '../assets/landing/enrollment-mobile.png';
import operationsScreen from '../assets/landing/operations.png';
import { classCreationSteps } from '../constants/classCreation';

const navItems = [
  ['dashboard', '제품'],
  ['create', '강의 만들기'],
  ['operations', '운영'],
  ['learner', '학습자 경험'],
] as const;

const flowSteps = [
  {
    number: '01',
    title: '기본 정보 만들기',
    description: '수강 방식과 일정, 가격, 신청 질문을 순서대로 입력해요.',
  },
  {
    number: '02',
    title: '커리큘럼 구성하기',
    description: '섹션과 차시를 추가하고 공개할 콘텐츠만 골라요.',
  },
  {
    number: '03',
    title: '신청 링크 공유하기',
    description: '학습자 화면을 미리 보고 바로 링크를 발행해요.',
  },
] as const;

const learnerSteps = [
  ['링크 열기', '별도 앱 없이 모바일 신청 페이지로'],
  ['신청·결제', '필요한 정보만 입력하고 상태 확인'],
  ['클래스 입장', '승인된 강의를 한곳에서 시작'],
  ['이어서 학습', '마지막 차시부터 바로 계속'],
] as const;

const dashboardSteps = [
  ['상태가 먼저 보여요', '준비중, 모집중, 결제대기처럼 다음 행동을 바로 판단할 수 있어요.'],
  ['필요한 곳으로 바로 이동해요', '카드를 누르면 신청자, 출석, 정산 화면으로 자연스럽게 이어져요.'],
  ['오늘 일정부터 확인해요', '수업 시간과 참여 인원을 확인하고 강의실로 바로 들어가요.'],
] as const;

export function LandingPage() {
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll');
    const sections = navItems
      .map(([id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const initialSection = window.location.hash.slice(1);
    if (initialSection) {
      window.requestAnimationFrame(() => {
        document.getElementById(initialSection)?.scrollIntoView();
      });
    }

    if (!('IntersectionObserver' in window)) {
      return () => document.documentElement.classList.remove('landing-scroll');
    }

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-28% 0px -60%', threshold: [0.1, 0.35] },
    );

    sections.forEach((section) => sectionObserver.observe(section));

    return () => {
      sectionObserver.disconnect();
      document.documentElement.classList.remove('landing-scroll');
    };
  }, []);

  return (
    <main className="landing-page" id="top">
      <a className="landing-skip-link" href="#landing-content">본문으로 바로가기</a>

      <header className="landing-header">
        <div className="landing-container landing-nav">
          <a className="landing-brand" href="#top" aria-label="원클릭 클래스 홈">원클릭 클래스</a>
          <nav aria-label="랜딩 페이지 메뉴">
            {navItems.map(([id, label]) => (
              <a
                className={activeSection === id ? 'active' : ''}
                href={`#${id}`}
                aria-current={activeSection === id ? 'location' : undefined}
                key={id}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="landing-nav-actions">
            <Link className="landing-login" to="/login">로그인</Link>
            <Link className="landing-button landing-button-primary landing-button-small" to="/signup">
              무료로 시작하기
            </Link>
          </div>
        </div>
      </header>

      <div id="landing-content">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">복잡한 LMS 없이 시작하세요</p>
              <h1 id="landing-hero-title">
                강의 만들기,<br />
                이렇게 쉬웠나요?
              </h1>
              <p className="landing-hero-description">
                생성부터 신청·출석·수료까지 하나의 흐름으로.<br />
                {' '}복잡한 LMS 없이, 링크 하나로 끝내세요.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-button landing-button-primary" to="/signup">
                  무료로 시작하기 <ArrowRight size={18} />
                </Link>
                <a className="landing-button landing-button-secondary" href="#dashboard">
                  데모 보기
                </a>
              </div>
              <p className="landing-hero-note">
                <Check size={15} /> 기술 지식 없이 시작
                <span aria-hidden="true">·</span>
                <Check size={15} /> 모바일 신청 페이지 제공
              </p>
            </div>

            <div className="landing-product-showcase">
              <figure className="landing-product-shot landing-product-shot-hero">
                <figcaption>실제 제품 화면 · 5단계 강의 개설</figcaption>
                <div className="landing-product-shot-crop">
                  <img src={createClassScreen} alt="원클릭 클래스의 실제 강의 생성 화면" />
                </div>
              </figure>
              <ol className="landing-create-step-preview" aria-label="강의 개설 5단계">
                {classCreationSteps.map(([title, description], index) => (
                  <li className={index === 0 ? 'active' : undefined} key={title}>
                    <span>{index + 1}</span>
                    <div>
                      <b>{title.replace('\n', ' ')}</b>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="landing-section landing-dashboard" id="dashboard" aria-labelledby="dashboard-title">
          <div className="landing-container landing-feature-grid media-first">
            <div className="landing-feature-copy">
              <p className="landing-kicker">INSTRUCTOR HOME</p>
              <h2 id="dashboard-title">분석보다 먼저,<br />오늘 할 일을 보여줘요</h2>
              <p>복잡한 숫자 대신 새 신청, 결제 대기, 오늘 수업처럼 지금 움직여야 할 상태를 앞에 둡니다.</p>
              <ol className="landing-learner-steps">
                {dashboardSteps.map(([title, description], index) => (
                  <li key={title}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div><b>{title}</b><p>{description}</p></div>
                  </li>
                ))}
              </ol>
            </div>

            <figure className="landing-product-shot landing-product-shot-dashboard">
              <figcaption>실제 제품 화면 · 오늘의 운영 대시보드</figcaption>
              <div className="landing-product-shot-crop">
                <img src={dashboardScreen} alt="원클릭 클래스의 실제 운영 대시보드 화면" />
              </div>
            </figure>
          </div>
        </section>

        <section className="landing-section landing-flow-section" id="create" aria-labelledby="flow-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-kicker">HOW IT WORKS</p>
              <h2 id="flow-title">세 단계면<br />신청 링크가 완성돼요</h2>
              <p>한 번에 모든 걸 설정하지 않아도 괜찮아요. 지금 필요한 정보부터 순서대로 안내합니다.</p>
            </div>
            <ol className="landing-flow-rail">
              {flowSteps.map((step) => (
                <li key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>

          </div>
        </section>

        <section className="landing-section landing-operations" id="operations" aria-labelledby="operations-title">
          <div className="landing-container landing-feature-grid">
            <div className="landing-feature-copy">
              <p className="landing-kicker">OPERATIONS</p>
              <h2 id="operations-title">신청 이후의 운영도<br />한 흐름으로 관리해요</h2>
              <p>기능을 따로 찾아다니지 않도록 클래스의 시작, 진행, 완료 순서에 맞춰 묶었습니다.</p>
              <ul>
                <li><Check /> 신청자 정보와 승인·결제 상태 확인</li>
                <li><Check /> 필요한 대상에게 수업 안내 발송</li>
                <li><Check /> 수료 기준 확인과 수료증 발급</li>
              </ul>
            </div>

            <figure className="landing-product-shot landing-product-shot-operations">
              <figcaption>실제 제품 화면 · 신청자 및 결제 상태</figcaption>
              <div className="landing-product-shot-crop landing-product-shot-crop-operations">
                <img src={operationsScreen} alt="원클릭 클래스의 실제 신청자 관리 화면" />
              </div>
            </figure>
          </div>
        </section>

        <section className="landing-section landing-attendance" aria-labelledby="attendance-title">
          <div className="landing-container landing-feature-grid media-first">
            <div className="landing-feature-copy">
              <p className="landing-kicker">CLASS DAY</p>
              <h2 id="attendance-title">수업 당일은<br />QR로 바로 출석해요</h2>
              <p>수강생이 휴대폰으로 스캔하면 출석 상태가 바로 반영되고, 운영자는 회차별 명단을 확인합니다.</p>
              <ul>
                <li><Check /> 5분마다 자동 갱신되는 출석 QR</li>
                <li><Check /> 실시간 체크인과 출석률 확인</li>
                <li><Check /> 회차별 상태 수정과 출석 내역 다운로드</li>
              </ul>
            </div>

            <figure className="landing-product-shot landing-product-shot-attendance">
              <figcaption>실제 제품 화면 · 실시간 QR 출석</figcaption>
              <div className="landing-product-shot-crop">
                <img src={attendanceScreen} alt="원클릭 클래스의 실제 QR 출석 관리 화면" />
              </div>
            </figure>
          </div>
        </section>

        <section className="landing-section landing-learner" id="learner" aria-labelledby="learner-title">
          <div className="landing-container landing-feature-grid reverse">
            <figure className="landing-mobile-shot">
              <div className="landing-mobile-status" aria-hidden="true">
                <b>9:41</b>
                <span>
                  <Signal />
                  <Wifi />
                  <BatteryFull />
                </span>
              </div>
              <img src={enrollmentMobileScreen} alt="원클릭 클래스의 실제 모바일 수강 신청 화면" />
            </figure>

            <div className="landing-feature-copy">
              <p className="landing-kicker">LEARNER EXPERIENCE</p>
              <h2 id="learner-title">공유한 링크 하나가<br />학습까지 이어져요</h2>
              <p>학습자는 모바일에서 강의를 확인하고 신청한 뒤, 같은 흐름에서 바로 학습을 계속할 수 있어요.</p>
              <ol className="landing-learner-steps">
                {learnerSteps.map(([title, description], index) => (
                  <li key={title}>
                    <span>{index + 1}</span>
                    <div><b>{title}</b><p>{description}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <div className="landing-container">
            <div>
              <p>LMS를 몰라도 괜찮아요</p>
              <h2 id="final-cta-title">첫 강의,<br />복잡하게 시작하지 마세요.</h2>
              <small><Check /> 기본 정보와 커리큘럼만 준비하면 바로 시작</small>
            </div>
            <div className="landing-final-action">
              <Link className="landing-button landing-button-light" to="/signup">
                무료 계정 만들기 <ArrowRight size={19} />
              </Link>
              <small>가입 후 바로 강의를 만들 수 있어요</small>
            </div>
          </div>
        </section>
      </div>

      <footer className="landing-footer">
        <div className="landing-container">
          <a className="landing-brand" href="#top">원클릭 클래스</a>
          <p>강의 개설부터 신청·출석·수료까지, 한곳에서.</p>
          <small>© 2026 OneClick Class</small>
        </div>
      </footer>
    </main>
  );
}
