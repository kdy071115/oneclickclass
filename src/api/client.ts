import axios, { AxiosError } from 'axios';
import { clearSession, getSession } from '../auth/session';
import type { ApiError } from '../types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL;
const withCredentials = import.meta.env.VITE_API_WITH_CREDENTIALS !== 'false';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string; message?: string; details?: Record<string, string> }>) => {
    const learnerRequest = error.config?.url?.startsWith('/oneclick/');
    if (error.response?.status === 401 && getSession() && !learnerRequest) {
      clearSession();
      if (location.pathname !== '/login') location.assign('/login');
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
