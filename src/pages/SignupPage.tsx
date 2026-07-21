import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../api/services';
import { setSession } from '../auth/session';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBar } from '../components/common/StatusBar';
import { useRole } from '../hooks/useRole';

const termLabels = ['(필수) 서비스 이용약관', '(필수) 개인정보 수집·이용 동의', '(선택) 마케팅 정보 수신 동의'];

export function SignupPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { setRole } = useRole();
  const [terms, setTerms] = useState([false, false, false]);
  const [openTerm, setOpenTerm] = useState('');
  const [fields, setFields] = useState({ email: '', id: '', password: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const valid =
    fields.email.includes('@') &&
    fields.id.length > 2 &&
    fields.password.length >= 8 &&
    fields.name &&
    terms[0] &&
    terms[1];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError('');
    try {
      const session = await authService.signup({ email: fields.email, username: fields.id, password: fields.password, name: fields.name, role: 'teacher' });
      setSession(session);
      setRole(session.user.role);
      const target = (location.state as { from?: string } | null)?.from ?? '/classes/new';
      nav(target, { replace: true });
    } catch {
      setError('회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="standalone framed">
      <form className="page signup" onSubmit={submit}>
        <StatusBar />
        <PageHeader title="강의를 저장할 계정" subtitle="만든 강의와 신청자를 안전하게 관리해요" />
        {[
          ['email', '이메일', 'example@email.com'],
          ['id', '아이디', '사용할 아이디'],
          ['password', '비밀번호', '8자 이상 입력'],
          ['name', '이름', '이름을 입력하세요'],
        ].map(([key, label, placeholder]) => (
          <label key={key}>
            {label}
            <input
              type={key === 'password' ? 'password' : 'text'}
              value={fields[key as keyof typeof fields]}
              onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
              placeholder={placeholder}
            />
          </label>
        ))}
        <div className="terms">
          <button
            type="button"
            onClick={() => setTerms(terms.every(Boolean) ? [false, false, false] : [true, true, true])}
          >
            <i className={terms.every(Boolean) ? 'checked' : ''} />
            약관 전체 동의
          </button>
          {termLabels.map((x, i) => (
            <button
              type="button"
              onClick={() => setTerms(terms.map((v, j) => (j === i ? !v : v)))}
              key={x}
            >
              <i className={terms[i] ? 'checked' : ''} />
              {x}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenTerm(x);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setOpenTerm(x);
                }}
              >
                보기
              </span>
            </button>
          ))}
        </div>
        {openTerm && (
          <p className="term-preview">
            <b>{openTerm}</b>
            원클릭 클래스 이용을 위한 기본 약관입니다. 자세한 내용은 가입 후 설정에서 다시 확인할 수 있어요.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="primary signup-cta" disabled={!valid || submitting}>
          {submitting ? '가입 중...' : '가입 완료'}
        </button>
      </form>
    </main>
  );
}

export function GuestPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [result, setResult] = useState(false);
  const canSearch = sent && phone.replace(/\D/g, '').length >= 10 && code.length >= 6;

  return (
    <main className="standalone framed">
      <section className="page guest">
        <StatusBar />
        <PageHeader title="" />
        <div className="guest-title">
          <i>✓</i>
          <h1>신청 정보 확인</h1>
          <p>신청할 때 입력한 휴대전화 번호로 이어볼 수 있어요</p>
        </div>
        <label>
          휴대전화 번호
          <input
            inputMode="tel"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label>
          인증코드
          <div>
            <input
              inputMode="numeric"
              placeholder="6자리 인증코드"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button onClick={() => setSent(true)}>코드 전송</button>
          </div>
        </label>
        {sent && <div className="guest-code-link">인증코드를 전송했어요. 데모 코드는 123456입니다.</div>}
        <button className="primary" disabled={!canSearch} onClick={() => setResult(true)}>
          신청조회
        </button>
        {result && (
          <section className="guest-result">
            <b>노션으로 시작하는 업무 자동화</b>
            <small>수강 가능 · 이전 위치 3강 14분 27초</small>
          </section>
        )}
        <p>공유받은 신청 링크에서 바로 수강을 시작할 수 있어요.</p>
        <Link className="secondary" to="/s/notion-auto">
          신청 링크로 이동
        </Link>
      </section>
    </main>
  );
}
