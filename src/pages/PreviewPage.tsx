import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileText,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  Play,
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
  type OneClickEnrollment,
  type OneClickLearnRoom,
  type OneClickLesson,
  type OneClickReview,
  type OneClickShare,
} from '../api/oneclick';
import { initialClassDraft } from '../constants/classDraft';
import { loadClassDraft, loadClassPreview } from '../utils/classDraft';
import { classService } from '../api/services';

const learnerHighlights = [
  '업무 흐름을 기준으로 데이터베이스를 설계해요.',
  '반복 업무를 버튼과 자동화 도구로 줄여요.',
  '팀원이 바로 쓸 수 있는 운영 템플릿을 완성해요.',
];

const learnerCurriculum = [
  ['1', '업무 구조 잡기', '흩어진 업무를 수강생 상황에 맞게 정리합니다.', '42분'],
  ['2', '자동화 흐름 만들기', '반복 입력, 알림, 상태 변경을 자동화합니다.', '52분'],
  ['3', '팀 협업 템플릿 완성', '함께 쓰기 좋은 권한과 보드 구조를 만듭니다.', '48분'],
] as const;
const learnerLessonProgress = [100, 62, 0] as const;
const defaultResumeLessonIndex = 1;

const fallbackLearnerLessons = (): OneClickLesson[] =>
  learnerCurriculum.map(([lessonId, title, description, durationText], index) => ({
    lessonId,
    title,
    description,
    durationText,
    progress: learnerLessonProgress[index],
    locked: index >= 2,
    completed: learnerLessonProgress[index] >= 100,
    playable: index < 2,
  }));

const isValidCourseId = (value?: string): value is string =>
  Boolean(value && value !== 'undefined' && value !== 'null');

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
  const { shareToken = 'notion-auto' } = useParams();
  const draft = loadClassDraft(initialClassDraft);
  const publishedDraft = loadClassPreview(shareToken, initialClassDraft);
  const hasCustomContent = Boolean(publishedDraft.title);
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
  const [showNewApplication, setShowNewApplication] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let alive = true;
    oneclickService
      .share(shareToken)
      .then((nextShare) => {
        if (!alive) return;
        setShare(nextShare);
        void oneclickService.reviews(shareToken).then((items) => alive && setReviews(items));
        void oneclickService.enrollment(nextShare.courseActiveSeq).then((enrollment) => {
          if (alive) setExisting(enrollment);
        });
      })
      .catch(() => alive && setError('신청 링크를 확인하지 못했어요.'));
    return () => {
      alive = false;
    };
  }, [shareToken]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!share) return setError('신청 링크를 확인하는 중이에요.');
    if (!form.name.trim()) return setError('이름을 입력해 주세요.');
    if (form.phone.replace(/\D/g, '').length < 10)
      return setError('휴대전화 번호를 확인해 주세요.');
    if (!form.privacyConsent) return setError('개인정보 수집 및 수강 안내 발송에 동의해 주세요.');
    if (share.paymentType === 'PAID' && !form.paymentConsent)
      return setError('결제 및 환불 안내를 확인해 주세요.');
    setSubmitting(true);
    setError('');
    try {
      const enrollment = await oneclickService.apply(shareToken, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        privacyConsent: form.privacyConsent,
        paymentConsent: share.paymentType === 'PAID' ? form.paymentConsent : undefined,
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
    ? `${share.enrolled} / ${share.capacity}명`
    : `0 / ${draft.capacity}명`;
  const disabled = share?.applyStatus === 'CLOSED';
  const resumeCourseActiveSeq = existing?.courseActiveSeq || share?.courseActiveSeq;
  const resumeLearning = () => {
    if (canEnterLearnerRoom(existing) && isValidCourseId(resumeCourseActiveSeq)) {
      nav(`/learn/${resumeCourseActiveSeq}`);
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
      ? '신청 처리 중...'
      : share?.requiresApproval
        ? '신청서 제출하기'
        : share?.paymentType === 'PAID'
          ? '신청하고 결제하기'
          : '신청하고 바로 입장';
  const applyGuide = disabled
    ? '현재는 새 신청을 받을 수 없어요.'
    : share?.requiresApproval
      ? '강의자가 확인한 뒤 수강 가능 여부를 안내해요.'
      : share?.paymentType === 'PAID'
        ? '신청 정보를 저장한 뒤 결제 단계로 이동해요.'
        : '신청 후 바로 강의실로 입장할 수 있어요.';
  const existingTitle = canEnterLearnerRoom(existing)
    ? `${existing?.learnerName}님, 이어서 볼까요?`
    : isPaymentPending(existing)
      ? '결제만 완료하면 수강할 수 있어요.'
      : isApprovalPending(existing)
        ? '강의자 확인을 기다리고 있어요.'
        : '신청 상태를 확인해 주세요.';
  const existingDescription = canEnterLearnerRoom(existing)
    ? `이전 위치: ${existing?.lastPosition}`
    : isPaymentPending(existing)
      ? '신청 정보는 저장됐어요.'
      : isApprovalPending(existing)
        ? '승인되면 문자로 안내드릴게요.'
        : '상태가 바뀌면 이 링크에서 바로 확인할 수 있어요.';
  const reviewAverage = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  return (
    <div className="learner-shell learner-apply">
      <header className="learner-topbar">
        <b>원클릭 클래스</b>
        <nav>
          <a href="#curriculum">커리큘럼</a>
          <a href="#reviews">후기</a>
        </nav>
      </header>
      <main className="learner-apply-grid">
        <section className="learner-content">
          <div className="learner-hero">
            <div>
              <span className="learner-badge">{disabled ? '모집 마감' : '모집중'}</span>
              <h1>{title}</h1>
              <p>{summary}</p>
              <div className="learner-quick-stats">
                <span>
                  <b>{hasCustomContent ? '안내 예정' : `${learnerCurriculum.length}개`}</b>
                  <small>커리큘럼</small>
                </span>
                <span>
                  <b>초급</b>
                  <small>난이도</small>
                </span>
                <span>
                  <b>{share?.scheduleText || '자유 수강'}</b>
                  <small>수강 방식</small>
                </span>
              </div>
            </div>
          </div>
          <div className="learner-tabs" aria-label="강의 정보">
            <a href="#learn">소개</a>
            <a href="#curriculum">커리큘럼</a>
            <a href="#reviews">후기</a>
          </div>
          <section className="learner-section" id="learn">
            <h2>이런 걸 배워요</h2>
            <div className="learner-highlight-list">
              {learnerHighlights.map((item) => (
                <p key={item}>
                  <Check />
                  {item}
                </p>
              ))}
            </div>
          </section>
          <section className="learner-section" id="curriculum">
            <h2>커리큘럼</h2>
            {hasCustomContent ? (
              <p className="curriculum-empty">상세 커리큘럼은 강의자가 준비한 뒤 안내해 드려요.</p>
            ) : (
              <div className="learner-curriculum">
                {learnerCurriculum.map(([step, lessonTitle, desc, time]) => (
                  <article key={step}>
                    <i>{step}</i>
                    <span>
                      <b>{lessonTitle}</b>
                      <small>{desc}</small>
                    </span>
                    <em>{time}</em>
                  </article>
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
              <strong>
                <Star fill="currentColor" />
                {reviewAverage}
                <small>{reviews.length}개</small>
              </strong>
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
                <b>아직 등록된 후기가 없어요.</b>
                <p>첫 수강 후기를 기다리고 있어요.</p>
              </div>
            )}
          </section>
        </section>
        <aside className="learner-apply-side">
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
              {error && <p className="form-error">{error}</p>}
              <button className="primary" onClick={resumeLearning}>
                {canEnterLearnerRoom(existing) ? '바로 이어보기' : '신청 상태 확인하기'}
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => setShowNewApplication(true)}
              >
                다른 정보로 신청하기
              </button>
            </section>
          ) : (
            <form className="learner-card learner-apply-card" onSubmit={submit}>
              <div className="learner-card-head">
                <span>{disabled ? '모집 마감' : '수강 신청'}</span>
                <b>{priceText}</b>
                <small>현재 {capacityText} 신청</small>
              </div>
              <label>
                이름
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                />
              </label>
              <label>
                휴대전화 번호
                <input
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="010-0000-0000"
                />
              </label>
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
                  type="checkbox"
                  checked={form.privacyConsent}
                  onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })}
                />{' '}
                개인정보 수집 및 수강 안내 발송에 동의해요
              </label>
              {share?.paymentType === 'PAID' && (
                <label className="learner-check">
                  <input
                    type="checkbox"
                    checked={form.paymentConsent}
                    onChange={(e) => setForm({ ...form, paymentConsent: e.target.checked })}
                  />{' '}
                  결제 및 환불 안내를 확인했어요
                </label>
              )}
              <div className="entry-note">
                <LockKeyhole /> {applyGuide}
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" disabled={submitting || disabled}>
                {applyButtonText}
              </button>
            </form>
          )}
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
    ? '신청이 완료됐어요.'
    : isPaymentPending(enrollment)
      ? '결제만 완료하면 수강할 수 있어요.'
      : isApprovalPending(enrollment)
        ? '강의자 확인을 기다리고 있어요.'
        : '신청 상태를 확인하고 있어요.';
  const description = canEnterLearnerRoom(enrollment)
    ? '지금 바로 강의를 시작할 수 있어요.'
    : isPaymentPending(enrollment)
      ? '신청 정보는 저장됐어요.'
      : isApprovalPending(enrollment)
        ? '승인되면 문자로 안내드릴게요.'
        : '신청 상태가 변경되면 이 화면에서 확인할 수 있어요.';

  return (
    <div className="learner-shell learner-verify">
      <section className="learner-card verify-card enrollment-complete-card">
        {canEnterLearnerRoom(enrollment) ? (
          <CheckCircle2 />
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
              : '수강 가능'}
        </span>
        <h1>{heading}</h1>
        <p>{description}</p>
        <div className="completion-summary">
          <b>{title}</b>
          <small>{enrollment.learnerName}님 신청 정보로 수강권을 확인해요.</small>
        </div>
        {error && <p className="form-error">{error}</p>}
        {canEnterLearnerRoom(enrollment) && (
          <button className="primary" onClick={enterRoom}>
            강의실 입장하기
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
  const [activeLessonIndex, setActiveLessonIndex] = useState(defaultResumeLessonIndex);
  const [playing, setPlaying] = useState(false);
  const toolPanelRef = useRef<HTMLElement | null>(null);
  const publishedDraft = loadClassPreview(id, initialClassDraft);
  const draft = publishedDraft.title ? publishedDraft : loadClassDraft(initialClassDraft);
  const hasCustomCourse = Boolean(publishedDraft.title);
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
          const nextIndex = Math.max(
            0,
            nextRoom.lessons.findIndex((lesson) => !lesson.completed && !lesson.locked),
          );
          setActiveLessonIndex(nextIndex);
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
      setError('');
      setSent(true);
      return;
    }
    if (verificationCode.replace(/\D/g, '').length < 6)
      return setError('문자로 받은 6자리 인증번호를 입력해 주세요.');
    setError('');
    const next = await oneclickService.continueWithPhone(id, phone);
    setEnrollment(next);
    setRoom({
      ...next,
      courseTitle: draft.title || '노션으로 시작하는 업무 자동화',
      courseSummary: draft.summary || '반복 업무를 자동화하는 실전 4주 과정',
      lessons: hasCustomCourse ? [] : fallbackLearnerLessons(),
      tools: hasCustomCourse
        ? { noticeCount: 0, resourceCount: 0, examCount: 0, surveyCount: 0 }
        : { noticeCount: 1, resourceCount: 3, examCount: 1, surveyCount: 1 },
    });
    setActiveLessonIndex(defaultResumeLessonIndex);
    setPlaying(true);
  };
  const lessons = room?.lessons?.length
    ? room.lessons
    : hasCustomCourse
      ? []
      : fallbackLearnerLessons();
  const tools = room?.tools ?? { noticeCount: 1, resourceCount: 3, examCount: 1, surveyCount: 1 };
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
              인증번호를 보냈어요. 문자를 받지 못했다면 잠시 후 다시 요청해 주세요.
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="primary" onClick={() => void continueLearning()}>
            {sent ? '확인하고 이어보기' : '인증번호 받기'}
          </button>
          <button className="secondary" onClick={() => nav(`/s/notion-auto`)}>
            처음 신청하기
          </button>
        </section>
      </div>
    );
  }
  if (
    enrollment.applyStatusCd === 'APPLY_STATUS::001' ||
    enrollment.applyStatusCd === 'APPLY_STATUS::004'
  ) {
    const pendingTitle =
      enrollment.applyStatusCd === 'APPLY_STATUS::004'
        ? '결제 확인이 필요해요.'
        : '신청 승인 대기 중이에요.';
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
          <p>수강권이 활성화되면 같은 링크에서 바로 강의실로 입장할 수 있어요.</p>
          {error && <p className="form-error">{error}</p>}
          <button
            className="primary"
            disabled={checkingStatus}
            onClick={() => void refreshLearnerStatus()}
          >
            {checkingStatus ? '확인 중...' : '상태 다시 확인'}
          </button>
          <button className="secondary" onClick={() => nav(`/s/notion-auto`)}>
            신청 페이지 보기
          </button>
        </section>
      </div>
    );
  }
  const courseShareToken =
    enrollment.shareToken || room?.shareToken || shareTokenFromCourseActiveSeq(id);
  if (!lessons.length) {
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
            <p>첫 강의가 등록되면 신청 정보로 안내해 드릴게요.</p>
            <button className="primary" onClick={() => nav(`/s/${courseShareToken}`)}>
              강의 정보 보기
            </button>
          </section>
        </main>
      </div>
    );
  }
  const activeLesson = lessons[activeLessonIndex] ?? lessons[0];
  const activeProgress = activeLesson.progress ?? enrollment.progress;
  const openTool = (tool: 'notice' | 'resource' | 'assessment' | 'review') => {
    setActiveTool(tool);
    setToolMessage('');
    window.setTimeout(
      () => toolPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      50,
    );
  };
  const markToolAction = (message: string) => {
    setToolMessage(message);
  };
  const downloadResource = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setToolMessage('자료 다운로드를 시작했어요.');
  };
  const resumeLesson = (index = defaultResumeLessonIndex) => {
    const locked = lessons[index]?.locked;
    if (locked) return;
    setActiveLessonIndex(index);
    setPlaying((prev) => (index === activeLessonIndex ? !prev : true));
    const lesson = lessons[index];
    if (lesson && enrollment.courseApplySeq) {
      void oneclickService.heartbeat(id, {
        courseApplySeq: enrollment.courseApplySeq,
        lessonId: lesson.lessonId,
        currentSeconds: lesson.currentSeconds ?? 0,
        playing: true,
      });
    }
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
    if (!window.confirm('작성한 후기를 삭제할까요?')) return;
    setReviewSaving(true);
    try {
      await oneclickService.removeReview(id);
      setReview(null);
      setReviewRating(0);
      setReviewContent('');
      setToolMessage('후기를 삭제했어요.');
    } catch {
      setToolMessage('후기를 삭제하지 못했어요.');
    } finally {
      setReviewSaving(false);
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
      <main className="learner-room-grid">
        <section className="learner-room-main">
          <div className="learner-player">
            <button
              aria-label={playing ? '강의 재생 중' : '강의 이어보기'}
              onClick={() => resumeLesson(activeLessonIndex)}
            >
              <Play fill="currentColor" />
            </button>
            <div className="learner-player-meta">
              <small>{playing ? '재생 중' : '이어보기 대기'}</small>
              <b>
                {activeLessonIndex + 1}강. {activeLesson.title}
              </b>
              <span>
                {activeLesson.durationText} · {activeProgress}% 지점
              </span>
            </div>
          </div>
          <section className="learner-section learner-progress-card">
            <span>수강 중</span>
            <h1>{title}</h1>
            <p>
              이전 위치: {activeLessonIndex + 1}강{' '}
              {enrollment.lastPosition.replace(/^\d+강\s*/, '')}
            </p>
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
                  {tools.surveyCount + tools.examCount
                    ? `참여 항목 ${tools.surveyCount + tools.examCount}개`
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
                <article className="learner-tool-item">
                  <span>필독</span>
                  <div>
                    <b>수강 전 확인해 주세요</b>
                    <p>강의 자료와 실습 파일은 각 강의 시작 전에 순서대로 열립니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markToolAction('공지사항을 읽음으로 표시했어요.')}
                  >
                    읽음 표시
                  </button>
                </article>
                <article className="learner-tool-item">
                  <span>안내</span>
                  <div>
                    <b>질문은 강의 자료실 안내를 먼저 확인해 주세요</b>
                    <p>반복 질문은 공지에 계속 업데이트됩니다.</p>
                  </div>
                  <button type="button" onClick={() => markToolAction('안내 내용을 확인했어요.')}>
                    확인
                  </button>
                </article>
              </>
            )}
            {activeTool === 'resource' && (
              <>
                <h2>자료실</h2>
                <article className="learner-tool-item">
                  <span>PDF</span>
                  <div>
                    <b>1강 업무 구조 체크리스트</b>
                    <p>강의 전에 현재 업무 흐름을 정리하는 자료입니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markToolAction('1강 업무 구조 체크리스트를 열었어요.')}
                  >
                    열기
                  </button>
                </article>
                <article className="learner-tool-item">
                  <span>템플릿</span>
                  <div>
                    <b>자동화 실습 템플릿</b>
                    <p>2강에서 사용할 버튼, 알림, 상태 변경 예제입니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadResource(
                        'oneclick-automation-template.txt',
                        '원클릭 클래스 자동화 실습 템플릿\\n\\n1. 업무 상태를 정의합니다.\\n2. 반복 입력을 찾습니다.\\n3. 버튼과 알림 흐름을 설계합니다.',
                      )
                    }
                  >
                    다운로드
                  </button>
                </article>
              </>
            )}
            {activeTool === 'assessment' && (
              <>
                <h2>설문·시험</h2>
                <article className="learner-tool-item required">
                  <span>필수</span>
                  <div>
                    <b>수강 전 설문</b>
                    <p>현재 업무 자동화 경험을 확인해 강의 예제를 추천해요.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      nav(`/learn/survey/take?returnTo=${encodeURIComponent(`/learn/${id}`)}`)
                    }
                  >
                    참여하기
                  </button>
                </article>
                <article className="learner-tool-item">
                  <span>퀴즈</span>
                  <div>
                    <b>1강 학습 확인</b>
                    <p>업무 구조를 제대로 정리했는지 가볍게 확인합니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      nav(`/learn/exam/take?returnTo=${encodeURIComponent(`/learn/${id}`)}`)
                    }
                  >
                    풀기
                  </button>
                </article>
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
                      onClick={() => void removeReview()}
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
          {lessons.map((lesson, index) => {
            const done = lesson.completed;
            const locked = lesson.locked || !lesson.playable;
            return (
              <button
                className={`learner-lesson ${done ? 'done' : ''} ${locked ? 'locked' : ''} ${activeLessonIndex === index ? 'active' : ''}`}
                disabled={locked}
                onClick={() => resumeLesson(index)}
                key={lesson.lessonId}
              >
                <span>{done ? <CheckCircle2 /> : locked ? <LockKeyhole /> : index + 1}</span>
                <b>
                  {lesson.title}
                  <small>
                    <Clock3 size={14} />
                    {lesson.durationText} · {lesson.progress}%
                  </small>
                </b>
                {!locked && <Play size={18} />}
              </button>
            );
          })}
          <div className="learner-room-note">
            <CalendarDays /> 다음 강의 알림은 신청 정보 기준으로 안내돼요.
          </div>
        </aside>
      </main>
    </div>
  );
}

function ClassPublicPage({ preview = false }: { preview?: boolean }) {
  const nav = useNavigate();
  const { id = 'notion' } = useParams();
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const draft = preview
    ? loadClassPreview(id, initialClassDraft)
    : loadClassDraft(initialClassDraft);
  const hasSavedPreview = preview && Boolean(draft.title);
  const title = draft.title || '노션으로 시작하는 업무 자동화';
  const summary = draft.summary || '반복 업무를 자동화하는 실전 4주 과정';
  const description =
    draft.description ||
    '데이터베이스 설계부터 반복 업무 자동화, 팀 협업 템플릿까지 4주 동안 직접 만들며 배웁니다.';
  const location =
    draft.type === 'offline' || draft.type === 'hybrid'
      ? [draft.address, draft.detailedAddress].filter(Boolean).join(' ')
      : draft.url || 'ZOOM 온라인';
  const publish = async () => {
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
                    disabled={publishing}
                    onClick={() => void publish()}
                  >
                    {publishing ? '공개 중...' : '공개하고 링크 복사'}
                  </button>
                </div>
                {publishError && <p className="form-error">{publishError}</p>}
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
                <span>{hasSavedPreview ? '준비 전' : '3개 섹션'}</span>
              </div>
              {hasSavedPreview ? (
                <p className="curriculum-empty">
                  공개 후 강의 관리에서 커리큘럼을 추가할 수 있어요.
                </p>
              ) : (
                [
                  ['1', '노션 데이터베이스 설계', '45분', true],
                  ['2', '반복 업무 자동화', '52분', false],
                  ['3', '팀 협업 템플릿', '48분', false],
                ].map(([n, t, time, done]) => (
                  <button className={`student-lesson ${done ? 'done' : ''}`} key={String(n)}>
                    <span>{done ? <CheckCircle2 /> : n}</span>
                    <b>
                      {t}
                      <small>
                        <Clock3 size={14} />
                        {time}
                      </small>
                    </b>
                    <Play size={18} />
                  </button>
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
                  일정<b>{draft.startDate || '자유 수강'}</b>
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
              <b>{draft.payment === 'paid' ? `${draft.price.toLocaleString()}원` : '무료'}</b>
            </div>
            <i />
            <div>
              <small>모집 현황</small>
              <b>0 / {draft.capacity}명</b>
            </div>
          </div>
          <section>
            <h3>소개</h3>
            <p>{description}</p>
          </section>
          <section>
            <h3>커리큘럼</h3>
            {hasSavedPreview ? (
              <p className="curriculum-empty">공개 후 강의 관리에서 커리큘럼을 추가할 수 있어요.</p>
            ) : (
              [
                ['1', '노션 데이터베이스 설계', '업무에 맞는 구조를 직접 만들어요'],
                ['2', '반복 업무 자동화', '버튼과 연결 도구로 시간을 줄여요'],
                ['3', '팀 협업 템플릿', '함께 쓰는 시스템으로 완성해요'],
              ].map((c) => (
                <div className="curriculum" key={c[0]}>
                  <i>{c[0]}</i>
                  <span>
                    <b>{c[1]}</b>
                    <small>{c[2]}</small>
                  </span>
                </div>
              ))
            )}
          </section>
          <section>
            <h3>일정 · 장소</h3>
            <div className="schedule-card">
              <p>
                <span>일정</span>
                <b>{draft.startDate || '일정 미정'}</b>
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
            <button className="primary" disabled={publishing} onClick={() => void publish()}>
              {publishing ? '공개 중...' : '공개하기'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
