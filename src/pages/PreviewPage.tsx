import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, LockKeyhole, Play, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { oneclickService, type OneClickEnrollment, type OneClickShare } from '../api/services';
import { initialClassDraft } from '../constants/classDraft';
import { loadClassDraft } from '../utils/classDraft';

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
      nav(`/learn/${enrollment.courseActiveSeq}`, { replace: true });
    } catch {
      setError('신청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };
  const title = share?.title || draft.title || '노션으로 시작하는 업무 자동화';
  const summary = share?.summary || draft.summary || '반복 업무를 자동화하는 실전 4주 과정';
  return (
    <div className="page entry-page">
      <section className="entry-hero">
        <small>간편 신청 링크</small>
        <h1>{title}</h1>
        <p>{summary}</p>
        {share && <div className="entry-meta"><span>{share.paymentType === 'PAID' ? `${share.price.toLocaleString()}원` : '무료'}</span><span>{share.enrolled} / {share.capacity}명 신청</span></div>}
      </section>
      {existing ? (
        <section className="entry-continue">
          <ShieldCheck />
          <b>{existing.learnerName}님, 이어서 볼까요?</b>
          <small>이전 위치: {existing.lastPosition}</small>
          <button className="primary" onClick={() => nav(`/learn/${existing.courseActiveSeq}`)}>바로 이어보기</button>
        </section>
      ) : (
        <form className="entry-form" onSubmit={submit}>
          <h2>간편 신청</h2>
          <p>회원가입 절차 없이 신청 정보를 확인하고 바로 수강권을 만들어요.</p>
          <label>이름<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름을 입력하세요" /></label>
          <label>휴대전화 번호<input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" /></label>
          <label>이메일 <small>선택</small><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" /></label>
          <div className="entry-note"><LockKeyhole /> 입력한 정보는 LX2 수강권과 이어보기 확인에만 사용돼요.</div>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={submitting}>{submitting ? '신청 처리 중...' : '신청하고 바로 입장'}</button>
        </form>
      )}
    </div>
  );
}

export function LearnerRoomPage() {
  const nav = useNavigate();
  const { id = 'notion' } = useParams();
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [enrollment, setEnrollment] = useState<OneClickEnrollment | null>();
  const draft = loadClassDraft(initialClassDraft);
  useEffect(() => {
    let alive = true;
    oneclickService.enrollment(id).then((next) => {
      if (alive) setEnrollment(next);
    });
    return () => { alive = false; };
  }, [id]);
  const continueLearning = async () => {
    if (!sent) return setSent(true);
    const next = await oneclickService.continueWithPhone(id, phone);
    setEnrollment(next);
  };
  if (enrollment === undefined) {
    return <div className="page entry-page"><section className="entry-hero verify"><small>수강권 확인</small><h1>신청 정보를 확인하고 있어요.</h1></section></div>;
  }
  if (!enrollment) {
    return (
      <div className="page entry-page">
        <section className="entry-hero verify">
          <small>신청 정보로 이어보기</small>
          <h1>신청 정보를 확인하면 바로 이어서 볼 수 있어요.</h1>
          <p>로그인 대신 신청할 때 입력한 휴대전화 번호를 확인해요.</p>
        </section>
        <section className="entry-form">
          <label>휴대전화 번호<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" /></label>
          {sent && <label>인증번호<input inputMode="numeric" placeholder="데모 인증번호 123456" /></label>}
          <button className="primary" onClick={() => void continueLearning()}>{sent ? '확인하고 이어보기' : '인증번호 받기'}</button>
          <button className="secondary" onClick={() => nav(`/s/notion-auto`)}>처음 신청하기</button>
        </section>
      </div>
    );
  }
  return (
    <div className="page learn-room">
      <header>
        <span>원클릭 클래스</span>
        <b>{enrollment.learnerName}님</b>
      </header>
      <section className="learn-video">
        <Play fill="currentColor" />
        <small>2강 이어서 재생</small>
      </section>
      <section className="learn-summary">
        <h1>{draft.title || '노션으로 시작하는 업무 자동화'}</h1>
        <p>이전 위치: {enrollment.lastPosition}</p>
        <div className="student-progress-head"><span>전체 진도</span><b>{enrollment.progress}%</b></div>
        <div className="oc-progress"><i style={{ width: `${enrollment.progress}%` }} /></div>
      </section>
      <section className="learn-lessons">
        <h2>커리큘럼</h2>
        {[
          ['1', '노션 데이터베이스 설계', '45분', true],
          ['2', '반복 업무 자동화', '52분', false],
          ['3', '팀 협업 템플릿', '48분', false],
        ].map(([n, title, time, done]) => (
          <button className={`student-lesson ${done ? 'done' : ''}`} key={String(n)}>
            <span>{done ? <CheckCircle2 /> : n}</span>
            <b>{title}<small><Clock3 size={14} />{time}</small></b>
            <Play size={18} />
          </button>
        ))}
      </section>
      <section className="learn-card">
        <CalendarDays />
        <span>다음 강의 알림은 신청 정보 기준으로 안내돼요.</span>
      </section>
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
    {!preview && <div className="student-class-web web-only">
      <Link className="oc-back-link" to="/classes"><ArrowLeft size={16}/> 클래스 목록</Link>
      <section className="student-learning-hero">
        <div className="student-learning-cover">{draft.thumbnail ? <img src={draft.thumbnail} alt="클래스 썸네일"/> : <div><Play size={32}/><b>대표 썸네일</b></div>}</div>
        <div className="student-learning-copy"><span className="operation-status wait">수강 중</span><h1>{title}</h1><p>{summary}</p><div className="student-instructor"><i>지</i><span><b>이지훈 강사</b><small>누적 수강생 68명 · 만족도 4.9</small></span></div><div className="student-progress-head"><span>전체 진도</span><b>62%</b></div><div className="oc-progress"><i style={{width:'62%'}}/></div><button className="student-continue"><Play size={18} fill="currentColor"/> 2강 이어서 듣기</button></div>
      </section>
      <div className="student-learning-layout"><main><section className="oc-panel"><div className="oc-panel-title"><h2>커리큘럼</h2><span>3개 섹션</span></div>{[['1','노션 데이터베이스 설계','45분',true],['2','반복 업무 자동화','52분',false],['3','팀 협업 템플릿','48분',false]].map(([n,t,time,done])=><button className={`student-lesson ${done?'done':''}`} key={String(n)}><span>{done?<CheckCircle2/>:n}</span><b>{t}<small><Clock3 size={14}/>{time}</small></b><Play size={18}/></button>)}</section><section className="oc-panel student-intro"><h2>클래스 소개</h2><p>{description}</p></section></main><aside><section className="oc-panel student-schedule"><h2>학습 정보</h2><p><CalendarDays/><span>일정<b>{draft.startDate||'자유 수강'}</b></span></p><p><UserRound/><span>수강 기간<b>4주</b></span></p><p><Play/><span>진행 방식<b>{location}</b></span></p></section></aside></div>
    </div>}
    <div className={`preview-page exact-preview ${preview ? '' : 'app-only'}`}>
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
    </div>
    </>
  );
}
