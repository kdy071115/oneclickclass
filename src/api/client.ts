import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken, getSession, updateAccessToken } from '../auth/session';
import type { ApiError } from '../types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL;
const withCredentials = import.meta.env.VITE_API_WITH_CREDENTIALS === 'true';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let refreshRequest: Promise<string> | undefined;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string; message?: string; details?: Record<string, string> }>) => {
    const config = error.config as RetryConfig | undefined;
    const session = getSession();

    if (error.response?.status === 401 && config && !config._retry && session?.refreshToken) {
      config._retry = true;
      try {
        refreshRequest ??= axios
          .post<{ accessToken: string }>(`${baseURL ?? ''}/auth/refresh`, { refreshToken: session.refreshToken })
          .then((response) => response.data.accessToken)
          .finally(() => { refreshRequest = undefined; });
        const accessToken = await refreshRequest;
        updateAccessToken(accessToken);
        config.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(config);
      } catch {
        clearSession();
        if (location.pathname !== '/login') location.assign('/login');
      }
    }

    const apiError: ApiError = {
      code: error.response?.data?.code ?? 'UNKNOWN_ERROR',
      message: error.response?.data?.message ?? '요청을 처리하지 못했어요.',
      status: error.response?.status ?? 0,
      details: error.response?.data?.details,
    };
    return Promise.reject(apiError);
  },
);
