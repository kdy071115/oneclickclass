import { FormEvent, useState } from 'react';
import { ChevronDown, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../api/services';
import googleLogin from '../assets/oauth/google-login.png';
import kakaoLogin from '../assets/oauth/kakao-login.png';
import naverLogin from '../assets/oauth/naver-login.png';
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
  const [emailOpen, setEmailOpen] = useState(false);

  const oauthProviders = [
    { id: 'kakao', label: '카카오', icon: kakaoLogin },
    { id: 'naver', label: '네이버', icon: naverLogin },
    { id: 'google', label: 'Google', icon: googleLogin },
  ] as const;

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

  function continueWithOAuth(label: string) {
    setError(`${label} 로그인은 백엔드 OAuth 연동 후 사용할 수 있어요.`);
  }

  return (
    <main className="standalone framed">
      <section className="auth page login-auth">
        <StatusBar />
        <h1>
          강사님, 반가워요
        </h1>
        <p className="muted">간편 로그인으로 바로 강의를 관리하세요</p>

        <div className="oauth-login" aria-label="간편 로그인">
          <div className="oauth-title">
            <strong>간편 로그인</strong>
            <small>가입할 때 사용한 계정을 선택해 주세요</small>
          </div>
          {oauthProviders.map((provider) => (
            <button
              type="button"
              className={`oauth-button ${provider.id}`}
              onClick={() => continueWithOAuth(provider.label)}
              key={provider.id}
            >
              <span className="oauth-symbol" aria-hidden="true">
                <img src={provider.icon} alt="" />
              </span>
              <b>{provider.label}로 계속하기</b>
            </button>
          ))}
        </div>

        <div className="login-divider">
          <span>또는</span>
        </div>

        <button
          type="button"
          className="email-login-toggle"
          aria-expanded={emailOpen}
          onClick={() => {
            setEmailOpen((open) => !open);
            setError('');
          }}
        >
          <Mail size={19} />
          <b>이메일로 로그인</b>
          <ChevronDown className={emailOpen ? 'open' : ''} size={18} />
        </button>

        {emailOpen && (
          <>
            <form className="email-login-form" onSubmit={submit}>
              <label>
                이메일
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  value={values.id}
                  onChange={(e) => setValues({ ...values, id: e.target.value })}
                />
              </label>
              <label>
                비밀번호
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="비밀번호를 입력하세요"
                  value={values.password}
                  onChange={(e) => setValues({ ...values, password: e.target.value })}
                />
              </label>
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? '로그인 중...' : '이메일로 로그인'}
              </button>
            </form>
            <div className="auth-links">
              <button onClick={() => setError('가입한 이메일로 아이디 안내를 보냈어요.')}>
                아이디 찾기
              </button>
              <i />
              <button onClick={() => setError('비밀번호 재설정 링크를 보냈어요.')}>
                비밀번호 찾기
              </button>
            </div>
          </>
        )}

        {error && <p className="form-error login-message" role="alert">{error}</p>}
        <p className="login-signup">
          처음이신가요? <Link to="/signup" state={location.state}>강사 계정 만들기</Link>
        </p>
      </section>
    </main>
  );
}
