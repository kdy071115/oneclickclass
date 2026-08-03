import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const returnTarget = (location.state as { from?: string } | null)?.from;
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
      const target = returnTarget ?? '/classes/new';
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
        <PageHeader
          title="강의를 저장할 계정"
          subtitle="만든 강의와 신청자를 안전하게 관리해요"
        />
        {[
          ['email', '이메일', 'example@email.com'],
          ['id', '아이디', '사용할 아이디'],
          ['password', '비밀번호', '8자 이상 입력'],
          ['name', '이름', '이름을 입력하세요'],
        ].map(([key, label, placeholder]) => (
          <label key={key}>
            {label}
            <input
              type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
              autoComplete={
                key === 'password'
                  ? 'new-password'
                  : key === 'email'
                    ? 'email'
                    : key === 'id'
                      ? 'username'
                      : 'name'
              }
              value={fields[key as keyof typeof fields]}
              onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
              placeholder={placeholder}
            />
          </label>
        ))}
        <div className="terms">
          <label className="term-all">
            <input
              type="checkbox"
              checked={terms.every(Boolean)}
              onChange={() =>
                setTerms(terms.every(Boolean) ? [false, false, false] : [true, true, true])
              }
            />
            <i className={terms.every(Boolean) ? 'checked' : ''} />
            <span>약관 전체 동의</span>
          </label>
          {termLabels.map((x, i) => (
            <div className="term-row" key={x}>
              <label>
                <input
                  type="checkbox"
                  checked={terms[i]}
                  onChange={() => setTerms(terms.map((v, j) => (j === i ? !v : v)))}
                />
                <i className={terms[i] ? 'checked' : ''} />
                <span>{x}</span>
              </label>
              <button type="button" onClick={() => setOpenTerm(x)}>
                보기
              </button>
            </div>
          ))}
        </div>
        {openTerm && (
          <p className="term-preview">
            <b>{openTerm}</b>
            원클릭 클래스 이용을 위한 기본 약관입니다. 자세한 내용은 가입 후 설정에서 다시 확인할 수 있어요.
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary signup-cta" disabled={!valid || submitting}>
          {submitting ? '가입 중...' : '가입 완료'}
        </button>
      </form>
    </main>
  );
}
