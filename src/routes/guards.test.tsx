import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
});
