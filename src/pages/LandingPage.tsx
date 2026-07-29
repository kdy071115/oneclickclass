import {
  ArrowRight,
  BatteryFull,
  Check,
  Signal,
  Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import createClassScreen from '../assets/landing/create-class.png';
import enrollmentMobileScreen from '../assets/landing/enrollment-mobile.png';
import operationsScreen from '../assets/landing/operations.png';
import { classCreationSteps } from '../constants/classCreation';

const navItems = [
  ['operations', '운영'],
  ['learner', '학습자'],
  ['flow', '강의 개설'],
] as const;

const flowSteps = [
  {
    number: '01',
    title: '기본 정보 5단계 작성',
    description: '제목, 진행 방식, 일정과 신청 항목을 순서대로 입력합니다.',
  },
  {
    number: '02',
    title: '차시별 콘텐츠 연결',
    description: '영상과 자료를 차시에 담고 공개할 학습 순서를 정합니다.',
  },
  {
    number: '03',
    title: '신청 링크 발행',
    description: '학습자 화면을 미리 확인한 뒤 신청 링크를 공유합니다.',
  },
] as const;

const learnerSteps = [
  ['링크 열기', '앱 설치 없이 강의 확인'],
  ['신청 정보', '필요한 정보만 간단히 입력'],
  ['신청 완료', '결제 결과와 신청 내역 확인'],
] as const;

export function LandingPage() {
  const [activeSection, setActiveSection] = useState('operations');

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll');
    const sections = navItems
      .map(([id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

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
              <p className="landing-eyebrow">강의 운영 플랫폼, 원클릭 클래스</p>
              <h1 id="landing-hero-title">
                강의는 쉽게 열고<br />
                운영은 한 번에
              </h1>
              <p className="landing-hero-description">
                개설부터 신청·결제·출석·학습·수료까지<br />
                {' '}복잡한 강의 운영을 하나의 흐름으로 관리하세요.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-button landing-button-primary" to="/signup">
                  무료로 시작하기 <ArrowRight size={18} />
                </Link>
                <a className="landing-button landing-button-secondary" href="#operations">
                  기능 둘러보기
                </a>
              </div>
              <p className="landing-hero-note">
                <Check size={15} /> 카드 등록 없이 시작
                <span aria-hidden="true">·</span>
                <Check size={15} /> 별도 설치 없음
              </p>
            </div>

            <div className="landing-product-showcase">
              <figure className="landing-product-shot landing-product-shot-hero">
                <figcaption>실제 제품 화면 · 5단계 강의 개설</figcaption>
                <img src={createClassScreen} alt="원클릭 클래스의 실제 강의 생성 화면" />
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

        <section className="landing-section landing-operations" id="operations" aria-labelledby="operations-title">
          <div className="landing-container landing-feature-grid">
            <div className="landing-feature-copy">
              <p className="landing-kicker">운영 화면</p>
              <h2 id="operations-title">신청·결제·출석을<br />한 화면에서 관리하세요</h2>
              <p>새 신청, 결제 대기, 오늘 수업처럼 지금 움직여야 할 상태를 한 화면에서 확인하세요.</p>
              <ul>
                <li><Check /> 모든 클래스의 신청자와 결제 상태 통합</li>
                <li><Check /> 현장 QR 출석과 온라인 학습 진도 관리</li>
                <li><Check /> 수료 조건 확인과 수료증 발급</li>
              </ul>
            </div>

            <figure className="landing-product-shot landing-product-shot-operations">
              <figcaption>실제 제품 화면 · 신청자 및 결제 상태</figcaption>
              <img src={operationsScreen} alt="원클릭 클래스의 실제 신청자 관리 화면" />
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
              <p className="landing-kicker">학습자 화면</p>
              <h2 id="learner-title">링크 하나로<br />신청과 결제까지</h2>
              <p>학습자는 앱 설치 없이 강의를 확인하고, 필요한 정보를 입력해 신청을 완료합니다.</p>
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

        <section className="landing-section landing-flow-section" id="flow" aria-labelledby="flow-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-kicker">강의 개설</p>
              <h2 id="flow-title">처음이어도<br />순서대로 만들 수 있어요</h2>
              <p>기본 정보와 콘텐츠를 입력하고, 신청자에게 공유할 링크를 발행하세요.</p>
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

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <div className="landing-container">
            <div>
              <p>계정 생성은 무료입니다</p>
              <h2 id="final-cta-title">첫 강의를 만들고<br />신청 링크를 발행하세요.</h2>
              <small><Check /> 카드 등록 없이 바로 시작</small>
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
