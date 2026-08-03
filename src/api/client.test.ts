import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, getSession, setSession } from '../auth/session';
import { apiClient } from './client';

const unauthorized: AxiosAdapter = (config) =>
  Promise.reject(
    new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: new AxiosHeaders(),
      config,
      data: {},
    }),
  );

const teacherSession = {
  user: {
    id: 'teacher-1',
    name: '강의자',
    email: 'teacher@oneclick.test',
    role: 'teacher' as const,
  },
};

describe('apiClient session handling', () => {
  beforeEach(() => {
    clearSession();
    window.history.replaceState(null, '', '/login');
  });

  it('쿠키를 포함하고 강의자 API의 401 응답에서 로컬 세션을 제거한다', async () => {
    setSession(teacherSession);

    await expect(apiClient.get('/dashboard', { adapter: unauthorized })).rejects.toMatchObject({
      status: 401,
    });

    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(getSession()).toBeNull();
  });

  it('수강생 API의 401 응답은 휴대전화 재인증을 위해 강의자 세션과 분리한다', async () => {
    setSession(teacherSession);

    await expect(
      apiClient.get('/oneclick/learn/course-1', { adapter: unauthorized }),
    ).rejects.toMatchObject({ status: 401 });

    expect(getSession()).toEqual(teacherSession);
  });
});
