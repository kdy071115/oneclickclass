import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="preview-page exact-preview">
      {preview ? (
        <header>
          <b>미리보기</b>
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
  );
}
