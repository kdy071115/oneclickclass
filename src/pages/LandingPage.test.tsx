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

    expect(screen.getByRole('heading', { name: /강의 만들기,\s*이렇게 쉬웠나요/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /무료로 시작하기/ })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('main')).toHaveTextContent('기술 지식 없이 시작');
    expect(screen.getByRole('heading', { name: /세 단계면\s*신청 링크가 완성돼요/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /공유한 링크 하나가\s*학습까지 이어져요/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 강의 생성 화면' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '강의 개설 5단계' }).children).toHaveLength(5);
    expect(screen.getByText('일정과 가격을 정해주세요')).toBeInTheDocument();
    expect(screen.getByText('모집 인원과 참가비를 설정해요')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /분석보다 먼저,\s*오늘 할 일을 보여줘요/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 운영 대시보드 화면' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 신청자 관리 화면' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /수업 당일은\s*QR로 바로 출석해요/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 QR 출석 관리 화면' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '원클릭 클래스의 실제 모바일 수강 신청 화면' })).toBeInTheDocument();
  });
});
