import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CaseSensitive,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Link2,
  List,
  Maximize2,
  Menu,
  MonitorSmartphone,
  MousePointer2,
  Play,
  Settings,
  SkipForward,
  Sparkles,
  Users,
  Volume2,
  Youtube,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource-variable/geist';
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
import { HeroProductMockup } from '../components/ui/HeroProductMockup';
import { HeroWithProductMockup } from '../components/ui/hero-with-product-mockup';
import { classes, classDetail } from '../constants/mockData';
import { won } from '../utils/format';

const navItems = [
  ['create', '강의 만들기'],
  ['learner', '공유·학습'],
  ['product', '강사 홈'],
  ['operations', '운영'],
] as const;

const quickstartUrlExamples = [
  '유튜브 영상 링크를 여기에 붙여넣어 보세요',
  '블로그 주소 하나면 강의가 뚝딱 완성됩니다',
  '학습하고 싶은 뉴스 기사 링크도 좋아요',
  'https://youtube.com/watch?v=... (이렇게 입력해 보세요!)',
] as const;

const quickstartCurriculum = [
  { title: '1. 데이터 분석이란?', time: '08:45' },
  { title: '2. 데이터 수집 방법', time: '12:30' },
  { title: '3. 데이터 전처리', time: '15:20' },
] as const;

const creatorPath = [
  {
    icon: FileText,
    title: '콘텐츠 불러오기',
    description: '영상 링크를 연결하거나 영상 파일과 문서를 올려 시작해요.',
  },
  {
    icon: Sparkles,
    title: '강의 구성 확인',
    description: '차시와 학습 흐름을 원하는 대로 정리해요.',
  },
  {
    icon: Link2,
    title: '신청 링크 공유',
    description: '무료·유료로 공개하고 바로 공유해요.',
  },
] as const;

const creatorAssurances = [
  '영상 링크·파일·문서 지원',
  '무료·유료 강의 설정',
  '공개 전까지 언제든 수정',
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

function LearnerCoursePhone({ showShareChip = false }: { showShareChip?: boolean }) {
  return (
    <>
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
      {showShareChip && (
        <span className="landing-share-chip" aria-hidden="true">
          <Link2 size={16} /> 링크 공유 완료
        </span>
      )}
    </>
  );
}

export function LandingPage() {
  const [activeSection, setActiveSection] = useState('');
  const [activeOperation, setActiveOperation] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [typedUrlExample, setTypedUrlExample] = useState('');
  const [urlTypewriterPaused, setUrlTypewriterPaused] = useState(false);
  const operationGalleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (urlTypewriterPaused) return;

    let exampleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = quickstartUrlExamples[exampleIndex];
      charIndex += isDeleting ? -1 : 1;
      setTypedUrlExample(current.slice(0, charIndex));

      let delay = isDeleting ? 32 : 55;
      if (!isDeleting && charIndex === current.length) {
        isDeleting = true;
        delay = 1800;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        exampleIndex = (exampleIndex + 1) % quickstartUrlExamples.length;
        delay = 400;
      }

      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, 500);
    return () => clearTimeout(timeoutId);
  }, [urlTypewriterPaused]);

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
          <details
            className="landing-mobile-menu"
            onToggle={(event) => setMobileMenuOpen(event.currentTarget.open)}
          >
            <summary
              aria-label={`랜딩 페이지 메뉴 ${mobileMenuOpen ? '닫기' : '열기'}`}
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={20} />
            </summary>
            <nav aria-label="모바일 랜딩 페이지 메뉴">
              {navItems.map(([id, label]) => (
                <a
                  className={activeSection === id ? 'active' : ''}
                  href={`#${id}`}
                  aria-current={activeSection === id ? 'location' : undefined}
                  onClick={(event) => {
                    setMobileMenuOpen(false);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                  key={id}
                >
                  {label}
                </a>
              ))}
              <Link
                className="landing-mobile-login"
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
              >
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
              무료로 강의 만들기
            </Link>
          </div>
        </div>
      </header>

      <div id="landing-content">
        <section className="landing-quickstart" aria-labelledby="landing-quickstart-title">
          <div className="landing-container landing-quickstart-inner">
            <h2 id="landing-quickstart-title" className="landing-quickstart-title">
              복잡한 준비 없이,
              <br />
              <span className="landing-quickstart-title-gradient">링크 하나</span>면 충분합니다.
            </h2>
            <p className="landing-quickstart-desc">
              유튜브, 블로그, 뉴스 기사의 URL을 붙여넣으세요.
              <br />
              AI가 내용을 분석해 즉시 학습 가능한 커리큘럼으로 변환합니다.
            </p>

            <div className="landing-quickstart-bar">
              <Link2 size={20} aria-hidden="true" />
              <div className="landing-quickstart-bar-input-wrap">
                {!urlTypewriterPaused && (
                  <span className="landing-quickstart-bar-typewriter" aria-hidden="true">
                    {typedUrlExample}
                    <span className="landing-quickstart-bar-caret" />
                  </span>
                )}
                <input
                  type="url"
                  aria-label="유튜브 영상 링크"
                  autoComplete="off"
                  onFocus={() => setUrlTypewriterPaused(true)}
                  onBlur={(event) => setUrlTypewriterPaused(event.currentTarget.value.trim() !== '')}
                />
              </div>
              <Link className="landing-quickstart-bar-cta" to="/signup">
                강의 만들기 <ArrowRight size={18} />
              </Link>
            </div>

            <div className="landing-quickstart-flow">
              <div className="landing-quickstart-mockup landing-quickstart-mockup-video">
                <div className="landing-quickstart-mockup-head">
                  <span className="landing-quickstart-mockup-youtube-badge" aria-hidden="true">
                    <Youtube size={13} />
                  </span>
                  <span className="landing-quickstart-mockup-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="landing-quickstart-thumb">
                  <svg
                    className="landing-quickstart-thumb-scene"
                    viewBox="0 0 320 180"
                    preserveAspectRatio="xMidYMid slice"
                    aria-hidden="true"
                  >
                    <rect width="320" height="180" fill="#cfe8fb" />
                    <circle cx="248" cy="46" r="26" fill="#fbfdff" opacity="0.9" />
                    <path d="M0 132L70 78 118 112 176 58 240 104 320 66V180H0Z" fill="#8fc7de" />
                    <path d="M0 150L96 108 168 138 232 100 320 128V180H0Z" fill="#5fa6c4" />
                    <path d="M0 180V158L320 158V180Z" fill="#3d7f9e" />
                  </svg>
                  <span className="landing-quickstart-play" aria-hidden="true">
                    <Play size={18} fill="currentColor" />
                  </span>
                  <span className="landing-quickstart-thumb-progress" aria-hidden="true" />
                </div>
                <div className="landing-quickstart-player-controls">
                  <Play size={11} fill="currentColor" aria-hidden="true" />
                  <SkipForward size={11} aria-hidden="true" />
                  <Volume2 size={11} aria-hidden="true" />
                  <span className="landing-quickstart-player-time">03:25 / 12:08</span>
                  <span className="grow" />
                  <Settings size={11} aria-hidden="true" />
                  <Maximize2 size={11} aria-hidden="true" />
                </div>
                <div className="landing-quickstart-link-row">
                  <Link2 size={14} aria-hidden="true" />
                  <span className="landing-quickstart-link-row-text">
                    https://www.youtube.com/watch?v=...
                  </span>
                  <span className="landing-quickstart-cursor-wrap">
                    <MousePointer2
                      size={14}
                      className="landing-quickstart-cursor"
                      fill="currentColor"
                      aria-hidden="true"
                    />
                    <span className="landing-quickstart-click-fx" aria-hidden="true" />
                  </span>
                </div>
              </div>

              <span className="landing-quickstart-arrow" aria-hidden="true">
                <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
                  <path
                    className="landing-quickstart-dash"
                    d="M0 10H32"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M25 3L33 10L25 17"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <div className="landing-quickstart-mockup landing-quickstart-mockup-analyze">
                <span className="landing-quickstart-url-pill">
                  <span className="landing-quickstart-url-pill-text">
                    https://www.youtube.com/watch?v=...
                  </span>
                  <span className="landing-quickstart-url-check" aria-hidden="true">
                    <Check size={11} strokeWidth={3} />
                  </span>
                </span>
                <div className="landing-quickstart-orbit" aria-hidden="true">
                  <span className="landing-quickstart-orbit-pulse" />
                  <span className="landing-quickstart-orbit-pulse landing-quickstart-orbit-pulse-delay" />
                  <span className="landing-quickstart-orbit-ring landing-quickstart-orbit-ring-outer" />
                  <span className="landing-quickstart-orbit-ring landing-quickstart-orbit-ring-inner" />
                  <span className="landing-quickstart-orbit-node landing-quickstart-orbit-node-text">
                    <CaseSensitive size={14} />
                  </span>
                  <span className="landing-quickstart-orbit-node landing-quickstart-orbit-node-image">
                    <ImageIcon size={13} />
                  </span>
                  <span className="landing-quickstart-orbit-node landing-quickstart-orbit-node-list">
                    <List size={13} />
                  </span>
                  <span className="landing-quickstart-orbit-center">
                    <Sparkles size={20} />
                  </span>
                </div>
                <div className="landing-quickstart-progress">
                  <i />
                </div>
              </div>

              <span className="landing-quickstart-arrow" aria-hidden="true">
                <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
                  <path
                    className="landing-quickstart-dash"
                    d="M0 10H32"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M25 3L33 10L25 17"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <div className="landing-quickstart-mockup landing-quickstart-mockup-result">
                <div className="landing-quickstart-result-hero">
                  <div className="landing-quickstart-result-hero-lines">
                    <i className="accent" />
                    <i />
                    <i className="short" />
                  </div>
                  <span className="landing-quickstart-result-hero-icon" aria-hidden="true">
                    <BookOpen size={15} />
                    <span className="landing-quickstart-result-hero-play">
                      <Play size={8} fill="currentColor" />
                    </span>
                  </span>
                </div>
                <ul className="landing-quickstart-curriculum">
                  {quickstartCurriculum.map((lesson) => (
                    <li key={lesson.title}>
                      <span className="landing-quickstart-curriculum-play" aria-hidden="true">
                        <Play size={9} fill="currentColor" />
                      </span>
                      <span className="landing-quickstart-curriculum-title">{lesson.title}</span>
                      <small>{lesson.time}</small>
                    </li>
                  ))}
                </ul>
                <div className="landing-quickstart-materials">
                  <span className="landing-quickstart-material" data-tone="pdf">
                    <b>PDF</b>
                    <small>PDF</small>
                  </span>
                  <span className="landing-quickstart-material" data-tone="ppt">
                    <b>PPT</b>
                    <small>PPT</small>
                  </span>
                  <span className="landing-quickstart-material" data-tone="quiz">
                    <b>
                      <CheckCircle2 size={16} aria-hidden="true" />
                    </b>
                    <small>Quiz</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <HeroWithProductMockup
          titleId="landing-hero-title"
          title={
            <>
              강의를 여는 일도,
              <br />
              <span>
                링크 하나면
                <br />
                가벼워져요
              </span>
            </>
          }
          description={
            <>
              영상 링크를 연결하거나 PDF와 문서를 올리세요.
              <br /> 강의 구성부터 신청 링크와 학습 화면까지 한곳에서 준비할 수 있어요.
            </>
          }
          actions={
            <>
              <Link className="landing-button landing-button-primary" to="/signup">
                무료로 강의 만들기 <ArrowRight size={18} />
              </Link>
              <a className="landing-button landing-button-secondary" href="#create">
                <ArrowDown size={17} /> 실제 화면 보기
              </a>
            </>
          }
          assurances={creatorAssurances}
          assurancesLabel="강의 개설 핵심 안내"
          productMockup={
            <HeroProductMockup
              ariaLabel="강사용 운영 화면과 수강생용 신청 화면"
              brandLabel="원클릭 클래스"
              caption="강사 운영부터 수강생 신청과 학습까지 이어지는 실제 제품 화면"
              desktopImage={dashboardScreen}
              desktopImageAlt="히어로의 원클릭 클래스 운영 대시보드"
              desktopTitle="강사 홈"
              mobileContent={<LearnerCoursePhone />}
            />
          }
        />

        <section
          className="landing-section landing-create"
          id="create"
          aria-labelledby="create-title"
        >
          <div className="landing-container">
            <div className="landing-section-heading centered landing-reveal">
              <h2 id="create-title">가지고 있는 콘텐츠에서 판매할 강의까지</h2>
              <p>
                영상 링크를 연결하거나 파일·문서를 올린 뒤, 가격과 공개 범위를 정하면 신청 링크가
                완성됩니다.
              </p>
            </div>

            <ol
              className="landing-creator-path landing-reveal"
              aria-label="콘텐츠를 강의로 만드는 과정"
            >
              {creatorPath.map(({ icon: Icon, title, description }, index) => (
                <li key={title}>
                  <span>{index + 1}</span>
                  <Icon size={22} />
                  <div>
                    <b>{title}</b>
                    <p>{description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="landing-product-showcase landing-reveal">
              <figure className="landing-product-shot landing-product-shot-hero">
                <figcaption>
                  <span>실제 제품 화면 · 강의 개설</span>
                  <button
                    type="button"
                    aria-label="강의 개설 화면 확대 보기"
                    onClick={() =>
                      setImagePreview({
                        title: '강의 개설',
                        images: [
                          {
                            src: createClassScreen,
                            alt: '원클릭 클래스의 실제 강의 개설 화면',
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
                    src={createClassScreen}
                    alt="원클릭 클래스의 실제 강의 개설 화면"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </figure>
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
              <LearnerCoursePhone showShareChip />
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
              <h2 id="product-title">
                공개한 뒤에는 오늘 할 일만
                <br />
                한눈에 확인하세요
              </h2>
              <p>매출과 신규 신청, 진행 중 강의와 오늘 일정을 한 화면에 정리합니다.</p>
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
                  <div>
                    <h3>운영 지표를 한눈에 봐요</h3>
                    <p>이번 달 매출과 신규 신청, 진행 중 클래스를 한 줄에서 비교해요.</p>
                  </div>
                </article>
                <article>
                  <div>
                    <h3>오늘 일정을 바로 확인해요</h3>
                    <p>수업 시간, 방식, 수강생 수를 확인하고 강의실로 바로 들어가요.</p>
                  </div>
                </article>
                <article>
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
              <h2 id="operations-title">
                필요할 때는 출석과 수료까지
                <br />
                같은 흐름에서 이어가세요
              </h2>
              <p>
                기본은 가볍게 시작하고, 신청 확인부터 QR 출석과 수료증 발급까지 필요한 기능만 이어서
                사용하세요.
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
              <h2 id="final-cta-title">
                이미 만든 콘텐츠로,
                <br />
                다음 강의를 시작하세요.
              </h2>
              <span>
                영상 링크를 연결하거나 파일·문서를 올리세요. 공개 전까지 언제든 수정하고, 준비가
                끝나면 신청 링크로 바로 공유할 수 있어요.
              </span>
            </div>
            <Link className="landing-button landing-button-light" to="/signup">
              무료로 강의 만들기 <ArrowRight size={19} />
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
          <p>가지고 있는 콘텐츠를 판매할 강의와 학습 경험으로.</p>
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
