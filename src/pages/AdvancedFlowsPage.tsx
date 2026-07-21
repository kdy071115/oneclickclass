import {
  Check,
  ChevronRight,
  CircleCheck,
  Eye,
  Link2,
  Minus,
  Plus,
  QrCode,
  Share2,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';

const people = [
  ['김', '김서연', 92],
  ['이', '이준호', 78],
  ['박', '박민지', 88],
  ['최', '최유진', 64],
  ['정', '정하늘', 55],
] as const;
const questions = [
  [
    '노션 데이터베이스의 핵심 구성 요소는?',
    ['페이지와 속성', '폴더와 파일', '셀과 시트', '슬라이드와 도형'],
    0,
  ],
  [
    '반복 업무를 자동화할 때 가장 먼저 할 일은?',
    ['도구 구매', '반복 과정 정의', '팀원 채용', '디자인 변경'],
    1,
  ],
  [
    '자동화 결과를 점검하는 가장 좋은 방법은?',
    ['한 번에 배포', '작은 범위로 테스트', '설명서 생략', '권한 전체 공개'],
    1,
  ],
] as const;

export function ExamResultPage() {
  const { id = 'notion' } = useParams();
  return (
    <div className="page subpage">
      <PageHeader title="최종 수료 시험" subtitle="응시 19명 · 합격 기준 70점" backTo={`/classes/${id}/exams`} />
      <div className="score-overview">
        <div>
          <b>82</b>
          <small>평균 점수</small>
        </div>
        <div>
          <b>14</b>
          <small>합격</small>
        </div>
        <div>
          <b>5</b>
          <small>불합격</small>
        </div>
      </div>
      <Link className="soft-primary" to={`/classes/${id}/exam-builder`}>
        문항 수정
      </Link>
      <h3>응시자 결과</h3>
      {people.map(([initial, name, score], i) => (
        <Link className="score-row" to={`/classes/${id}/exams/final/${i}`} key={name}>
          <i>{initial}</i>
          <span>
            <b>{name}</b>
            <small>제출 완료</small>
          </span>
          <strong className={score < 70 ? 'fail' : ''}>{score}점</strong>
          <em>{score >= 70 ? '합격' : '불합격'}</em>
          <ChevronRight />
        </Link>
      ))}
    </div>
  );
}
export function ExamTakerPage() {
  const { id = 'notion' } = useParams();
  return (
    <div className="page subpage">
      <PageHeader title="" backTo={`/classes/${id}/exams/final`} />
      <div className="taker-profile">
        <i>김</i>
        <span>
          <h2>김서연</h2>
          <small>최종 수료 시험 · 7월 14일 제출</small>
        </span>
        <strong>
          92<small>점</small>
        </strong>
      </div>
      <div className="answer-summary">
        <div>
          <b>9</b>
          <small>맞은 문제</small>
        </div>
        <div>
          <b>1</b>
          <small>틀린 문제</small>
        </div>
      </div>
      {questions.map(([text, choices, answer], i) => (
        <article className="answer-card" key={text}>
          <header>
            <span>문제 {i + 1}</span>
            <em>{i === 2 ? '오답' : '정답'}</em>
          </header>
          <b>{text}</b>
          {choices.map((choice, j) => (
            <p
              className={j === answer ? 'correct' : j === 0 && i === 2 ? 'wrong' : ''}
              key={choice}
            >
              <i>{j === answer ? <Check /> : String.fromCharCode(65 + j)}</i>
              {choice}
              {j === answer && <em>정답</em>}
              {j === 0 && i === 2 && <em>선택</em>}
            </p>
          ))}
        </article>
      ))}
    </div>
  );
}

export function CertificateSetupPage() {
  const { id = 'notion' } = useParams();
  const [attendance, setAttendance] = useState(80);
  const [score, setScore] = useState(70);
  const [auto, setAuto] = useState(true);
  const [color, setColor] = useState('#3182f6');
  return (
    <div className="page subpage certificate-setup">
      <PageHeader title="수료증 설정" subtitle="발급 조건과 증서 내용을 직접 정해요" backTo={`/classes/${id}/certificates`} />
      <h3>발급 조건</h3>
      <Stepper
        label="최소 출석률"
        value={`${attendance}%`}
        down={() => setAttendance(Math.max(50, attendance - 5))}
        up={() => setAttendance(Math.min(100, attendance + 5))}
      />
      <Stepper
        label="최소 시험 점수"
        value={`${score}점`}
        down={() => setScore(Math.max(0, score - 5))}
        up={() => setScore(Math.min(100, score + 5))}
      />
      <button className="auto-issue" onClick={() => setAuto(!auto)}>
        <span>
          <b>자동 발급 대기 등록</b>
          <small>조건 충족 시 자동으로 대기 목록에 추가</small>
        </span>
        <i className={auto ? 'on' : ''}>
          <em />
        </i>
      </button>
      <h3>수료증 내용</h3>
      <label className="field-label">
        증서 문구
        <textarea defaultValue="위 사람은 본 과정을 성실히 이수하였기에 이 수료증을 수여합니다." />
      </label>
      <label className="field-label">
        발급 기관 · 서명
        <input defaultValue="원클릭 클래스 · 이지훈 강사" />
      </label>
      <h3>테두리 색상</h3>
      <div className="cert-colors">
        {['#3182f6', '#7048e8', '#12b886', '#f59f00', '#191f28'].map((c) => (
          <button
            style={{ background: c }}
            className={color === c ? 'active' : ''}
            onClick={() => setColor(c)}
            key={c}
          >
            {color === c && <Check />}
          </button>
        ))}
      </div>
      <button className="soft-primary">
        <Eye />
        수료증 미리보기
      </button>
      <button className="primary">저장하기</button>
    </div>
  );
}
function Stepper({
  label,
  value,
  down,
  up,
}: {
  label: string;
  value: string;
  down: () => void;
  up: () => void;
}) {
  return (
    <div className="cert-stepper">
      <b>{label}</b>
      <span>
        <button onClick={down}>
          <Minus />
        </button>
        <strong>{value}</strong>
        <button onClick={up}>
          <Plus />
        </button>
      </span>
    </div>
  );
}

export function AttendPickerPage() {
  const today = ['notion', '노션으로 시작하는 업무 자동화', '오후 8:00', '2회차', '24'];
  const others = [
    ['calligraphy', '주말 원데이 캘리그라피 클래스', '1회차', '15'],
    ['branding', '나만의 브랜드 만들기', '3회차', '20'],
  ];
  return (
    <div className="page subpage attendance-picker">
      <PageHeader
        title="어떤 강의의 출석을 받을까요?"
        subtitle="오늘 진행하는 강의를 선택하면 QR이 열려요"
        backTo="/classes"
      />
      <div className="picker-label today">오늘 강의</div>
      <Link className="pick-class today-card" to={`/classes/${today[0]}/attendance/qr`}>
        <i />
        <span>
          <em>오늘 {today[2]}</em>
          <b>{today[1]}</b>
          <small>
            {today[3]} · 수강생 {today[4]}명
          </small>
        </span>
        <ChevronRight />
      </Link>
      <div className="picker-label">진행중인 다른 강의</div>
      {others.map((c, i) => (
        <Link className="pick-class" to={`/classes/${c[0]}/attendance/qr`} key={c[0]}>
          <i className={i ? 'purple' : 'green'} />
          <span>
            <b>{c[1]}</b>
            <small>
              {c[2]} · 수강생 {c[3]}명
            </small>
          </span>
          <ChevronRight />
        </Link>
      ))}
    </div>
  );
}

export function StudentFlowPage() {
  const path = useLocation().pathname;
  const exam = path.includes('/exam/');
  const result = path.endsWith('/done') || path.endsWith('/result');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number>();
  const [text, setText] = useState('');
  const survey = [
    { text: '강의 전반에 만족하시나요?', type: 'choice' },
    { text: '강사의 설명은 이해하기 쉬웠나요?', type: 'rating' },
    { text: '가장 좋았던 점을 알려주세요', type: 'text' },
  ] as const;
  if (result)
    return (
      <div className="page flow-result">
        {exam ? <Trophy /> : <CircleCheck />}
        <h1>{exam ? '시험을 완료했어요!' : '설문 응답이 제출됐어요'}</h1>
        <p>{exam ? '총점 80점으로 합격했어요.' : '소중한 의견 감사합니다.'}</p>
        {exam && (
          <div className="result-ring">
            <b>80</b>
            <small>점</small>
          </div>
        )}
        <Link className="primary" to="/">
          확인
        </Link>
      </div>
    );
  const total = exam ? questions.length : survey.length;
  const current = exam ? { text: questions[index][0], type: 'choice' as const } : survey[index];
  const choices = exam ? questions[index][1] : ['매우 만족', '만족', '보통', '아쉬워요'];
  const disabled = current.type === 'text' ? !text.trim() : answer === undefined;
  return (
    <div className="page student-flow">
      <header>
        <button onClick={() => history.back()}>‹</button>
        <b>{exam ? '최종 수료 시험' : '강의 만족도 설문'}</b>
        <Link to="/">닫기</Link>
      </header>
      <div className="flow-progress">
        <i style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <small className="flow-count">
        {index + 1} / {total}
      </small>
      <h1>{current.text}</h1>
      {current.type === 'choice' && (
        <div className="choice-list">
          {choices.map((c, i) => (
            <button className={answer === i ? 'active' : ''} onClick={() => setAnswer(i)} key={c}>
              <i>{exam ? String.fromCharCode(65 + i) : i + 1}</i>
              {c}
            </button>
          ))}
        </div>
      )}
      {current.type === 'rating' && (
        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button onClick={() => setAnswer(n)} className={(answer ?? 0) >= n ? 'on' : ''} key={n}>
              <Star fill="currentColor" />
            </button>
          ))}
        </div>
      )}
      {current.type === 'text' && (
        <textarea
          className="student-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="자유롭게 의견을 남겨주세요"
        />
      )}
      <button
        className="primary flow-cta"
        disabled={disabled}
        onClick={() => {
          setAnswer(undefined);
          setText('');
          setIndex(Math.min(index + 1, total - 1));
        }}
      >
        {index === total - 1 ? <Link to={exam ? 'result' : 'done'}>제출하기</Link> : '다음'}
      </button>
    </div>
  );
}
export function PublishDonePage() {
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const link = 'https://oneclick.class/s/notion-auto';
  const confetti = [
    ['8%', '#3182f6', '2.4s', '0s'],
    ['24%', '#12b886', '2.7s', '.3s'],
    ['44%', '#f59f00', '2.2s', '.6s'],
    ['63%', '#e64980', '2.9s', '.15s'],
    ['82%', '#7048e8', '2.5s', '.45s'],
    ['92%', '#3182f6', '2.6s', '.8s'],
  ];
  const notify = (message: string) => {
    setToast('');
    requestAnimationFrame(() => setToast(message));
    window.setTimeout(() => setToast(''), 2000);
  };
  const copy = () => {
    setCopied(true);
    notify('신청 링크를 복사했어요');
    void navigator.clipboard?.writeText(link).catch(() => undefined);
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: '원클릭 클래스', url: link });
      else copy();
    } catch {
      // Closing the native share sheet is not an application error.
    }
  };
  return (
    <>
      <div className="oc-web-page publish-done-web">
        <section className="oc-publish-card exact-done">
          {confetti.map(([left, background, animationDuration, animationDelay]) => (
            <i
              className="confetti"
              style={{ left, background, animationDuration, animationDelay }}
              key={left}
            />
          ))}
          <div className="done-check">
            <Check strokeWidth={2.6} />
          </div>
          <h1>
            클래스가
            <br />
            공개됐어요!
          </h1>
          <p>
            이제 링크만 공유하면
            <br />
            바로 신청받을 수 있어요
          </p>
          <div className="published-link">
            <Link2 />
            <span>oneclick.class/s/notion-auto</span>
            <button onClick={copy}>복사</button>
          </div>
          <button className="publish-copy-main" onClick={copy}>
            <Link2 />
            링크 복사하기
          </button>
          <div className="share-actions">
            <button onClick={share}>
              <i className="kakao-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-.7 2.7-.8 3.1 0 .2.1.4.4.2.2-.1 2.8-1.9 3.9-2.7.6.1 1.2.1 1.8.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
                </svg>
              </i>
              카카오톡
            </button>
            <button onClick={copy}>
              <i>
                <Link2 />
              </i>
              링크 복사
            </button>
            <button onClick={share}>
              <i>
                <Share2 />
              </i>
              공유하기
            </button>
          </div>
          <Link className="secondary" to="/s/notion-auto">
            실제 신청 페이지 열기
          </Link>
          {copied && (
            <div className="publish-next-inline">
              <b>다음으로 할 일</b>
              <Link to="/applicants"><Users /> 신청자 현황 보기</Link>
              <Link to="/classes"><CircleCheck /> 강의 관리로 이동</Link>
              <button onClick={copy}><QrCode /> QR 링크 준비</button>
            </div>
          )}
        </section>
        {toast && <div className="done-toast" aria-live="polite">{toast}</div>}
      </div>

      <div className="page publish-done exact-done app-only">
        {confetti.map(([left, background, animationDuration, animationDelay]) => (
          <i
            className="confetti"
            style={{ left, background, animationDuration, animationDelay }}
            key={left}
          />
        ))}
        <div className="done-check">
          <Check strokeWidth={2.6} />
        </div>
        <h1>
          클래스가
          <br />
          공개됐어요!
        </h1>
        <p>
          이제 링크만 공유하면
          <br />
          바로 신청받을 수 있어요
        </p>
        <div className="published-link">
          <Link2 />
          <span>oneclick.class/s/notion-auto</span>
          <button onClick={copy}>복사</button>
        </div>
        <div className="share-actions">
          <button onClick={share}>
            <i className="kakao-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-.7 2.7-.8 3.1 0 .2.1.4.4.2.2-.1 2.8-1.9 3.9-2.7.6.1 1.2.1 1.8.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
              </svg>
            </i>
            카카오톡
          </button>
          <button onClick={copy}>
            <i>
              <Link2 />
            </i>
            링크 복사
          </button>
          <button onClick={share}>
            <i>
              <Share2 />
            </i>
            공유하기
          </button>
        </div>
        <Link className="secondary" to="/s/notion-auto">
          실제 신청 페이지 열기
        </Link>
        <Link className="done-home" to="/">
          홈으로 가기
        </Link>
        {toast && (
          <div className="done-toast" aria-live="polite">
            {toast}
          </div>
        )}
      </div>
    </>
  );
}
