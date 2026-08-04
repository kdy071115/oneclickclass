import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroProductMockup } from './HeroProductMockup';

describe('HeroProductMockup', () => {
  it('실제 데스크톱 화면과 모바일 화면을 하나의 제품 장면으로 구성한다', () => {
    const { container } = render(
      <HeroProductMockup
        ariaLabel="강사용 화면과 수강생 화면"
        brandLabel="원클릭 클래스"
        caption="강사와 수강생에게 이어지는 실제 제품 화면"
        desktopImage="/dashboard.png"
        desktopImageAlt="강사용 운영 대시보드"
        desktopTitle="강사 홈"
        mobileContent={<div data-testid="mobile-product">수강 신청 화면</div>}
      />,
    );

    expect(screen.getByRole('figure', { name: '강사용 화면과 수강생 화면' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '강사용 운영 대시보드' })).toHaveAttribute(
      'src',
      '/dashboard.png',
    );
    expect(screen.getByText('강사 홈')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-product')).toBeInTheDocument();
    expect(container.querySelector('.hero-product-mockup__desktop')).toBeInTheDocument();
    expect(container.querySelector('.hero-product-mockup__mobile')).toBeInTheDocument();
  });
});
