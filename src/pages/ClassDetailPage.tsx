import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CirclePlay,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  Image,
  Link2,
  LockKeyhole,
  MapPin,
  NotebookPen,
  Radio,
  type LucideIcon,
  QrCode,
  Settings,
  Share2,
  Star,
  Users,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AsyncState } from '../components/common/AsyncState';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { getClassThumbnail } from '../utils/classThumbnail';
import { getClassOperationFocus, type ClassOperationFocus } from '../utils/classOperationFocus';
import { detailService } from '../api/services';
import type { ClassDetail, LessonContentType } from '../types/class';

const lessonContentPresentation: Record<LessonContentType, { Icon: LucideIcon; label: string }> = {
  video: { Icon: CirclePlay, label: '녹화 영상' },
  live: { Icon: Radio, label: '라이브 강의' },
  document: { Icon: FileText, label: '학습 자료' },
  assignment: { Icon: NotebookPen, label: '과제' },
};

const operationFocusIcons: Record<ClassOperationFocus['kind'], LucideIcon> = {
  prepare: ClipboardList,
  publish: Eye,
  recruit: Users,
  operate: CheckSquare,
  complete: Award,
};

function OperationFocusCard({
  focus,
  compact = false,
}: {
  focus: ClassOperationFocus;
  compact?: boolean;
}) {
  const Icon = operationFocusIcons[focus.kind];

  return (
    <section className={`oc-operation-focus${compact ? ' compact' : ''}`}>
      <i aria-hidden="true">
        <Icon />
      </i>
      <div>
        <h2>{focus.title}</h2>
        <p>{focus.description}</p>
      </div>
      <div className="oc-operation-focus-actions" role="navigation" aria-label="권장 운영 작업">
        <Link className="primary" to={focus.primary.to}>
          {focus.primary.label}
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link to={focus.secondary.to}>{focus.secondary.label}</Link>
      </div>
    </section>
  );
}

const parseDurationMinutes = (durationText: string) => {
  const hours = durationText.match(/(\d+)\s*시간/)?.[1];
  const minutes = durationText.match(/(\d+)\s*분/)?.[1];
  if (hours || minutes) return Number(hours || 0) * 60 + Number(minutes || 0);
  return Number(durationText.match(/\d+/)?.[0] || 0);
};

const formatSectionSummary = (count: number, minutes: number) => {
  if (!minutes) return `${count}개 차시`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${count}개 차시 · ${hours}시간${remainder ? ` ${remainder}분` : ''}`;
  }
  return `${count}개 차시 · ${minutes}분`;
};

const groupCurriculumItems = <
  T extends { sectionId?: string; sectionTitle?: string; durationText: string },
>(
  items: T[],
) =>
  items.reduce<Array<{ key: string; title: string; items: T[]; totalMinutes: number }>>(
    (groups, item, index) => {
      const title = item.sectionTitle || '커리큘럼';
      const key = item.sectionId || item.sectionTitle || `default-${index}`;
      const previous = groups[groups.length - 1];
      if (previous && previous.key === key) {
        previous.items.push(item);
        previous.totalMinutes += parseDurationMinutes(item.durationText);
        return groups;
      }
      groups.push({
        key,
        title,
        items: [item],
        totalMinutes: parseDurationMinutes(item.durationText),
      });
      return groups;
    },
    [],
  );

export function ClassDetailPage() {
  const { id = 'notion' } = useParams();
  const [detail, setDetail] = useState<ClassDetail>();
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [shareQrUrl, setShareQrUrl] = useState('');
  const toastTimeout = useRef<number>();

  useEffect(() => {
    let alive = true;
    setDetail(undefined);
    setError('');
    detailService
      .getClass(id)
      .then((value) => {
        if (alive) setDetail(value);
      })
      .catch(() => {
        if (alive) setError('강의 정보를 찾을 수 없어요.');
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(
    () => () => {
      if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    },
    [],
  );

  if (error) {
    return (
      <div className="class-detail-error">
        <AsyncState loading={false} error={error} onRetry={() => location.reload()} />
        <div className="class-detail-recovery">
          <Link className="primary" to="/classes">
            클래스 목록으로
          </Link>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="class-detail-loading" role="status" aria-label="강의 정보 불러오는 중">
        <AsyncState loading />
      </div>
    );
  }

  const thumbnail = detail.thumbnail || getClassThumbnail(id);
  const sharePath = `/s/${detail.shareToken || (id === 'notion' ? 'notion-auto' : id)}`;
  const shareUrl = `${location.origin}${sharePath}`;
  const shareReady = detail.publicOn === true;
  const capacity = detail.capacity || 30;
  const enrolled = detail.enrolled || 0;
  const remainingSeats = Math.max(0, capacity - enrolled);
  const recruitRate = Math.min(100, Math.round((enrolled / capacity) * 100));
  const reviewCount = detail.reviewCount || 0;
  const curriculum = detail.curriculum || [];
  const publishedLessons = curriculum.filter((item) => item.published).length;
  const supportsAttendance = detail.type !== '온라인';
  const curriculumGroups = groupCurriculumItems(curriculum);
  const operationFocus = getClassOperationFocus({
    id,
    lifecycleStatus: detail.lifecycleStatus,
    status: detail.status,
    publicOn: detail.publicOn,
    publishedLessons,
    enrolled,
    capacity,
    recruitEndDate: detail.recruitEndDate,
    supportsAttendance,
    sharePath,
  });
  const mobileMenus: [string, LucideIcon, string, string][] = [
    ['applicants', Users, '신청자', `${enrolled}명 관리`],
  ];
  if (supportsAttendance) {
    mobileMenus.push([
      'attendance',
      CheckSquare,
      '출석',
      `${Math.max(1, detail.sessions || 1)}회차 관리`,
    ]);
  }
  mobileMenus.push([
    'survey',
    BarChart3,
    '설문·시험',
    reviewCount
      ? `후기 ${reviewCount}개 · 평점 ${(detail.rating || 0).toFixed(1)}/5`
      : '항목 만들기 · 결과 확인',
  ]);
  const applicantTrend = detail.applicantTrend || [];
  const stats = [
    [
      '신청 현황',
      `${enrolled} / ${capacity}명`,
      remainingSeats ? `${remainingSeats}자리 남음` : '잔여 좌석 없음',
      Users,
    ],
    [
      '운영 일정',
      detail.date || '일정 미정',
      `모집 마감 ${detail.recruitEndDate || '미정'}`,
      CalendarDays,
    ],
    [
      '신청 페이지',
      shareReady ? '공개' : '비공개',
      `${detail.status} · 차시 ${publishedLessons}/${curriculum.length}개 공개`,
      shareReady ? Eye : LockKeyhole,
    ],
  ] as const;

  const notify = (message: string) => {
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    setToast(message);
    toastTimeout.current = window.setTimeout(() => setToast(''), 2400);
  };

  const copyShare = async () => {
    if (!navigator.clipboard?.writeText) {
      notify('링크를 복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.');
      return false;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify('신청 링크를 복사했어요.');
      return true;
    } catch {
      notify('링크를 복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.');
      return false;
    }
  };

  const openShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '원클릭 클래스 신청 페이지', url: shareUrl });
      } else {
        await copyShare();
      }
    } catch (shareError) {
      if ((shareError as Error).name !== 'AbortError') {
        notify('공유 화면을 열지 못했어요. 링크 복사를 이용해 주세요.');
      }
    }
  };

  const showShareQr = async () => {
    try {
      setShareQrUrl(await QRCode.toDataURL(shareUrl, { width: 220, margin: 1 }));
      notify('신청 페이지 QR 코드를 만들었어요.');
    } catch {
      notify('QR 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <>
      <div className="oc-web-page class-overview-page">
        <div className="oc-crumb">
          <Link to="/classes">클래스</Link>
          <span>›</span>
          <b>{detail.title}</b>
        </div>
        <div className="oc-detail-layout">
          <div className="oc-detail-primary">
            <OperationFocusCard focus={operationFocus} />
            <section className="oc-detail-hero reference class-overview-hero">
              <div className="oc-detail-main">
                <div className="oc-detail-copy">
                  <div className="oc-status-line">
                    <StatusBadge>{detail.status}</StatusBadge>
                    <span>{detail.type}</span>
                  </div>
                  <h2 className="oc-detail-course-title">{detail.title}</h2>
                  <p>{detail.summary}</p>
                  <div className="oc-hero-meta">
                    <span>
                      <CalendarDays aria-hidden="true" /> <b>{detail.date || '일정 미정'}</b>
                    </span>
                    {detail.location && (
                      <span>
                        <MapPin aria-hidden="true" /> <b>{detail.location}</b>
                      </span>
                    )}
                    <span>
                      <Eye aria-hidden="true" />
                      <b>{shareReady ? '신청 페이지 공개' : '신청 페이지 비공개'}</b>
                    </span>
                  </div>
                </div>
                {thumbnail ? (
                  <img
                    className="oc-detail-thumbnail"
                    src={thumbnail}
                    alt={`${detail.title} 대표 이미지`}
                    style={{ objectPosition: detail.thumbnailPosition || 'center' }}
                  />
                ) : (
                  <Link className="oc-operation-thumbnail" to={`/classes/new?edit=${id}`}>
                    <Image size={30} />
                    <span>대표 이미지 추가</span>
                  </Link>
                )}
              </div>
              <div className="oc-detail-actions">
                <Link to={`/classes/new?edit=${id}`}>강의 정보 수정</Link>
                <Link to={`/classes/${id}/preview`}>수강생 화면 미리보기</Link>
              </div>
              <div className="oc-detail-stats reference" aria-label="클래스 운영 지표">
                {stats.map(([label, value, sub, Icon]) => (
                  <div key={label}>
                    <i>
                      <Icon size={19} aria-hidden="true" />
                    </i>
                    <span>
                      <small>{label}</small>
                      <b>{value}</b>
                      <strong>{sub}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div
              className="oc-detail-tabs reference"
              role="navigation"
              aria-label="클래스 관리 메뉴"
            >
              {[
                ['개요', `/classes/${id}`],
                ['신청자', `/classes/${id}/applicants`],
                ...(supportsAttendance ? [['출석/QR', `/classes/${id}/attendance`]] : []),
                ['설문·시험', `/classes/${id}/survey`],
                ['수료증', `/classes/${id}/certificates`],
                ['설정', `/classes/${id}/manage`],
              ].map(([label, to], index) => (
                <Link
                  className={index === 0 ? 'active' : ''}
                  aria-current={index === 0 ? 'page' : undefined}
                  to={to}
                  key={label}
                >
                  {label}
                </Link>
              ))}
            </div>

            <section className="oc-panel oc-curriculum-panel">
              <div className="oc-panel-title">
                <h2>
                  커리큘럼 <small>총 {curriculum.length}개 차시</small>
                </h2>
                <Link to={`/classes/${id}/curriculum`}>강의 구성 수정</Link>
              </div>
              <div className="oc-curriculum-timeline">
                {curriculumGroups.map((section, sectionIndex) => (
                  <section className="oc-curriculum-section-group" key={section.key}>
                    <header className="curriculum-section-heading">
                      <span>{String(sectionIndex + 1).padStart(2, '0')}</span>
                      <b>섹션 {sectionIndex + 1}</b>
                      <strong>{section.title}</strong>
                      <small>
                        {formatSectionSummary(section.items.length, section.totalMinutes)}
                      </small>
                    </header>
                    {section.items.map((item, lessonIndex) => {
                      const content = lessonContentPresentation[item.contentType ?? 'video'];
                      const LessonIcon = content.Icon;
                      return (
                        <div className="oc-curriculum-row reference" key={item.id}>
                          <span>
                            {sectionIndex + 1}-{lessonIndex + 1}
                          </span>
                          <i role="img" aria-label={content.label}>
                            <LessonIcon size={18} aria-hidden="true" />
                          </i>
                          <b>
                            {item.title}
                            <small>{item.description}</small>
                          </b>
                          <em>
                            <CalendarDays size={16} /> {item.durationText}
                          </em>
                          <span
                            className={`oc-publish-status${item.published ? ' done' : ''}`}
                            role="img"
                            aria-label={item.published ? '공개됨' : '미공개'}
                          >
                            <CheckCircle2 size={20} aria-hidden="true" />
                          </span>
                        </div>
                      );
                    })}
                  </section>
                ))}
                {!curriculum.length && (
                  <div className="oc-empty-detail">
                    <ClipboardList />
                    <b>등록된 커리큘럼이 없어요.</b>
                    <p>강의 구성 수정에서 첫 섹션과 차시를 등록해 주세요.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="oc-detail-aside" aria-label="클래스 운영 보조 정보">
            <section className="oc-panel oc-recruit-panel">
              <div className="oc-panel-title">
                <h2>모집 현황</h2>
                <Link to={`/classes/${id}/applicants`}>자세히 보기 ›</Link>
              </div>
              <div className="oc-recruit-content">
                <div className="oc-recruit-summary">
                  <div>
                    <span>신청 인원</span>
                    <strong>
                      {enrolled}명 <small>/ {capacity}명</small>
                    </strong>
                  </div>
                  <b>{recruitRate}%</b>
                  <div
                    className="oc-recruit-progress"
                    role="progressbar"
                    aria-label="모집률"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={recruitRate}
                  >
                    <i style={{ width: `${recruitRate}%` }} />
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>남은 자리</dt>
                    <dd>{remainingSeats}명</dd>
                  </div>
                  <div>
                    <dt>마감 예정일</dt>
                    <dd>{detail.recruitEndDate || '마감일 미정'}</dd>
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
              {shareReady ? (
                <>
                  <p>신청 페이지 링크를 수강생에게 공유하세요.</p>
                  <div className="oc-share-link-row">
                    <span>{shareUrl.replace(/^https?:\/\//, '')}</span>
                    <button type="button" onClick={() => void copyShare()}>
                      <Copy size={18} aria-hidden="true" />
                      복사
                    </button>
                  </div>
                  <div className="oc-share-buttons">
                    <Link to={sharePath}>
                      <Link2 size={16} aria-hidden="true" /> 신청 페이지
                    </Link>
                    <button type="button" onClick={() => void showShareQr()}>
                      <QrCode size={16} aria-hidden="true" /> QR 코드
                    </button>
                    <button type="button" onClick={() => void openShare()}>
                      <Share2 size={16} aria-hidden="true" /> 공유
                    </button>
                  </div>
                  {shareQrUrl && (
                    <div className="oc-share-qr">
                      <button
                        type="button"
                        aria-label="QR 코드 닫기"
                        onClick={() => setShareQrUrl('')}
                      >
                        <X aria-hidden="true" />
                      </button>
                      <img src={shareQrUrl} alt="신청 페이지 QR 코드" />
                      <small>스캔하면 신청 페이지로 이동해요.</small>
                    </div>
                  )}
                </>
              ) : (
                <div className="oc-share-locked">
                  <LockKeyhole aria-hidden="true" />
                  <p>신청 페이지를 공개하면 링크와 QR 코드를 공유할 수 있어요.</p>
                  <Link to={`/classes/${id}/manage`}>공개 설정 확인</Link>
                </div>
              )}
            </section>
            <section className="oc-panel">
              <div className="oc-panel-title">
                <h2>최근 활동</h2>
              </div>
              <div className="oc-activity-list">
                {(detail.recentActivities || []).map((activity) => (
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
                {!detail.recentActivities.length && (
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
        <div
          className={`class-cover ${thumbnail ? 'has-thumbnail' : 'is-placeholder'}`}
          style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : undefined}
        >
          <span>
            <b>{detail.status}</b>
            <small>{shareReady ? '신청 페이지 공개' : '신청 페이지 비공개'}</small>
          </span>
        </div>
        <h2 className="mobile-class-title">{detail.title}</h2>
        <p className="muted">
          신청 {enrolled} / {capacity}명 · 모집 마감 {detail.recruitEndDate || '미정'}
        </p>
        <OperationFocusCard focus={operationFocus} compact />
        <Link
          className={`mobile-curriculum-overview ${!curriculum.length ? 'empty' : ''}`}
          to={`/classes/${id}/curriculum`}
        >
          <i>
            <ClipboardList />
          </i>
          <span>
            <b>커리큘럼·차시 관리</b>
            <strong>
              {curriculum.length
                ? `${curriculumGroups.length}개 섹션 · ${curriculum.length}개 차시`
                : '아직 등록된 차시가 없어요'}
            </strong>
            <small>
              {curriculum.length
                ? `공개 ${publishedLessons}개 · 미공개 ${curriculum.length - publishedLessons}개`
                : '첫 차시를 만들어 강의를 준비하세요'}
            </small>
          </span>
          <em aria-hidden="true">›</em>
        </Link>
        <div className="dashboard-grid">
          {mobileMenus.map(([path, Icon, title, desc]) => (
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
            <small>수료 조건 설정 · 발급 대상 확인</small>
          </span>
        </Link>
        <Link className="wide-menu manage-menu" to={`/classes/${id}/manage`}>
          <i>
            <Settings />
          </i>
          <span>
            <b>설정</b>
            <small>기본 정보 · 공개 상태 · 모집 마감</small>
          </span>
        </Link>
        <Link className="preview-link" to={`/classes/${id}/preview`}>
          <Eye />
          수강생 화면 미리보기
        </Link>
        {shareReady ? (
          <button className="mobile-share-action" type="button" onClick={() => void copyShare()}>
            <Link2 aria-hidden="true" />
            신청 링크 복사
          </button>
        ) : (
          <Link className="mobile-share-action" to={`/classes/${id}/manage`}>
            <LockKeyhole aria-hidden="true" />
            신청 페이지 공개
          </Link>
        )}
      </div>
    </>
  );
}
