import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Link2,
  Maximize2,
  Menu,
  MonitorSmartphone,
  Play,
  Users,
  WalletCards,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import attendanceMobileScreen from '../assets/landing/attendance-mobile.png';
import attendanceScreen from '../assets/landing/attendance.png';
import certificatesScreen from '../assets/landing/certificates.jpg';
import createClassScreen from '../assets/landing/create-class.png';
import dashboardScreen from '../assets/landing/dashboard.jpg';
import operationsMobileScreen from '../assets/landing/operations-mobile.jpg';
import operationsScreen from '../assets/landing/operations.jpg';
import settlementsScreen from '../assets/landing/settlements.jpg';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/ui';
import { classCreationSteps } from '../constants/classCreation';
import { classes, classDetail, dashboard } from '../constants/mockData';
import { won } from '../utils/format';

const navItems = [
  ['create', '강의 만들기'],
  ['learner', '학습자 경험'],
  ['product', '강사 홈'],
  ['operations', '운영'],
] as const;

type ImagePreview = {
  title: string;
  images: { src: string; alt: string }[];
};

const operationGroups = [
  {
    step: '01',
    icon: Users,
    caption: '신청자 및 결제 상태',
    title: '신청 확인',
    description: '신청자 정보와 승인 여부, 결제 상태를 한 목록에서 확인해요.',
    items: ['신청자 관리', '결제 상태', '알림 발송'],
    image: operationsScreen,
    mobileImage: operationsMobileScreen,
    imageAlt: '원클릭 클래스의 실제 신청자 관리 화면',
    secondaryImage: null,
    secondaryImageAlt: null,
  },
  {
    step: '02',
    icon: ClipboardCheck,
    caption: '실시간 QR 출석',
    title: '출석 운영',
    description: '현장 QR을 발급하고 참석 현황과 출석 상태를 한 화면에서 확인해요.',
    items: ['출석 QR', '실시간 현황', '출석 상태'],
    image: attendanceScreen,
    mobileImage: attendanceMobileScreen,
    imageAlt: '원클릭 클래스의 실제 QR 출석 관리 화면',
    secondaryImage: null,
    secondaryImageAlt: null,
  },
  {
    step: '03',
    icon: GraduationCap,
    caption: '수료증 발급 및 정산 확인',
    title: '수료·정산 마무리',
    description: '수료 기준을 확인하고 수료증 발급과 정산까지 마무리해요.',
    items: ['수료 기준', '수료증 발급', '정산 확인'],
    image: settlementsScreen,
    mobileImage: null,
    imageAlt: '원클릭 클래스의 실제 정산 관리 화면',
    secondaryImage: certificatesScreen,
    secondaryImageAlt: '원클릭 클래스의 실제 수료증 발급 관리 화면',
  },
] as const;

const learnerJourney = [
  ['링크 열기', '별도 앱 없이 모바일 신청 페이지로'],
  ['신청·결제', '필요한 정보만 입력하고 상태 확인'],
  ['클래스 입장', '승인된 강의를 한곳에서 시작'],
  ['이어서 학습', '마지막 차시부터 바로 계속'],
] as const;

const course = classes[0];
const schedule = dashboard.todaySchedule?.[0];

export function LandingPage() {
  const [activeSection, setActiveSection] = useState('');
  const [activeOperation, setActiveOperation] = useState(0);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const operationGalleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll');
    const revealItems = [...document.querySelectorAll<HTMLElement>('.landing-reveal')];
    const sections = navItems
      .map(([id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const hero = document.querySelector<HTMLElement>('.landing-hero');

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return () => document.documentElement.classList.remove('landing-scroll');
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const nextHash = `#${visible.target.id}`;
          setActiveSection(visible.target.id);
          if (window.location.hash !== nextHash) {
            window.history.replaceState(window.history.state, '', nextHash);
          }
        }
      },
      { rootMargin: '-25% 0px -60%', threshold: [0, 0.25, 0.6] },
    );
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setActiveSection('');
        if (window.location.hash) {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}`,
          );
        }
      },
      { threshold: 0.25 },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
    sections.forEach((section) => sectionObserver.observe(section));
    if (hero) heroObserver.observe(hero);

    return () => {
      document.documentElement.classList.remove('landing-scroll');
      revealObserver.disconnect();
      sectionObserver.disconnect();
      heroObserver.disconnect();
    };
  }, []);

  const scrollToOperation = (index: number) => {
    const gallery = operationGalleryRef.current;
    if (!gallery) return;
    gallery.scrollTo({
      left: (gallery.scrollWidth / operationGroups.length) * index,
      behavior: 'smooth',
    });
    setActiveOperation(index);
  };

  return (
    <main className="landing-page" id="top">
      <a className="landing-skip-link" href="#landing-content">
        본문으로 바로가기
      </a>

      <header className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <a className="landing-brand" href="#top" aria-label="원클릭 클래스 홈">
            <span aria-hidden="true">
              <Check size={16} strokeWidth={3} />
            </span>
            원클릭 클래스
          </a>
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
          <details className="landing-mobile-menu">
            <summary aria-label="랜딩 페이지 메뉴 열기">
              <Menu size={20} />
            </summary>
            <nav aria-label="모바일 랜딩 페이지 메뉴">
              {navItems.map(([id, label]) => (
                <a
                  className={activeSection === id ? 'active' : ''}
                  href={`#${id}`}
                  aria-current={activeSection === id ? 'location' : undefined}
                  onClick={(event) =>
                    event.currentTarget.closest('details')?.removeAttribute('open')
                  }
                  key={id}
                >
                  {label}
                </a>
              ))}
              <Link className="landing-mobile-login" to="/login">
                로그인
              </Link>
            </nav>
          </details>
          <div className="landing-nav-actions">
            <Link className="landing-login" to="/login">
              로그인
            </Link>
            <Link
              className="landing-button landing-button-primary landing-button-small"
              to="/signup"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </header>

      <div id="landing-content">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-container">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">
                <CheckCircle2 size={16} /> 복잡한 LMS 없이 시작하세요
              </p>
              <h1 id="landing-hero-title">
                강의 만들기,
                <br />
                <span>이렇게 쉬웠나요?</span>
              </h1>
              <p className="landing-hero-description">
                생성부터 신청·출석·수료까지 하나의 흐름으로.
                <br />
                복잡한 LMS 없이, 링크 하나로 끝내세요.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-button landing-button-primary" to="/signup">
                  무료로 시작하기 <ArrowRight size={18} />
                </Link>
                <a className="landing-button landing-button-secondary" href="#create">
                  <Play size={17} fill="currentColor" /> 제품 화면 보기
                </a>
              </div>
              <p className="landing-hero-note">
                <Check size={15} /> 기술 지식 없이 시작
                <span aria-hidden="true">·</span>
                <Check size={15} /> 모바일 신청 페이지 제공
              </p>
            </div>

            <div
              className="landing-hero-preview"
              aria-label="강사 대시보드와 학습자 신청 화면 예시"
            >
              <div className="landing-dashboard-frame">
                <div className="landing-window-bar">
                  <span />
                  <span />
                  <span />
                  <small>oneclickclass.kr</small>
                </div>
                <div className="landing-dashboard-shell">
                  <aside>
                    <div className="landing-mini-brand">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <LayoutDashboard className="active" size={17} />
                    <BookOpen size={17} />
                    <Users size={17} />
                    <WalletCards size={17} />
                  </aside>
                  <div className="landing-dashboard-content">
                    <header>
                      <div>
                        <small>오늘의 운영 현황</small>
                        <h2>이지훈 강사님, 안녕하세요</h2>
                      </div>
                      <span>
                        <Bell size={15} />
                        <i />
                      </span>
                    </header>
                    <div className="landing-preview-kpis">
                      <article className="blue">
                        <small>신규 신청</small>
                        <strong>
                          {dashboard.newApplicants}
                          <em>건</em>
                        </strong>
                        <span>오늘 접수</span>
                      </article>
                      <article className="orange">
                        <small>결제 대기</small>
                        <strong>
                          {dashboard.pendingPayments}
                          <em>건</em>
                        </strong>
                        <span>{won(dashboard.pendingAmount ?? 0)}</span>
                      </article>
                      <article className="purple">
                        <small>진행중 클래스</small>
                        <strong>
                          {dashboard.todayClasses}
                          <em>개</em>
                        </strong>
                        <span>오늘 일정</span>
                      </article>
                    </div>
                    <div className="landing-preview-panel">
                      <div className="landing-preview-panel-title">
                        <strong>오늘 일정</strong>
                        <span>
                          전체보기 <ChevronRight size={12} />
                        </span>
                      </div>
                      {schedule && (
                        <div className="landing-schedule-row">
                          <time>{schedule.time}</time>
                          <div>
                            <StatusBadge>{schedule.badge}</StatusBadge>
                            <b>{schedule.title}</b>
                            <small>{schedule.meta}</small>
                          </div>
                          <span className="landing-schedule-action" aria-hidden="true">
                            입장
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="landing-preview-panel landing-class-row">
                      <div>
                        <StatusBadge>{course.status}</StatusBadge>
                        <b>{course.title}</b>
                        <small>
                          {course.type} · {course.date}
                        </small>
                      </div>
                      <span>
                        <small>
                          신청 {course.enrolled}/{course.capacity}
                        </small>
                        <i>
                          <em style={{ width: `${(course.enrolled / course.capacity) * 100}%` }} />
                        </i>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-phone-frame">
                <div className="landing-phone-speaker" />
                <div className="landing-phone-screen">
                  <div className="landing-phone-cover">
                    <Play size={22} fill="currentColor" />
                    <span>온라인 · 4주 과정</span>
                  </div>
                  <div className="landing-phone-body">
                    <StatusBadge>{course.status}</StatusBadge>
                    <h3>{classDetail.title}</h3>
                    <p>{classDetail.summary}</p>
                    <dl>
                      <div>
                        <dt>
                          <CalendarDays size={13} /> 일정
                        </dt>
                        <dd>{course.date}</dd>
                      </div>
                      <div>
                        <dt>
                          <MonitorSmartphone size={13} /> 장소
                        </dt>
                        <dd>{classDetail.location}</dd>
                      </div>
                    </dl>
                    <div className="landing-phone-price">
                      <span>수강료</span>
                      <b>{won(classDetail.price)}</b>
                    </div>
                  </div>
                  <div className="landing-phone-cta">클래스 신청하기</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-create"
          id="create"
          aria-labelledby="create-title"
        >
          <div className="landing-container">
            <div className="landing-section-heading centered landing-reveal">
              <p className="landing-kicker">강의 만드는 방법</p>
              <h2 id="create-title">다섯 단계로 신청 링크를 완성해요</h2>
              <p>질문에 답하듯 필요한 정보를 입력하면 공개할 수 있는 신청 페이지가 완성됩니다.</p>
            </div>

            <div className="landing-product-showcase landing-reveal">
              <figure className="landing-product-shot landing-product-shot-hero">
                <figcaption>
                  <span>실제 제품 화면 · 5단계 강의 개설</span>
                  <button
                    type="button"
                    aria-label="5단계 강의 개설 화면 확대 보기"
                    onClick={() =>
                      setImagePreview({
                        title: '5단계 강의 개설',
                        images: [
                          {
                            src: createClassScreen,
                            alt: '원클릭 클래스의 실제 5단계 강의 개설 화면',
                          },
                        ],
                      })
                    }
                  >
                    <Maximize2 size={14} /> 확대 보기
                  </button>
                </figcaption>
                <div className="landing-product-shot-crop">
                  <img src={createClassScreen} alt="원클릭 클래스의 실제 5단계 강의 개설 화면" />
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

        <section
          className="landing-section landing-learner"
          id="learner"
          aria-labelledby="learner-title"
        >
          <div className="landing-container landing-learner-grid">
            <div className="landing-learner-copy landing-reveal">
              <p className="landing-kicker">학습자 경험</p>
              <h2 id="learner-title">
                공유한 링크 하나가
                <br />
                학습까지 이어져요
              </h2>
              <p>
                학습자는 모바일에서 강의를 확인하고 신청한 뒤, 같은 흐름에서 바로 학습을 계속할 수
                있어요.
              </p>
              <ol className="landing-journey">
                {learnerJourney.map(([title, description], index) => (
                  <li key={title}>
                    <span>{index + 1}</span>
                    <div>
                      <b>{title}</b>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div
              className="landing-learner-phone landing-reveal"
              role="img"
              aria-label="공유 링크에서 클래스 정보를 확인하고 신청하는 모바일 화면 예시"
            >
              <div className="landing-learner-device" aria-hidden="true">
                <div className="landing-device-top">
                  <span>9:41</span>
                  <i />
                </div>
                <div className="landing-learner-cover">
                  <Play size={30} fill="currentColor" />
                  <span>온라인 클래스</span>
                </div>
                <div className="landing-learner-content">
                  <StatusBadge>{course.status}</StatusBadge>
                  <h3>{classDetail.title}</h3>
                  <p>{classDetail.summary}</p>
                  <div className="landing-learner-instructor">
                    <i>이</i>
                    <span>
                      <small>강사</small>
                      <b>{classDetail.instructor}</b>
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>
                        <CalendarDays size={15} /> 일정
                      </dt>
                      <dd>{course.date}</dd>
                    </div>
                    <div>
                      <dt>
                        <MonitorSmartphone size={15} /> 장소
                      </dt>
                      <dd>{classDetail.location}</dd>
                    </div>
                    <div>
                      <dt>
                        <Users size={15} /> 남은 자리
                      </dt>
                      <dd>{course.capacity - course.enrolled}자리</dd>
                    </div>
                  </dl>
                  <div className="landing-curriculum">
                    <div>
                      <b>커리큘럼</b>
                      <small>총 {classDetail.sessions}회</small>
                    </div>
                    {classDetail.curriculum.slice(0, 2).map((lesson, index) => (
                      <p key={lesson.id}>
                        <span>{index + 1}</span>
                        <b>{lesson.title}</b>
                        <small>{lesson.durationText}</small>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="landing-learner-sticky">
                  <span>
                    <small>수강료</small>
                    <b>{won(classDetail.price)}</b>
                  </span>
                  <span className="landing-learner-apply">신청하기</span>
                </div>
              </div>
              <span className="landing-share-chip" aria-hidden="true">
                <Link2 size={16} /> 링크 공유 완료
              </span>
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-product"
          id="product"
          aria-labelledby="product-title"
        >
          <div className="landing-container">
            <div className="landing-section-heading landing-reveal">
              <p className="landing-kicker">강사용 홈</p>
              <h2 id="product-title">
                운영 현황과 오늘 할 일을
                <br />
                한눈에 보여줘요
              </h2>
              <p>이번 달 매출, 신규 신청, 진행 중 클래스와 오늘 일정을 한 화면에 정리합니다.</p>
            </div>

            <div className="landing-product-grid landing-reveal">
              <div className="landing-dashboard-view">
                <p>핵심 운영 화면을 먼저 보고, 전체 화면은 확대해서 확인하세요.</p>
                <figure className="landing-product-shot landing-product-shot-dashboard">
                  <figcaption>
                    <span>실제 제품 화면 · 오늘의 운영 대시보드</span>
                    <button
                      type="button"
                      aria-label="오늘의 운영 대시보드 화면 확대 보기"
                      onClick={() =>
                        setImagePreview({
                          title: '오늘의 운영 대시보드',
                          images: [
                            {
                              src: dashboardScreen,
                              alt: '원클릭 클래스의 실제 운영 대시보드 화면',
                            },
                          ],
                        })
                      }
                    >
                      <Maximize2 size={14} /> 확대 보기
                    </button>
                  </figcaption>
                  <div className="landing-product-shot-crop">
                    <img
                      src={dashboardScreen}
                      alt="원클릭 클래스의 실제 운영 대시보드 화면"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </figure>
              </div>

              <div className="landing-product-points">
                <article>
                  <span>01</span>
                  <div>
                    <h3>운영 지표를 한눈에 봐요</h3>
                    <p>이번 달 매출과 신규 신청, 진행 중 클래스를 한 줄에서 비교해요.</p>
                  </div>
                </article>
                <article>
                  <span>02</span>
                  <div>
                    <h3>오늘 일정을 바로 확인해요</h3>
                    <p>수업 시간, 방식, 수강생 수를 확인하고 강의실로 바로 들어가요.</p>
                  </div>
                </article>
                <article>
                  <span>03</span>
                  <div>
                    <h3>필요한 화면으로 연결돼요</h3>
                    <p>각 카드를 선택하면 신청자, 결제, 클래스 운영 화면으로 이어져요.</p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-operations"
          id="operations"
          aria-labelledby="operations-title"
        >
          <div className="landing-container">
            <div className="landing-section-heading landing-reveal">
              <p className="landing-kicker">클래스 운영</p>
              <h2 id="operations-title">
                신청부터 출석, 수료까지
                <br />
                하나의 클래스에서 관리해요
              </h2>
              <p>
                신청과 결제를 확인하고 수업을 운영한 뒤, 수료증 발급까지 같은 흐름에서 이어집니다.
              </p>
            </div>

            <p className="landing-gallery-hint" id="operations-gallery-help">
              <span aria-hidden="true">←</span> 옆으로 넘기거나 방향키로 세 단계를 확인하세요
              <span aria-hidden="true">→</span>
            </p>
            <div
              className="landing-operations-gallery landing-reveal"
              role="region"
              aria-label="운영 제품 화면"
              aria-describedby="operations-gallery-help"
              tabIndex={0}
              ref={operationGalleryRef}
              onScroll={(event) => {
                const gallery = event.currentTarget;
                const next = Math.round(
                  gallery.scrollLeft / (gallery.scrollWidth / operationGroups.length),
                );
                setActiveOperation(Math.max(0, Math.min(operationGroups.length - 1, next)));
              }}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                const direction = event.key === 'ArrowRight' ? 1 : -1;
                scrollToOperation(
                  Math.max(0, Math.min(operationGroups.length - 1, activeOperation + direction)),
                );
              }}
            >
              {operationGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <article className="landing-operation-step" key={group.title}>
                    <figure className="landing-product-shot">
                      <figcaption>
                        <span>
                          <b>{group.step}</b> {group.caption}
                        </span>
                        <button
                          type="button"
                          aria-label={`${group.caption} 화면 확대 보기`}
                          onClick={() =>
                            setImagePreview({
                              title: group.caption,
                              images: [
                                ...(group.secondaryImage
                                  ? [
                                      {
                                        src: group.secondaryImage,
                                        alt: group.secondaryImageAlt ?? '',
                                      },
                                    ]
                                  : []),
                                { src: group.image, alt: group.imageAlt },
                              ],
                            })
                          }
                        >
                          <Maximize2 size={14} /> 확대
                        </button>
                      </figcaption>
                      <div
                        className={`landing-product-shot-crop${group.secondaryImage ? ' landing-operation-composite' : ''}`}
                      >
                        <picture>
                          {group.mobileImage && (
                            <source media="(max-width: 640px)" srcSet={group.mobileImage} />
                          )}
                          <img
                            src={group.image}
                            alt={group.imageAlt}
                            loading="lazy"
                            decoding="async"
                          />
                        </picture>
                        {group.secondaryImage && (
                          <img
                            className="landing-operation-secondary-screen"
                            src={group.secondaryImage}
                            alt={group.secondaryImageAlt ?? ''}
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                    </figure>
                    <div className="landing-operation-step-copy">
                      <span aria-hidden="true">
                        <Icon size={22} />
                      </span>
                      <div>
                        <h3>{group.title}</h3>
                        <p>{group.description}</p>
                        <ul>
                          {group.items.map((item) => (
                            <li key={item}>
                              <Check size={14} /> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="landing-operation-pagination" role="group" aria-label="운영 화면 선택">
              {operationGroups.map((group, index) => (
                <button
                  type="button"
                  className={activeOperation === index ? 'active' : undefined}
                  aria-label={`${group.step} ${group.caption} 보기`}
                  aria-current={activeOperation === index ? 'step' : undefined}
                  onClick={() => scrollToOperation(index)}
                  key={group.step}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <div className="landing-container landing-reveal">
            <div>
              <p>다섯 단계면 신청 링크가 완성돼요</p>
              <h2 id="final-cta-title">
                첫 강의를 지금,
                <br />
                가볍게 열어보세요.
              </h2>
              <span>
                제목과 일정부터 입력하세요. 공개 전까지 언제든 수정하고, 준비가 끝나면 링크로 바로
                공유할 수 있어요.
              </span>
            </div>
            <Link className="landing-button landing-button-light" to="/signup">
              무료로 시작하기 <ArrowRight size={19} />
            </Link>
          </div>
        </section>
      </div>

      <footer className="landing-footer">
        <div className="landing-container">
          <a className="landing-brand" href="#top">
            <span>
              <Check size={15} strokeWidth={3} />
            </span>
            원클릭 클래스
          </a>
          <p>강의 개설부터 신청·출석·수료까지, 한곳에서.</p>
          <small>© 2026 OneClick Class</small>
        </div>
      </footer>

      <Modal
        className="landing-image-dialog"
        open={Boolean(imagePreview)}
        title={imagePreview?.title ?? '제품 화면'}
        onClose={() => setImagePreview(null)}
      >
        {imagePreview && (
          <div
            className={
              imagePreview.images.length > 1
                ? 'landing-image-dialog-grid'
                : 'landing-image-dialog-grid single'
            }
          >
            {imagePreview.images.map((image) => (
              <img src={image.src} alt={image.alt} key={image.src} />
            ))}
          </div>
        )}
      </Modal>
    </main>
  );
}
