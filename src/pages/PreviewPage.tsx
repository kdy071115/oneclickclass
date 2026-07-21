import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  LockKeyhole,
  Megaphone,
  Play,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { oneclickService, type OneClickEnrollment, type OneClickLearnRoom, type OneClickLesson, type OneClickShare } from '../api/services';
import { initialClassDraft } from '../constants/classDraft';
import { loadClassDraft } from '../utils/classDraft';

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

const fallbackLearnerLessons = (): OneClickLesson[] => learnerCurriculum.map(([lessonId, title, description, durationText], index) => ({
  lessonId,
  title,
  description,
  durationText,
  progress: learnerLessonProgress[index],
  locked: index >= 2,
  completed: learnerLessonProgress[index] >= 100,
  playable: index < 2,
}));

const learnerReviews = [
  ['김서연', '실제 업무에 바로 활용할 수 있어서 좋았어요. 신청부터 수강까지 막히는 부분이 없었습니다.'],
  ['이준호', '예제가 구체적이고 설명이 쉬워서 초반 진입 장벽이 낮았어요.'],
];

const isValidCourseId = (value?: string) => Boolean(value && value !== 'undefined' && value !== 'null');

export function PreviewPage() {
  return <ClassPublicPage preview />;
}

export function StudentClassPage() {
  return <ClassPublicPage />;
}

export function PublicEnrollmentPage() {
  const nav = useNavigate();
  const { shareToken = 'notion-auto' } = useParams();
  const draft = loadClassDraft(initialClassDraft);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [share, setShare] = useState<OneClickShare>();
  const [existing, setExisting] = useState<OneClickEnrollment | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let alive = true;
    oneclickService.share(shareToken).then((nextShare) => {
      if (!alive) return;
      setShare(nextShare);
      void oneclickService.enrollment(nextShare.courseActiveSeq).then((enrollment) => {
        if (alive) setExisting(enrollment);
      });
    }).catch(() => alive && setError('신청 링크를 확인하지 못했어요.'));
    return () => { alive = false; };
  }, [shareToken]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!share) return setError('신청 링크를 확인하는 중이에요.');
    if (!form.name.trim()) return setError('이름을 입력해 주세요.');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('휴대전화 번호를 확인해 주세요.');
    setSubmitting(true);
    setError('');
    try {
      const enrollment = await oneclickService.apply(shareToken, { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined });
      const courseActiveSeq = enrollment.courseActiveSeq || share.courseActiveSeq;
      if (!isValidCourseId(courseActiveSeq)) throw new Error('missing course id');
      nav(`/learn/${courseActiveSeq}`, { replace: true });
    } catch {
      setError('신청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };
  const title = share?.title || draft.title || '노션으로 시작하는 업무 자동화';
  const summary = share?.summary || draft.summary || '반복 업무를 자동화하는 실전 4주 과정';
  const priceText = share?.paymentType === 'PAID' ? `${share.price.toLocaleString()}원` : '무료';
  const capacityText = share ? `${share.enrolled} / ${share.capacity}명` : `0 / ${draft.capacity}명`;
  const disabled = share?.applyStatus === 'CLOSED';
  const resumeCourseActiveSeq = existing?.courseActiveSeq || share?.courseActiveSeq;
  const resumeLearning = () => {
    if (isValidCourseId(resumeCourseActiveSeq)) {
      nav(`/learn/${resumeCourseActiveSeq}`);
      return;
    }
    setError('수강 링크를 다시 확인해 주세요.');
  };
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
              <span className="learner-badge">모집중</span>
              <h1>{title}</h1>
              <p>{summary}</p>
              <div className="learner-quick-stats">
                <span><b>{learnerCurriculum.length}개</b><small>핵심 챕터</small></span>
                <span><b>초급</b><small>난이도</small></span>
                <span><b>{share?.scheduleText || '자유 수강'}</b><small>수강 방식</small></span>
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
                <p key={item}><Check />{item}</p>
              ))}
            </div>
          </section>
          <section className="learner-section" id="curriculum">
            <h2>커리큘럼</h2>
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
          </section>
          <section className="learner-section" id="reviews">
            <h2>수강생 후기</h2>
            <div className="learner-review-grid">
              {learnerReviews.map(([name, review]) => (
                <article key={name}>
                  <b>★★★★★</b>
                  <p>{review}</p>
                  <small>{name}</small>
                </article>
              ))}
            </div>
          </section>
        </section>
        <aside className="learner-apply-side">
          {existing ? (
            <section className="learner-card learner-continue-card">
              <ShieldCheck />
              <h2>{existing.learnerName}님, 이어서 볼까요?</h2>
              <p>이전 위치: {existing.lastPosition}</p>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" onClick={resumeLearning}>바로 이어보기</button>
            </section>
          ) : (
            <form className="learner-card learner-apply-card" onSubmit={submit}>
              <div className="learner-card-head">
                <span>{disabled ? '모집 마감' : '수강 신청'}</span>
                <b>{priceText}</b>
                <small>현재 {capacityText} 신청</small>
              </div>
              <label>이름<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름을 입력하세요" /></label>
              <label>휴대전화 번호<input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" /></label>
              <label>이메일 <small>선택</small><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" /></label>
              <div className="entry-note"><LockKeyhole /> 신청 정보로 자동 수강권과 이어보기 세션을 만들어요.</div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" disabled={submitting || disabled}>{disabled ? '신청 마감' : submitting ? '신청 처리 중...' : '신청하고 바로 입장'}</button>
            </form>
          )}
        </aside>
      </main>
    </div>
  );
}

export function LearnerRoomPage() {
  const nav = useNavigate();
  const { id = 'notion' } = useParams();
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [room, setRoom] = useState<OneClickLearnRoom | null>();
  const [enrollment, setEnrollment] = useState<OneClickEnrollment | null>();
  const [error, setError] = useState('');
  const [activeTool, setActiveTool] = useState<'notice' | 'resource' | 'assessment'>('notice');
  const [activeLessonIndex, setActiveLessonIndex] = useState(defaultResumeLessonIndex);
  const [playing, setPlaying] = useState(false);
  const draft = loadClassDraft(initialClassDraft);
  const invalidCourseId = !isValidCourseId(id);
  useEffect(() => {
    let alive = true;
    if (invalidCourseId) {
      setRoom(null);
      setEnrollment(null);
      return () => { alive = false; };
    }
    oneclickService.learnRoom(id).then((nextRoom) => {
      if (!alive) return;
      setRoom(nextRoom);
      setEnrollment(nextRoom);
      if (nextRoom?.lessons?.length) {
        const nextIndex = Math.max(0, nextRoom.lessons.findIndex((lesson) => !lesson.completed && !lesson.locked));
        setActiveLessonIndex(nextIndex);
      }
    }).catch(() => {
      if (!alive) return;
      setError('수강실 정보를 불러오지 못했어요.');
      setRoom(null);
      setEnrollment(null);
    });
    return () => { alive = false; };
  }, [id, invalidCourseId]);
  const continueLearning = async () => {
    if (invalidCourseId) return nav('/s/notion-auto', { replace: true });
    if (!sent) return setSent(true);
    if (phone.replace(/\D/g, '').length < 10) return setError('휴대전화 번호를 확인해 주세요.');
    setError('');
    const next = await oneclickService.continueWithPhone(id, phone);
    setEnrollment(next);
    setRoom({
      ...next,
      courseTitle: draft.title || '노션으로 시작하는 업무 자동화',
      courseSummary: draft.summary || '반복 업무를 자동화하는 실전 4주 과정',
      lessons: fallbackLearnerLessons(),
      tools: { noticeCount: 1, resourceCount: 3, examCount: 1, surveyCount: 1 },
    });
    setActiveLessonIndex(defaultResumeLessonIndex);
    setPlaying(true);
  };
  const lessons = room?.lessons?.length ? room.lessons : fallbackLearnerLessons();
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
          <button className="primary" onClick={() => nav('/s/notion-auto', { replace: true })}>신청 페이지로 이동</button>
        </section>
      </div>
    );
  }
  if (enrollment === undefined) {
    return <div className="learner-shell learner-verify"><section className="learner-card verify-card"><Smartphone /><span>수강권 확인</span><h1>신청 정보를 확인하고 있어요.</h1></section></div>;
  }
  if (!enrollment) {
    return (
      <div className="learner-shell learner-verify">
        <section className="learner-card verify-card">
          <Smartphone />
          <span>다른 기기에서 이어보기</span>
          <h1>신청 정보를 확인하면 바로 이어서 볼 수 있어요.</h1>
          <p>로그인 대신 신청할 때 입력한 휴대전화 번호를 확인해요.</p>
          <label>휴대전화 번호<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" /></label>
          {sent && <label>인증번호<input inputMode="numeric" placeholder="데모 인증번호 123456" /></label>}
          {error && <p className="form-error">{error}</p>}
          <button className="primary" onClick={() => void continueLearning()}>{sent ? '확인하고 이어보기' : '인증번호 받기'}</button>
          <button className="secondary" onClick={() => nav(`/s/notion-auto`)}>처음 신청하기</button>
        </section>
      </div>
    );
  }
  if (enrollment.applyStatusCd === 'APPLY_STATUS::001' || enrollment.applyStatusCd === 'APPLY_STATUS::004') {
    const pendingTitle = enrollment.applyStatusCd === 'APPLY_STATUS::004' ? '결제 확인이 필요해요.' : '신청 승인 대기 중이에요.';
    return (
      <div className="learner-shell learner-verify">
        <section className="learner-card verify-card">
          <ShieldCheck />
          <span>수강권 확인</span>
          <h1>{pendingTitle}</h1>
          <p>수강권이 활성화되면 같은 링크에서 바로 강의실로 입장할 수 있어요.</p>
          <button className="primary" onClick={() => location.reload()}>다시 확인하기</button>
          <button className="secondary" onClick={() => nav(`/s/notion-auto`)}>신청 페이지 보기</button>
        </section>
      </div>
    );
  }
  const activeLesson = lessons[activeLessonIndex] ?? lessons[0];
  const activeProgress = activeLesson?.progress ?? enrollment.progress;
  const resumeLesson = (index = defaultResumeLessonIndex) => {
    const locked = lessons[index]?.locked;
    if (locked) return;
    setActiveLessonIndex(index);
    setPlaying(true);
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
  return (
    <div className="learner-shell learner-room-shell">
      <header className="learner-room-topbar">
        <b>원클릭 클래스</b>
        <span>{enrollment.learnerName}님</span>
      </header>
      <main className="learner-room-grid">
        <section className="learner-room-main">
          <div className="learner-player">
            <button aria-label={playing ? '강의 재생 중' : '강의 이어보기'} onClick={() => resumeLesson(activeLessonIndex)}><Play fill="currentColor" /></button>
            <div className="learner-player-meta">
              <small>{playing ? '재생 중' : '이어보기 대기'}</small>
              <b>{activeLessonIndex + 1}강. {activeLesson.title}</b>
              <span>{activeLesson.durationText} · {activeProgress}% 지점</span>
            </div>
          </div>
          <section className="learner-section learner-progress-card">
            <span>수강 중</span>
            <h1>{title}</h1>
            <p>이전 위치: {activeLessonIndex + 1}강 {enrollment.lastPosition.replace(/^\d+강\s*/, '')}</p>
            <div className="student-progress-head"><span>전체 진도</span><b>{enrollment.progress}%</b></div>
            <div className="oc-progress"><i style={{ width: `${enrollment.progress}%` }} /></div>
            <button className="learner-resume-button" onClick={() => resumeLesson()}>
              <Play size={18} fill="currentColor" />
              바로 이어보기
            </button>
          </section>
          <section className="learner-room-tools">
            <button className={activeTool === 'notice' ? 'active' : ''} type="button" onClick={() => setActiveTool('notice')}><Megaphone /><span><b>공지사항</b><small>{tools.noticeCount ? `새 공지 ${tools.noticeCount}개` : '확인할 공지 없음'}</small></span></button>
            <button className={activeTool === 'resource' ? 'active' : ''} type="button" onClick={() => setActiveTool('resource')}><FileText /><span><b>자료실</b><small>{tools.resourceCount ? `자료 ${tools.resourceCount}개` : '등록 자료 없음'}</small></span></button>
            <button className={activeTool === 'assessment' ? 'active' : ''} type="button" onClick={() => setActiveTool('assessment')}><ClipboardCheck /><span><b>설문·시험</b><small>{tools.surveyCount + tools.examCount ? `참여 항목 ${tools.surveyCount + tools.examCount}개` : '대기 항목 없음'}</small></span></button>
          </section>
          <section className="learner-section learner-tool-panel">
            {activeTool === 'notice' && (
              <>
                <h2>공지사항</h2>
                <article><b>수강 전 확인해 주세요</b><p>강의 자료와 실습 파일은 각 강의 시작 전에 순서대로 열립니다.</p></article>
              </>
            )}
            {activeTool === 'resource' && (
              <>
                <h2>자료실</h2>
                <article><b>실습 템플릿</b><p>강의 진행에 필요한 템플릿과 체크리스트를 여기에서 확인합니다.</p></article>
              </>
            )}
            {activeTool === 'assessment' && (
              <>
                <h2>설문·시험</h2>
                <article><b>학습 확인</b><p>현재 참여 가능한 항목은 {tools.surveyCount + tools.examCount}개입니다.</p></article>
              </>
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
              <button className={`learner-lesson ${done ? 'done' : ''} ${locked ? 'locked' : ''} ${activeLessonIndex === index ? 'active' : ''}`} disabled={locked} onClick={() => resumeLesson(index)} key={lesson.lessonId}>
                <span>{done ? <CheckCircle2 /> : locked ? <LockKeyhole /> : index + 1}</span>
                <b>{lesson.title}<small><Clock3 size={14} />{lesson.durationText} · {lesson.progress}%</small></b>
                {!locked && <Play size={18} />}
              </button>
            );
          })}
          <div className="learner-room-note"><CalendarDays /> 다음 강의 알림은 신청 정보 기준으로 안내돼요.</div>
        </aside>
      </main>
    </div>
  );
}

function ClassPublicPage({ preview = false }: { preview?: boolean }) {
  const nav = useNavigate();
  const { id = 'notion' } = useParams();
  const draft = loadClassDraft(initialClassDraft);
  const title = draft.title || '노션으로 시작하는 업무 자동화';
  const summary = draft.summary || '반복 업무를 자동화하는 실전 4주 과정';
  const description =
    draft.description ||
    '데이터베이스 설계부터 반복 업무 자동화, 팀 협업 템플릿까지 4주 동안 직접 만들며 배웁니다.';
  const location =
    draft.type === 'offline' || draft.type === 'hybrid'
      ? [draft.address, draft.detailedAddress].filter(Boolean).join(' ')
      : draft.url || 'ZOOM 온라인';
  return (
    <>
    <div className="student-class-web web-only">
      {preview ? <Link className="oc-back-link" to={`/classes/${id}`}><ArrowLeft size={16}/> 관리 화면으로 돌아가기</Link> : <Link className="oc-back-link" to="/classes"><ArrowLeft size={16}/> 클래스 목록</Link>}
      <section className="student-learning-hero">
        <div className="student-learning-cover">{draft.thumbnail ? <img src={draft.thumbnail} alt="클래스 썸네일"/> : <div><Play size={32}/><b>대표 썸네일</b></div>}</div>
        <div className="student-learning-copy"><span className="operation-status wait">{preview ? '신청 페이지 미리보기' : '수강 중'}</span><h1>{title}</h1><p>{summary}</p><div className="student-instructor"><i>지</i><span><b>이지훈 강사</b><small>누적 수강생 68명 · 만족도 4.9</small></span></div>{preview ? <div className="preview-publish-actions"><Link to="/classes/new?edit=1">수정하기</Link><Link className="student-continue" to="/classes/published">공개하고 링크 복사</Link></div> : <><div className="student-progress-head"><span>전체 진도</span><b>62%</b></div><div className="oc-progress"><i style={{width:'62%'}}/></div><button className="student-continue"><Play size={18} fill="currentColor"/> 2강 이어서 듣기</button></>}</div>
      </section>
      <div className="student-learning-layout"><main><section className="oc-panel"><div className="oc-panel-title"><h2>커리큘럼</h2><span>3개 섹션</span></div>{[['1','노션 데이터베이스 설계','45분',true],['2','반복 업무 자동화','52분',false],['3','팀 협업 템플릿','48분',false]].map(([n,t,time,done])=><button className={`student-lesson ${done?'done':''}`} key={String(n)}><span>{done?<CheckCircle2/>:n}</span><b>{t}<small><Clock3 size={14}/>{time}</small></b><Play size={18}/></button>)}</section><section className="oc-panel student-intro"><h2>클래스 소개</h2><p>{description}</p></section></main><aside><section className="oc-panel student-schedule"><h2>학습 정보</h2><p><CalendarDays/><span>일정<b>{draft.startDate||'자유 수강'}</b></span></p><p><UserRound/><span>수강 기간<b>4주</b></span></p><p><Play/><span>진행 방식<b>{location}</b></span></p></section></aside></div>
    </div>
    <div className={`preview-page exact-preview ${preview ? 'app-only' : 'app-only'}`}>
      {preview ? (
        <header>
          <button type="button" onClick={() => nav(`/classes/${id}`)} aria-label="관리 페이지로 돌아가기">
            <ArrowLeft />
            <b>미리보기</b>
          </button>
          <Link to="/classes/new?edit=1">수정하기</Link>
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
          {[
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
          ))}
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
      {preview && <div className="layout-fixed-action"><button className="primary" onClick={() => nav('/classes/published')}>공개하기</button></div>}
    </div>
    </>
  );
}
