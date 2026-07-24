import { FormEvent, type RefObject, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  Heart,
  LockKeyhole,
  MapPin,
  Megaphone,
  MessageSquareText,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  canEnterLearnerRoom,
  isApprovalPending,
  isPaymentPending,
  oneclickService,
  shareTokenFromCourseActiveSeq,
  type OneClickContentProvider,
  type OneClickEnrollment,
  type OneClickLearnRoom,
  type OneClickLesson,
  type OneClickReview,
  type OneClickShare,
} from '../api/oneclick';
import { initialClassDraft } from '../constants/classDraft';
import { loadClassDraft, loadClassPreview } from '../utils/classDraft';
import { classService, curriculumService, detailService } from '../api/services';
import type { ClassDetail, CurriculumSection } from '../types/class';
import { getPublishIssues, type PublishIssue } from '../utils/classReadiness';
import { useCourseBookmark } from '../hooks/useCourseBookmark';
import { ConfirmDialog } from '../components/ui';
import { YouTubePlayer } from '../components/YouTubePlayer';

const fallbackLearnerHighlights = [
  '업무 흐름을 기준으로 데이터베이스를 설계해요.',
  '반복 업무를 버튼과 자동화 도구로 줄여요.',
  '팀원이 바로 쓸 수 있는 운영 템플릿을 완성해요.',
];

const defaultResumeLessonIndex = 0;

const isValidCourseId = (value?: string): value is string =>
  Boolean(value && value !== 'undefined' && value !== 'null');

const formatPlaybackTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}분 ${remainder}초`;
};

const formatFileSize = (size?: number) => {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
};

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

const groupCurriculumItems = <T extends { sectionId?: string; sectionTitle?: string; durationText: string }>(items: T[]) =>
  items.reduce<Array<{ key: string; title: string; items: T[]; totalMinutes: number }>>((groups, item, index) => {
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
  }, []);

const getResumeLessonIndex = (room: OneClickLearnRoom) => {
  const available = (lesson: OneClickLesson) => !lesson.locked && lesson.playable;
  const savedIndex = room.resumeLessonId
    ? room.lessons.findIndex((lesson) => lesson.lessonId === room.resumeLessonId && available(lesson))
    : -1;
  if (savedIndex >= 0) return savedIndex;
  const legacyIndex = Number.parseInt(room.lastPosition, 10) - 1;
  if (legacyIndex >= 0 && available(room.lessons[legacyIndex])) return legacyIndex;
  const inProgressIndex = room.lessons.findIndex(
    (lesson) => available(lesson) && !lesson.completed && (lesson.currentSeconds ?? 0) > 0,
  );
  if (inProgressIndex >= 0) return inProgressIndex;
  const incompleteIndex = room.lessons.findIndex(
    (lesson) => available(lesson) && !lesson.completed,
  );
  return incompleteIndex >= 0 ? incompleteIndex : 0;
};

const getLessonDisplayNumber = (
  groups: Array<{ items: OneClickLesson[] }>,
  lessonId: string,
) => {
  for (let sectionIndex = 0; sectionIndex < groups.length; sectionIndex += 1) {
    const lessonIndex = groups[sectionIndex].items.findIndex((lesson) => lesson.lessonId === lessonId);
    if (lessonIndex >= 0) return `${sectionIndex + 1}-${lessonIndex + 1}`;
  }
  return '1-1';
};

const getYouTubeVideoId = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0];
    if (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/'))
      return parsed.pathname.split('/')[2];
    return parsed.searchParams.get('v') || '';
  } catch {
    return '';
  }
};

const getLinkedLessonView = (provider: OneClickContentProvider) => {
  switch (provider) {
    case 'DOCUMENT':
      return {
        label: '학습 자료',
        title: '자료를 확인해 주세요.',
        description: '강의자가 등록한 학습 자료를 새 창에서 열어 볼 수 있어요.',
        action: '자료 열기',
      };
    case 'ASSIGNMENT':
      return {
        label: '과제',
        title: '과제 안내를 확인해 주세요.',
        description: '제출 방법과 과제 설명을 확인한 뒤 진행해 주세요.',
        action: '과제 보기',
      };
    case 'LIVE':
      return {
        label: '라이브',
        title: '라이브 수업에 입장해 주세요.',
        description: '정해진 시간에 참여 링크로 입장할 수 있어요.',
        action: '라이브 입장',
      };
    case 'EXTERNAL':
      return {
        label: '외부 콘텐츠',
        title: '연결된 콘텐츠를 확인해 주세요.',
        description: '강의자가 등록한 링크를 새 창에서 열어 학습을 이어갈 수 있어요.',
        action: '콘텐츠 열기',
      };
    default:
      return null;
  }
};

export function PreviewPage() {
  return <ClassPublicPage preview />;
}

export function StudentClassPage() {
  return <ClassPublicPage />;
}

type EnrollmentCompleteState = {
  enrollment?: OneClickEnrollment;
  share?: OneClickShare;
};

export function PublicEnrollmentPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { shareToken = 'notion-auto' } = useParams();
  const draft = loadClassDraft(initialClassDraft);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    privacyConsent: false,
    paymentConsent: false,
  });
  const [share, setShare] = useState<OneClickShare>();
  const [reviews, setReviews] = useState<OneClickReview[]>([]);
  const [existing, setExisting] = useState<OneClickEnrollment | null>(null);
  const [existingChecked, setExistingChecked] = useState(false);
  const [showNewApplication, setShowNewApplication] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationHint, setVerificationHint] = useState('');
  const [error, setError] = useState('');
  const [errorTarget, setErrorTarget] = useState<'name' | 'phone' | 'privacy' | 'payment' | 'verification' | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [applicationFocus, setApplicationFocus] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const privacyInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);
  const {
    bookmarked,
    loading: bookmarkLoading,
    error: bookmarkError,
    toggle: toggleBookmark,
  } = useCourseBookmark(share?.courseActiveSeq, Boolean(existing));
  const [activeSection, setActiveSection] = useState<'learn' | 'curriculum' | 'reviews'>(() => {
    const section = location.hash.slice(1);
    return section === 'curriculum' || section === 'reviews' ? section : 'learn';
  });
  useEffect(() => {
    let alive = true;
    oneclickService
      .share(shareToken)
      .then((nextShare) => {
        if (!alive) return;
        setShare(nextShare);
        void oneclickService.reviews(shareToken).then((items) => alive && setReviews(items));
        void oneclickService.enrollment(nextShare.courseActiveSeq).then((enrollment) => {
          if (alive) {
            setExisting(enrollment);
            setExistingChecked(true);
          }
        });
      })
      .catch(() => alive && setError('신청 링크를 확인하지 못했어요.'));
    return () => {
      alive = false;
    };
  }, [shareToken]);
  useEffect(() => {
    const sections = ['learn', 'curriculum', 'reviews']
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const updateActiveSection = () => {
      const marker = window.scrollY + window.innerHeight * 0.45;
      const current = sections.reduce(
        (selected, section) => (section.offsetTop <= marker ? section : selected),
        sections[0],
      );
      if (current) setActiveSection(current.id as typeof activeSection);
    };
    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, []);
  const setFormError = (
    message: string,
    target: typeof errorTarget,
    inputRef?: RefObject<HTMLInputElement | null>,
  ) => {
    setError(message);
    setErrorTarget(target);
    window.setTimeout(() => inputRef?.current?.focus(), 0);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!share) return setFormError('신청 링크를 확인하는 중이에요.', '');
    if (!form.name.trim()) return setFormError('이름을 입력해 주세요.', 'name', nameInputRef);
    if (form.phone.replace(/\D/g, '').length < 10)
      return setFormError('휴대전화 번호를 확인해 주세요.', 'phone', phoneInputRef);
    if (!form.privacyConsent)
      return setFormError(
        '개인정보 수집 및 수강 안내 발송에 동의해 주세요.',
        'privacy',
        privacyInputRef,
      );
    if (share.paymentType === 'PAID' && !form.paymentConsent)
      return setFormError('결제 및 환불 안내를 확인해 주세요.', 'payment', paymentInputRef);
    setSubmitting(true);
    setError('');
    setErrorTarget('');
    try {
      if (!verificationSent) {
        const verification = await oneclickService.requestVerification(
          share.courseActiveSeq,
          form.phone.trim(),
        );
        setVerificationSent(true);
        setVerificationHint(
          verification.debugCode
            ? `테스트 인증번호는 ${verification.debugCode}예요.`
            : '인증번호를 보냈어요. 3분 안에 입력해 주세요.',
        );
        return;
      }
      if (verificationCode.replace(/\D/g, '').length !== 6) {
        setFormError('문자로 받은 6자리 인증번호를 입력해 주세요.', 'verification', verificationInputRef);
        return;
      }
      const enrollment = await oneclickService.apply(shareToken, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        privacyConsent: form.privacyConsent,
        paymentConsent: share.paymentType === 'PAID' ? form.paymentConsent : undefined,
        verificationCode,
      });
      const courseActiveSeq = enrollment.courseActiveSeq || share.courseActiveSeq;
      if (!isValidCourseId(courseActiveSeq)) throw new Error('missing course id');
      nav(`/s/${shareToken}/complete`, {
        replace: true,
        state: {
          enrollment: { ...enrollment, courseActiveSeq },
          share,
        } satisfies EnrollmentCompleteState,
      });
    } catch {
      setError('신청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };
  const title = share?.title || draft.title || '노션으로 시작하는 업무 자동화';
  const summary = share?.summary || draft.summary || '반복 업무를 자동화하는 실전 4주 과정';
  const priceText = share?.paymentType === 'PAID' ? `${share.price.toLocaleString()}원` : '무료';
  const capacityText = share
    ? `${share.confirmedCount} / ${share.capacity}명`
    : `0 / ${draft.capacity}명`;
  const disabled = share ? share.recruitmentStatus !== 'OPEN' || share.remainingSeats <= 0 : false;
  const curriculum = share?.curriculum ?? [];
  const curriculumGroups = groupCurriculumItems(curriculum);
  const showCurriculum = curriculum.length > 0;
  const resumeCourseActiveSeq = existing?.courseActiveSeq || share?.courseActiveSeq;
  const resumeLearning = async () => {
    if (canEnterLearnerRoom(existing) && showCurriculum && isValidCourseId(resumeCourseActiveSeq)) {
      nav(`/learn/${resumeCourseActiveSeq}`);
      return;
    }
    if (canEnterLearnerRoom(existing) && !showCurriculum) {
      try {
        const nextShare = await oneclickService.share(shareToken);
        setShare(nextShare);
        if (nextShare.curriculum.length && isValidCourseId(resumeCourseActiveSeq)) {
          nav(`/learn/${resumeCourseActiveSeq}`);
          return;
        }
        setError('아직 공개된 강의가 없어요. 강의가 등록되면 이곳에서 바로 시작할 수 있어요.');
      } catch {
        setError('강의 준비 상태를 확인하지 못했어요.');
      }
      return;
    }
    if (existing) {
      nav(`/s/${shareToken}/complete`, {
        state: { enrollment: existing, share } satisfies EnrollmentCompleteState,
      });
      return;
    }
    setError('수강 링크를 다시 확인해 주세요.');
  };
  const applyButtonText = disabled
    ? '신청 마감'
    : submitting
      ? verificationSent
        ? '인증 확인 중...'
        : '인증번호 전송 중...'
      : !verificationSent
        ? '휴대전화 확인하기'
      : share?.requiresApproval
        ? '신청서 제출하기'
        : share?.paymentType === 'PAID'
          ? '신청하고 결제하기'
          : !showCurriculum
            ? '신청하고 안내받기'
            : '신청하고 바로 입장';
  const applyGuide = disabled
    ? '현재는 새 신청을 받을 수 없어요.'
    : share?.requiresApproval
      ? '강의자가 확인한 뒤 수강 가능 여부를 안내해요.'
      : share?.paymentType === 'PAID'
        ? showCurriculum
          ? '신청 정보를 저장한 뒤 결제 단계로 이동해요.'
          : '결제 후 신청을 저장하고, 첫 강의가 공개되면 안내해요.'
        : showCurriculum
          ? '신청 후 바로 강의실로 입장할 수 있어요.'
          : '신청을 저장하고, 첫 강의가 공개되면 안내해요.';
  const existingTitle = canEnterLearnerRoom(existing)
    ? showCurriculum
      ? `${existing?.learnerName}님, 이어서 볼까요?`
      : '신청은 완료됐고, 강의를 준비하고 있어요.'
    : isPaymentPending(existing)
      ? '결제만 완료하면 수강할 수 있어요.'
      : isApprovalPending(existing)
        ? '강의자 확인을 기다리고 있어요.'
        : '신청 상태를 확인해 주세요.';
  const existingDescription = canEnterLearnerRoom(existing)
    ? showCurriculum
      ? `이전 위치: ${existing?.lastPosition}`
      : '강의가 공개되면 같은 링크에서 바로 시작할 수 있어요.'
    : isPaymentPending(existing)
      ? '신청 정보는 저장됐어요.'
      : isApprovalPending(existing)
        ? '승인되면 문자로 안내드릴게요.'
        : '상태가 바뀌면 이 링크에서 바로 확인할 수 있어요.';
  const reviewAverage = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const highlights = share?.highlights?.length ? share.highlights : fallbackLearnerHighlights;
  const remainingSeats = share?.remainingSeats ?? draft.capacity;
  const mobileCtaText = !share || !existingChecked
    ? '신청 정보 확인 중...'
    : canEnterLearnerRoom(existing)
    ? showCurriculum
      ? '바로 이어보기'
      : '강의 준비 상태 확인'
    : existing
      ? '신청 상태 확인하기'
      : share?.paymentType === 'PAID'
        ? `${priceText} 결제하고 신청`
        : `무료로 신청 · 잔여 ${remainingSeats}명`;
  const mobileCtaDisabled = !share || !existingChecked;
  const moveToApplication = () => {
    if (existing && !showNewApplication) {
      if (canEnterLearnerRoom(existing)) return void resumeLearning();
      document.getElementById('learner-application')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setApplicationFocus(true);
    document.getElementById('learner-application')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => setApplicationFocus(false), 1400);
  };
  const handleBookmark = () => {
    if (!existing) {
      setError('관심 클래스 저장은 신청 정보를 확인한 뒤 사용할 수 있어요.');
      document.getElementById('learner-application')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    void toggleBookmark();
  };
  return (
    <div className="learner-shell learner-apply">
      <header className="learner-topbar">
        <b>원클릭 클래스</b>
        <nav>
          <Link to="/favorites">관심 클래스</Link>
          <a className={activeSection === 'curriculum' ? 'active' : ''} href="#curriculum">
            커리큘럼
          </a>
          <a className={activeSection === 'reviews' ? 'active' : ''} href="#reviews">
            후기
          </a>
        </nav>
      </header>
      <main className="learner-apply-grid">
        <section className="learner-content learner-public-content">
          <div className="learner-hero">
            <button
              className={`learner-bookmark-button ${bookmarked ? 'active' : ''}`}
              type="button"
              aria-label={bookmarked ? '관심 클래스 해제' : '관심 클래스 등록'}
              aria-pressed={bookmarked}
              disabled={bookmarkLoading || !share || !existingChecked}
              onClick={handleBookmark}
            >
              <Heart fill={bookmarked ? 'currentColor' : 'none'} />
              <span>{bookmarked ? '관심 저장됨' : '관심 클래스'}</span>
            </button>
            <div>
              <span className="learner-badge">{disabled ? '모집 마감' : '모집중'}</span>
              <h1>{title}</h1>
              <p>{summary}</p>
              <div className="learner-quick-stats">
                <span>
                  <b>{share?.instructorName || '강사 안내'}</b>
                  <small>강사</small>
                </span>
                <span>
                  <b>{share?.difficulty || '초급'}</b>
                  <small>난이도</small>
                </span>
                <span>
                  <b>{share?.scheduleText || '자유 수강'}</b>
                  <small>수강 방식</small>
                </span>
              </div>
            </div>
          </div>
          {bookmarkError && <p className="learner-bookmark-error" role="status">{bookmarkError}</p>}
          <button
            className="learner-mobile-apply-cta"
            type="button"
            disabled={mobileCtaDisabled}
            onClick={moveToApplication}
          >
            {mobileCtaText}
          </button>
          <div className="learner-tabs" aria-label="강의 정보">
            <a className={activeSection === 'learn' ? 'active' : ''} href="#learn">
              소개
            </a>
            <a className={activeSection === 'curriculum' ? 'active' : ''} href="#curriculum">
              커리큘럼
            </a>
            <a className={activeSection === 'reviews' ? 'active' : ''} href="#reviews">
              후기
            </a>
          </div>
          <section className="learner-section" id="learn">
            <h2>이런 걸 배워요</h2>
            <div className="learner-highlight-list">
              {highlights.map((item) => (
                <p key={item}>
                  <Check />
                  {item}
                </p>
              ))}
            </div>
          </section>
          <section className="learner-section" id="curriculum">
            <h2>커리큘럼</h2>
            {!showCurriculum ? (
              <p className="curriculum-empty">상세 커리큘럼은 강의자가 준비한 뒤 안내해 드려요.</p>
            ) : (
              <div className="learner-curriculum">
                {curriculumGroups.map((section, sectionIndex) => (
                  <section className="learner-curriculum-group" key={section.key}>
                    <header className="learner-curriculum-section">
                      <span>{String(sectionIndex + 1).padStart(2, '0')}</span>
                      <b>섹션 {sectionIndex + 1}</b>
                      <strong>{section.title}</strong>
                      <small>{formatSectionSummary(section.items.length, section.totalMinutes)}</small>
                    </header>
                    {section.items.map((lesson, lessonIndex) => (
                      <article className="learner-curriculum-row" key={lesson.lessonId}>
                        <i><Play size={14} fill="currentColor" /></i>
                        <span><b>{sectionIndex + 1}-{lessonIndex + 1} · {lesson.title}</b><small>{lesson.description}</small></span>
                        <em>{lesson.durationText}</em>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </section>
          <section className="learner-section" id="reviews">
            <div className="learner-review-head">
              <div>
                <h2>수강생 후기</h2>
                <p>실제 수강생이 남긴 후기예요.</p>
              </div>
              {reviews.length > 0 && (
                <strong>
                  <Star fill="currentColor" />
                  {reviewAverage}
                  <small>{reviews.length}개</small>
                </strong>
              )}
            </div>
            {reviews.length ? (
              <div className="learner-review-grid">
                {reviews.map((review) => (
                  <article key={review.reviewSeq}>
                    <b>
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </b>
                    <p>{review.content}</p>
                    <small>
                      {review.learnerName} · {review.createdAt}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="learner-review-empty">
                <MessageSquareText />
                <div>
                  <b>아직 등록된 후기가 없어요.</b>
                  <p>수강을 마친 뒤 첫 후기를 남겨주세요.</p>
                </div>
              </div>
            )}
          </section>
        </section>
        <aside className="learner-apply-side" id="learner-application">
          {existing && !showNewApplication ? (
            <section className="learner-card learner-continue-card">
              {isPaymentPending(existing) ? (
                <CreditCard />
              ) : canEnterLearnerRoom(existing) ? (
                <CheckCircle2 />
              ) : (
                <ShieldCheck />
              )}
              <h2>{existingTitle}</h2>
              <p>{existingDescription}</p>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary" onClick={() => void resumeLearning()}>
                {canEnterLearnerRoom(existing)
                  ? showCurriculum
                    ? '바로 이어보기'
                    : '강의 준비 상태 확인'
                  : '신청 상태 확인하기'}
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setShowNewApplication(true);
                  setApplicationFocus(true);
                  window.setTimeout(() => {
                    document.getElementById('learner-application')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                    nameInputRef.current?.focus();
                  }, 0);
                  window.setTimeout(() => setApplicationFocus(false), 1400);
                }}
              >
                다른 정보로 신청하기
              </button>
            </section>
          ) : (
            <form
              className={`learner-card learner-apply-card ${applicationFocus ? 'is-focused' : ''}`}
              onSubmit={submit}
            >
              <div className="learner-card-head">
                <span>{disabled ? '모집 마감' : '수강 신청'}</span>
                <b>{priceText}</b>
                <small>현재 {capacityText} 신청</small>
              </div>
              <label>
                이름
                <input
                  ref={nameInputRef}
                  aria-invalid={errorTarget === 'name'}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (errorTarget === 'name') {
                      setError('');
                      setErrorTarget('');
                    }
                  }}
                  placeholder="이름을 입력하세요"
                />
              </label>
              <label>
                휴대전화 번호
                <input
                  ref={phoneInputRef}
                  aria-invalid={errorTarget === 'phone'}
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (errorTarget === 'phone') {
                      setError('');
                      setErrorTarget('');
                    }
                    setVerificationSent(false);
                    setVerificationCode('');
                    setVerificationHint('');
                  }}
                  placeholder="010-0000-0000"
                  readOnly={verificationSent}
                />
              </label>
              {verificationSent && (
                <label>
                  인증번호
                  <input
                    ref={verificationInputRef}
                    aria-invalid={errorTarget === 'verification'}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/\D/g, ''));
                      if (errorTarget === 'verification') {
                        setError('');
                        setErrorTarget('');
                      }
                    }}
                    placeholder="6자리 인증번호"
                  />
                  <small className="verify-help">{verificationHint}</small>
                </label>
              )}
              <label>
                이메일 <small>선택</small>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="example@email.com"
                />
              </label>
              <label className="learner-check">
                <input
                  ref={privacyInputRef}
                  aria-invalid={errorTarget === 'privacy'}
                  type="checkbox"
                  checked={form.privacyConsent}
                  onChange={(e) => {
                    setForm({ ...form, privacyConsent: e.target.checked });
                    if (errorTarget === 'privacy') {
                      setError('');
                      setErrorTarget('');
                    }
                  }}
                />{' '}
                개인정보 수집 및 수강 안내 발송에 동의해요
              </label>
              {share?.paymentType === 'PAID' && (
                <label className="learner-check">
                  <input
                    ref={paymentInputRef}
                    aria-invalid={errorTarget === 'payment'}
                    type="checkbox"
                    checked={form.paymentConsent}
                    onChange={(e) => {
                      setForm({ ...form, paymentConsent: e.target.checked });
                      if (errorTarget === 'payment') {
                        setError('');
                        setErrorTarget('');
                      }
                    }}
                  />{' '}
                  결제 및 환불 안내를 확인했어요
                </label>
              )}
              <div className="entry-note">
                <LockKeyhole /> {applyGuide}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary" disabled={submitting || disabled}>
                {applyButtonText}
              </button>
            </form>
          )}
          <section className="learner-course-guide" aria-label="수강 안내">
            <h2>수강 안내</h2>
            <div>
              <UserRound />
              <span>
                <small>강사</small>
                <b>{share?.instructorName || '확인 중'}</b>
              </span>
            </div>
            <div>
              <CalendarDays />
              <span>
                <small>수강 방식</small>
                <b>{share?.scheduleText || '확인 중'}</b>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <small>수강 장소</small>
                <b>{share?.locationText || '확인 중'}</b>
              </span>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

export function EnrollmentCompletePage() {
  const nav = useNavigate();
  const location = useLocation();
  const { shareToken = 'notion-auto' } = useParams();
  const state = (location.state ?? {}) as EnrollmentCompleteState;
  const [share, setShare] = useState<OneClickShare | undefined>(state.share);
  const [enrollment, setEnrollment] = useState<OneClickEnrollment | null | undefined>(
    state.enrollment,
  );
  const [processing, setProcessing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const loadCompleteState = async () => {
      if (state.enrollment) return;
      try {
        const nextShare = state.share ?? (await oneclickService.share(shareToken));
        if (!alive) return;
        setShare(nextShare);
        const nextEnrollment = await oneclickService.enrollment(nextShare.courseActiveSeq);
        if (alive) setEnrollment(nextEnrollment);
      } catch {
        if (!alive) return;
        setError('신청 정보를 다시 확인하지 못했어요.');
        setEnrollment(null);
      }
    };
    void loadCompleteState();
    return () => {
      alive = false;
    };
  }, [shareToken, state.enrollment, state.share]);

  const courseActiveSeq = enrollment?.courseActiveSeq || share?.courseActiveSeq;
  const hasCurriculum = Boolean(share?.curriculum.length);
  const enterRoom = () => {
    if (!isValidCourseId(courseActiveSeq)) return setError('수강 링크를 확인하지 못했어요.');
    nav(`/learn/${courseActiveSeq}`, { replace: true });
  };
  const completePayment = async () => {
    const validCourseActiveSeq = courseActiveSeq;
    if (!isValidCourseId(validCourseActiveSeq) || !enrollment?.courseApplySeq)
      return setError('결제할 신청 정보를 확인하지 못했어요.');
    setProcessing(true);
    setError('');
    try {
      const next = await oneclickService.completePayment(
        validCourseActiveSeq,
        enrollment.courseApplySeq,
      );
      setEnrollment(next);
    } catch {
      setError('결제를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setProcessing(false);
    }
  };
  const refreshStatus = async () => {
    if (!isValidCourseId(courseActiveSeq))
      return setError('신청 상태를 확인할 강의를 찾지 못했어요.');
    setChecking(true);
    setError('');
    try {
      const next = await oneclickService.refreshEnrollment(courseActiveSeq);
      setEnrollment(next);
    } catch {
      setError('신청 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setChecking(false);
    }
  };
  const refreshCurriculum = async () => {
    setChecking(true);
    setError('');
    try {
      setShare(await oneclickService.share(shareToken));
    } catch {
      setError('강의 준비 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setChecking(false);
    }
  };

  if (enrollment === undefined) {
    return (
      <div className="learner-shell learner-verify">
        <section className="learner-card verify-card">
          <Smartphone />
          <span>신청 정보 확인</span>
          <h1>신청 상태를 확인하고 있어요.</h1>
        </section>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="learner-shell learner-verify">
        <section className="learner-card verify-card">
          <Smartphone />
          <span>신청 정보 없음</span>
          <h1>신청 페이지에서 다시 진행해 주세요.</h1>
          <p>이 기기에서 확인된 신청 정보가 없어요.</p>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" onClick={() => nav(`/s/${shareToken}`, { replace: true })}>
            신청 페이지로 이동
          </button>
        </section>
      </div>
    );
  }

  const title = share?.title || '강의';
  const heading = canEnterLearnerRoom(enrollment)
    ? hasCurriculum
      ? '신청이 완료됐어요.'
      : '신청은 완료됐고, 강의를 준비하고 있어요.'
    : isPaymentPending(enrollment)
      ? '결제만 완료하면 수강할 수 있어요.'
      : isApprovalPending(enrollment)
        ? '강의자 확인을 기다리고 있어요.'
        : '신청 상태를 확인하고 있어요.';
  const description = canEnterLearnerRoom(enrollment)
    ? hasCurriculum
      ? '지금 바로 강의를 시작할 수 있어요.'
      : '첫 강의가 공개되면 같은 링크에서 바로 시작할 수 있어요.'
    : isPaymentPending(enrollment)
      ? '신청 정보는 저장됐어요.'
      : isApprovalPending(enrollment)
        ? '승인되면 문자로 안내드릴게요.'
        : '신청 상태가 변경되면 이 화면에서 확인할 수 있어요.';

  return (
    <div className="learner-shell learner-verify">
      <section className="learner-card verify-card enrollment-complete-card">
        {canEnterLearnerRoom(enrollment) ? (
          hasCurriculum ? (
            <CheckCircle2 />
          ) : (
            <CalendarDays />
          )
        ) : isPaymentPending(enrollment) ? (
          <CreditCard />
        ) : (
          <ShieldCheck />
        )}
        <span>
          {isPaymentPending(enrollment)
            ? '결제 대기'
            : isApprovalPending(enrollment)
              ? '승인 대기'
              : hasCurriculum
                ? '수강 가능'
                : '강의 준비 중'}
        </span>
        <h1>{heading}</h1>
        <p>{description}</p>
        <div className="completion-summary">
          <b>{title}</b>
          <small>{enrollment.learnerName}님 신청 정보로 수강권을 확인해요.</small>
        </div>
        {error && <p className="form-error">{error}</p>}
        {canEnterLearnerRoom(enrollment) && hasCurriculum && (
          <button className="primary" onClick={enterRoom}>
            강의실 입장하기
          </button>
        )}
        {canEnterLearnerRoom(enrollment) && !hasCurriculum && (
          <button className="primary" disabled={checking} onClick={() => void refreshCurriculum()}>
            {checking ? '확인 중...' : '강의 등록 여부 다시 확인'}
          </button>
        )}
        {isPaymentPending(enrollment) && (
          <button className="primary" disabled={processing} onClick={() => void completePayment()}>
            {processing ? '결제 확인 중...' : '결제하기'}
          </button>
        )}
        {isApprovalPending(enrollment) && (
          <button className="primary" disabled={checking} onClick={() => void refreshStatus()}>
            {checking ? '확인 중...' : '상태 다시 확인'}
          </button>
        )}
        <button className="secondary" onClick={() => nav(`/s/${shareToken}`)}>
          강의 정보 보기
        </button>
      </section>
    </div>
  );
}

export function LearnerRoomPage() {
  const nav = useNavigate();
  const { id = 'notion' } = useParams();
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sent, setSent] = useState(false);
  const [verificationHint, setVerificationHint] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [room, setRoom] = useState<OneClickLearnRoom | null>();
  const [enrollment, setEnrollment] = useState<OneClickEnrollment | null>();
  const [error, setError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [activeTool, setActiveTool] = useState<'notice' | 'resource' | 'assessment' | 'review'>(
    'notice',
  );
  const [toolMessage, setToolMessage] = useState('');
  const [review, setReview] = useState<OneClickReview | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewDeleteOpen, setReviewDeleteOpen] = useState(false);
  const [activeLessonIndex, setActiveLessonIndex] = useState(defaultResumeLessonIndex);
  const [playing, setPlaying] = useState(false);
  const [activeDurationSeconds, setActiveDurationSeconds] = useState(0);
  const [playbackStartSeconds, setPlaybackStartSeconds] = useState(0);
  const [playbackSession, setPlaybackSession] = useState(0);
  const [activeMarker, setActiveMarker] = useState<NonNullable<OneClickLesson['markers']>[number]>();
  const [markerAnswer, setMarkerAnswer] = useState<number>();
  const toolPanelRef = useRef<HTMLElement | null>(null);
  const lastHeartbeatRef = useRef(0);
  const lastMarkerTimeRef = useRef(0);
  const shownMarkersRef = useRef(new Set<string>());
  const publishedDraft = loadClassPreview(id, initialClassDraft);
  const draft = publishedDraft.title ? publishedDraft : loadClassDraft(initialClassDraft);
  const invalidCourseId = !isValidCourseId(id);
  useEffect(() => {
    let alive = true;
    if (invalidCourseId) {
      setRoom(null);
      setEnrollment(null);
      return () => {
        alive = false;
      };
    }
    oneclickService
      .learnRoom(id)
      .then((nextRoom) => {
        if (!alive) return;
        setRoom(nextRoom);
        setEnrollment(nextRoom);
        if (nextRoom?.lessons?.length) {
          const nextIndex = getResumeLessonIndex(nextRoom);
          setActiveLessonIndex(nextIndex);
          setPlaybackStartSeconds(
            nextRoom.lessons[nextIndex].completed
              ? 0
              : (nextRoom.lessons[nextIndex].currentSeconds ?? 0),
          );
        }
      })
      .catch(() => {
        if (!alive) return;
        setError('수강실 정보를 불러오지 못했어요.');
        setRoom(null);
        setEnrollment(null);
      });
    return () => {
      alive = false;
    };
  }, [id, invalidCourseId]);
  useEffect(() => {
    if (invalidCourseId) return;
    void oneclickService.myReview(id).then((item) => {
      setReview(item);
      setReviewRating(item?.rating ?? 0);
      setReviewContent(item?.content ?? '');
    });
  }, [id, invalidCourseId]);
  const continueLearning = async () => {
    if (invalidCourseId) return nav('/s/notion-auto', { replace: true });
    if (phone.replace(/\D/g, '').length < 10) return setError('휴대전화 번호를 확인해 주세요.');
    if (!sent) {
      setVerifying(true);
      setError('');
      try {
        const verification = await oneclickService.requestVerification(id, phone);
        setVerificationHint(
          verification.debugCode ? `테스트 인증번호: ${verification.debugCode}` : '',
        );
        setSent(true);
      } catch {
        setError('인증번호를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setVerifying(false);
      }
      return;
    }
    if (verificationCode.replace(/\D/g, '').length < 6)
      return setError('문자로 받은 6자리 인증번호를 입력해 주세요.');
    setVerifying(true);
    setError('');
    try {
      const next = await oneclickService.continueWithPhone(id, phone, verificationCode);
      const nextRoom = await oneclickService.learnRoom(id);
      setEnrollment(nextRoom || next);
      setRoom(nextRoom);
      if (nextRoom?.lessons.length) {
        const nextIndex = getResumeLessonIndex(nextRoom);
        setActiveLessonIndex(nextIndex);
        setPlaybackStartSeconds(
          nextRoom.lessons[nextIndex].completed
            ? 0
            : (nextRoom.lessons[nextIndex].currentSeconds ?? 0),
        );
      }
    } catch {
      setError('인증번호가 올바르지 않거나 만료됐어요. 다시 확인해 주세요.');
    } finally {
      setVerifying(false);
    }
  };
  const resendVerification = async () => {
    setVerifying(true);
    setError('');
    try {
      const verification = await oneclickService.requestVerification(id, phone);
      setVerificationHint(
        verification.debugCode
          ? `새 테스트 인증번호: ${verification.debugCode}`
          : '인증번호를 다시 보냈어요.',
      );
    } catch {
      setError('인증번호를 다시 보내지 못했어요. 잠시 후 시도해 주세요.');
    } finally {
      setVerifying(false);
    }
  };
  const lessons = room?.lessons ?? [];
  const lessonGroups = groupCurriculumItems(lessons);
  const tools = room?.tools ?? { noticeCount: 0, resourceCount: 0, examCount: 0, surveyCount: 0 };
  const pendingAssessmentCount = room?.assessments.filter((item) => !item.completed).length;
  const title = room?.courseTitle || draft.title || '노션으로 시작하는 업무 자동화';
  if (invalidCourseId) {
    return (
      <div className="learner-shell learner-verify">
        <section className="learner-card verify-card">
          <Smartphone />
          <span>수강 링크 확인 필요</span>
          <h1>신청 페이지에서 다시 입장해 주세요.</h1>
          <p>수강실 주소가 완전하지 않아 수강권을 확인할 수 없어요.</p>
          <button className="primary" onClick={() => nav('/s/notion-auto', { replace: true })}>
            신청 페이지로 이동
          </button>
        </section>
      </div>
    );
  }
  if (enrollment === undefined) {
    return (
      <div className="learner-shell learner-verify">
        <section className="learner-card verify-card">
          <Smartphone />
          <span>수강권 확인</span>
          <h1>신청 정보를 확인하고 있어요.</h1>
        </section>
      </div>
    );
  }
  if (!enrollment) {
    return (
      <div className="learner-shell learner-verify">
        <section className="learner-card verify-card">
          <Smartphone />
          <span>다른 기기에서 이어보기</span>
          <h1>신청 정보를 확인하면 바로 이어서 볼 수 있어요.</h1>
          <strong className="verify-course-title">{title}</strong>
          <p>신청할 때 입력한 휴대전화 번호를 확인해요.</p>
          <label>
            휴대전화 번호
            <input
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </label>
          {sent && (
            <label>
              인증번호
              <input
                inputMode="numeric"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="문자로 받은 6자리 번호"
              />
            </label>
          )}
          {sent && (
            <p className="verify-help">
              {verificationHint ||
                '인증번호를 보냈어요. 문자를 받지 못했다면 잠시 후 다시 요청해 주세요.'}
            </p>
          )}
          {sent && (
            <button
              className="verify-resend"
              type="button"
              disabled={verifying}
              onClick={() => void resendVerification()}
            >
              인증번호 다시 받기
            </button>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={verifying} onClick={() => void continueLearning()}>
            {verifying ? '확인 중...' : sent ? '확인하고 이어보기' : '인증번호 받기'}
          </button>
          <button
            className="secondary"
            onClick={() => nav(`/s/${shareTokenFromCourseActiveSeq(id)}`)}
          >
            처음 신청하기
          </button>
        </section>
      </div>
    );
  }
  if (!enrollment.canLearn) {
    const accessCopy = {
      AWAITING_APPROVAL: ['신청 승인 대기 중이에요.', '강의자가 신청을 확인하면 이 화면에서 바로 알려드릴게요.'],
      AWAITING_PAYMENT: ['결제 확인이 필요해요.', '결제를 완료하면 수강권이 바로 활성화돼요.'],
      PAYMENT_FAILED: ['결제를 완료하지 못했어요.', '결제 상태를 확인한 뒤 다시 시도해 주세요.'],
      REJECTED: ['신청이 승인되지 않았어요.', '자세한 내용은 강의자에게 문의해 주세요.'],
      CANCELLED: ['취소된 신청이에요.', '다시 참여하려면 강의 정보에서 신청 가능 여부를 확인해 주세요.'],
      REFUNDED: ['환불이 완료된 수강권이에요.', '환불된 신청으로는 강의를 볼 수 없어요.'],
      SUSPENDED: ['수강권이 일시 정지됐어요.', '자세한 내용은 강의자에게 문의해 주세요.'],
      COURSE_UNAVAILABLE: ['현재 강의를 이용할 수 없어요.', '강의 공개 상태를 잠시 후 다시 확인해 주세요.'],
      AVAILABLE: ['수강권을 확인하고 있어요.', '잠시 후 다시 확인해 주세요.'],
    } as const;
    const [pendingTitle, pendingDescription] = accessCopy[enrollment.accessReason];
    const refreshLearnerStatus = async () => {
      setCheckingStatus(true);
      setError('');
      try {
        const next = await oneclickService.learnRoom(id);
        setRoom(next);
        setEnrollment(next);
      } catch {
        setError('수강권 상태를 다시 확인하지 못했어요.');
      } finally {
        setCheckingStatus(false);
      }
    };
    return (
      <div className="learner-shell learner-verify">
        <section className="learner-card verify-card">
          <ShieldCheck />
          <span>수강권 확인</span>
          <h1>{pendingTitle}</h1>
          <p>{pendingDescription}</p>
          {error && <p className="form-error">{error}</p>}
          <button
            className="primary"
            disabled={checkingStatus}
            onClick={() => void refreshLearnerStatus()}
          >
            {checkingStatus ? '확인 중...' : '상태 다시 확인'}
          </button>
          <button
            className="secondary"
            onClick={() => nav(`/s/${enrollment.shareToken || shareTokenFromCourseActiveSeq(id)}`)}
          >
            신청 페이지 보기
          </button>
        </section>
      </div>
    );
  }
  const courseShareToken =
    enrollment.shareToken || room?.shareToken || shareTokenFromCourseActiveSeq(id);
  if (!lessons.length) {
    const refreshLessons = async () => {
      setCheckingStatus(true);
      setError('');
      try {
        const next = await oneclickService.learnRoom(id);
        setRoom(next);
        setEnrollment(next);
        if (!next?.lessons.length) setError('아직 공개된 강의가 없어요.');
      } catch {
        setError('강의 준비 상태를 확인하지 못했어요.');
      } finally {
        setCheckingStatus(false);
      }
    };
    return (
      <div className="learner-shell learner-room-shell">
        <header className="learner-room-topbar">
          <b>원클릭 클래스</b>
          <div className="learner-room-actions">
            <button type="button" onClick={() => nav(`/s/${courseShareToken}`)}>
              강의 정보
            </button>
            <span>{enrollment.learnerName}님</span>
          </div>
        </header>
        <main className="learner-verify">
          <section className="learner-card verify-card">
            <CalendarDays />
            <span>강의 준비 중</span>
            <h1>{title}</h1>
            <p>강의자가 커리큘럼을 공개하면 이곳에서 바로 시작할 수 있어요.</p>
            {error && <p className="form-error">{error}</p>}
            <button
              className="primary"
              disabled={checkingStatus}
              onClick={() => void refreshLessons()}
            >
              {checkingStatus ? '확인 중...' : '강의 등록 여부 다시 확인'}
            </button>
            <button className="secondary" onClick={() => nav(`/s/${courseShareToken}`)}>
              강의 정보 보기
            </button>
          </section>
        </main>
      </div>
    );
  }
  const activeLesson = lessons[activeLessonIndex] ?? lessons[0];
  const activeProgress = activeLesson.progress ?? enrollment.progress;
  const activeLessonNumber = getLessonDisplayNumber(lessonGroups, activeLesson.lessonId);
  const activeLessonPosition = `${activeLessonNumber}차시 ${formatPlaybackTime(
    activeLesson.currentSeconds ?? playbackStartSeconds,
  )}`;
  const linkedLessonView = getLinkedLessonView(activeLesson.contentProvider);
  const activeLessonResources =
    activeLesson.resources?.length
      ? activeLesson.resources
      : activeLesson.contentUrl && linkedLessonView
        ? [{ id: 'primary-resource', name: activeLesson.title, url: activeLesson.contentUrl }]
        : [];
  const hasActiveLessonContent = Boolean(activeLesson.contentUrl || activeLessonResources.length);
  const openTool = (tool: 'notice' | 'resource' | 'assessment' | 'review') => {
    setActiveTool(tool);
    setToolMessage('');
    window.setTimeout(
      () => toolPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      50,
    );
  };
  const readNotice = async (noticeId: string) => {
    try {
      await oneclickService.readNotice(id, noticeId);
      setRoom((current) =>
        current
          ? {
              ...current,
              notices: current.notices.map((notice) =>
                notice.id === noticeId ? { ...notice, read: true } : notice,
              ),
              tools: {
                ...current.tools,
                noticeCount: Math.max(0, current.tools.noticeCount - 1),
              },
            }
          : current,
      );
      setToolMessage('공지사항을 확인했어요.');
    } catch {
      setToolMessage('읽음 상태를 저장하지 못했어요.');
    }
  };
  const resumeLesson = (index = defaultResumeLessonIndex) => {
    const lesson = lessons[index];
    if (!lesson || lesson.locked || !lesson.playable || !(lesson.contentUrl || lesson.resources?.length)) return;
    setActiveLessonIndex(index);
    setActiveDurationSeconds(0);
    setPlaybackStartSeconds(lesson.completed ? 0 : (lesson.currentSeconds ?? 0));
    setPlaybackSession((current) => current + 1);
    setPlaying(false);
    setActiveMarker(undefined);
    setMarkerAnswer(undefined);
    shownMarkersRef.current.clear();
    lastMarkerTimeRef.current = lesson.completed ? 0 : (lesson.currentSeconds ?? 0);
  };
  const showMarkerAt = (currentSeconds: number) => {
    const previousSeconds = lastMarkerTimeRef.current;
    lastMarkerTimeRef.current = currentSeconds;
    if (currentSeconds < previousSeconds) return false;
    const marker = activeLesson.markers?.find(
      (item) =>
        !shownMarkersRef.current.has(item.id) &&
        item.timeSeconds > previousSeconds - 0.75 &&
        item.timeSeconds <= currentSeconds + 0.75,
    );
    if (!marker) return false;
    shownMarkersRef.current.add(marker.id);
    setActiveMarker(marker);
    setMarkerAnswer(undefined);
    return true;
  };
  const savePlayback = (
    currentSeconds: number,
    isPlaying: boolean,
    durationSeconds = activeDurationSeconds,
    ended = false,
  ) => {
    if (!enrollment.courseApplySeq) return;
    const measuredProgress = durationSeconds
      ? Math.min(100, Math.round((currentSeconds / durationSeconds) * 100))
      : activeProgress;
    const lessonCompleted = ended || activeLesson.completed || measuredProgress >= 90;
    const lessonProgress = Math.max(activeLesson.progress, measuredProgress, lessonCompleted ? 90 : 0);
    const lastPosition = `${activeLessonNumber}차시 ${formatPlaybackTime(currentSeconds)}`;
    const totalProgress = Math.round(
      lessons.reduce(
        (total, lesson, index) =>
          total + (index === activeLessonIndex ? lessonProgress : lesson.progress),
        0,
      ) / lessons.length,
    );
    void oneclickService.heartbeat(id, {
      courseApplySeq: enrollment.courseApplySeq,
      lessonId: activeLesson.lessonId,
      currentSeconds: Math.floor(currentSeconds),
      durationSeconds: durationSeconds > 0 ? Math.floor(durationSeconds) : undefined,
      ended,
      playing: isPlaying,
    });
    setRoom((current) =>
      current
        ? {
            ...current,
            progress: totalProgress,
            lastPosition,
            resumeLessonId: activeLesson.lessonId,
            lessons: current.lessons.map((lesson, index) =>
              index === activeLessonIndex
                ? {
                    ...lesson,
                    currentSeconds,
                    progress: lessonProgress,
                    completed: lessonCompleted,
                    completedAt:
                      lessonCompleted && !lesson.completed
                        ? new Date().toISOString()
                        : lesson.completedAt,
                    completionReason: ended
                      ? 'ENDED'
                      : lessonCompleted
                        ? lesson.completionReason || 'WATCH_THRESHOLD'
                        : null,
                  }
                : lesson,
            ),
          }
        : current,
    );
    setEnrollment((current) =>
      current
        ? {
            ...current,
            progress: totalProgress,
            lastPosition,
            resumeLessonId: activeLesson.lessonId,
          }
        : current,
    );
  };
  const saveReview = async () => {
    if (!reviewRating) return setToolMessage('별점을 선택해 주세요.');
    if (reviewContent.trim().length < 10) return setToolMessage('후기를 10자 이상 입력해 주세요.');
    setReviewSaving(true);
    try {
      const saved = await oneclickService.saveReview(id, {
        courseApplySeq: enrollment.courseApplySeq,
        rating: reviewRating,
        content: reviewContent.trim(),
      });
      setReview(saved);
      setReviewContent(saved.content);
      setToolMessage(review ? '후기를 수정했어요.' : '후기를 등록했어요.');
    } catch {
      setToolMessage('후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setReviewSaving(false);
    }
  };
  const removeReview = async () => {
    setReviewSaving(true);
    try {
      await oneclickService.removeReview(id);
      setReview(null);
      setReviewRating(0);
      setReviewContent('');
      setReviewDeleteOpen(false);
      setToolMessage('후기를 삭제했어요.');
    } catch {
      setToolMessage('후기를 삭제하지 못했어요.');
    } finally {
      setReviewSaving(false);
    }
  };
  return (
    <>
    <div className="learner-shell learner-room-shell">
      <header className="learner-room-topbar">
        <b>원클릭 클래스</b>
        <div className="learner-room-actions">
          <button type="button" onClick={() => nav(`/s/${courseShareToken}`)}>
            강의 정보
          </button>
          <span>{enrollment.learnerName}님</span>
        </div>
      </header>
      <main className="learner-room-grid">
        <section className="learner-room-main">
          {linkedLessonView && activeLessonResources.length ? (
            <section className="learner-material-stage">
              <div className="learner-material-stage-head">
                <span><FileText size={18} /> {linkedLessonView.label}</span>
                <small>{activeLessonNumber}차시</small>
              </div>
              <h2>{activeLesson.title}</h2>
              <p>{activeLesson.description || linkedLessonView.description}</p>
              <div className="learner-material-files">
                {activeLessonResources.map((resource, index) => (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    key={resource.id}
                    onClick={() => savePlayback(1, false, 1, true)}
                  >
                    <span>
                      <FileText size={18} />
                      <span>
                        <b>{resource.name || `${linkedLessonView.action} ${index + 1}`}</b>
                        <small>{[formatFileSize(resource.size), resource.type].filter(Boolean).join(' · ') || linkedLessonView.action}</small>
                      </span>
                    </span>
                    <strong>
                      {linkedLessonView.action}
                      <ExternalLink size={15} />
                    </strong>
                  </a>
                ))}
              </div>
              <small className="learner-material-stage-note">
                자료를 열면 이 차시는 학습한 것으로 기록돼요.
              </small>
            </section>
          ) : (
          <div className={`learner-player ${hasActiveLessonContent ? 'has-video' : 'is-empty'}`}>
            {activeLesson.contentProvider === 'FILE' && activeLesson.contentUrl ? (
              <video
                key={`${activeLesson.lessonId}-${playbackSession}`}
                controls
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                src={activeLesson.contentUrl}
                onContextMenu={(event) => event.preventDefault()}
                onPlay={() => setPlaying(true)}
                onLoadedMetadata={(event) => {
                  setActiveDurationSeconds(event.currentTarget.duration);
                  if (playbackStartSeconds)
                    event.currentTarget.currentTime = playbackStartSeconds;
                }}
                onPause={(event) => {
                  setPlaying(false);
                  savePlayback(
                    event.currentTarget.currentTime,
                    false,
                    event.currentTarget.duration,
                  );
                }}
                onEnded={(event) =>
                  savePlayback(
                    event.currentTarget.currentTime,
                    false,
                    event.currentTarget.duration,
                    true,
                  )
                }
                onTimeUpdate={(event) => {
                  const seconds = event.currentTarget.currentTime;
                  if (showMarkerAt(seconds)) {
                    event.currentTarget.pause();
                    return;
                  }
                  if (seconds - lastHeartbeatRef.current < 10) return;
                  lastHeartbeatRef.current = seconds;
                  savePlayback(seconds, true, event.currentTarget.duration);
                }}
              />
            ) : activeLesson.contentProvider === 'YOUTUBE' && activeLesson.contentUrl ? (
              <YouTubePlayer
                key={`${activeLesson.lessonId}-${playbackSession}`}
                videoId={getYouTubeVideoId(activeLesson.contentUrl)}
                startSeconds={playbackStartSeconds}
                onPlayingChange={setPlaying}
                onProgress={(currentSeconds, durationSeconds, isPlaying, ended) => {
                  setActiveDurationSeconds(durationSeconds);
                  savePlayback(currentSeconds, isPlaying, durationSeconds, ended);
                }}
                onTimeChange={showMarkerAt}
              />
            ) : activeLesson.contentProvider === 'VIMEO' && activeLesson.contentUrl ? (
              <div className="learner-player-empty protected-external-content">
                <ExternalLink />
                <b>Vimeo 재생은 준비 중이에요.</b>
                <p>YouTube 강의는 수강실 안에서 바로 재생할 수 있어요.</p>
              </div>
            ) : activeLesson.contentUrl ? (
              <div className="learner-player-empty protected-external-content">
                <ExternalLink />
                <b>지원 준비 중인 콘텐츠예요.</b>
                <p>이 차시는 수강 페이지 안에서 바로 열 수 있는 방식으로 등록이 필요해요.</p>
              </div>
            ) : (
              <div className="learner-player-empty">
                <CalendarDays />
                <b>아직 재생할 콘텐츠가 등록되지 않았어요.</b>
              </div>
            )}
            {activeMarker && (
              <section className="learner-marker" role="dialog" aria-modal="true" aria-label={activeMarker.title}>
                <small>{formatPlaybackTime(activeMarker.timeSeconds)} 마커</small>
                <h2>{activeMarker.title}</h2>
                {activeMarker.type === 'IMAGE' && activeMarker.imageUrl ? (
                  <img src={activeMarker.imageUrl} alt={activeMarker.content || activeMarker.title} />
                ) : activeMarker.type === 'QUIZ' ? (
                  <div className="learner-marker-quiz">
                    <p>{activeMarker.content}</p>
                    {activeMarker.choices?.map((choice, index) => (
                      <button
                        type="button"
                        className={markerAnswer === index ? 'selected' : ''}
                        key={choice}
                        onClick={() => setMarkerAnswer(index)}
                      >
                        {index + 1}. {choice}
                      </button>
                    ))}
                    {markerAnswer !== undefined && (
                      <strong className={markerAnswer === activeMarker.answerIndex ? 'correct' : 'incorrect'}>
                        {markerAnswer === activeMarker.answerIndex ? '정답이에요.' : '다시 생각해 보세요.'}
                      </strong>
                    )}
                  </div>
                ) : (
                  <p>{activeMarker.content}</p>
                )}
                <button type="button" className="learner-marker-close" onClick={() => setActiveMarker(undefined)}>
                  계속 보기
                </button>
              </section>
            )}
            <div className="learner-player-meta">
              <small>
                {hasActiveLessonContent
                  ? playing
                    ? '재생 중'
                    : linkedLessonView
                      ? '자료 열람'
                      : '이어보기 대기'
                  : '콘텐츠 준비 중'}
              </small>
              <b>
                {activeLessonNumber}차시. {activeLesson.title}
              </b>
              <span>
                {activeDurationSeconds
                  ? `영상 길이 ${formatPlaybackTime(activeDurationSeconds)}`
                  : `예상 학습 ${activeLesson.durationText}`}
                {activeProgress > 0 ? ` · 차시 진도 ${activeProgress}%` : ''}
              </span>
            </div>
          </div>
          )}
          <section className="learner-section learner-progress-card">
            <span>수강 중</span>
            <h1>{activeLesson.title}</h1>
            <p>현재 학습 위치: {activeLessonPosition}</p>
            <div className="student-progress-head">
              <span>전체 진도</span>
              <b>{enrollment.progress}%</b>
            </div>
            <div className="oc-progress">
              <i style={{ width: `${enrollment.progress}%` }} />
            </div>
          </section>
          <section className="learner-room-tools has-reviews">
            <button
              className={activeTool === 'notice' ? 'active' : ''}
              type="button"
              onClick={() => openTool('notice')}
            >
              <Megaphone />
              <span>
                <b>공지사항</b>
                <small>
                  {tools.noticeCount ? `새 공지 ${tools.noticeCount}개` : '확인할 공지 없음'}
                </small>
              </span>
            </button>
            <button
              className={activeTool === 'review' ? 'active' : ''}
              type="button"
              onClick={() => openTool('review')}
            >
              <MessageSquareText />
              <span>
                <b>수강 후기</b>
                <small>{review ? '작성한 후기 수정' : '후기 남기기'}</small>
              </span>
            </button>
            <button
              className={activeTool === 'resource' ? 'active' : ''}
              type="button"
              onClick={() => openTool('resource')}
            >
              <FileText />
              <span>
                <b>자료실</b>
                <small>
                  {tools.resourceCount ? `자료 ${tools.resourceCount}개` : '등록 자료 없음'}
                </small>
              </span>
            </button>
            <button
              className={activeTool === 'assessment' ? 'active' : ''}
              type="button"
              onClick={() => openTool('assessment')}
            >
              <ClipboardCheck />
              <span>
                <b>설문·시험</b>
                <small>
                  {pendingAssessmentCount !== undefined
                    ? pendingAssessmentCount
                      ? `참여할 항목 ${pendingAssessmentCount}개`
                      : '모두 참여했어요'
                    : tools.surveyCount + tools.examCount
                      ? `참여할 항목 ${tools.surveyCount + tools.examCount}개`
                      : '대기 항목 없음'}
                </small>
              </span>
            </button>
          </section>
          <section className="learner-section learner-tool-panel" ref={toolPanelRef}>
            {toolMessage && (
              <div className="learner-tool-message">
                <CheckCircle2 size={16} />
                {toolMessage}
              </div>
            )}
            {activeTool === 'notice' && (
              <>
                <h2>공지사항</h2>
                {room?.notices.length ? (
                  room.notices.map((notice) => (
                    <article className="learner-tool-item" key={notice.id}>
                      <span>{notice.label}</span>
                      <div>
                        <b>{notice.title}</b>
                        <p>{notice.description}</p>
                      </div>
                      <button
                        type="button"
                        disabled={notice.read}
                        onClick={() => void readNotice(notice.id)}
                      >
                        {notice.read ? '확인 완료' : notice.actionLabel || '확인'}
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="learner-tool-empty">등록된 공지사항이 없어요.</p>
                )}
              </>
            )}
            {activeTool === 'resource' && (
              <>
                <h2>자료실</h2>
                {room?.resources.length ? (
                  room.resources.map((resource) => (
                    <article className="learner-tool-item" key={resource.id}>
                      <span>{resource.label}</span>
                      <div>
                        <b>{resource.title}</b>
                        <p>{resource.description}</p>
                      </div>
                      <button
                        type="button"
                        disabled={!resource.url}
                        onClick={() =>
                          resource.url && window.open(resource.url, '_blank', 'noopener,noreferrer')
                        }
                      >
                        {resource.url ? resource.actionLabel || '열기' : '준비 중'}
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="learner-tool-empty">등록된 강의 자료가 없어요.</p>
                )}
              </>
            )}
            {activeTool === 'assessment' && (
              <>
                <h2>설문·시험</h2>
                {room?.assessments.length ? (
                  room.assessments.map((assessment) => (
                    <article
                      className={`learner-tool-item ${assessment.required ? 'required' : ''}`}
                      key={assessment.id}
                    >
                      <span>{assessment.completed ? '완료' : assessment.label}</span>
                      <div>
                        <b>{assessment.title}</b>
                        <p>{assessment.description}</p>
                      </div>
                      <button
                        type="button"
                        disabled={assessment.completed && assessment.type === 'SURVEY'}
                        onClick={() => {
                          const path =
                            assessment.type === 'SURVEY'
                              ? 'survey/take'
                              : assessment.completed
                                ? 'exam/result'
                                : 'exam/take';
                          nav(
                            `/learn/${path}?courseActiveSeq=${encodeURIComponent(id)}&assessmentId=${encodeURIComponent(assessment.id)}&returnTo=${encodeURIComponent(`/learn/${id}`)}`,
                          );
                        }}
                      >
                        {assessment.completed
                          ? assessment.type === 'EXAM'
                            ? '결과 보기'
                            : '참여 완료'
                          : assessment.type === 'SURVEY'
                            ? '참여하기'
                            : '풀기'}
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="learner-tool-empty">참여할 설문이나 시험이 없어요.</p>
                )}
              </>
            )}
            {activeTool === 'review' && (
              <div className="learner-review-form">
                <div className="learner-review-form-head">
                  <div>
                    <h2>{review ? '작성한 후기' : '수강 후기 남기기'}</h2>
                    <p>수강 경험을 솔직하게 알려주세요.</p>
                  </div>
                  {review && <span>등록 완료</span>}
                </div>
                <div className="learner-review-rating" role="group" aria-label="후기 별점">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      type="button"
                      className={reviewRating >= rating ? 'active' : ''}
                      onClick={() => setReviewRating(rating)}
                      aria-label={`${rating}점`}
                      key={rating}
                    >
                      <Star fill="currentColor" />
                    </button>
                  ))}
                  <b>{reviewRating ? `${reviewRating}.0` : '별점을 선택해 주세요'}</b>
                </div>
                <label>
                  후기 내용
                  <textarea
                    maxLength={500}
                    value={reviewContent}
                    onChange={(event) => setReviewContent(event.target.value)}
                    placeholder="강의에서 좋았던 점과 도움이 된 부분을 알려주세요."
                  />
                  <small>{reviewContent.length} / 500</small>
                </label>
                <div className="learner-review-actions">
                  {review && (
                    <button
                      type="button"
                      className="review-delete"
                      disabled={reviewSaving}
                      onClick={() => setReviewDeleteOpen(true)}
                    >
                      <Trash2 />
                      삭제
                    </button>
                  )}
                  <button
                    type="button"
                    className="primary"
                    disabled={reviewSaving || !reviewRating || reviewContent.trim().length < 10}
                    onClick={() => void saveReview()}
                  >
                    {reviewSaving ? '저장 중...' : review ? '후기 수정하기' : '후기 등록하기'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </section>
        <aside className="learner-card learner-lesson-panel">
          <div className="learner-panel-title">
            <h2>커리큘럼</h2>
            <small>총 {lessons.length}강</small>
          </div>
          {lessonGroups.map((section, sectionIndex) => (
            <section className="learner-lesson-group" key={section.key}>
              <div className="learner-lesson-section">
                <span>{String(sectionIndex + 1).padStart(2, '0')}</span>
                <b>섹션 {sectionIndex + 1}</b>
                <strong>{section.title}</strong>
                <small>{formatSectionSummary(section.items.length, section.totalMinutes)}</small>
              </div>
              {section.items.map((lesson, lessonIndex) => {
                const index = lessons.findIndex((item) => item.lessonId === lesson.lessonId);
                const done = lesson.completed;
                const locked = lesson.locked;
                const hasLessonContent = Boolean(lesson.contentUrl || lesson.resources?.length);
                const unavailable = !locked && (!lesson.playable || !hasLessonContent);
                const lessonNumber = `${sectionIndex + 1}-${lessonIndex + 1}`;
                const lessonStatus = locked
                  ? '이전 강의 완료 후 열림'
                  : unavailable
                    ? '콘텐츠 준비 중'
                    : done
                      ? '처음부터 다시 보기'
                      : ['FILE', 'YOUTUBE', 'VIMEO'].includes(lesson.contentProvider)
                        ? '재생'
                        : '열기';
                return (
                  <button
                    className={`learner-lesson ${done ? 'done' : ''} ${locked ? 'locked' : ''} ${unavailable ? 'unavailable' : ''} ${activeLessonIndex === index ? 'active' : ''}`}
                    disabled={locked || unavailable}
                    key={lesson.lessonId}
                    onClick={() => resumeLesson(index)}
                  >
                    <span className="learner-lesson-index">
                      {done ? <CheckCircle2 /> : locked ? <LockKeyhole /> : lessonNumber}
                    </span>
                    <span className="learner-lesson-copy">
                      <b>{lesson.title}</b>
                      <small>
                        <Clock3 size={14} />
                        예상 {lesson.durationText}
                        {lesson.progress > 0 ? ` · 학습 ${lesson.progress}%` : ''}
                      </small>
                    </span>
                    <span className="learner-lesson-action" aria-label={lessonStatus}>
                      {locked || unavailable ? (
                        <small className="lesson-state">{lessonStatus}</small>
                      ) : done ? (
                        <RotateCcw size={18} />
                      ) : ['FILE', 'YOUTUBE', 'VIMEO'].includes(lesson.contentProvider) ? (
                        <Play size={18} />
                      ) : (
                        <ExternalLink size={18} />
                      )}
                    </span>
                  </button>
                );
              })}
            </section>
          ))}
          <div className="learner-room-note">
            <CalendarDays /> 다음 강의 알림은 신청 정보 기준으로 안내돼요.
          </div>
        </aside>
      </main>
    </div>
    <ConfirmDialog
      open={reviewDeleteOpen}
      title="후기를 삭제할까요?"
      description="작성한 후기가 수강생 후기 영역에서 사라져요. 삭제한 후기는 다시 복구할 수 없어요."
      confirmText="삭제하기"
      loading={reviewSaving}
      onCancel={() => setReviewDeleteOpen(false)}
      onConfirm={() => void removeReview()}
    />
    </>
  );
}

function ClassPublicPage({ preview = false }: { preview?: boolean }) {
  const nav = useNavigate();
  const { id = 'notion' } = useParams();
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [previewCurriculum, setPreviewCurriculum] = useState<CurriculumSection[]>([]);
  const [previewDetail, setPreviewDetail] = useState<ClassDetail>();
  const draft = preview
    ? loadClassPreview(id, initialClassDraft)
    : loadClassDraft(initialClassDraft);
  useEffect(() => {
    if (!preview) return;
    let alive = true;
    void Promise.all([curriculumService.list(id), detailService.getClass(id)]).then(
      ([sections, detail]) => {
        if (!alive) return;
        setPreviewCurriculum(sections);
        setPreviewDetail(detail);
      },
    );
    return () => {
      alive = false;
    };
  }, [id, preview]);
  const previewLessons = previewCurriculum.flatMap((section) => section.lessons);
  const previewType = previewDetail
    ? ({ 온라인: 'online', 라이브: 'live', 오프라인: 'offline', 혼합형: 'hybrid' } as const)[
        previewDetail.type as '온라인' | '라이브' | '오프라인' | '혼합형'
      ] || draft.type
    : draft.type;
  const readinessDraft = previewDetail
    ? {
        ...draft,
        type: previewType,
        title: previewDetail.title,
        summary: previewDetail.summary,
        description: previewDetail.description,
        startDate: previewDetail.date,
        recruitEndDate: previewDetail.recruitEndDate,
        capacity: previewDetail.capacity,
        payment: previewDetail.price > 0 ? ('paid' as const) : ('free' as const),
        price: previewDetail.price,
        address:
          previewType === 'offline' || previewType === 'hybrid'
            ? previewDetail.location
            : draft.address,
      }
    : draft;
  const publishIssues = getPublishIssues(readinessDraft, previewCurriculum);
  const canPublish = publishIssues.length === 0;
  const title = previewDetail?.title || draft.title || '노션으로 시작하는 업무 자동화';
  const summary = previewDetail?.summary || draft.summary || '반복 업무를 자동화하는 실전 4주 과정';
  const description =
    previewDetail?.description ||
    draft.description ||
    '데이터베이스 설계부터 반복 업무 자동화, 팀 협업 템플릿까지 4주 동안 직접 만들며 배웁니다.';
  const location =
    previewDetail?.location || (draft.type === 'offline' || draft.type === 'hybrid'
      ? [draft.address, draft.detailedAddress].filter(Boolean).join(' ') || '장소 협의 중'
      : draft.type === 'live'
        ? '라이브 · 차시별 참여 링크'
        : '온라인 · 차시별 영상');
  const previewPrice = previewDetail?.price ?? (draft.payment === 'paid' ? draft.price : 0);
  const previewCapacity = previewDetail?.capacity ?? draft.capacity;
  const previewDate = previewDetail?.date || draft.startDate;
  const publish = async () => {
    if (!canPublish) {
      setPublishError(publishIssues[0]?.label || '공개 준비 항목을 확인해 주세요.');
      return;
    }
    setPublishing(true);
    setPublishError('');
    try {
      const { shareToken } = await classService.publish(id);
      nav(`/classes/published?shareToken=${encodeURIComponent(shareToken)}`);
    } catch {
      setPublishError('공개하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setPublishing(false);
    }
  };
  return (
    <>
      <div className="student-class-web web-only">
        {preview ? (
          <Link className="oc-back-link" to={`/classes/${id}`}>
            <ArrowLeft size={16} /> 관리 화면으로 돌아가기
          </Link>
        ) : (
          <Link className="oc-back-link" to="/classes">
            <ArrowLeft size={16} /> 클래스 목록
          </Link>
        )}
        <section className="student-learning-hero">
          <div className="student-learning-cover">
            {draft.thumbnail ? (
              <img src={draft.thumbnail} alt="클래스 썸네일" />
            ) : (
              <div>
                <Play size={32} />
                <b>대표 썸네일</b>
              </div>
            )}
          </div>
          <div className="student-learning-copy">
            <span className="operation-status wait">
              {preview ? '신청 페이지 미리보기' : '수강 중'}
            </span>
            <h1>{title}</h1>
            <p>{summary}</p>
            <div className="student-instructor">
              <i>지</i>
              <span>
                <b>이지훈 강사</b>
                <small>누적 수강생 68명 · 만족도 4.9</small>
              </span>
            </div>
            {preview ? (
              <>
                <div className="preview-publish-actions">
                  <Link to={`/classes/new?edit=${id}`}>수정하기</Link>
                  <button
                    className="student-continue"
                    disabled={publishing || !canPublish}
                    onClick={() => void publish()}
                  >
                    {publishing ? '공개 중...' : '공개하고 링크 복사'}
                  </button>
                </div>
                {publishError && <p className="form-error">{publishError}</p>}
                {!canPublish && <PublishReadiness issues={publishIssues} classId={id} />}
              </>
            ) : (
              <>
                <div className="student-progress-head">
                  <span>전체 진도</span>
                  <b>62%</b>
                </div>
                <div className="oc-progress">
                  <i style={{ width: '62%' }} />
                </div>
                <button className="student-continue">
                  <Play size={18} fill="currentColor" /> 2강 이어서 듣기
                </button>
              </>
            )}
          </div>
        </section>
        <div className="student-learning-layout">
          <main>
            <section className="oc-panel">
              <div className="oc-panel-title">
                <h2>커리큘럼</h2>
                <span>{previewCurriculum.length}개 섹션 · {previewLessons.length}개 차시</span>
              </div>
              {!previewLessons.length ? (
                <p className="curriculum-empty">
                  강의 관리에서 첫 커리큘럼을 추가해 주세요.
                </p>
              ) : (
                previewCurriculum.map((section) => (
                  <section className="student-curriculum-section" key={section.id}>
                    <header><b>{section.title}</b><small>{section.lessons.length}개 차시</small></header>
                    {section.lessons.map((lesson) => {
                      const lessonIndex = previewLessons.findIndex((item) => item.id === lesson.id);
                      return <div className={`student-lesson ${lesson.published ? 'done' : ''}`} key={lesson.id}>
                        <span>{lesson.published ? <CheckCircle2 /> : lessonIndex + 1}</span>
                        <b>{lesson.title}<small><Clock3 size={14} />{lesson.durationMinutes}분 · {lesson.published ? '공개' : '비공개'}</small></b>
                      </div>;
                    })}
                  </section>
                ))
              )}
            </section>
            <section className="oc-panel student-intro">
              <h2>클래스 소개</h2>
              <p>{description}</p>
            </section>
          </main>
          <aside>
            <section className="oc-panel student-schedule">
              <h2>학습 정보</h2>
              <p>
                <CalendarDays />
                <span>
                  일정<b>{previewDate || '자유 수강'}</b>
                </span>
              </p>
              <p>
                <UserRound />
                <span>
                  수강 기간<b>4주</b>
                </span>
              </p>
              <p>
                <Play />
                <span>
                  진행 방식<b>{location}</b>
                </span>
              </p>
            </section>
          </aside>
        </div>
      </div>
      <div className={`preview-page exact-preview ${preview ? 'app-only' : 'app-only'}`}>
        {preview ? (
          <header>
            <button
              type="button"
              onClick={() => nav(`/classes/${id}`)}
              aria-label="관리 페이지로 돌아가기"
            >
              <ArrowLeft />
              <b>미리보기</b>
            </button>
            <Link to={`/classes/new?edit=${id}`}>수정하기</Link>
          </header>
        ) : (
          <button className="student-public-back" onClick={() => nav(-1)} aria-label="뒤로">
            <ArrowLeft />
          </button>
        )}
        <div className="preview-hero">
          {draft.thumbnail && <img src={draft.thumbnail} alt="클래스 썸네일" />}
        </div>
        <main>
          <span className="badge blue">모집중</span>
          <h1>{title}</h1>
          <p className="lead">{summary}</p>
          <div className="preview-instructor">
            <i>지</i>
            <span>
              <b>이지훈 강사</b>
              <small>누적 수강생 68명 · 만족도 4.9</small>
            </span>
          </div>
          <div className="preview-numbers">
            <div>
              <small>참가비</small>
              <b>{previewPrice > 0 ? `${previewPrice.toLocaleString()}원` : '무료'}</b>
            </div>
            <i />
            <div>
              <small>모집 현황</small>
              <b>0 / {previewCapacity}명</b>
            </div>
          </div>
          {preview && !canPublish && <PublishReadiness issues={publishIssues} classId={id} />}
          <section>
            <h3>소개</h3>
            <p>{description}</p>
          </section>
          <section>
            <h3>커리큘럼</h3>
            {!previewLessons.length ? (
              <p className="curriculum-empty">강의 관리에서 첫 커리큘럼을 추가해 주세요.</p>
            ) : (
              previewCurriculum.map((section) => (
                <div className="mobile-curriculum-section" key={section.id}>
                  <strong>{section.title}<small>{section.lessons.length}개 차시</small></strong>
                  {section.lessons.map((lesson) => {
                    const lessonIndex = previewLessons.findIndex((item) => item.id === lesson.id);
                    return <div className="curriculum" key={lesson.id}>
                      <i>{lessonIndex + 1}</i>
                      <span><b>{lesson.title}</b><small>{lesson.description || `${lesson.durationMinutes}분`}</small></span>
                    </div>;
                  })}
                </div>
              ))
            )}
          </section>
          <section>
            <h3>일정 · 장소</h3>
            <div className="schedule-card">
              <p>
                <span>일정</span>
                <b>{previewDate || '일정 미정'}</b>
              </p>
              <p>
                <span>진행</span>
                <b>{location}</b>
              </p>
            </div>
          </section>
          <section>
            <h3>후기</h3>
            {[
              ['★★★★★', '실제 업무에 바로 활용할 수 있어서 좋았어요.', '김서연'],
              ['★★★★★', '예제가 구체적이고 설명이 쉬웠습니다.', '이준호'],
            ].map((r) => (
              <article className="preview-review" key={r[2]}>
                <b>{r[0]}</b>
                <p>{r[1]}</p>
                <small>{r[2]}</small>
              </article>
            ))}
          </section>
        </main>
        {preview && (
          <div className="layout-fixed-action">
            {publishError && <p className="form-error">{publishError}</p>}
            <button className="primary" disabled={publishing || !canPublish} onClick={() => void publish()}>
              {publishing ? '공개 중...' : '공개하기'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PublishReadiness({ issues, classId }: { issues: PublishIssue[]; classId: string }) {
  return (
    <section className="preview-readiness" aria-label="공개 전 확인">
      <b>공개 전에 {issues.length}가지만 확인해 주세요</b>
      {issues.map((issue) => (
        <Link
          to={issue.area === 'basic' ? `/classes/new?edit=${classId}` : `/classes/${classId}/curriculum?setup=1`}
          key={issue.id}
        >
          {issue.label} <span>수정하기</span>
        </Link>
      ))}
    </section>
  );
}
