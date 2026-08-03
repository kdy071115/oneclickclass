import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { initialClassDraft } from '../constants/classDraft';
import { CLASS_DRAFT_KEY } from '../utils/classDraft';
import { CreateClassPage } from './CreateClassPage';

const creationMetaKey = 'oneclick-class-creation-meta';

function renderCreator(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CreateClassPage />
    </MemoryRouter>,
  );
}

describe('CreateClassPage accessibility and ordering', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('별도 헤더 없이 진행 영역에 브랜드와 나가기 동작을 함께 배치한다', () => {
    const { container } = renderCreator('/classes/new');

    const progressShell = container.querySelector('.creator-progress');
    expect(container.querySelector('.creator-header')).toBeNull();
    expect(progressShell?.querySelector('.creator-brand')).not.toBeNull();
    expect(progressShell?.querySelector('nav[aria-label="클래스 만들기 진행률"]')).not.toBeNull();
    expect(progressShell?.querySelector('.creator-exit')).not.toBeNull();
    expect(progressShell?.querySelector('.creator-save-status')).toBeNull();
    expect(container.querySelector('.creator-save-status')).toHaveAttribute('role', 'status');
  });

  it('안내와 자료 다시 선택 동작을 클래스 정보 입력 폼 마지막에 함께 배치한다', () => {
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 2, maxStep: 2 }),
    );
    const { container } = renderCreator('/classes/new?step=2');

    const editor = container.querySelector('.information-editor');
    const basics = container.querySelector('.information-basics');
    const footer = container.querySelector('.information-footer');
    const ready = container.querySelector('.information-ready');
    const reset = container.querySelector('.information-source-reset');
    expect(reset).toHaveTextContent('자료 다시 선택');
    expect(basics?.querySelector('[data-creator-field="title"]')).not.toBeNull();
    expect(basics?.querySelector('[data-creator-field="summary"]')).not.toBeNull();
    expect(editor?.lastElementChild).toBe(footer);
    expect(footer?.firstElementChild).toBe(ready);
    expect(footer?.lastElementChild).toBe(reset);
  });

  it('자료가 없는 클래스는 공개 대신 기본 정보 저장으로 안내한다', () => {
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        title: '게시 확인 클래스',
        summary: '게시 전 정보 확인을 위한 충분한 길이의 클래스 소개입니다.',
        description: '게시 전 확인창과 버튼 문구를 검증하기 위한 클래스 내용입니다.',
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 4, maxStep: 4 }),
    );
    const { container } = renderCreator('/classes/new?step=4');

    const back = container.querySelector('.creator-back');
    const publish = container.querySelector('.creator-next');
    const confirmDialog = container.querySelector('.ui-confirm-dialog');
    expect(back?.querySelector('.lucide-arrow-left')).not.toBeNull();
    expect(publish).toHaveTextContent('기본 정보 저장');
    expect(publish?.querySelector('.lucide-arrow-right')).not.toBeNull();
    expect(
      Array.from(confirmDialog?.querySelectorAll('button') ?? []).map((button) => button.textContent),
    ).toContain('저장하고 계속');
  });

  it('미리보기 편집기에 명시적인 이름을 제공하고 편집 종료 후 포커스를 복원한다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        title: '접근성 테스트 클래스',
        summary: '누구나 이해할 수 있는 충분한 길이의 클래스 소개입니다.',
        description: '클래스 내용을 충분한 길이로 작성해 접근성 편집 동작을 검증합니다.',
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 4, maxStep: 4 }),
    );
    renderCreator('/classes/new?step=4');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const trigger = screen.getByRole('button', { name: '클래스 제목 수정' });
    await user.click(trigger);
    const input = screen.getByRole('textbox', { name: '클래스 제목 편집' });
    expect(input).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '클래스 제목 수정' })).toHaveFocus(),
    );

    const help = screen.getByRole('button', { name: '편집 방법' });
    expect(screen.queryByRole('button', { name: '도움말 닫기' })).not.toBeInTheDocument();
    await user.click(help);
    const closeHelp = screen.getByRole('button', { name: '도움말 닫기' });
    await user.click(closeHelp);
    await waitFor(() => expect(help).toHaveFocus());
  });

  it('미리보기 핵심 정보와 상세 내용을 분리하고 현재 진행 맥락을 표시한다', () => {
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        title: '레이아웃 테스트 클래스',
        summary: '첫 화면에서 확인할 수 있는 클래스 소개입니다.',
        description: '상세 설명은 핵심 정보 다음 영역에 배치합니다.',
        thumbnail: 'https://cdn.example.com/class-thumbnail.webp',
        thumbnailPosition: 'center',
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 4, maxStep: 4 }),
    );
    const { container } = renderCreator('/classes/new?step=4');

    expect(container.querySelector('.creator-progress-copy')).toHaveTextContent('미리보기');
    expect(screen.getByText('공개 페이지 미리보기를 편집하고 있어요')).toBeInTheDocument();

    const hero = container.querySelector('.preview-public-hero');
    const detail = container.querySelector('.preview-content');
    const description = container.querySelector('[data-preview-field="description"]');
    expect(hero?.firstElementChild).toHaveClass('preview-hero-media');
    expect(hero?.querySelector('.preview-hero-copy')).not.toBeNull();
    expect(container.querySelector('.preview-enroll-card')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '클래스 신청하기' })).not.toBeInTheDocument();
    expect(screen.queryByText('미리보기에서는 신청되지 않아요.')).not.toBeInTheDocument();
    expect(hero?.contains(description)).toBe(false);
    expect(detail?.contains(description)).toBe(true);
    expect(screen.getByLabelText('클래스 썸네일 변경')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    );
    expect(screen.getByRole('img', { name: '클래스 썸네일 미리보기' })).toHaveStyle({
      objectPosition: 'center',
    });
    expect(screen.queryByRole('group', { name: '커버 초점 위치' })).not.toBeInTheDocument();
  });

  it('단계별 제목과 하단 액션을 해당 콘텐츠 폭에 맞춰 정렬한다', () => {
    const stepOne = renderCreator('/classes/new');
    expect(stepOne.container.querySelector('.creator-step-heading')).toHaveClass('is-wide');
    expect(stepOne.container.querySelector('.creator-actions')).toHaveClass('single');
    cleanup();

    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 2, maxStep: 2 }),
    );
    const stepTwo = renderCreator('/classes/new?step=2');
    expect(stepTwo.container.querySelector('.creator-step-heading')).not.toHaveClass('is-wide');
    expect(stepTwo.container.querySelector('.creator-context')).not.toHaveClass('is-compact');
    expect(stepTwo.container.querySelectorAll('.creator-context-item')).toHaveLength(2);
    expect(stepTwo.container.querySelectorAll('.creator-context-item svg')).toHaveLength(2);
    expect(stepTwo.container.querySelector('.creator-actions')).toHaveClass('is-information');
    expect(stepTwo.container.querySelector('.creator-actions > .creator-action-group')).not.toBeNull();
    cleanup();

    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 3, maxStep: 3 }),
    );
    const stepThree = renderCreator('/classes/new?step=3');
    expect(stepThree.container.querySelector('.creator-step-heading')).toHaveClass('is-compact');
    expect(stepThree.container.querySelector('.creator-context')).toHaveClass('is-compact');
    expect(stepThree.container.querySelector('.creator-actions')).toHaveClass('is-compact');
  });

  it('라이브 미리보기 정보를 참가비, 인원, 일정 순서로 정렬한다', () => {
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        type: 'live',
        title: '라이브 레이아웃 테스트',
        summary: '긴 일정도 겹치지 않고 읽을 수 있어야 합니다.',
        description: '라이브 클래스 상세 설명입니다.',
        capacity: 30,
        startDate: '2026-08-27T19:28',
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 4, maxStep: 4 }),
    );
    const { container } = renderCreator('/classes/new?step=4');

    const facts = container.querySelector('.preview-facts.live');
    expect(facts).not.toBeNull();
    expect(
      Array.from(facts?.children ?? []).map(
        (fact) => fact.querySelector('.preview-fact-copy small')?.textContent,
      ),
    ).toEqual(['참가비', '참가인원', '일정']);
    expect(facts?.querySelector('.preview-fact-copy.schedule b')).toHaveTextContent(
      '2026년 8월 27일 오후 7:28',
    );
  });

  it('숫자 정보를 편집할 때 넓은 입력 영역과 명확한 완료 동작을 제공한다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        type: 'live',
        capacity: 30,
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 4, maxStep: 4 }),
    );
    const { container } = renderCreator('/classes/new?step=4');

    await user.click(screen.getByRole('button', { name: '참가인원 수정' }));
    const input = screen.getByRole('textbox', { name: '참가인원 편집' });
    const done = screen.getByRole('button', { name: '참가인원 편집 완료' });
    expect(input.closest('.preview-fact')).toHaveClass('is-editing');
    expect(done).toHaveTextContent('완료');
    expect(done.querySelector('.lucide-check')).not.toBeNull();
    expect(container.querySelector('.inline-number-field')).toContainElement(input);

    await user.clear(input);
    await user.type(input, '45');
    await user.click(done);
    expect(screen.getByRole('button', { name: '참가인원 수정' })).toHaveTextContent('45명');
  });

  it('장소를 편집할 때 주소 입력과 검색·완료 동작을 명확하게 구분한다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        type: 'offline',
        address: '서울 마포구 양화로 45',
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 4, maxStep: 4 }),
    );
    const { container } = renderCreator('/classes/new?step=4');

    await user.click(screen.getByRole('button', { name: '클래스 장소 수정' }));
    const input = screen.getByRole('textbox', { name: '클래스 장소 편집' });
    const search = screen.getByRole('button', { name: '주소 검색' });
    const done = screen.getByRole('button', { name: '클래스 장소 편집 완료' });
    expect(input.closest('.preview-fact')).toHaveClass('is-editing');
    expect(container.querySelector('.inline-address-field')).toContainElement(input);
    expect(search).toHaveTextContent('검색');
    expect(search.querySelector('.lucide-search')).not.toBeNull();
    expect(done).toHaveTextContent('완료');
    expect(done.querySelector('.lucide-check')).not.toBeNull();

    await user.clear(input);
    await user.type(input, '서울 마포구 월드컵북로 21');
    await user.click(done);
    expect(screen.getByRole('button', { name: '클래스 장소 수정' })).toHaveTextContent(
      '서울 마포구 월드컵북로 21',
    );
  });

  it('미리보기 일정 카드에서 날짜와 시간을 함께 수정하고 유효성을 안내한다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        type: 'live',
        title: '일정 편집 테스트 클래스',
        summary: '미리보기에서 일정을 바로 수정할 수 있는지 확인합니다.',
        description: '날짜와 시간을 함께 입력하고 검증하는 일정 편집 동작을 확인합니다.',
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 4, maxStep: 4 }),
    );
    renderCreator('/classes/new?step=4');

    await user.click(screen.getByRole('button', { name: '클래스 일정 수정' }));
    const dateInput = screen.getByLabelText('클래스 시작 날짜 편집');
    const timeInput = screen.getByLabelText('클래스 시작 시간 편집');
    expect(dateInput).toHaveFocus();

    fireEvent.change(dateInput, { target: { value: '2027-08-27' } });
    fireEvent.change(timeInput, { target: { value: '19:28' } });
    await user.click(screen.getByRole('button', { name: '클래스 일정 편집 완료' }));
    expect(screen.getByRole('button', { name: '클래스 일정 수정' })).toHaveTextContent(
      '2027년 8월 27일 오후 7:28',
    );

    await user.click(screen.getByRole('button', { name: '클래스 일정 수정' }));
    fireEvent.change(screen.getByLabelText('클래스 시작 날짜 편집'), {
      target: { value: '' },
    });
    await user.click(screen.getByRole('button', { name: '클래스 일정 편집 완료' }));
    expect(
      screen.getByText('일정을 설정하려면 시작 날짜와 시간을 모두 입력해 주세요.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('클래스 시작 시간 편집')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '클래스 일정 편집 취소' }));
    expect(screen.getByRole('button', { name: '클래스 일정 수정' })).toHaveTextContent(
      '2027년 8월 27일 오후 7:28',
    );
  });

  it('설정 카드의 DOM 순서와 화면 순서를 동일하게 유지하고 주소 검색 후 포커스를 복원한다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({ ...initialClassDraft, type: 'offline', capacity: 20 }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 3, maxStep: 3 }),
    );
    const { container } = renderCreator('/classes/new?step=3');

    const panel = container.querySelector('.settings-panel');
    expect(panel).toHaveClass('offline');
    expect(Array.from(panel?.children ?? []).map((child) => child.textContent)).toEqual([
      expect.stringContaining('참가비'),
      expect.stringContaining('참가인원'),
      expect.stringContaining('클래스 장소'),
      expect.stringContaining('일정도 지금 설정할까요?'),
    ]);

    const addressTrigger = container.querySelector<HTMLButtonElement>('.address-search-button');
    expect(addressTrigger).not.toBeNull();
    await user.click(addressTrigger!);
    const searchInput = screen.getByPlaceholderText('도로명, 건물명 또는 지번 검색');
    expect(searchInput).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(addressTrigger).toHaveFocus());
  });
});
