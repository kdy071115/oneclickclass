import type { AuthSession } from '../types/auth';

const sessionKey = 'oneclick.session';
const mock = import.meta.env.VITE_USE_MOCK !== 'false';
const sessionStorageArea = () => (mock ? localStorage : sessionStorage);

export function getSession(): AuthSession | null {
  try {
    const value = sessionStorageArea().getItem(sessionKey);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    sessionStorageArea().removeItem(sessionKey);
    return null;
  }
}

export function setSession(session: AuthSession) {
  if (!mock) localStorage.removeItem(sessionKey);
  sessionStorageArea().setItem(
    sessionKey,
    JSON.stringify(mock ? session : { user: session.user }),
  );
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
}
