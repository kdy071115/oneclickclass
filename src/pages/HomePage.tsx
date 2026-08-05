import {
  ArrowRight,
  Bell,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Link2,
  MoreHorizontal,
  Play,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import '@fontsource-variable/geist';
import { classService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { Badge, BarChart, Tabs } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useRole } from '../hooks/useRole';
import { getSession } from '../auth/session';
import { getClassTiming } from '../utils/dashboard';
import { won } from '../utils/format';
import { getStatusTone } from '../utils/status';

const trendPeriods = ['금년', '최근 1년', '최근 6개월', '최근 3개월'] as const;

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
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [useCustomRange, setUseCustomRange] = useState(false);

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
  const todaySchedule = data.todaySchedule ?? [];
  const remainingClassCount = todaySchedule.length;
  const completedClassCount = Math.max(data.todayClasses - remainingClassCount, 0);
  const pendingTaskCount = data.pendingPayments + data.newApplicants;
  const classProgressRate = data.todayClasses > 0
    ? Math.round((completedClassCount / data.todayClasses) * 100)
    : 0;
  const enrollmentTrend = data.enrollmentTrend ?? [];
  const memberTrend = data.memberTrend ?? [];
  const isRecent3Months = !useCustomRange && trendPeriod === '최근 3개월';
  const visibleEnrollmentTrend = isRecent3Months ? enrollmentTrend.slice(-3) : enrollmentTrend;
  const visibleMemberTrend = isRecent3Months ? memberTrend.slice(-3) : memberTrend;
  const enrollmentTotal = visibleEnrollmentTrend.reduce((sum, item) => sum + item.value, 0);
  const memberTotal = visibleMemberTrend.reduce((sum, item) => sum + item.value, 0);
  const selectTrendPeriod = (period: (typeof trendPeriods)[number]) => {
    setTrendPeriod(period);
    setUseCustomRange(false);
  };
  const applyCustomRange = () => {
    if (!customRange.from || !customRange.to) return;
    setUseCustomRange(true);
  };
  const visibleTrend = statsTab === 'enrollment' ? visibleEnrollmentTrend : visibleMemberTrend;
  const studentStats = data.studentStats ?? [];
  const studentInProgress = data.studentInProgress ?? [];
  const userName = getSession()?.user.name || '강사';
  const nextClass = todaySchedule[0] ?? null;
  const nextClassTiming = nextClass ? getClassTiming(nextClass.time) : null;
  const heroCountdown = nextClassTiming
    ? nextClassTiming.canStartAttendance
      ? '지금 바로 시작할 수 있어요'
      : `다음 수업까지 ${nextClassTiming.label.replace(/^수업까지\s*/, '')}`
    : null;
  const nextClassInfo = classItems.find(
    (item) => nextClass?.title.includes(item.title) || item.title.includes(nextClass?.title ?? ''),
  );
  const heroAvatarPool = data.applicants.slice(0, 3);
  const heroEnrolledCount = nextClassInfo?.enrolled ?? heroAvatarPool.length;
  const heroAvatarExtra = Math.max(heroEnrolledCount - heroAvatarPool.length, 0);
  const recentApplicants = data.applicants.slice(0, 3);
  const activityCopy: Record<string, { label: (name: string) => string; tag: string }> = {
    결제완료: { label: (name) => `${name}님이 결제를 완료했습니다.`, tag: '승인 완료' },
    환불: { label: (name) => `${name}님이 환불을 요청했습니다.`, tag: '환불 처리' },
    결제대기: { label: (name) => `${name}님이 수강을 신청했습니다.`, tag: '결제 대기' },
  };
  const recentActivity = recentApplicants.map((applicant) => {
    const copy = activityCopy[applicant.payment] ?? activityCopy['결제대기'];
    return {
      id: applicant.id,
      label: copy.label(applicant.name),
      meta: `${applicant.classTitle} · ${applicant.appliedAt}`,
      tag: copy.tag,
      tone: getStatusTone(applicant.payment),
    };
  });

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
                <h2 className="dashboard-intro-title">{userName}님, 오늘 확인할 내용을 정리했어요</h2>
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
                <section className="dashboard-priority" aria-label="오늘 먼저 확인할 일">
                  <div className="dashboard-priority-grid">
                    <article className="dashboard-hero-class">
                      {nextClass ? (
                        <>
                          <div className="dashboard-hero-top">
                            <span className="dashboard-hero-badge">
                              <Clock size={14} aria-hidden="true" />
                              {heroCountdown}
                            </span>
                            <button type="button" className="dashboard-hero-more" aria-label="더 보기">
                              <MoreHorizontal size={18} />
                            </button>
                          </div>
                          <div className="dashboard-hero-main">
                            <div className="dashboard-hero-copy">
                              <h3>{nextClass.title}</h3>
                              <p>
                                {nextClass.meta} · {nextClass.badge}
                              </p>
                            </div>
                            <span className="dashboard-hero-play" aria-hidden="true">
                              <Play size={22} fill="currentColor" />
                            </span>
                          </div>
                          <div className="dashboard-hero-actions">
                            <Link
                              className="dashboard-hero-cta"
                              to={
                                nextClassTiming?.canStartAttendance
                                  ? '/attendance/select'
                                  : '/classes'
                              }
                            >
                              <Play size={14} fill="currentColor" />
                              {nextClassTiming?.canStartAttendance ? '수업방 입장하기' : '수업 준비하기'}
                            </Link>
                            <span className="dashboard-hero-avatars">
                              <span className="dashboard-hero-avatar-stack">
                                {heroAvatarPool.map((applicant, index) => (
                                  <i key={applicant.id} style={{ zIndex: heroAvatarPool.length - index }}>
                                    {applicant.name[0]}
                                  </i>
                                ))}
                                {heroAvatarExtra > 0 && <i>+{heroAvatarExtra}</i>}
                              </span>
                              수강생 {heroEnrolledCount}명 대기중
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="dashboard-hero-empty">
                          <b>오늘 예정된 수업이 없습니다</b>
                          <span>다음 클래스 일정을 준비해 보세요.</span>
                          <Link className="dashboard-task-secondary" to="/classes">
                            전체 일정
                          </Link>
                        </div>
                      )}
                    </article>

                    <article className="oc-panel dashboard-task-list-card">
                      <div className="dashboard-task-list-head">
                        <h3>처리할 업무</h3>
                        {pendingTaskCount > 0 && (
                          <span className="dashboard-task-list-badge">{pendingTaskCount}건</span>
                        )}
                      </div>
                      {pendingTaskCount > 0 ? (
                        <div className="dashboard-task-list">
                          {data.pendingPayments > 0 && (
                            <Link className="dashboard-task-list-row" to="/applicants?payment=결제대기">
                              <span className="dashboard-task-list-icon" data-tone="blue">
                                <CreditCard size={16} aria-hidden="true" />
                              </span>
                              <span className="dashboard-task-list-copy">
                                <b>결제 확인 대기</b>
                                <small>무통장 입금 확인이 필요합니다.</small>
                              </span>
                              <strong>{data.pendingPayments}건</strong>
                            </Link>
                          )}
                          {data.newApplicants > 0 && (
                            <Link className="dashboard-task-list-row" to="/applicants">
                              <span className="dashboard-task-list-icon" data-tone="purple">
                                <UserPlus size={16} aria-hidden="true" />
                              </span>
                              <span className="dashboard-task-list-copy">
                                <b>신규 수강 신청</b>
                                <small>신청 내역을 검토해 주세요.</small>
                              </span>
                              <strong>{data.newApplicants}건</strong>
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="dashboard-empty-state">
                          <b>처리할 업무가 없습니다</b>
                          <span>결제나 신규 신청이 들어오면 이곳에 표시됩니다.</span>
                        </div>
                      )}
                    </article>
                  </div>
                </section>

                <section className="dashboard-performance-card oc-panel">
                  <div className="oc-panel-title">
                    <h2>이번 달 운영 성과</h2>
                    <Link to="/settlements">
                      상세 리포트 <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="dashboard-performance-grid">
                    <div className="dashboard-performance-item">
                      <small>총 매출액</small>
                      <strong>{data.monthlyRevenue == null ? '-' : won(data.monthlyRevenue)}</strong>
                      {data.monthlyRevenueChange && (
                        <em className="oc-kpi-tag">{data.monthlyRevenueChange}</em>
                      )}
                    </div>
                    <div className="dashboard-performance-item">
                      <small>활성 수강생</small>
                      <strong>{data.activeStudents == null ? '-' : `${data.activeStudents}명`}</strong>
                      <span className="dashboard-performance-meta">
                        신규 유입 {data.newMembers ?? 0}명
                      </span>
                    </div>
                    <div className="dashboard-performance-item">
                      <small>수업 진행률</small>
                      <strong>{classProgressRate}%</strong>
                      <span className="dashboard-performance-bar">
                        <i style={{ width: `${classProgressRate}%` }} />
                      </span>
                    </div>
                  </div>
                </section>

                <div className="dashboard-content-grid">
                  <section className="oc-panel dashboard-operations-panel">
                    <div className="oc-panel-title">
                      <div>
                        <h2>운영중인 클래스</h2>
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
                    {classItems.length > 0 ? (
                      <div className="dashboard-class-list">
                        {classItems.slice(0, 4).map((item) => (
                          <Link className="dashboard-class-row" to={`/classes/${item.id}`} key={item.id}>
                            <span className="dashboard-class-row-icon" aria-hidden="true">
                              <CalendarDays size={16} />
                            </span>
                            <span className="dashboard-class-row-copy">
                              <b>{item.title}</b>
                              <small>
                                {item.date} 시작 · {item.type}
                              </small>
                            </span>
                            <span className="dashboard-class-row-progress">
                              <strong>
                                {item.enrolled} / {item.capacity}명
                              </strong>
                              <span className="dashboard-performance-bar">
                                <i
                                  style={{
                                    width: `${Math.min(100, (item.enrolled / item.capacity) * 100)}%`,
                                    background: item.color,
                                  }}
                                />
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="dashboard-empty-state">
                        <b>운영중인 클래스가 없습니다</b>
                        <span>클래스를 만들면 이곳에서 모집 현황을 볼 수 있습니다.</span>
                      </div>
                    )}
                  </section>

                  <section className="oc-panel dashboard-activity-panel">
                    <div className="oc-panel-title">
                      <h2>최근 활동</h2>
                    </div>
                    {recentActivity.length > 0 ? (
                      <div className="dashboard-activity-timeline">
                        {recentActivity.map((activity) => (
                          <div className="dashboard-activity-row" key={activity.id}>
                            <span className="dashboard-activity-dot" aria-hidden="true" />
                            <div className="dashboard-activity-copy">
                              <b>{activity.label}</b>
                              <small>{activity.meta}</small>
                              <Badge tone={activity.tone}>{activity.tag}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="dashboard-empty-state">
                        <b>새 활동이 없습니다</b>
                        <span>신청이나 결제가 들어오면 이곳에서 바로 확인할 수 있습니다.</span>
                      </div>
                    )}
                    <Link className="dashboard-activity-more" to="/applicants">
                      모든 활동 보기 <ChevronRight size={15} />
                    </Link>
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
                      <div className="oc-trend-filter">
                        <div className="oc-trend-filter-presets" role="group" aria-label="조회 기간">
                          {trendPeriods.map((period) => (
                            <button
                              type="button"
                              key={period}
                              className={!useCustomRange && trendPeriod === period ? 'active' : ''}
                              aria-pressed={!useCustomRange && trendPeriod === period}
                              onClick={() => selectTrendPeriod(period)}
                            >
                              {period}
                            </button>
                          ))}
                        </div>
                        <div className="oc-trend-filter-range">
                          <label className="oc-date-input">
                            <input
                              type="date"
                              aria-label="시작일"
                              value={customRange.from}
                              max={customRange.to || undefined}
                              onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
                            />
                            <Calendar size={16} aria-hidden="true" />
                          </label>
                          <span className="oc-trend-filter-sep">~</span>
                          <label className="oc-date-input">
                            <input
                              type="date"
                              aria-label="종료일"
                              value={customRange.to}
                              min={customRange.from || undefined}
                              onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
                            />
                            <Calendar size={16} aria-hidden="true" />
                          </label>
                          <button
                            type="button"
                            className="oc-trend-filter-submit"
                            onClick={applyCustomRange}
                            disabled={!customRange.from || !customRange.to}
                          >
                            조회
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="dashboard-live-region" aria-live="polite">
                      {useCustomRange ? `${customRange.from} ~ ${customRange.to}` : trendPeriod},{' '}
                      {statsTab === 'enrollment' ? '클래스 신청' : '신규 신청자'} 총{' '}
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
