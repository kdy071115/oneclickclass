import { Award, BarChart3, CheckSquare, ClipboardList, Copy, Eye, Settings, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';

const menus = [
  ['applicants', Users, '신청자', '24명 관리'],
  ['attendance', CheckSquare, '출석', '3회차 · 평균 92%'],
  ['survey', BarChart3, '설문', '응답 18 · 만족 4.8'],
  ['exams', ClipboardList, '시험', '응시 15 · 합격 12'],
] as const;

const stats = [
  ['모집 인원', '24/30', '#3182f6'],
  ['누적 매출', '108만원', '#191f28'],
  ['평균 만족도', '4.9', '#0ca678'],
  ['진행률', '80%', '#191f28'],
] as const;

const curriculum = [
  ['1', '노션 기본기와 데이터베이스', '45분'],
  ['2', '반복 업무 자동화 설계', '50분'],
  ['3', '팀 협업 워크스페이스 구축', '55분'],
  ['4', '실전 프로젝트 & Q&A', '60분'],
] as const;

export function ClassDetailPage() {
  const { id = 'notion' } = useParams();

  return (
    <>
      <div className="oc-web-page">
        <Link className="oc-back-link" to="/classes">
          ‹ 클래스 목록
        </Link>
        <section className="oc-detail-hero">
          <div className="oc-detail-cover">
            <span>모집중 · 온라인</span>
          </div>
          <div className="oc-detail-body">
            <div className="oc-detail-title">
              <div>
                <h1>노션으로 시작하는 업무 자동화</h1>
                <p>노션 하나로 팀 업무를 자동화하는 4주 클래스</p>
              </div>
              <div>
                <Link to={`/classes/${id}/manage`}>수정</Link>
                <Link className="primary-link" to={`/classes/${id}/applicants`}>
                  신청자 관리
                </Link>
              </div>
            </div>
            <div className="oc-detail-stats">
              {stats.map(([label, value, color]) => (
                <div key={label}>
                  <small>{label}</small>
                  <b style={{ color }}>{value}</b>
                </div>
              ))}
            </div>
            <div className="oc-detail-tabs">
              {[
                ['개요', `/classes/${id}`],
                ['신청자', `/classes/${id}/applicants`],
                ['출석/QR', `/classes/${id}/attendance`],
                ['설문·시험', `/classes/${id}/survey`],
                ['수료증', `/classes/${id}/certificates`],
              ].map(([label, to], index) => (
                <Link className={index === 0 ? 'active' : ''} to={to} key={label}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="oc-grid-2">
          <div className="oc-panel">
            <div className="oc-panel-title">
              <h2>클래스 소개</h2>
            </div>
            <p className="oc-copy">
              노션의 데이터베이스·자동화 기능을 활용해 반복적인 업무를 줄이는 방법을 배웁니다.
              실무에서 바로 쓸 수 있는 템플릿과 워크플로우를 함께 만들어봅니다. 4주 동안 매주
              라이브 세션과 과제 피드백이 제공됩니다.
            </p>
            <div className="oc-panel-title oc-subtitle">
              <h2>커리큘럼</h2>
            </div>
            <div className="oc-list">
              {curriculum.map(([n, title, time]) => (
                <div className="oc-curriculum-row" key={n}>
                  <span>{n}</span>
                  <b>{title}</b>
                  <small>{time}</small>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="oc-panel">
              <div className="oc-panel-title">
                <h2>모집 현황</h2>
              </div>
              <div className="oc-recruit-big">
                <b>24</b>
                <span>/ 30명</span>
              </div>
              <div className="oc-progress">
                <i style={{ width: '80%' }} />
              </div>
              <p className="oc-muted-line">마감까지 D-7 · 목표의 80% 달성</p>
            </div>
            <div className="oc-panel oc-share">
              <div className="oc-panel-title">
                <h2>공유 링크</h2>
              </div>
              <div>
                <span>oneclick.class/c/notion-auto</span>
                <button>
                  <Copy size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

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
