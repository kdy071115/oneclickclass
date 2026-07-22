import { ArrowLeft, Check, CheckCircle2, Clock3 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  oneclickService,
  type OneClickExamQuestion,
  type OneClickExamResult,
} from '../api/oneclick';
import type { SurveyQuestion } from '../types/class';

function useReturnTo() {
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo');
  return returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/classes';
}

function useCourseActiveSeq() {
  const [params] = useSearchParams();
  return params.get('courseActiveSeq') || 'notion';
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
  const courseActiveSeq = useCourseActiveSeq();
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<SurveyQuestion[]>();
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    void oneclickService
      .surveyQuestions(courseActiveSeq)
      .then(setQuestions)
      .catch(() => setError('설문을 불러오지 못했어요.'));
  }, [courseActiveSeq]);
  const question = questions?.[index];
  const answer = question ? answers[question.id] : undefined;
  if (!questions || !question) {
    return (
      <TaskShell>
        <div className="student-complete">
          <span>{error ? '설문 확인 필요' : '설문 불러오는 중'}</span>
          <h1>{error || '질문을 준비하고 있어요.'}</h1>
          {error && (
            <Link className="primary" to={returnTo}>
              이전 화면으로 돌아가기
            </Link>
          )}
        </div>
      </TaskShell>
    );
  }
  const disabled = question.type === 'text' ? !String(answer ?? '').trim() : answer === undefined;
  const goBack = () => (index ? setIndex(index - 1) : nav(returnTo));
  const next = async () => {
    if (index < questions.length - 1) return setIndex(index + 1);
    setSubmitting(true);
    setError('');
    try {
      await oneclickService.submitSurvey(courseActiveSeq, answers);
      nav(`/learn/survey/done${location.search}`);
    } catch {
      setError('설문을 제출하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TaskShell>
      <TaskHeader
        title="강의 만족도 설문"
        current={index + 1}
        total={questions.length}
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
                onClick={() => setAnswers({ ...answers, [question.id]: optionIndex })}
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
                onClick={() => setAnswers({ ...answers, [question.id]: value })}
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
            onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
            placeholder="자유롭게 의견을 남겨주세요"
          />
        )}
      </div>
      {error && <p className="learner-task-error">{error}</p>}
      <footer className="learner-task-footer">
        <button
          type="button"
          className="primary take-next"
          disabled={disabled || submitting}
          onClick={() => void next()}
        >
          {submitting ? '제출 중...' : index === questions.length - 1 ? '제출하기' : '다음'}
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
  const courseActiveSeq = useCourseActiveSeq();
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<OneClickExamQuestion[]>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [seconds, setSeconds] = useState(899);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    void oneclickService
      .examQuestions(courseActiveSeq)
      .then(setQuestions)
      .catch(() => setError('시험 문제를 불러오지 못했어요.'));
  }, [courseActiveSeq]);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const question = questions?.[index];
  const answer = question ? answers[question.id] : undefined;
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const goBack = () => (index ? setIndex(index - 1) : nav(returnTo));
  const next = async () => {
    if (!questions || index < questions.length - 1) return setIndex(index + 1);
    setSubmitting(true);
    setError('');
    try {
      const result = await oneclickService.submitExam(courseActiveSeq, answers);
      nav(`/learn/exam/result${location.search}`, { state: { result } });
    } catch {
      setError('답안을 제출하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };
  if (!questions || !question) {
    return (
      <TaskShell>
        <div className="student-complete">
          <span>{error ? '시험 확인 필요' : '시험 불러오는 중'}</span>
          <h1>{error || '문제를 준비하고 있어요.'}</h1>
          {error && (
            <Link className="primary" to={returnTo}>
              이전 화면으로 돌아가기
            </Link>
          )}
        </div>
      </TaskShell>
    );
  }

  return (
    <TaskShell>
      <TaskHeader
        title="학습 확인 퀴즈"
        current={index + 1}
        total={questions.length}
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
              onClick={() => setAnswers({ ...answers, [question.id]: choiceIndex })}
              key={choice}
            >
              <i>{String.fromCharCode(65 + choiceIndex)}</i>
              {choice}
              {answer === choiceIndex && <Check />}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="learner-task-error">{error}</p>}
      <footer className="learner-task-footer">
        <button
          type="button"
          className="primary take-next"
          disabled={answer === undefined || submitting}
          onClick={() => void next()}
        >
          {submitting
            ? '채점 중...'
            : index === questions.length - 1
              ? '답안 제출하기'
              : '다음 문제'}
        </button>
      </footer>
    </TaskShell>
  );
}

export function ExamResultStudentPage() {
  const returnTo = useReturnTo();
  const courseActiveSeq = useCourseActiveSeq();
  const location = useLocation();
  const stateResult = (location.state as { result?: OneClickExamResult } | null)?.result;
  const [result, setResult] = useState<OneClickExamResult | null | undefined>(stateResult);
  useEffect(() => {
    if (result) return;
    void oneclickService.examResult(courseActiveSeq).then(setResult);
  }, [courseActiveSeq, result]);
  if (!result) {
    return (
      <TaskShell>
        <div className="student-complete">
          <span>{result === null ? '결과 없음' : '채점 결과 확인 중'}</span>
          <h1>{result === null ? '제출한 답안을 찾지 못했어요.' : '결과를 불러오고 있어요.'}</h1>
          {result === null && (
            <Link className="primary" to={returnTo}>
              이전 화면으로 돌아가기
            </Link>
          )}
        </div>
      </TaskShell>
    );
  }
  return (
    <TaskShell>
      <div className="exam-result-exact">
        <CheckCircle2 />
        <small>학습 확인 결과</small>
        <div className="score-ring">
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r="80" />
            <circle
              className="score"
              cx="90"
              cy="90"
              r="80"
              style={{ strokeDasharray: `${(result.score / 100) * 503} 503` }}
            />
          </svg>
          <span>
            <b>{result.score}</b>
            <em>점</em>
          </span>
        </div>
        <h1>{result.passed ? '퀴즈를 통과했어요' : '조금만 더 복습해 볼까요?'}</h1>
        <p>
          {result.totalCount}문제 중 {result.correctCount}문제를 맞혔어요.
        </p>
        <Link className="primary" to={returnTo}>
          이전 화면으로 돌아가기
        </Link>
      </div>
    </TaskShell>
  );
}
