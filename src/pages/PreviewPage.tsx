import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Play, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { initialClassDraft } from '../constants/classDraft';
import { loadClassDraft } from '../utils/classDraft';

export function PreviewPage() {
  return <ClassPublicPage preview />;
}

export function StudentClassPage() {
  return <ClassPublicPage />;
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
