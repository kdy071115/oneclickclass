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

    expect(screen.getByRole('heading', { name: /강의는 쉽게 열고\s*운영은 한 번에/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /무료로 시작하기/ })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('main')).toHaveTextContent('카드 등록 없이 시작');
    expect(screen.getByRole('heading', { name: /링크 하나로\s*신청과 결제까지/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 강의 생성 화면' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '강의 개설 5단계' }).children).toHaveLength(5);
    expect(screen.getByText('일정과 가격을 정해주세요')).toBeInTheDocument();
    expect(screen.getByText('모집 인원과 참가비를 설정해요')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 신청자 관리 화면' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 모바일 수강 신청 화면' })).toBeInTheDocument();
  });
});
