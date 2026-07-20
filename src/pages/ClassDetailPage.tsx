import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Copy,
  Edit3,
  Eye,
  Image,
  Link2,
  MoreVertical,
  QrCode,
  Settings,
  Share2,
  Star,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { getClassThumbnail } from '../utils/classThumbnail';

const menus = [
  ['applicants', Users, '신청자', '24명 관리'],
  ['attendance', CheckSquare, '출석', '3회차 · 평균 92%'],
  ['survey', BarChart3, '설문', '응답 18 · 만족 4.8'],
  ['exams', ClipboardList, '시험', '응시 15 · 합격 12'],
] as const;

const stats = [
  ['모집 현황', '24', '/ 30명', '80%', Users, '#3182f6'],
  ['누적 신청자', '108', '명', '↑ 12명 (지난 7일)', BarChart3, '#0ca678'],
  ['평균 만족도', '4.9', '/ 5.0', '★★★★★', Star, '#f59f00'],
  ['수강 완료율', '80', '%', '↑ 10% (지난 7일)', CheckCircle2, '#7048e8'],
] as const;

const curriculum = [
  ['1', '노션 기본기와 데이터베이스', '데이터베이스 / 필터 / 관계형 DB', '45분', true],
  ['2', '반복 업무 자동화 설계', '자동화 로직 / 템플릿 설계', '50분', true],
  ['3', '팀 협업 워크스페이스 구축', '권한 / 페이지 구성 / 협업 전략', '55분', true],
  ['4', '실전 프로젝트 & Q&A', '실습 / 피드백 / 질의응답', '60분', false],
] as const;

export function ClassDetailPage() {
  const { id = 'notion' } = useParams();
  const thumbnail = getClassThumbnail(id);
  const [toast, setToast] = useState('');
  const sharePath = '/s/notion-auto';
  const copyShare = () => {
    void navigator.clipboard?.writeText(`${location.origin}${sharePath}`).catch(() => undefined);
    setToast('신청 링크를 복사했어요');
    window.setTimeout(() => setToast(''), 2000);
  };

  return (
    <>
      <div className="oc-web-page">
        <div className="oc-crumb">
          <Link to="/classes">클래스</Link>
          <span>›</span>
          <b>내 클래스</b>
        </div>
        <div className="oc-detail-layout">
          <main>
            <section className="oc-detail-hero reference">
              <div className="oc-detail-main">
                <div className="oc-detail-copy">
                  <div className="oc-status-line">
                    <span className="live">모집중</span>
                    <span>온라인</span>
                  </div>
                  <h1>
                    노션으로 시작하는 업무 자동화
                    <Link to={`/classes/${id}/manage`} aria-label="강의 수정">
                      <Edit3 size={20} />
                    </Link>
                  </h1>
                  <p>노션 하나로 팀 업무를 자동화하는 4주 클래스</p>
                  <div className="oc-hero-meta">
                    <span><Star size={18} fill="currentColor" /> <b>4.9</b> (128)</span>
                    <span><Users size={18} /> <b>108명</b> 수강</span>
                    <span><CalendarDays size={18} /> <b>4주</b> 프로그램</span>
                  </div>
                </div>
                {thumbnail ? <img className="oc-detail-thumbnail" src={thumbnail} alt="클래스 썸네일" /> : <div className="oc-operation-thumbnail"><Image size={30} /><span>대표 썸네일</span></div>}
              </div>
              <div className="oc-detail-actions">
                <button type="button" onClick={copyShare}><Link2 size={17} /> 공유하기</button>
                <Link to={`/classes/${id}/manage`}>강의 수정</Link>
                <Link className="primary-link" to={`/classes/${id}/applicants`}>
                  신청자 관리 <span>→</span>
                </Link>
              </div>
              <div className="oc-detail-stats reference">
                {stats.map(([label, value, unit, sub, Icon, color]) => (
                  <div key={label}>
                    <i style={{ background: `${color}18`, color }}>
                      <Icon size={23} />
                    </i>
                    <span>
                      <small>{label}</small>
                      <b>{value}<em>{unit}</em></b>
                      <strong style={{ color }}>{sub}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="oc-detail-tabs reference">
              {[
                ['개요', `/classes/${id}`],
                ['신청자', `/classes/${id}/applicants`],
                ['출석/QR', `/classes/${id}/attendance`],
                ['설문·시험', `/classes/${id}/survey`],
                ['수료증', `/classes/${id}/certificates`],
                ['분석', `/classes/${id}/manage`],
              ].map(([label, to], index) => (
                <Link className={index === 0 ? 'active' : ''} to={to} key={label}>
                  {label}
                </Link>
              ))}
            </div>

            <section className="oc-panel oc-curriculum-panel">
              <div className="oc-panel-title">
                <h2>커리큘럼 <small>총 4개 섹션 · 4주 과정</small></h2>
                <Link to={`/classes/${id}/manage`}>커리큘럼 편집</Link>
              </div>
              <div className="oc-curriculum-timeline">
                {curriculum.map(([n, title, desc, time, done]) => (
                  <div className="oc-curriculum-row reference" key={n}>
                    <span>{n}</span>
                    <i><ClipboardList size={18} /></i>
                    <b>{title}<small>{desc}</small></b>
                    <em><CalendarDays size={16} /> {time}</em>
                    {done ? <CheckCircle2 className="done" size={20} /> : <CheckCircle2 size={20} />}
                    <button type="button" aria-label={`${title} 더보기`}>
                      <MoreVertical size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="oc-detail-aside">
            <section className="oc-panel oc-recruit-panel">
              <div className="oc-panel-title">
                <h2>모집 현황</h2>
                <Link to={`/classes/${id}/applicants`}>자세히 보기 ›</Link>
              </div>
              <div className="oc-recruit-content">
                <div
                  className="oc-donut"
                  style={{ background: 'conic-gradient(#3182f6 0 80%, #eef2f7 80% 100%)' }}
                >
                  <div><b>80%</b><small>모집 완료</small></div>
                </div>
                <dl>
                  <div><dt>모집 인원</dt><dd>30명</dd></div>
                  <div><dt>현재 신청자</dt><dd>24명</dd></div>
                  <div><dt>남은 자리</dt><dd>6명</dd></div>
                  <div><dt>마감 예정일</dt><dd>D-7 · 7월 21일</dd></div>
                </dl>
              </div>
              <div className="oc-mini-chart">
                {[30, 43, 56, 68, 74, 80].map((value, index) => (
                  <i style={{ height: `${value}%` }} key={index} />
                ))}
              </div>
            </section>
            <section className="oc-panel oc-share reference">
              <div className="oc-panel-title">
                <h2>빠른 공유</h2>
              </div>
              <p>링크를 복사해 수강생에게 공유해보세요.</p>
              <div>
                <span>oneclick.class/s/notion-auto</span>
                <button onClick={copyShare}><Copy size={18} />복사</button>
              </div>
              <div className="oc-share-buttons">
                <Link to={sharePath}><Link2 size={16} /> 신청 페이지</Link>
                <button type="button"><QrCode size={16} /> QR 코드</button>
                <button type="button" onClick={copyShare}><Share2 size={16} /> SNS 공유</button>
              </div>
            </section>
            <section className="oc-panel">
              <div className="oc-panel-title">
                <h2>최근 활동</h2>
              </div>
              <div className="oc-activity-list">
                <Link to={`/classes/${id}/applicants`}><Users size={18} /> 새 신청자 3명 <small>2시간 전 ›</small></Link>
                <Link to={`/classes/${id}/attendance`}><CheckCircle2 size={18} /> 수강 완료 1명 <small>1일 전 ›</small></Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
      {toast && <div className="done-toast" aria-live="polite">{toast}</div>}

      <div className="page subpage class-dashboard original-detail">
        <PageHeader title="" backTo="/classes" />
        <div className="class-cover" />
        <h1>
          노션으로 시작하는
          <br />
          업무 자동화
        </h1>
        <p className="muted">신청 24 / 30명 · 모집 마감 D-7</p>
        <div className="dashboard-grid">
          {menus.map(([path, Icon, title, desc]) => (
            <Link to={`/classes/${id}/${path}`} key={path}>
              <Icon />
              <b>{title}</b>
              <small>{desc}</small>
            </Link>
          ))}
        </div>
        <Link className="wide-menu certificate-menu" to={`/classes/${id}/certificates`}>
          <i>
            <Award />
          </i>
          <span>
            <b>수료증</b>
            <small>발급 대기 12명 · 발급 완료 0명</small>
          </span>
        </Link>
        <Link className="wide-menu manage-menu" to={`/classes/${id}/manage`}>
          <i>
            <Settings />
          </i>
          <span>
            <b>강의 관리</b>
            <small>정보 수정 · 공개 상태 · 모집 마감</small>
          </span>
        </Link>
        <Link className="preview-link" to={`/classes/${id}/preview`}>
          <Eye />
          수강생 화면 미리보기
        </Link>
      </div>
    </>
  );
}
