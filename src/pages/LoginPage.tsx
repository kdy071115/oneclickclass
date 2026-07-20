import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../api/services';
import { setSession } from '../auth/session';
import { StatusBar } from '../components/common/StatusBar';
import { useRole } from '../hooks/useRole';

export function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { setRole } = useRole();
  const [values, setValues] = useState({ id: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!values.id.includes('@')) return setError('올바른 이메일을 입력해 주세요.');
    if (values.password.length < 6) return setError('비밀번호는 6자 이상 입력해 주세요.');
    setSubmitting(true);
    setError('');
    try {
      const session = await authService.login({ email: values.id, password: values.password });
      setSession(session);
      setRole(session.user.role);
      const target = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      nav(target, { replace: true });
    } catch {
      setError('로그인에 실패했어요. 입력 정보를 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="standalone framed">
      <section className="auth page">
        <StatusBar />
        <h1>
          안녕하세요 :)
          <br />
          원클릭 클래스예요
        </h1>
        <p className="muted">로그인하고 강의를 관리해보세요</p>
        <form onSubmit={submit}>
          <label>
            이메일 아이디
            <input
              type="email"
              placeholder="example@email.com"
              value={values.id}
              onChange={(e) => setValues({ ...values, id: e.target.value })}
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="auth-links">
          <button onClick={() => setError('가입한 이메일로 아이디 안내를 보냈어요.')}>아이디 찾기</button>
          <i />
          <button onClick={() => setError('비밀번호 재설정 링크를 보냈어요.')}>비밀번호 찾기</button>
          <i />
          <Link to="/signup">회원가입</Link>
        </div>
        <div className="sns-divider">
          <span>SNS 계정으로 로그인</span>
        </div>
        <div className="sns">
          {['◼', 'N', 'f', 'G'].map((label) => (
            <button onClick={() => setError(`${label} 계정으로 로그인했어요.`)} key={label}>
              {label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
