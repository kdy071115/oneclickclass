import { Bell, CheckSquare, ChevronRight, Plus, TrendingUp, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { classService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { ApplicantRow } from '../components/feature/ApplicantRow';
import { ClassCard } from '../components/feature/ClassCard';
import { Badge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { won } from '../utils/format';
import { getStatusTone } from '../utils/status';

export function HomePage() {
  const nav = useNavigate();
  const load = useCallback(() => classService.dashboard(), []);
  const { data, loading, error, retry } = useAsync(load);

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

  const tintCards = [
        ['이번 달 매출', '전월 대비 +18%', won(2145000), '#e7f0ff', '/settlements'],
        ['신규 신청', '오늘 접수', `${data.newApplicants}건`, '#ffeedd', '/applicants'],
        ['진행중 클래스', '수강생 52명', `${data.todayClasses}개`, '#eceafe', '/classes'],
      ];

  return (
    <>
      <div className="oc-web-page">
        <div className="oc-web-head">
          <h1>대시보드</h1>
          <p>오늘 강의 2개, 신규 신청 3건이 있어요</p>
        </div>

        <section className="oc-grid-2 dashboard-overview">
          <div className="dashboard-primary">
            <div className="oc-hero-title">지훈님, 안녕하세요</div>
            <div className="oc-hero-sub">클래스 운영 현황을 한눈에 확인하세요</div>
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
                  <b>{won(2145000)}</b>
                  <small>이번 달 매출</small>
                </span>
                <em>+18%</em>
              </div>
              <div className="oc-summary-row">
                <span>
                  <Wallet size={20} />
                </span>
                <span>
                  <b>{won(1820000)}</b>
                  <small>지난 달 매출</small>
                </span>
              </div>
            </div>
            <button className="oc-promo" onClick={() => nav('/settlements')}>
              <small>PRO</small>
              <b>프로 플랜으로 정산 수수료를 낮춰보세요</b>
            </button>
          </div>
        </section>

        <section className="oc-grid-2">
          <div className="oc-panel">
            <div className="oc-panel-title">
              <div>
                <h2>매출 추세</h2>
                <p className="oc-hero-sub">최근 6개월 매출 흐름</p>
              </div>
              <button>주간</button>
            </div>
            <div className="oc-chart">
              <div className="oc-chart-big">
                <b>214만원</b>
                <small>이번 달 매출</small>
                <em>+18% 전월 대비</em>
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
              <h2>이번 달 목표</h2>
            </div>
            <div
              className="oc-donut"
              style={{
                background: 'conic-gradient(#3182f6 80%, #edf0f3 0)',
              }}
            >
              <div>
                <b style={{ color: '#3182f6' }}>80%</b>
                <small>달성</small>
              </div>
            </div>
            <div className="oc-list">
              <div className="oc-schedule-row">
                <b>달성</b>
                <span className="grow" />
                <strong>{won(2145000)}</strong>
              </div>
              <div className="oc-schedule-row">
                <b>남은 금액</b>
                <span className="grow" />
                <strong>{won(535000)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="oc-insights">
          {[
            ['신청 추세', '지난주 대비 신규 신청이 18% 늘었어요. 마감 임박 클래스를 홍보해보세요.', '신청자 보기', '/applicants'],
            ['정산 예정', '7월 15일 135,000원 정산이 예정돼 있어요. 계좌를 확인해 두세요.', '정산 보기', '/settlements'],
            ['새 후기', '브랜딩 기초 클래스에 후기 3건이 등록됐어요. 답글을 남겨보세요.', '자세히 보기', '/classes'],
          ].map(([title, desc, cta, to]) => (
            <Link className="oc-card" to={to} key={title}>
              <h3>{title}</h3>
              <p>{desc}</p>
              <p style={{ color: '#3182f6', fontWeight: 800 }}>{cta} ›</p>
            </Link>
          ))}
        </section>

        <section className="oc-grid-2">
          <div className="oc-panel">
            <div className="oc-panel-title">
              <h2>오늘 일정</h2>
              <Link to="/classes">전체보기</Link>
            </div>
            <div className="oc-list">
              {[
                ['10:00', '오전', 'UX 리서치 실무 4주 · 2주차', '라이브 · 수강생 20명', '라이브'],
                ['14:00', '오후', '주말 원데이 캘리그라피', '오프라인 · 강남 스튜디오', '오프라인'],
                ['20:00', '오후', '실전 유튜브 편집 8주 · 3주차', '라이브 · 수강생 20명', '라이브'],
              ].map(([time, meridiem, title, meta, badge]) => (
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
      </div>

      <div className="page home app-page">
        <header>
          <h2 className="logo">원클릭 클래스</h2>
          <button className="icon-btn has-unread" aria-label="알림" onClick={() => nav('/notifications')}>
            <Bell size={20} />
          </button>
        </header>
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
      </div>
    </>
  );
}
