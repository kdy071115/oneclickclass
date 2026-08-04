import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroWithProductMockup } from './hero-with-product-mockup';

describe('HeroWithProductMockup', () => {
  it('카피와 행동, 제품 목업을 하나의 히어로로 구성한다', () => {
    render(
      <HeroWithProductMockup
        titleId="hero-title"
        title="콘텐츠가 강의가 됩니다"
        description="가지고 있는 자료에서 시작하세요."
        actions={<a href="/start">강의 만들기</a>}
        assurances={['영상 링크 지원', '공개 전 수정']}
        assurancesLabel="핵심 안내"
        productMockup={<div data-testid="product-mockup">제품 화면</div>}
      />,
    );

    expect(screen.getByRole('region', { name: '콘텐츠가 강의가 됩니다' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '강의 만들기' })).toHaveAttribute('href', '/start');
    expect(screen.getByRole('list', { name: '핵심 안내' }).children).toHaveLength(2);
    expect(screen.getByTestId('product-mockup')).toBeInTheDocument();
  });
});
