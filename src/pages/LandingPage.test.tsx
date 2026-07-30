import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('핵심 카피와 가입 경로를 보여주고 모션 미지원 환경에서도 내용을 공개한다', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /강의 만들기,\s*이렇게 쉬웠나요/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /무료로 시작하기/ })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 5단계 강의 개설 화면' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '강의 개설 5단계' }).children).toHaveLength(5);
    expect(container.querySelector('.landing-reveal')).toHaveClass('is-visible');
  });
});
