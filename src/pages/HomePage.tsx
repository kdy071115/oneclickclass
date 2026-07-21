import { Bell, BookOpen, CheckSquare, ChevronRight, Plus, TrendingUp, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { classService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { ApplicantRow } from '../components/feature/ApplicantRow';
import { ClassCard } from '../components/feature/ClassCard';
import { Badge, BarChart, EmptyState, Table, Tabs, type TableColumn } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useRole } from '../hooks/useRole';
import type { ClassItem } from '../types/class';
import { won } from '../utils/format';
import { getStatusTone } from '../utils/status';

const trendPeriods = ['최근 3개월', '최근 6개월', '최근 1년', '금년'] as const;
const enrollmentTrend = [
  { label: '2월', value: 4 },
  { label: '3월', value: 7 },
  { label: '4월', value: 5 },
  { label: '5월', value: 9 },
  { label: '6월', value: 14 },
  { label: '7월', value: 16 },
];
const memberTrend = [
  { label: '2월', value: 2 },
  { label: '3월', value: 3 },
  { label: '4월', value: 5 },
  { label: '5월', value: 8 },
  { label: '6월', value: 10 },
  { label: '7월', value: 12 },
];
const todaySchedule = [
  ['10:00', '오전', 'UX 리서치 실무 4주 · 2주차', '수강생 20명', '라이브'],
  ['14:00', '오후', '주말 원데이 캘리그라피', '강남 스튜디오', '오프라인'],
  ['20:00', '오후', '실전 유튜브 편집 8주 · 3주차', '수강생 20명', '라이브'],
];
const classColumns: TableColumn<ClassItem>[] = [
  { key: 'title', header: '클래스명', render: (item) => <b>{item.title}</b> },
  { key: 'status', header: '상태', render: (item) => <Badge tone={getStatusTone(item.status)}>{item.status}</Badge> },
  { key: 'enrolled', header: '신청/정원', render: (item) => <>{item.enrolled} / {item.capacity}명</> },
  { key: 'schedule', header: '일정', render: (item) => <>{item.type} · {item.date}</> },
];

export function HomePage() {
  const nav = useNavigate();
  const { role } = useRole();
  const load = useCallback(() => classService.dashboard(), []);
  const { data, loading, error, retry } = useAsync(load);
  const loadClasses = useCallback(() => classService.list(), []);
  const { data: classItems = [], loading: classesLoading } = useAsync(loadClasses);
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
    ['받은 수료증', '최근 3월', '3개', '#eceafe', '/my/certificates'],
  ];
  const kpiCards = [
    { label: '이번 달 매출', value: won(2145000), tag: '전월 대비 +18%', tint: '#e7f0ff', to: '/settlements' },
    { label: '신규 신청', meta: '오늘 접수', value: `${data.newApplicants}건`, tint: '#ffeedd', to: '/applicants' },
    { label: '진행중 클래스', meta: '수강생 52명', value: `${data.todayClasses}개`, tint: '#eceafe', to: '/classes' },
    { label: '신규 가입', meta: '이번 달', value: '12명', tint: '#e6f9f0', to: '/applicants' },
  ];
  const enrollmentTotal = enrollmentTrend.reduce((sum, t) => sum + t.value, 0);
  const memberTotal = memberTrend.reduce((sum, t) => sum + t.value, 0);
  const trendData = statsTab === 'enrollment' ? enrollmentTrend : memberTrend;
  const visibleTrend = trendPeriod === '최근 3개월' ? trendData.slice(-3) : trendData;

  return (
    <>
      <div className="oc-web-page">
        <div className="oc-web-head">
          <h1>홈</h1>
          <p>{teacher ? '오늘 강의 2개, 신규 신청 3건이 있어요' : '이어서 들을 강의를 확인하세요'}</p>
        </div>

        {teacher ? (
          <div className="oc-stack">
            <div className="oc-hero-title">지훈님, 안녕하세요</div>
            <div className="oc-hero-sub">
              {!classesLoading && classItems.length === 0
                ? '첫 강의를 만들고 클래스 운영을 시작해보세요'
                : '오늘의 클래스 운영 현황을 한눈에 확인하세요'}
            </div>

            {classesLoading ? (
              <section className="oc-panel">
                <AsyncState loading />
              </section>
            ) : classItems.length === 0 ? (
              <section className="oc-panel">
                <EmptyState
                  icon={<BookOpen size={32} />}
                  title="아직 만든 강의가 없어요"
                  description="강의를 만들면 신청 현황, 매출, 통계를 한눈에 확인할 수 있어요"
                  action={
                    <Link className="ui-button ui-button-primary" to="/classes/new">
                      <Plus size={16} />
                      강의 만들기
                    </Link>
                  }
                />
              </section>
            ) : (
              <>
                <div className="oc-kpi-grid">
                  {kpiCards.map((card) => (
                    <Link className="oc-kpi-card" style={{ background: card.tint }} to={card.to} key={card.label}>
                      <div className="oc-kpi-head">
                        <b>{card.label}</b>
                      </div>
                      {card.meta && <small className="oc-kpi-meta">{card.meta}</small>}
                      {card.tag && <em className="oc-kpi-tag">{card.tag}</em>}
                      <div className="oc-kpi-foot">
                        <strong>{card.value}</strong>
                        <i>›</i>
                      </div>
                    </Link>
                  ))}
                </div>

                <section className="oc-panel">
                  <div className="oc-panel-title">
                    <h2>오늘 일정</h2>
                    <Link to="/classes">전체보기</Link>
                  </div>
                  <div className="oc-list">
                    {todaySchedule.map(([time, meridiem, title, meta, badge], index) => (
                      <div className="oc-schedule-row" key={title}>
                        <span className="oc-schedule-time">
                          <b>{time}</b>
                          <small>{meridiem}</small>
                        </span>
                        <span className="grow">
                          <div className="oc-schedule-meta-row">
                            <Badge tone="primary">{badge}</Badge>
                            <small>{meta}</small>
                          </div>
                          <b>{title}</b>
                        </span>
                        {index === 0 && (
                          <Link className="ui-button ui-button-secondary" to="/attendance/select">
                            강의실 입장
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="oc-panel">
                  <div className="oc-panel-title">
                    <h2>클래스 운영 현황</h2>
                    <Link to="/classes">자세히 보기</Link>
                  </div>
                  <Table columns={classColumns} rows={classItems} rowKey={(item) => item.id} loading={classesLoading} />
                </section>

                <section className="oc-panel">
                  <div className="oc-panel-title">
                    <Tabs
                      value={statsTab}
                      onChange={setStatsTab}
                      label="대시보드 통계"
                      tabs={[
                        { value: 'enrollment', label: `과정등록 현황 (${enrollmentTotal})` },
                        { value: 'members', label: `신규회원 수 (${memberTotal})` },
                      ]}
                    />
                    <div className="oc-filters" style={{ margin: 0 }}>
                      {trendPeriods.map((p) => (
                        <button key={p} className={trendPeriod === p ? 'active' : ''} onClick={() => setTrendPeriod(p)}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <BarChart data={visibleTrend} label={statsTab === 'enrollment' ? '과정등록 현황' : '신규회원 수'} />
                </section>
              </>
            )}
          </div>
        ) : (
          <>
            <section className="oc-grid-2 dashboard-overview">
              <div className="dashboard-primary">
                <div className="oc-hero-title">지훈님, 안녕하세요</div>
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
                <div className="oc-donut" style={{ background: 'conic-gradient(#0ca678 68%, #edf0f3 0)' }}>
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
                  {todaySchedule.map(([time, meridiem, title, meta, badge]) => (
                    <div className="oc-schedule-row" key={title}>
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
                      <span className="oc-avatar" style={{ background: '#e7f0ff', color: '#1b64da' }}>
                        {a.name[0]}
                      </span>
                      <span className="grow">
                        <b>{a.name}</b>
                        <small>{a.classTitle} · {a.appliedAt}</small>
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

      <div className="page home app-page">
        <header>
          <h2 className="logo">원클릭 클래스</h2>
          <button className="icon-btn has-unread" aria-label="알림" onClick={() => nav('/notifications')}>
            <Bell size={20} />
          </button>
        </header>
        {/* <div className="segments role-segments">
          <button className={teacher ? 'active' : ''} onClick={() => setRole('teacher')}>
            강의자 홈
          </button>
          <button className={!teacher ? 'active' : ''} onClick={() => setRole('student')}>
            수강생 홈
          </button>
        </div> */}
        {teacher ? (
          <>
            <button className="hero" onClick={() => nav('/attendance/select')}>
              <strong>
                지훈님, 오늘
                <br />
                강의 2개가 있어요 🎓
              </strong>
              <span>
                오늘 일정 보기 <ChevronRight size={15} />
              </span>
              <i />
            </button>
            <div className="stats">
              <div>
                <b>{data.newApplicants}</b>
                <small>신규 신청</small>
              </div>
              <div>
                <b>{data.todayClasses}</b>
                <small>오늘 강의</small>
              </div>
              <div>
                <b>{data.pendingPayments}</b>
                <small>결제 대기</small>
              </div>
            </div>
            <Link className="payment-callout" to="/applicants">
              <span>
                <small>결제 대기</small>
                <b>
                  {data.pendingPayments}건 · {won(data.pendingAmount)} 확인 필요
                </b>
              </span>
              <ChevronRight />
            </Link>
            <h3>내 클래스 관리하기</h3>
            <div className="manage-grid">
              <Link to="/attendance/select">
                <CheckSquare />
                <b>출석 QR</b>
                <small>강의 선택 · 오늘 2개</small>
              </Link>
              <Link to="/classes/new">
                <Plus />
                <b>강의 만들기</b>
                <small>1분이면 완성</small>
              </Link>
            </div>
            <div className="section-title">
              <h3>모집중인 클래스</h3>
              <Link to="/classes">전체보기</Link>
            </div>
            {data.classes.map((c) => (
              <ClassCard item={c} key={c.id} />
            ))}
            <h3>최근 신청자</h3>
            <div className="list-box">
              {data.applicants.map((a, i) => (
                <ApplicantRow item={a} index={i} key={a.id} />
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="hero student-hero" onClick={() => nav('/classes')}>
              <strong>
                지훈님, 오늘
                <br />
                이어서 들을 강의가 있어요
              </strong>
              <span>
                이어서 학습하기 <ChevronRight size={15} />
              </span>
              <i />
            </button>
            <div className="stats">
              {data.studentStats.map((s) => (
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
              {data.studentInProgress.map((c) => (
                <button className="student-class-card" onClick={() => nav(`/learn/classes/${c.id}`)} key={c.id}>
                  <i style={{ background: `linear-gradient(135deg,${c.color},color-mix(in srgb, ${c.color}, white 35%))` }} />
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
        )}
      </div>
    </>
  );
}
