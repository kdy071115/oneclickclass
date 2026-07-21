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
  QrCode,
  Settings,
  Share2,
  Star,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { getClassThumbnail } from '../utils/classThumbnail';
import { detailService } from '../api/services';
import type { ClassDetail } from '../types/class';

const menus = [
  ['applicants', Users, '신청자', '24명 관리'],
  ['attendance', CheckSquare, '출석', '3회차 · 평균 92%'],
  ['survey', BarChart3, '설문', '응답 18 · 만족 4.8'],
  ['exams', ClipboardList, '시험', '응시 15 · 합격 12'],
] as const;

export function ClassDetailPage() {
  const { id = 'notion' } = useParams();
  const [detail, setDetail] = useState<ClassDetail>();
  const thumbnail = getClassThumbnail(id);
  const [toast, setToast] = useState('');
  const [shareQrUrl, setShareQrUrl] = useState('');
  const sharePath = `/s/${detail?.shareToken || (id === 'notion' ? 'notion-auto' : id)}`;
  const shareUrl = `${location.origin}${sharePath}`;
  const capacity = detail?.capacity || 30;
  const enrolled = detail?.enrolled || 0;
  const recruitRate = Math.min(100, Math.round((enrolled / capacity) * 100));
  const reviewCount = detail?.reviewCount || 0;
  const completionRate = detail?.completionRate || 0;
  const curriculum = detail?.curriculum || [];
  const applicantTrend = detail?.applicantTrend || [];
  const stats = [
    ['모집 현황', String(enrolled), `/ ${capacity}명`, `${recruitRate}%`, Users, '#3182f6'],
    [
      '누적 신청자',
      String(enrolled),
      '명',
      enrolled ? '신청자 관리에서 확인' : '아직 신청 전',
      BarChart3,
      '#0ca678',
    ],
    [
      '평균 만족도',
      reviewCount ? String(detail?.rating || 0) : '-',
      '/ 5.0',
      reviewCount ? `후기 ${reviewCount}개` : '후기 없음',
      Star,
      '#f59f00',
    ],
    [
      '수강 완료율',
      String(completionRate),
      '%',
      enrolled ? '진도에서 확인' : '수강 전',
      CheckCircle2,
      '#7048e8',
    ],
  ] as const;
  useEffect(() => {
    let alive = true;
    detailService.getClass(id).then((value) => {
      if (alive) setDetail(value);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2000);
  };
  const copyShare = () => {
    void navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
    notify('신청 링크를 복사했어요');
  };
  const openShare = async () => {
    try {
      if (navigator.share)
        await navigator.share({ title: '원클릭 클래스 신청 페이지', url: shareUrl });
      else copyShare();
    } catch {
      // Native share sheet dismissal is not an app error.
    }
  };
  const showShareQr = async () => {
    setShareQrUrl(await QRCode.toDataURL(shareUrl, { width: 220, margin: 1 }));
    notify('신청 페이지 QR 코드를 만들었어요');
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
                    <span className="live">{detail?.status || '모집중'}</span>
                    <span>{detail?.type || '온라인'}</span>
                  </div>
                  <h1>
                    {detail?.title || '강의 정보를 불러오는 중이에요'}
                    <Link to={`/classes/new?edit=${id}`} aria-label="강의 수정">
                      <Edit3 size={20} />
                    </Link>
                  </h1>
                  <p>{detail?.summary || '강의 정보를 확인하고 있어요.'}</p>
                  <div className="oc-hero-meta">
                    <span>
                      <Star size={18} fill="currentColor" /> <b>{detail?.rating || '-'}</b> (
                      {reviewCount})
                    </span>
                    <span>
                      <Users size={18} /> <b>{enrolled}명</b> 신청
                    </span>
                    <span>
                      <CalendarDays size={18} /> <b>{detail?.sessions || 0}회차</b> 구성
                    </span>
                  </div>
                </div>
                {thumbnail ? (
                  <img className="oc-detail-thumbnail" src={thumbnail} alt="클래스 썸네일" />
                ) : (
                  <div className="oc-operation-thumbnail">
                    <Image size={30} />
                    <span>대표 썸네일</span>
                  </div>
                )}
              </div>
              <div className="oc-detail-actions">
                <button type="button" onClick={copyShare}>
                  <Link2 size={17} /> 링크 복사
                </button>
                <Link to={`/classes/new?edit=${id}`}>강의 수정</Link>
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
                      <b>
                        {value}
                        <em>{unit}</em>
                      </b>
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
                ['설정', `/classes/${id}/manage`],
              ].map(([label, to], index) => (
                <Link className={index === 0 ? 'active' : ''} to={to} key={label}>
                  {label}
                </Link>
              ))}
            </div>

            <section className="oc-panel oc-curriculum-panel">
              <div className="oc-panel-title">
                <h2>
                  커리큘럼{' '}
                  <small>
                    총 {curriculum.length}개 섹션 · {detail?.sessions || 0}회차 과정
                  </small>
                </h2>
                <Link to={`/classes/${id}/curriculum`}>강의 구성 수정</Link>
              </div>
              <div className="oc-curriculum-timeline">
                {curriculum.map((item, index) => (
                  <div className="oc-curriculum-row reference" key={item.id}>
                    <span>{index + 1}</span>
                    <i>
                      <ClipboardList size={18} />
                    </i>
                    <b>
                      {item.title}
                      <small>{item.description}</small>
                    </b>
                    <em>
                      <CalendarDays size={16} /> {item.durationText}
                    </em>
                    {item.published ? (
                      <CheckCircle2 className="done" size={20} />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                  </div>
                ))}
                {!curriculum.length && (
                  <div className="oc-empty-detail">
                    <ClipboardList />
                    <b>등록된 커리큘럼이 없어요.</b>
                    <p>강의 수정에서 첫 커리큘럼을 등록해 주세요.</p>
                  </div>
                )}
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
                  style={{
                    background: `conic-gradient(#3182f6 0 ${recruitRate}%, #eef2f7 ${recruitRate}% 100%)`,
                  }}
                >
                  <div>
                    <b>{recruitRate}%</b>
                    <small>모집 완료</small>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>모집 인원</dt>
                    <dd>{capacity}명</dd>
                  </div>
                  <div>
                    <dt>현재 신청자</dt>
                    <dd>{enrolled}명</dd>
                  </div>
                  <div>
                    <dt>남은 자리</dt>
                    <dd>{Math.max(0, capacity - enrolled)}명</dd>
                  </div>
                  <div>
                    <dt>마감 예정일</dt>
                    <dd>{detail?.recruitEndDate || '마감일 미정'}</dd>
                  </div>
                </dl>
              </div>
              {applicantTrend.length ? (
                <div className="oc-mini-chart" aria-label="최근 신청 추이">
                  {applicantTrend.map((value, index) => (
                    <i style={{ height: `${value}%` }} key={index} />
                  ))}
                </div>
              ) : (
                <div className="oc-trend-empty">신청 추이가 쌓이면 표시돼요.</div>
              )}
            </section>
            <section className="oc-panel oc-share reference">
              <div className="oc-panel-title">
                <h2>빠른 공유</h2>
              </div>
              <p>링크를 복사해 수강생에게 공유해보세요.</p>
              <div className="oc-share-link-row">
                <span>{shareUrl.replace(/^https?:\/\//, '')}</span>
                <button onClick={copyShare}>
                  <Copy size={18} />
                  복사
                </button>
              </div>
              <div className="oc-share-buttons">
                <Link to={sharePath}>
                  <Link2 size={16} /> 신청 페이지
                </Link>
                <button type="button" onClick={() => void showShareQr()}>
                  <QrCode size={16} /> QR 코드
                </button>
                <button type="button" onClick={() => void openShare()}>
                  <Share2 size={16} /> SNS 공유
                </button>
              </div>
              {shareQrUrl && (
                <div className="oc-share-qr">
                  <img src={shareQrUrl} alt="신청 페이지 QR 코드" />
                  <small>수강생이 스캔하면 신청 페이지로 이동해요.</small>
                </div>
              )}
            </section>
            <section className="oc-panel">
              <div className="oc-panel-title">
                <h2>최근 활동</h2>
              </div>
              <div className="oc-activity-list">
                {(detail?.recentActivities || []).map((activity) => (
                  <Link
                    to={
                      activity.type === 'applicant'
                        ? `/classes/${id}/applicants`
                        : activity.type === 'review'
                          ? `/classes/${id}/survey`
                          : `/classes/${id}/attendance`
                    }
                    key={activity.id}
                  >
                    {activity.type === 'applicant' ? (
                      <Users size={18} />
                    ) : activity.type === 'review' ? (
                      <Star size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    {activity.label}
                    <small>{activity.occurredAt} ›</small>
                  </Link>
                ))}
                {!detail?.recentActivities.length && (
                  <div className="oc-activity-empty">최근 활동이 아직 없어요.</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
      {toast && (
        <div className="done-toast" aria-live="polite">
          {toast}
        </div>
      )}

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
