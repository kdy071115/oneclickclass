import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('핵심 카피와 가입 경로를 보여주고 모션 미지원 환경에서도 내용을 공개한다', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /링크와 자료가,\s*판매할 강의가 돼요/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /공개한 뒤에는 오늘 할 일만\s*한눈에 확인하세요/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '가지고 있는 콘텐츠에서 판매할 강의까지' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /필요할 때는 출석과 수료까지\s*같은 흐름에서 이어가세요/,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /무료로 시작하기/ })[0]).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(screen.getByRole('link', { name: '만드는 과정 보기' })).toHaveAttribute(
      'href',
      '#create',
    );
    expect(screen.getByText('YouTube·영상·자료 링크 지원')).toBeInTheDocument();
    expect(screen.getByText('무료·유료 강의 설정')).toBeInTheDocument();
    expect(screen.getByText('공개 전까지 언제든 수정')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /화면 확대 보기/ })).toHaveLength(5);
    expect(
      screen.getByRole('img', { name: '원클릭 클래스의 실제 강의 개설 화면' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '원클릭 클래스의 실제 신청자 관리 화면' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '원클릭 클래스의 실제 QR 출석 관리 화면' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '원클릭 클래스의 실제 정산 관리 화면' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '원클릭 클래스의 실제 수료증 발급 관리 화면' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: '공유 링크에서 클래스 정보를 확인하고 신청하는 모바일 화면 예시',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '콘텐츠를 강의로 만드는 과정' }).children).toHaveLength(
      3,
    );
    expect(
      [...container.querySelectorAll('#landing-content > section[id]')].map(({ id }) => id),
    ).toEqual(['create', 'learner', 'product', 'operations']);
    expect(container.querySelector('.landing-reveal')).toHaveClass('is-visible');
  });

  it('운영 갤러리를 스크롤하면 현재 단계를 갱신하고 방향키 이동을 지원한다', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    const gallery = screen.getByRole('region', { name: '운영 제품 화면' });
    Object.defineProperties(gallery, {
      scrollLeft: { configurable: true, value: 360, writable: true },
      scrollWidth: { configurable: true, value: 1080 },
    });
    gallery.scrollTo = vi.fn();

    fireEvent.scroll(gallery);
    expect(screen.getByRole('button', { name: '02 실시간 QR 출석 보기' })).toHaveAttribute(
      'aria-current',
      'step',
    );

    fireEvent.keyDown(gallery, { key: 'ArrowRight' });
    expect(gallery.scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 720 });
  });

  it('섹션 위치를 주소와 메뉴에 반영하고 히어로로 돌아오면 선택을 해제한다', () => {
    const observers: MockIntersectionObserver[] = [];

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0];
      readonly targets: Element[] = [];

      constructor(readonly callback: IntersectionObserverCallback) {
        observers.push(this);
      }

      disconnect() {}
      observe(target: Element) {
        this.targets.push(target);
      }
      takeRecords() {
        return [];
      }
      unobserve() {}
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const hero = container.querySelector('.landing-hero');
    const heroObserver = observers.find(
      ({ targets }) => targets.length === 1 && targets.includes(hero!),
    );
    const sectionObserver = observers.find(({ targets }) =>
      ['product', 'create', 'operations', 'learner'].every((id) =>
        targets.some((target) => target.id === id),
      ),
    );
    const operations = container.querySelector('#operations');

    expect(hero).not.toBeNull();
    expect(heroObserver).toBeDefined();
    expect(sectionObserver).toBeDefined();
    expect(operations).not.toBeNull();

    act(() => {
      sectionObserver!.callback(
        [
          { target: operations, isIntersecting: true, intersectionRatio: 0.8 },
        ] as IntersectionObserverEntry[],
        sectionObserver!,
      );
    });
    expect(window.location.hash).toBe('#operations');
    expect(screen.getAllByRole('link', { name: '운영' })[0]).toHaveAttribute(
      'aria-current',
      'location',
    );

    act(() => {
      heroObserver!.callback(
        [{ target: hero, isIntersecting: true }] as IntersectionObserverEntry[],
        heroObserver!,
      );
    });
    expect(window.location.hash).toBe('');
    expect(screen.getAllByRole('link', { name: '운영' })[0]).not.toHaveAttribute('aria-current');
  });
});
