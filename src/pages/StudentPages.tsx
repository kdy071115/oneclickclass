import { ArrowLeft, Check, CheckCircle2, Clock3 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { examQuestions as exams, surveyQuestions as surveys } from '../constants/mockData';

function useReturnTo() {
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo');
  return returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/classes';
}

function TaskHeader({
  title,
  current,
  total,
  onBack,
  timer,
}: {
  title: string;
  current: number;
  total: number;
  onBack: () => void;
  timer?: string;
}) {
  return (
    <header className="learner-task-header">
      <button type="button" onClick={onBack} aria-label="이전 화면">
        <ArrowLeft />
      </button>
      <div>
        <b>{title}</b>
        <div className="take-progress" aria-label={`${total}개 중 ${current}번째`}>
          <i style={{ width: `${(current / total) * 100}%` }} />
        </div>
      </div>
      {timer ? (
        <em>
          <Clock3 />
          {timer}
        </em>
      ) : (
        <span>
          {current} / {total}
        </span>
      )}
    </header>
  );
}

function TaskShell({ children }: { children: ReactNode }) {
  return (
    <main className="learner-task-shell">
      <section className="learner-task-card">{children}</section>
    </main>
  );
}

export function SurveyTakePage() {
  const nav = useNavigate();
  const location = useLocation();
  const returnTo = useReturnTo();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const question = surveys[index];
  const answer = answers[index];
  const disabled = question.type === 'text' ? !String(answer ?? '').trim() : answer === undefined;
  const goBack = () => (index ? setIndex(index - 1) : nav(returnTo));
  const next = () =>
    index === surveys.length - 1
      ? nav(`/learn/survey/done${location.search}`)
      : setIndex(index + 1);

  return (
    <TaskShell>
      <TaskHeader
        title="강의 만족도 설문"
        current={index + 1}
        total={surveys.length}
        onBack={goBack}
      />
      <div className="learner-task-body">
        <b className="question-step">질문 {index + 1}</b>
        <h1>{question.text}</h1>
        {question.type === 'choice' && (
          <div className="take-options">
            {question.options?.map((option, optionIndex) => (
              <button
                type="button"
                className={answer === optionIndex ? 'active' : ''}
                onClick={() => setAnswers({ ...answers, [index]: optionIndex })}
                key={option}
              >
                <i>{optionIndex + 1}</i>
                {option}
                {answer === optionIndex && <Check />}
              </button>
            ))}
          </div>
        )}
        {question.type === 'rating' && (
          <div className="rating-options" role="group" aria-label="만족도 선택">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                className={Number(answer ?? 0) >= value ? 'active' : ''}
                onClick={() => setAnswers({ ...answers, [index]: value })}
                aria-label={`${value}점`}
                key={value}
              >
                ★
              </button>
            ))}
          </div>
        )}
        {question.type === 'text' && (
          <textarea
            value={String(answer ?? '')}
            onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })}
            placeholder="자유롭게 의견을 남겨주세요"
          />
        )}
      </div>
      <footer className="learner-task-footer">
        <button type="button" className="primary take-next" disabled={disabled} onClick={next}>
          {index === surveys.length - 1 ? '제출하기' : '다음'}
        </button>
      </footer>
    </TaskShell>
  );
}

export function SurveyDonePage() {
  const returnTo = useReturnTo();
  return (
    <TaskShell>
      <div className="student-complete">
        <div>
          <Check />
        </div>
        <span>응답 제출 완료</span>
        <h1>설문을 제출했어요</h1>
        <p>소중한 의견을 강의 운영에 반영할게요.</p>
        <Link className="primary" to={returnTo}>
          이전 화면으로 돌아가기
        </Link>
      </div>
    </TaskShell>
  );
}

export function ExamTakePage() {
  const nav = useNavigate();
  const location = useLocation();
  const returnTo = useReturnTo();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [seconds, setSeconds] = useState(899);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const question = exams[index];
  const answer = answers[index];
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const goBack = () => (index ? setIndex(index - 1) : nav(returnTo));
  const next = () =>
    index === exams.length - 1 ? nav(`/learn/exam/result${location.search}`) : setIndex(index + 1);

  return (
    <TaskShell>
      <TaskHeader
        title="학습 확인 퀴즈"
        current={index + 1}
        total={exams.length}
        onBack={goBack}
        timer={time}
      />
      <div className="learner-task-body">
        <b className="question-step">문제 {index + 1}</b>
        <h1>{question.text}</h1>
        <div className="take-options">
          {question.choices.map((choice, choiceIndex) => (
            <button
              type="button"
              className={answer === choiceIndex ? 'active' : ''}
              onClick={() => setAnswers({ ...answers, [index]: choiceIndex })}
              key={choice}
            >
              <i>{String.fromCharCode(65 + choiceIndex)}</i>
              {choice}
              {answer === choiceIndex && <Check />}
            </button>
          ))}
        </div>
      </div>
      <footer className="learner-task-footer">
        <button
          type="button"
          className="primary take-next"
          disabled={answer === undefined}
          onClick={next}
        >
          {index === exams.length - 1 ? '답안 제출하기' : '다음 문제'}
        </button>
      </footer>
    </TaskShell>
  );
}

export function ExamResultStudentPage() {
  const returnTo = useReturnTo();
  return (
    <TaskShell>
      <div className="exam-result-exact">
        <CheckCircle2 />
        <small>학습 확인 결과</small>
        <div className="score-ring">
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r="80" />
            <circle className="score" cx="90" cy="90" r="80" />
          </svg>
          <span>
            <b>80</b>
            <em>점</em>
          </span>
        </div>
        <h1>퀴즈를 통과했어요</h1>
        <p>3문제 중 2문제를 맞혔어요.</p>
        <Link className="primary" to={returnTo}>
          이전 화면으로 돌아가기
        </Link>
      </div>
    </TaskShell>
  );
}
