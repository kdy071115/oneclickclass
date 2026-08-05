import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProtectedRoute } from './guards';

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear());

  it('세션이 없으면 로그인 화면으로 보낸다', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>로그인 필요</div>} />
          <Route path="/dashboard" element={<ProtectedRoute><div>대시보드</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('로그인 필요')).toBeInTheDocument();
  });

  it('로그인 후 돌아갈 검색 조건과 화면 위치까지 보존한다', () => {
    function LoginLocation() {
      const location = useLocation();
      return <div>{(location.state as { from?: string } | null)?.from}</div>;
    }

    render(
      <MemoryRouter initialEntries={['/classes/new?edit=class-1&step=4#preview']}>
        <Routes>
          <Route path="/login" element={<LoginLocation />} />
          <Route
            path="/classes/new"
            element={
              <ProtectedRoute>
                <div>클래스 편집</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('/classes/new?edit=class-1&step=4#preview')).toBeInTheDocument();
  });
});
