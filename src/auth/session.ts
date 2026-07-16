import type { AuthSession } from '../types/auth';

const sessionKey = 'oneclick.session';

export function getSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(sessionKey);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

export function setSession(session: AuthSession) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
}

export function getAccessToken() {
  return getSession()?.accessToken;
}

export function updateAccessToken(accessToken: string) {
  const session = getSession();
  if (session) setSession({ ...session, accessToken });
}
