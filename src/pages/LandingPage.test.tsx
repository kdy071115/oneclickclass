import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('핵심 카피와 가입 경로, 실제 서비스 화면을 보여준다', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /강의 개설부터\s*수료까지 한곳에서/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /무료로 시작하기/ })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 강의 생성 화면' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 신청자 관리 화면' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 모바일 수강 신청 화면' })).toBeInTheDocument();
  });
});
