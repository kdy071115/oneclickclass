import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Link2,
  ListChecks,
  MonitorSmartphone,
  Play,
  QrCode,
  Send,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/common/StatusBadge';
import { applicants, classes, classDetail, dashboard } from '../constants/mockData';
import { won } from '../utils/format';

const navItems = [
  ['product', '제품'],
  ['create', '강의 만들기'],
  ['operations', '운영'],
  ['learner', '학습자 경험'],
] as const;

const launchStages = [
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

const creationSteps = ['강의 정보', '진행 방식', '일정·가격', '신청 질문', '최종 확인'] as const;

const operationGroups = [
  {
    icon: Users,
    title: '신청과 결제',
    description: '신청자 정보와 승인, 결제 상태를 한 목록에서 확인해요.',
    items: ['신청자 관리', '결제 상태', '알림 발송'],
  },
  {
    icon: ClipboardCheck,
    title: '수업 운영',
    description: '현장 QR 출석부터 온라인 진도, 설문과 시험까지 이어져요.',
    items: ['출석 QR', '학습 진도', '설문·시험'],
  },
  {
    icon: GraduationCap,
    title: '수료와 정산',
    description: '수료 기준을 확인하고 수료증 발급과 정산을 마무리해요.',
    items: ['수료 기준', '수료증', '정산 관리'],
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
  const [activeSection, setActiveSection] = useState('product');

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll');
    const revealItems = [...document.querySelectorAll<HTMLElement>('.landing-reveal')];
    const sections = navItems
      .map(([id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

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
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-25% 0px -60%', threshold: [0, 0.25, 0.6] },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
    sections.forEach((section) => sectionObserver.observe(section));

    return () => {
      document.documentElement.classList.remove('landing-scroll');
      revealObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <main className="landing-page" id="top">
      <a className="landing-skip-link" href="#landing-content">
        본문으로 바로가기
      </a>

      <header className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <a className="landing-brand" href="#top" aria-label="원클릭 클래스 홈">
            <span aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
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
          <div className="landing-container">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow"><CheckCircle2 size={16} /> 복잡한 LMS 없이 시작하세요</p>
              <h1 id="landing-hero-title">
                강의 만들기,<br />
                <span>이렇게 쉬웠나요?</span>
              </h1>
              <p className="landing-hero-description">
                생성부터 신청·출석·수료까지 하나의 흐름으로.<br />
                복잡한 LMS 없이, 링크 하나로 끝내세요.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-button landing-button-primary" to="/signup">
                  무료로 시작하기 <ArrowRight size={18} />
                </Link>
                <a className="landing-button landing-button-secondary" href="#product">
                  <Play size={17} fill="currentColor" /> 데모 보기
                </a>
              </div>
              <p className="landing-hero-note">
                <Check size={15} /> 기술 지식 없이 시작
                <span aria-hidden="true">·</span>
                <Check size={15} /> 모바일 신청 페이지 제공
              </p>
            </div>

            <div className="landing-hero-preview" aria-label="강사 대시보드와 학습자 신청 화면 예시">
              <div className="landing-dashboard-frame">
                <div className="landing-window-bar">
                  <span /><span /><span />
                  <small>oneclickclass.kr</small>
                </div>
                <div className="landing-dashboard-shell">
                  <aside>
                    <div className="landing-mini-brand"><Check size={12} strokeWidth={3} /></div>
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
                      <span><Bell size={15} /><i /></span>
                    </header>
                    <div className="landing-preview-kpis">
                      <article className="blue">
                        <small>신규 신청</small>
                        <strong>{dashboard.newApplicants}<em>건</em></strong>
                        <span>오늘 접수</span>
                      </article>
                      <article className="orange">
                        <small>결제 대기</small>
                        <strong>{dashboard.pendingPayments}<em>건</em></strong>
                        <span>{won(dashboard.pendingAmount ?? 0)}</span>
                      </article>
                      <article className="purple">
                        <small>진행중 클래스</small>
                        <strong>{dashboard.todayClasses}<em>개</em></strong>
                        <span>오늘 일정</span>
                      </article>
                    </div>
                    <div className="landing-preview-panel">
                      <div className="landing-preview-panel-title">
                        <strong>오늘 일정</strong>
                        <span>전체보기 <ChevronRight size={12} /></span>
                      </div>
                      {schedule && (
                        <div className="landing-schedule-row">
                          <time>{schedule.time}</time>
                          <div>
                            <StatusBadge>{schedule.badge}</StatusBadge>
                            <b>{schedule.title}</b>
                            <small>{schedule.meta}</small>
                          </div>
                          <button type="button" aria-label="강의실 입장 예시">입장</button>
                        </div>
                      )}
                    </div>
                    <div className="landing-preview-panel landing-class-row">
                      <div>
                        <StatusBadge>{course.status}</StatusBadge>
                        <b>{course.title}</b>
                        <small>{course.type} · {course.date}</small>
                      </div>
                      <span>
                        <small>신청 {course.enrolled}/{course.capacity}</small>
                        <i><em style={{ width: `${course.enrolled / course.capacity * 100}%` }} /></i>
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
                      <div><dt><CalendarDays size={13} /> 일정</dt><dd>{course.date}</dd></div>
                      <div><dt><MonitorSmartphone size={13} /> 장소</dt><dd>{classDetail.location}</dd></div>
                    </dl>
                    <div className="landing-phone-price">
                      <span>수강료</span><b>{won(classDetail.price)}</b>
                    </div>
                  </div>
                  <div className="landing-phone-cta">클래스 신청하기</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-product" id="product" aria-labelledby="product-title">
          <div className="landing-container">
            <div className="landing-section-heading landing-reveal">
              <p className="landing-kicker">INSTRUCTOR HOME</p>
              <h2 id="product-title">분석보다 먼저,<br />오늘 할 일을 보여줘요</h2>
              <p>복잡한 숫자 대신 새 신청, 결제 대기, 오늘 수업처럼 지금 움직여야 할 상태를 앞에 둡니다.</p>
            </div>

            <div className="landing-product-grid landing-reveal">
              <div className="landing-action-board">
                <header>
                  <div>
                    <span className="landing-live-dot" /> 오늘의 클래스
                    <h3>놓치면 안 되는 운영 항목</h3>
                  </div>
                  <button type="button" aria-label="운영 알림 예시"><Bell size={18} /></button>
                </header>
                <div className="landing-action-cards">
                  <article className="urgent">
                    <span><CircleDollarSign size={20} /></span>
                    <div><small>확인이 필요해요</small><b>결제 대기 {dashboard.pendingPayments}건</b></div>
                    <ChevronRight size={18} />
                  </article>
                  <article>
                    <span><Users size={20} /></span>
                    <div><small>방금 들어왔어요</small><b>새 신청자 {dashboard.newApplicants}명</b></div>
                    <ChevronRight size={18} />
                  </article>
                  <article>
                    <span><CalendarDays size={20} /></span>
                    <div><small>오늘 오후 8:00</small><b>{classDetail.title}</b></div>
                    <ChevronRight size={18} />
                  </article>
                </div>
                <div className="landing-activity">
                  <div><span><Check size={14} /></span><p><b>박민지</b>님의 결제가 완료됐어요</p><time>방금</time></div>
                  <div><span><Send size={13} /></span><p>수업 안내 알림이 발송됐어요</p><time>1시간 전</time></div>
                </div>
              </div>

              <div className="landing-product-points">
                <article>
                  <span>01</span>
                  <div><h3>상태가 먼저 보여요</h3><p>준비중, 모집중, 결제대기처럼 다음 행동을 바로 판단할 수 있어요.</p></div>
                </article>
                <article>
                  <span>02</span>
                  <div><h3>필요한 곳으로 바로 이동해요</h3><p>카드를 누르면 신청자, 출석, 정산 화면으로 자연스럽게 이어져요.</p></div>
                </article>
                <article>
                  <span>03</span>
                  <div><h3>데스크톱에 맞게 넓게 봐요</h3><p>운영 목록은 넉넉하게, 중요한 상태는 작고 선명하게 정리했어요.</p></div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-create" id="create" aria-labelledby="create-title">
          <div className="landing-container">
            <div className="landing-section-heading centered landing-reveal">
              <p className="landing-kicker">HOW IT WORKS</p>
              <h2 id="create-title">세 단계면 신청 링크가 완성돼요</h2>
              <p>한 번에 모든 걸 설정하지 않아도 괜찮아요. 지금 필요한 정보부터 순서대로 안내합니다.</p>
            </div>

            <ol className="landing-launch-stages landing-reveal">
              {launchStages.map((stage, index) => (
                <li className={index === 0 ? 'active' : ''} key={stage.number}>
                  <span>{stage.number}</span>
                  <div>
                    <h3>{stage.title}</h3>
                    <p>{stage.description}</p>
                  </div>
                  {index < launchStages.length - 1 && <ChevronRight aria-hidden="true" />}
                </li>
              ))}
            </ol>

            <div className="landing-builder landing-reveal">
              <div className="landing-builder-sidebar">
                <p>강의 만들기</p>
                <ol>
                  {creationSteps.map((step, index) => (
                    <li className={index === 0 ? 'current' : ''} key={step}>
                      <span>{index === 0 ? '1' : index + 1}</span>
                      <div><b>{step}</b><small>{index === 0 ? '작성 중' : '다음 단계'}</small></div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="landing-builder-form">
                <div className="landing-builder-progress"><span style={{ width: '20%' }} /></div>
                <header>
                  <p>1 / 5</p>
                  <h3>어떤 강의를 만드시나요?</h3>
                  <span>먼저 강의의 기본 정보를 알려주세요.</span>
                </header>
                <div className="landing-field">
                  <label>강의 제목</label>
                  <div>{classDetail.title}</div>
                  <small>학습자가 이해하기 쉬운 이름을 입력해 주세요.</small>
                </div>
                <div className="landing-field">
                  <label>한 줄 소개</label>
                  <div>{classDetail.summary}</div>
                </div>
                <footer>
                  <button type="button" disabled>이전</button>
                  <button type="button">다음 단계 <ArrowRight size={16} /></button>
                </footer>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-operations" id="operations" aria-labelledby="operations-title">
          <div className="landing-container">
            <div className="landing-section-heading landing-reveal">
              <p className="landing-kicker">OPERATIONS</p>
              <h2 id="operations-title">신청 이후의 운영도<br />한 흐름으로 관리해요</h2>
              <p>기능을 따로 찾아다니지 않도록 클래스의 시작, 진행, 완료 순서에 맞춰 묶었습니다.</p>
            </div>

            <div className="landing-operation-groups landing-reveal">
              {operationGroups.map(({ icon: Icon, title, description, items }) => (
                <article key={title}>
                  <span><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <ul>{items.map((item) => <li key={item}><Check size={14} /> {item}</li>)}</ul>
                </article>
              ))}
            </div>

            <div className="landing-operations-preview landing-reveal">
              <div className="landing-applicant-panel">
                <header>
                  <div><small>신청자 관리</small><h3>{classDetail.title}</h3></div>
                  <button type="button"><Send size={15} /> 알림 보내기</button>
                </header>
                <div className="landing-applicant-summary">
                  <span><small>전체 신청</small><b>{course.enrolled}명</b></span>
                  <span><small>결제 완료</small><b>{course.enrolled - dashboard.pendingPayments}명</b></span>
                  <span><small>승인 대기</small><b>{dashboard.newApplicants}명</b></span>
                </div>
                <div className="landing-applicant-table" role="table" aria-label="신청자 관리 화면 예시">
                  <div className="heading" role="row">
                    <span>신청자</span><span>신청 시각</span><span>결제</span><span>상태</span>
                  </div>
                  {applicants.map((applicant, index) => (
                    <div role="row" key={applicant.id}>
                      <span><i>{applicant.name.slice(0, 1)}</i><b>{applicant.name}</b></span>
                      <span>{applicant.appliedAt}</span>
                      <span><StatusBadge>{applicant.payment}</StatusBadge></span>
                      <span><StatusBadge>{index === 0 ? '승인대기' : '진행중'}</StatusBadge></span>
                    </div>
                  ))}
                </div>
              </div>
              <aside className="landing-qr-panel">
                <span className="landing-qr-icon"><QrCode size={92} strokeWidth={1.3} /></span>
                <StatusBadge>진행중</StatusBadge>
                <h3>출석 QR</h3>
                <p>수강생이 휴대폰으로 스캔하면 출석 상태가 바로 반영돼요.</p>
                <button type="button">QR 크게 보기</button>
              </aside>
            </div>
          </div>
        </section>

        <section className="landing-section landing-learner" id="learner" aria-labelledby="learner-title">
          <div className="landing-container landing-learner-grid">
            <div className="landing-learner-copy landing-reveal">
              <p className="landing-kicker">LEARNER EXPERIENCE</p>
              <h2 id="learner-title">공유한 링크 하나가<br />학습까지 이어져요</h2>
              <p>학습자는 모바일에서 강의를 확인하고 신청한 뒤, 같은 흐름에서 바로 학습을 계속할 수 있어요.</p>
              <ol className="landing-journey">
                {learnerJourney.map(([title, description], index) => (
                  <li key={title}>
                    <span>{index + 1}</span>
                    <div><b>{title}</b><p>{description}</p></div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="landing-learner-phone landing-reveal" aria-label="모바일 학습자 화면 예시">
              <div className="landing-learner-device">
                <div className="landing-device-top"><span>9:41</span><i /></div>
                <div className="landing-learner-cover">
                  <Play size={30} fill="currentColor" />
                  <span>온라인 클래스</span>
                </div>
                <div className="landing-learner-content">
                  <StatusBadge>{course.status}</StatusBadge>
                  <h3>{classDetail.title}</h3>
                  <p>{classDetail.summary}</p>
                  <div className="landing-learner-instructor"><i>이</i><span><small>강사</small><b>{classDetail.instructor}</b></span></div>
                  <dl>
                    <div><dt><CalendarDays size={15} /> 일정</dt><dd>{course.date}</dd></div>
                    <div><dt><MonitorSmartphone size={15} /> 장소</dt><dd>{classDetail.location}</dd></div>
                    <div><dt><Users size={15} /> 남은 자리</dt><dd>{course.capacity - course.enrolled}자리</dd></div>
                  </dl>
                  <div className="landing-curriculum">
                    <div><b>커리큘럼</b><small>총 {classDetail.sessions}회</small></div>
                    {classDetail.curriculum.slice(0, 2).map((lesson, index) => (
                      <p key={lesson.id}><span>{index + 1}</span><b>{lesson.title}</b><small>{lesson.durationText}</small></p>
                    ))}
                  </div>
                </div>
                <div className="landing-learner-sticky">
                  <span><small>수강료</small><b>{won(classDetail.price)}</b></span>
                  <button type="button">신청하기</button>
                </div>
              </div>
              <span className="landing-share-chip"><Link2 size={16} /> 링크 공유 완료</span>
            </div>
          </div>
        </section>

        <section className="landing-section landing-trust" aria-labelledby="trust-title">
          <div className="landing-container">
            <div className="landing-section-heading centered landing-reveal">
              <p className="landing-kicker">CALM & CLEAR</p>
              <h2 id="trust-title">누구에게나 분명한 화면을 만들었어요</h2>
              <p>작은 화면, 키보드 탐색, 처리 중인 순간까지 사용자가 현재 상태를 놓치지 않게 안내합니다.</p>
            </div>
            <div className="landing-trust-grid landing-reveal">
              <article><MonitorSmartphone size={24} /><h3>어디서든 편안하게</h3><p>데스크톱 운영과 모바일 신청 화면이 각각의 사용 환경에 맞게 반응해요.</p></article>
              <article><ShieldCheck size={24} /><h3>상태를 숨기지 않게</h3><p>성공, 오류, 빈 화면, 처리 중 상태를 색상과 문장으로 함께 알려줘요.</p></article>
              <article><ListChecks size={24} /><h3>다음 행동이 분명하게</h3><p>한 섹션에는 하나의 핵심 행동을 두고 키보드 포커스도 선명하게 보여요.</p></article>
            </div>
            <div className="landing-state-preview landing-reveal" aria-label="서비스 상태 안내 화면 예시">
              <span className="success"><CheckCircle2 size={18} /><b>저장 완료</b><small>변경한 내용이 안전하게 저장됐어요.</small></span>
              <span className="error"><FileCheck2 size={18} /><b>입력을 확인해 주세요</b><small>모집 종료일은 시작일보다 빨라요.</small></span>
              <button type="button" disabled><span className="landing-loading-dot" /> 게시 중...</button>
            </div>
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <div className="landing-container landing-reveal">
            <div>
              <p>LMS를 몰라도 괜찮아요</p>
              <h2 id="final-cta-title">첫 강의,<br />복잡하게 시작하지 마세요.</h2>
              <span>기본 정보를 입력하고 커리큘럼을 구성하면 바로 신청 링크를 공유할 수 있어요.</span>
            </div>
            <Link className="landing-button landing-button-light" to="/signup">
              무료로 시작하기 <ArrowRight size={19} />
            </Link>
          </div>
        </section>
      </div>

      <footer className="landing-footer">
        <div className="landing-container">
          <a className="landing-brand" href="#top"><span><Check size={15} strokeWidth={3} /></span>원클릭 클래스</a>
          <p>강의 개설부터 신청·출석·수료까지, 한곳에서.</p>
          <small>© 2026 OneClick Class</small>
        </div>
      </footer>

      <Link className="landing-mobile-cta" to="/signup">
        무료로 시작하기 <ArrowRight size={18} />
      </Link>
    </main>
  );
}
