import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Link2,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import '@fontsource-variable/geist';
import { classService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { ClassCard } from '../components/feature/ClassCard';
import { Badge, BarChart, Table, Tabs, type TableColumn } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useRole } from '../hooks/useRole';
import { getSession } from '../auth/session';
import type { ClassItem } from '../types/class';
import { won } from '../utils/format';
import { getStatusTone } from '../utils/status';

const trendPeriods = ['최근 3개월', '최근 6개월'] as const;

const classColumns: TableColumn<ClassItem>[] = [
  {
    key: 'title',
    header: '클래스명',
    render: (item) => (
      <Link to={`/classes/${item.id}`}>
        <b>{item.title}</b>
      </Link>
    ),
  },
  {
    key: 'status',
    header: '상태',
    render: (item) => <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>,
  },
  {
    key: 'enrolled',
    header: '신청/정원',
    render: (item) => (
      <>
        {item.enrolled} / {item.capacity}명
      </>
    ),
  },
  {
    key: 'schedule',
    header: '일정',
    render: (item) => (
      <>
        {item.type} · {item.date}
      </>
    ),
  },
];

function CreatorActivation({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`creator-activation${compact ? ' compact' : ''}`}>
      <span className="creator-activation-icon" aria-hidden="true">
        <Sparkles />
      </span>
      <div className="creator-activation-copy">
        <h2>영상 링크 하나로 첫 강의를 시작해 보세요</h2>
        <p>
          영상을 확인한 뒤 제목과 소개의 초안을 만들고, 공개할 페이지에서 바로 다듬을 수 있어요.
        </p>
      </div>
      <div className="creator-activation-actions">
        <Link className="ui-button ui-button-primary" to="/classes/new?source=video&step=2">
          <Link2 />
          영상 링크로 시작
          <ArrowRight />
        </Link>
        <Link className="ui-button ui-button-secondary" to="/classes/new">
          다른 방식으로 만들기
        </Link>
      </div>
    </section>
  );
}

export function HomePage() {
  const nav = useNavigate();
  const { role } = useRole();
  const load = useCallback(() => classService.dashboard(), []);
  const { data, loading, error, retry } = useAsync(load);
  const loadClasses = useCallback(() => classService.list(), []);
  const {
    data: classItems = [],
    loading: classesLoading,
    error: classesError,
    retry: retryClasses,
  } = useAsync(loadClasses);
  const [statsTab, setStatsTab] = useState<'enrollment' | 'members'>('enrollment');
  const [trendPeriod, setTrendPeriod] = useState<(typeof trendPeriods)[number]>('최근 6개월');

  if (loading || error || !data) {
    return (
      <>
        <div className="page">
          <AsyncState loading={loading} error={error} onRetry={retry} />
        </div>
        <div className="oc-web-page">
          <AsyncState loading={loading} error={error} onRetry={retry} />
        </div>
      </>
    );
  }

  const teacher = role === 'teacher';
  const tintCards = [
    ['수강 중', '이번 주 강의 3개', '2개', '#e1f7ec', '/classes'],
    ['이수 완료', '누적 12개', '3개', '#e7f0ff', '/classes'],
    ['학습 완료', '누적 학습 현황', '3개', '#eceafe', '/classes'],
  ];
  const kpiCards = [
    {
      label: '이번 달 매출',
      value: data.monthlyRevenue == null ? '-' : won(data.monthlyRevenue),
      tag: data.monthlyRevenueChange,
      detail: '이번 달 누적',
      to: '/settlements',
    },
    {
      label: '신규 신청',
      value: `${data.newApplicants}건`,
      detail: '오늘 접수',
      to: '/applicants',
    },
    {
      label: '오늘 강의',
      value: `${data.todayClasses}개`,
      detail: data.activeStudents == null ? '수강생 집계 전' : `수강생 ${data.activeStudents}명`,
      to: '/classes',
    },
  ];
  const enrollmentTrend = data.enrollmentTrend ?? [];
  const memberTrend = data.memberTrend ?? [];
  const todaySchedule = data.todaySchedule ?? [];
  const trendRange = trendPeriod === '최근 3개월' ? 3 : 6;
  const visibleEnrollmentTrend = enrollmentTrend.slice(-trendRange);
  const visibleMemberTrend = memberTrend.slice(-trendRange);
  const enrollmentTotal = visibleEnrollmentTrend.reduce((sum, item) => sum + item.value, 0);
  const memberTotal = visibleMemberTrend.reduce((sum, item) => sum + item.value, 0);
  const visibleTrend = statsTab === 'enrollment' ? visibleEnrollmentTrend : visibleMemberTrend;
  const studentStats = data.studentStats ?? [];
  const studentInProgress = data.studentInProgress ?? [];
  const userName = getSession()?.user.name || '강사';
  const dashboardIntro = `${userName}님, 오늘 운영 현황을 확인해 보세요`;
  const nextClass = todaySchedule[0] ?? null;
  const recentApplicants = data.applicants.slice(0, 3);
  const recentPendingApplicant = data.applicants.find(
    (applicant) => applicant.payment === '결제대기',
  );

  return (
    <>
      <div className={`oc-web-page${teacher ? ' teacher-dashboard-page' : ''}`}>
        {teacher && (
          <header className="dashboard-mobile-header app-only">
            <Link to="/dashboard">원클릭 클래스</Link>
            <button
              type="button"
              className="dashboard-mobile-notification"
              aria-label="알림"
              onClick={() => nav('/notifications')}
            >
              <Bell size={20} />
            </button>
          </header>
        )}
        <div className="oc-web-head">
          <h1>홈</h1>
          <p>
            {teacher
              ? `오늘 강의 ${data.todayClasses}개, 신규 신청 ${data.newApplicants}건이 있어요`
              : '이어서 들을 강의를 확인하세요'}
          </p>
        </div>

        {teacher ? (
          <div className="oc-stack dashboard-refresh">
            <header className="dashboard-intro">
              <div className="dashboard-intro-copy">
                <h2 className="dashboard-intro-title">{dashboardIntro}</h2>
                <p>
                  {!classesLoading && classItems.length === 0
                    ? '첫 클래스를 만들고 운영을 시작해 보세요.'
                    : '다음 수업과 확인이 필요한 업무부터 정리했습니다.'}
                </p>
              </div>
            </header>

            {classesLoading ? (
              <section className="oc-panel">
                <AsyncState loading />
              </section>
            ) : classesError ? (
              <section className="oc-panel">
                <AsyncState loading={false} error={classesError} onRetry={retryClasses} />
              </section>
            ) : classItems.length === 0 ? (
              <CreatorActivation />
            ) : (
              <>
                <section className="dashboard-priority" aria-labelledby="dashboard-priority-title">
                  <div className="dashboard-section-heading">
                    <div>
                      <h2 id="dashboard-priority-title">오늘 먼저 확인할 일</h2>
                      <p>수업 시작과 미처리 업무를 우선순위대로 보여드립니다.</p>
                    </div>
                  </div>

                  <div className="dashboard-priority-grid">
                    <article className="oc-panel dashboard-next-class">
                      <div className="dashboard-task-head">
                        <div>
                          <h3>다음 수업</h3>
                          <p>
                            {nextClass ? `오늘 예정 ${todaySchedule.length}개` : '예정된 수업 없음'}
                          </p>
                        </div>
                        <span aria-hidden="true">
                          <CalendarDays size={21} />
                        </span>
                      </div>

                      {nextClass ? (
                        <>
                          <div className="dashboard-next-class-main">
                            <time>
                              <small>{nextClass.meridiem}</small>
                              <strong>{nextClass.time}</strong>
                            </time>
                            <div>
                              <Badge tone="primary">{nextClass.badge}</Badge>
                              <h4>{nextClass.title}</h4>
                              <p>{nextClass.meta}</p>
                            </div>
                          </div>
                          <div className="dashboard-task-actions">
                            <Link className="dashboard-task-primary" to="/attendance/select">
                              출석 시작 <ArrowRight size={16} />
                            </Link>
                            <Link className="dashboard-task-secondary" to="/classes">
                              전체 일정
                            </Link>
                          </div>
                        </>
                      ) : (
                        <div className="dashboard-task-empty">
                          <b>오늘 예정된 수업이 없습니다</b>
                          <span>다음 클래스 일정을 준비해 보세요.</span>
                        </div>
                      )}
                    </article>

                    <article className="oc-panel dashboard-attention-panel">
                      <div className="dashboard-task-head">
                        <div>
                          <h3>확인이 필요한 일</h3>
                          <p>미처리 항목을 먼저 확인하세요.</p>
                        </div>
                        <span aria-hidden="true">
                          <CircleDollarSign size={21} />
                        </span>
                      </div>

                      <div className="dashboard-attention-value">
                        <strong>{data.pendingPayments}건</strong>
                        <span>결제 확인</span>
                      </div>
                      <p className="dashboard-attention-copy">
                        {data.pendingPayments > 0
                          ? `${won(data.pendingAmount)}의 결제 상태 확인이 필요합니다.${
                              recentPendingApplicant
                                ? ` 최근 대기 ${recentPendingApplicant.name} · ${recentPendingApplicant.appliedAt}`
                                : ''
                            }`
                          : '확인이 필요한 결제가 없습니다.'}
                      </p>
                      <div className="dashboard-attention-actions">
                        <Link to="/applicants?payment=결제대기">
                          <span>
                            <small>결제 대기</small>
                            <b>{data.pendingPayments}건</b>
                          </span>
                          <span>
                            결제 확인 <ArrowRight size={15} />
                          </span>
                        </Link>
                        <Link to="/applicants">
                          <span>
                            <small>신규 신청</small>
                            <b>{data.newApplicants}건</b>
                          </span>
                          <span>
                            신청 검토 <ArrowRight size={15} />
                          </span>
                        </Link>
                      </div>
                    </article>
                  </div>
                </section>

                <section className="dashboard-summary" aria-labelledby="dashboard-summary-title">
                  <div className="dashboard-section-heading">
                    <div>
                      <h2 id="dashboard-summary-title">핵심 지표</h2>
                      <p>오늘의 운영 판단에 필요한 수치만 모았습니다.</p>
                    </div>
                  </div>
                  <div className="oc-kpi-grid dashboard-kpi-grid">
                    {kpiCards.map((card) => (
                      <Link
                        className="oc-kpi-card dashboard-kpi-card"
                        to={card.to}
                        key={card.label}
                      >
                        <div className="oc-kpi-head">
                          <span>{card.label}</span>
                          <ArrowUpRight size={17} aria-hidden="true" />
                        </div>
                        <div className="dashboard-kpi-value">
                          <strong>{card.value}</strong>
                          {card.tag && <em className="oc-kpi-tag">{card.tag}</em>}
                        </div>
                        <small className="oc-kpi-meta">{card.detail}</small>
                      </Link>
                    ))}
                  </div>
                </section>

                <div className="dashboard-content-grid">
                  <section className="oc-panel dashboard-operations-panel">
                    <div className="oc-panel-title">
                      <div>
                        <h2>클래스 운영 현황</h2>
                        <p>모집과 수강 진행 상태를 확인하세요.</p>
                      </div>
                      <div className="dashboard-panel-actions">
                        <Link to="/classes/new">
                          <Plus size={15} /> 클래스 만들기
                        </Link>
                        <Link to="/classes">
                          전체 클래스 <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                    <div className="dashboard-class-table">
                      <Table
                        columns={classColumns}
                        rows={classItems}
                        rowKey={(item) => item.id}
                        loading={classesLoading}
                      />
                    </div>
                    <div className="dashboard-class-cards">
                      {classItems.slice(0, 3).map((item) => (
                        <ClassCard item={item} key={item.id} />
                      ))}
                    </div>
                  </section>

                  <section className="oc-panel dashboard-applicant-panel">
                    <div className="oc-panel-title">
                      <div>
                        <h2>최근 신청</h2>
                        <p>미처리 상태를 빠르게 확인하세요.</p>
                      </div>
                      <Link to="/applicants">
                        전체보기 <ArrowRight size={15} />
                      </Link>
                    </div>
                    {recentApplicants.length > 0 ? (
                      <div className="dashboard-applicant-list">
                        {recentApplicants.map((applicant) => (
                          <Link to={`/applicants/${applicant.id}`} key={applicant.id}>
                            <span className="dashboard-applicant-avatar" aria-hidden="true">
                              {applicant.name[0]}
                            </span>
                            <span className="dashboard-applicant-copy">
                              <b>{applicant.name}</b>
                              <small>
                                {applicant.classTitle} · {applicant.appliedAt}
                              </small>
                            </span>
                            <Badge tone={getStatusTone(applicant.payment)}>
                              {applicant.payment}
                            </Badge>
                            <ChevronRight size={17} aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="dashboard-empty-state">
                        <b>새 신청이 없습니다</b>
                        <span>신청이 들어오면 이곳에서 바로 확인할 수 있습니다.</span>
                      </div>
                    )}
                  </section>
                </div>

                <details className="dashboard-analysis-details">
                  <summary>
                    <span>
                      <b>성장 추이</b>
                      <small>필요할 때 등록과 신규 회원 흐름을 확인하세요.</small>
                    </span>
                    <span className="dashboard-analysis-toggle">
                      <span className="dashboard-analysis-open-label">분석 접기</span>
                      <span className="dashboard-analysis-closed-label">분석 보기</span>
                      <ChevronDown size={17} />
                    </span>
                  </summary>
                  <div className="dashboard-analysis-content">
                    <div className="dashboard-analysis-toolbar">
                      <Tabs
                        value={statsTab}
                        onChange={setStatsTab}
                        label="대시보드 통계"
                        tabs={[
                          { value: 'enrollment', label: `클래스 신청 (${enrollmentTotal})` },
                          { value: 'members', label: `신규 신청자 (${memberTotal})` },
                        ]}
                      />
                      <div className="oc-filters">
                        {trendPeriods.map((period) => (
                          <button
                            type="button"
                            key={period}
                            className={trendPeriod === period ? 'active' : ''}
                            aria-pressed={trendPeriod === period}
                            onClick={() => setTrendPeriod(period)}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="dashboard-live-region" aria-live="polite">
                      {trendPeriod}, {statsTab === 'enrollment' ? '클래스 신청' : '신규 신청자'} 총{' '}
                      {statsTab === 'enrollment' ? enrollmentTotal : memberTotal}건
                    </p>
                    <BarChart
                      data={visibleTrend}
                      label={statsTab === 'enrollment' ? '클래스 신청 추이' : '신규 신청자 추이'}
                    />
                  </div>
                </details>
              </>
            )}
          </div>
        ) : (
          <>
            <section className="oc-grid-2 dashboard-overview">
              <div className="dashboard-primary">
                <div className="oc-hero-title">{userName}님, 안녕하세요</div>
                <div className="oc-hero-sub">오늘 학습할 내용을 이어서 볼 수 있어요</div>
                <div className="oc-tint-grid">
                  {tintCards.map(([label, sub, value, tint, to]) => (
                    <Link className="oc-tint-card" style={{ background: tint }} to={to} key={label}>
                      <b>{label}</b>
                      <small>{sub}</small>
                      <strong>{value}</strong>
                      <i>↗</i>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="dashboard-secondary">
                <div className="oc-summary-card">
                  <div className="oc-summary-row">
                    <span>
                      <TrendingUp size={20} />
                    </span>
                    <span>
                      <b>68%</b>
                      <small>평균 진도율</small>
                    </span>
                    <em>+12%</em>
                  </div>
                  <div className="oc-summary-row">
                    <span>
                      <Wallet size={20} />
                    </span>
                    <span>
                      <b>5개</b>
                      <small>남은 강의</small>
                    </span>
                  </div>
                </div>
                <button className="oc-promo" onClick={() => nav('/classes')}>
                  <small>추천</small>
                  <b>관심 분야에 새 클래스가 열렸어요</b>
                </button>
              </div>
            </section>

            <section className="oc-grid-2">
              <div className="oc-panel">
                <div className="oc-panel-title">
                  <div>
                    <h2>학습 시간</h2>
                    <p className="oc-hero-sub">이번 주 집중 학습 시간</p>
                  </div>
                  <button>주간</button>
                </div>
                <div className="oc-chart">
                  <div className="oc-chart-big">
                    <b>14시간</b>
                    <small>이번 주 학습</small>
                    <em>+15% 지난주 대비</em>
                  </div>
                  <div className="oc-bars">
                    {['1월', '2월', '3월', '4월', '5월', '6월'].map((label, index) => (
                      <span className={`oc-bar ${index === 4 ? 'active' : ''}`} key={label}>
                        <i style={{ height: `${[56, 76, 64, 88, 100, 78][index]}%` }} />
                        <span>{label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="oc-panel">
                <div className="oc-panel-title">
                  <h2>학습 목표</h2>
                </div>
                <div
                  className="oc-donut"
                  style={{ background: 'conic-gradient(#0ca678 68%, #edf0f3 0)' }}
                >
                  <div>
                    <b style={{ color: '#0ca678' }}>68%</b>
                    <small>달성</small>
                  </div>
                </div>
                <div className="oc-list">
                  <div className="oc-schedule-row">
                    <b>완료</b>
                    <span className="grow" />
                    <strong>8개</strong>
                  </div>
                  <div className="oc-schedule-row">
                    <b>남은 강의</b>
                    <span className="grow" />
                    <strong>4개</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="oc-grid-2">
              <div className="oc-panel">
                <div className="oc-panel-title">
                  <h2>다가오는 강의</h2>
                  <Link to="/classes">전체보기</Link>
                </div>
                <div className="oc-list">
                  {todaySchedule.map(({ time, meridiem, title, meta, badge }) => (
                    <div className="oc-schedule-row" key={`${time}-${title}`}>
                      <span className="oc-schedule-time">
                        <b>{time}</b>
                        <small>{meridiem}</small>
                      </span>
                      <span className="grow">
                        <b>{title}</b>
                        <small>{meta}</small>
                      </span>
                      <Badge tone="primary">{badge}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="oc-panel">
                <div className="oc-panel-title">
                  <h2>최근 신청자</h2>
                  <Link to="/applicants">전체보기</Link>
                </div>
                <div className="oc-list">
                  {data.applicants.map((a) => (
                    <Link className="oc-applicant-line" to={`/applicants/${a.id}`} key={a.id}>
                      <span
                        className="oc-avatar"
                        style={{ background: '#e7f0ff', color: '#1b64da' }}
                      >
                        {a.name[0]}
                      </span>
                      <span className="grow">
                        <b>{a.name}</b>
                        <small>
                          {a.classTitle} · {a.appliedAt}
                        </small>
                      </span>
                      <Badge tone={getStatusTone(a.payment)}>{a.payment}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {!teacher && (
        <div className="page home app-page">
          <header>
            <h1 className="logo">원클릭 클래스</h1>
            <button
              className="icon-btn has-unread"
              aria-label="알림"
              onClick={() => nav('/notifications')}
            >
              <Bell size={20} />
            </button>
          </header>
          <>
            <button className="hero student-hero" onClick={() => nav('/classes')}>
              <strong>
                {userName}님, 오늘
                <br />
                이어서 들을 강의가 있어요
              </strong>
              <span>
                이어서 학습하기 <ChevronRight size={15} />
              </span>
              <i />
            </button>
            <div className="stats">
              {studentStats.map((s) => (
                <div key={s.label}>
                  <b style={{ color: s.color }}>{s.value}</b>
                  <small>{s.label}</small>
                </div>
              ))}
            </div>
            <div className="section-title">
              <h3>수강 중인 강의</h3>
              <Link to="/classes">전체보기</Link>
            </div>
            <div className="student-stack">
              {studentInProgress.map((c) => (
                <button
                  className="student-class-card"
                  onClick={() => nav(`/learn/${c.id}`)}
                  key={c.id}
                >
                  <i
                    style={{
                      background: `linear-gradient(135deg,${c.color},color-mix(in srgb, ${c.color}, white 35%))`,
                    }}
                  />
                  <span>
                    <b>{c.title}</b>
                    <small>{c.meta}</small>
                    <em>
                      <strong style={{ width: `${c.progress}%`, background: c.color }} />
                    </em>
                  </span>
                </button>
              ))}
            </div>
          </>
        </div>
      )}
    </>
  );
}
