import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { initialClassDraft } from '../constants/classDraft';
import { CLASS_DRAFT_KEY } from '../utils/classDraft';
import { CreateClassPage } from './CreateClassPage';

const creationMetaKey = 'oneclick-class-creation-meta';
const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

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
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:class-source'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    if (originalShowModal) HTMLDialogElement.prototype.showModal = originalShowModal;
    else delete (HTMLDialogElement.prototype as { showModal?: () => void }).showModal;
    if (originalClose) HTMLDialogElement.prototype.close = originalClose;
    else delete (HTMLDialogElement.prototype as { close?: () => void }).close;
    if (originalCreateObjectURL)
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
    else delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    if (originalRevokeObjectURL)
      Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL);
    else delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  });

  it('고정 헤더에 브랜드, 현재 단계와 나가기 동작을 배치한다', () => {
    const { container } = renderCreator('/classes/new');

    const progressShell = container.querySelector('.creator-progress');
    expect(container.querySelector('.creator-header')).toBeNull();
    expect(progressShell?.querySelector('.creator-brand')).not.toBeNull();
    expect(progressShell?.querySelector('.creator-progress-copy')).toHaveTextContent('진행 방식');
    expect(progressShell?.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(progressShell?.querySelector('.creator-exit')).not.toBeNull();
    expect(progressShell?.querySelector('.creator-save-status')).toBeNull();
    expect(container.querySelector('.creator-save-status')).toHaveAttribute('role', 'status');
  });

  it('진행 방식을 별도 첫 페이지에서 선택한 뒤 자료 추가로 이동한다', async () => {
    const user = userEvent.setup();
    renderCreator('/classes/new');

    expect(
      screen.getByRole('heading', { name: '어떤 방식으로 클래스를 진행하시나요?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /온라인/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /라이브/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /오프라인/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: '링크 추가' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /온라인/ }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByRole('heading', { name: '링크 추가' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
  });

  it('자료가 없으면 AI 생성을 시작할 수 없고 직접 작성 경로를 제공하지 않는다', () => {
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'source', step: 2, maxStep: 2 }),
    );
    renderCreator('/classes/new?step=2');

    expect(screen.queryByText('자료 없이 시작하기')).not.toBeInTheDocument();
    expect(screen.queryByText('직접 작성')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI가 클래스 만들기/ })).toBeDisabled();
    expect(screen.getByText('링크나 파일을 하나 이상 추가해 주세요')).toBeInTheDocument();
  });
  it('링크 입력을 기본으로 두고 컴퓨터 파일을 보조 자료로 여러 개 추가한다', async () => {
    const { container } = renderCreator('/classes/new?step=2');

    expect(screen.getByRole('textbox', { name: '자료 링크' })).toBeInTheDocument();
    expect(container.querySelector('.source-file-option')).toHaveAttribute('open');
    const input = screen.getByLabelText(/파일을 끌어놓거나 클릭해 추가하세요/);
    fireEvent.change(input, {
      target: {
        files: [
          new File(['guide'], 'guide.pdf', { type: 'application/pdf' }),
          new File(['slides'], 'slides.pptx', {
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          }),
        ],
      },
    });

    expect(await screen.findByText('guide.pdf')).toBeInTheDocument();
    expect(screen.getByText('slides.pptx')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/업로드 완료/)).toHaveLength(2));
    expect(screen.getByRole('button', { name: /AI가 클래스 만들기/ })).toBeEnabled();
    expect(screen.getByText('2개 자료를 함께 분석해 정보와 썸네일을 만들어요')).toBeInTheDocument();
  });
  it('추가한 자료를 드래그하거나 방향키로 정렬한다', async () => {
    const { container } = renderCreator('/classes/new?step=2');
    fireEvent.paste(screen.getByRole('textbox', { name: '자료 링크' }), {
      clipboardData: {
        getData: () =>
          [
            'https://first.example.com/guide',
            'https://second.example.com/guide',
            'https://third.example.com/guide',
          ].join('\n'),
      },
    });

    expect(await screen.findByRole('heading', { name: '자료 순서' })).toBeInTheDocument();
    const itemLabels = () =>
      Array.from(container.querySelectorAll('.source-order-item')).map((item) => item.textContent);
    expect(itemLabels()).toEqual([
      expect.stringContaining('first.example.com'),
      expect.stringContaining('second.example.com'),
      expect.stringContaining('third.example.com'),
    ]);

    const thirdItem = Array.from(container.querySelectorAll('.source-order-item')).find((item) =>
      item.textContent?.includes('third.example.com'),
    );
    expect(thirdItem).toBeDefined();
    Array.from(container.querySelectorAll<HTMLElement>('.source-order-item')).forEach((item) => {
      vi.spyOn(item, 'getBoundingClientRect').mockImplementation(() => {
        const currentItems = Array.from(
          container.querySelectorAll<HTMLElement>('.source-order-item'),
        );
        const top = currentItems.indexOf(item) * 80;
        const height = 66;
        return {
          x: 0,
          y: top,
          top,
          right: 600,
          bottom: top + height,
          left: 0,
          width: 600,
          height,
          toJSON: () => ({}),
        };
      });
    });
    const firstHandle = screen.getByRole('button', {
      name: /first\.example\.com 순서 이동/,
    });
    fireEvent.pointerDown(firstHandle, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 230,
    });
    expect(screen.getByText('자료 이동 중')).toBeInTheDocument();
    expect(container.querySelector('.source-drag-preview')).not.toBeNull();
    expect(itemLabels()).toEqual([
      expect.stringContaining('second.example.com'),
      expect.stringContaining('third.example.com'),
      expect.stringContaining('first.example.com'),
    ]);
    expect(
      Array.from(container.querySelectorAll('.source-order-item')).find((item) =>
        item.textContent?.includes('first.example.com'),
      ),
    ).toHaveClass('is-dragging');
    fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'mouse' });
    expect(screen.queryByText('자료 이동 중')).not.toBeInTheDocument();

    expect(itemLabels()).toEqual([
      expect.stringContaining('second.example.com'),
      expect.stringContaining('third.example.com'),
      expect.stringContaining('first.example.com'),
    ]);
    expect(
      Array.from(container.querySelectorAll('.source-order-item')).find((item) =>
        item.textContent?.includes('first.example.com'),
      ),
    ).toHaveClass('is-recently-moved');

    fireEvent.keyDown(screen.getByRole('button', { name: /second\.example\.com 순서 이동/ }), {
      key: 'ArrowDown',
    });
    expect(itemLabels()).toEqual([
      expect.stringContaining('third.example.com'),
      expect.stringContaining('second.example.com'),
      expect.stringContaining('first.example.com'),
    ]);

    const touchHandle = screen.getByRole('button', {
      name: /third\.example\.com 순서 이동/,
    });
    fireEvent.pointerDown(touchHandle, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 60,
      clientY: 400,
    });
    expect(container.querySelector('.source-drag-preview')).toHaveStyle({
      '--source-drag-x': '12px',
    });
    fireEvent.pointerCancel(window, { pointerId: 2, pointerType: 'touch' });
  });
  it.each(['manual', 'generated'] as const)(
    '저장된 %s 상태로 자료 단계에 복귀해도 입력 화면을 표시한다',
    (informationMode) => {
      sessionStorage.setItem(
        creationMetaKey,
        JSON.stringify({ deliverySelected: true, informationMode, step: 2, maxStep: 3 }),
      );

      renderCreator('/classes/new?step=2');

      expect(screen.getByRole('heading', { name: '링크 추가' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '자료 링크' })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: '어떤 자료로 클래스를 만들까요?' }),
      ).toBeInTheDocument();
    },
  );
  it('자료 단계에서 이전을 누르면 진행 방식을 다시 선택할 수 있다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({
        deliverySelected: true,
        informationMode: 'generated',
        source: 'links',
        links: [
          {
            id: 'source-1',
            url: 'https://blog.example.com/class',
            provider: 'EXTERNAL',
          },
        ],
        step: 2,
        maxStep: 2,
      }),
    );
    renderCreator('/classes/new?step=2');

    expect(screen.getByRole('heading', { name: '링크 추가' })).toBeInTheDocument();
    expect(screen.getAllByText('blog.example.com')).not.toHaveLength(0);
    await user.click(screen.getByRole('button', { name: '이전' }));
    expect(
      screen.getByRole('heading', { name: '어떤 방식으로 클래스를 진행하시나요?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /온라인/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /라이브/ }));
    expect(screen.getByRole('button', { name: /라이브/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getAllByText('blog.example.com')).not.toHaveLength(0);
  });
  it('자료가 없는 이전 초안은 같은 화면에서 게시를 막고 링크 입력을 안내한다', async () => {
    const user = userEvent.setup();
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
    renderCreator('/classes/new?step=4');

    await user.click(screen.getByRole('button', { name: '자료 추가하기' }));

    expect(screen.getByRole('heading', { name: '링크 추가' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('링크나 파일이 하나 이상 필요해요');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('게시를 마친 생성 초안은 다음 새 클래스에 남기지 않는다', async () => {
    const user = userEvent.setup();
    const completedTitle = '게시 완료 뒤 초기화할 클래스';
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        title: completedTitle,
        summary: '게시 완료 후 새 클래스에서 복원되면 안 되는 소개입니다.',
        description: '게시 상태와 신규 생성 상태를 분리하는 회귀 테스트입니다.',
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({
        deliverySelected: true,
        informationMode: 'generated',
        source: 'links',
        links: [
          {
            id: 'source-1',
            url: 'https://blog.example.com/class',
            provider: 'EXTERNAL',
          },
        ],
        step: 3,
        maxStep: 3,
      }),
    );
    renderCreator('/classes/new?step=3');

    await user.click(screen.getAllByRole('button', { name: '클래스 게시' })[0]);
    await user.click(screen.getAllByRole('button', { name: '클래스 게시' })[1]);

    await waitFor(
      () =>
        expect(
          screen.getByRole('heading', { name: '클래스와 첫 차시가 완성됐어요!' }),
        ).toBeInTheDocument(),
      { timeout: 3_000 },
    );
    expect(sessionStorage.getItem(CLASS_DRAFT_KEY)).toBeNull();
    expect(sessionStorage.getItem(creationMetaKey)).toBeNull();

    cleanup();
    renderCreator('/classes/new');
    expect(screen.queryByText(completedTitle)).toBeNull();
    expect(
      screen.getByRole('heading', { name: '어떤 방식으로 클래스를 진행하시나요?' }),
    ).toBeInTheDocument();
  });
  it('이전 버전에서 남은 완료 상태도 새 클래스 진입 시 정리한다', () => {
    const legacyTitle = '이전에 저장을 마친 클래스';
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({ ...initialClassDraft, title: legacyTitle }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({
        deliverySelected: true,
        informationMode: 'manual',
        createdId: 'completed-class',
        shareToken: 'completed-share-token',
        step: 4,
        maxStep: 4,
      }),
    );

    renderCreator('/classes/new?step=4');

    expect(screen.queryByText(legacyTitle)).toBeNull();
    expect(screen.getByRole('heading', { name: '제목을 입력해 주세요' })).toBeInTheDocument();
    expect(sessionStorage.getItem(CLASS_DRAFT_KEY)).toBeNull();
    expect(sessionStorage.getItem(creationMetaKey)).toBeNull();
  });

  it('기존 강의 수정 상태를 새 강의 생성 상태와 별도 키에 저장한다', async () => {
    const newClassMeta = {
      deliverySelected: true,
      informationMode: 'manual',
      createdId: 'new-class-draft',
      step: 2,
      maxStep: 2,
    };
    sessionStorage.setItem(creationMetaKey, JSON.stringify(newClassMeta));
    localStorage.setItem(
      'oneclick-class-preview:existing-class',
      JSON.stringify({ ...initialClassDraft, title: '기존 강의' }),
    );

    renderCreator('/classes/new?edit=existing-class&step=4');

    await waitFor(() =>
      expect(sessionStorage.getItem(`${creationMetaKey}:edit:existing-class`)).not.toBeNull(),
    );
    expect(JSON.parse(sessionStorage.getItem(creationMetaKey) || '{}')).toEqual(newClassMeta);
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
    const trigger = screen.getByRole('button', { name: '제목 수정' });
    await user.click(trigger);
    const input = screen.getByRole('textbox', { name: '제목 편집' });
    expect(input).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('button', { name: '제목 수정' })).toHaveFocus());

    const help = screen.getByRole('button', { name: '편집 방법' });
    expect(screen.queryByRole('button', { name: '도움말 닫기' })).not.toBeInTheDocument();
    await user.click(help);
    const closeHelp = screen.getByRole('button', { name: '도움말 닫기' });
    await user.click(closeHelp);
    await waitFor(() => expect(help).toHaveFocus());
  });

  it('미리보기 핵심 정보와 상세 내용을 분리하고 단일 작업 공간 맥락을 표시한다', () => {
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
    expect(screen.getByText('AI가 만든 공개 페이지를 확인하고 있어요')).toBeInTheDocument();

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

  it('진행 방식, 자료 입력과 AI 미리보기를 단계별 페이지로 배치한다', () => {
    const delivery = renderCreator('/classes/new');
    expect(delivery.container.querySelector('.class-type-grid')).not.toBeNull();
    expect(delivery.container.querySelector('.creator-information')).toBeNull();
    expect(delivery.container.querySelector('.preview-workspace')).toBeNull();
    cleanup();

    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'source', step: 2, maxStep: 2 }),
    );
    const sourceOnly = renderCreator('/classes/new?step=2');
    expect(sourceOnly.container.querySelector('.creator-information')).not.toBeNull();
    expect(sourceOnly.container.querySelector('.preview-workspace')).toBeNull();
    expect(sourceOnly.container.querySelector('.creator-actions')).toBeNull();
    expect(sourceOnly.container.querySelector('.analyze-source-button')).not.toBeNull();
    expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
    const sourceActions = sourceOnly.container.querySelector('.source-primary-actions');
    expect(sourceActions?.firstElementChild).toBe(screen.getByRole('button', { name: '이전' }));
    expect(sourceActions?.lastElementChild).toBe(
      screen.getByRole('button', { name: /AI가 클래스 만들기/ }),
    );
    cleanup();

    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'manual', step: 3, maxStep: 3 }),
    );
    const generated = renderCreator('/classes/new?step=3');
    expect(generated.container.querySelector('.creator-information')).toBeNull();
    expect(generated.container.querySelector('.preview-workspace')).not.toBeNull();
    expect(generated.container.querySelector('.creator-actions')).not.toHaveClass('single');
    expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
  });

  it('영상과 블로그 링크를 여러 개 추가하고 AI 미리보기로 바로 이동한다', async () => {
    const user = userEvent.setup();
    renderCreator('/classes/new?source=video&step=2');

    expect(screen.getByRole('heading', { name: '링크 추가' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '어떤 자료로 클래스를 만들까요?' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('자료 없이 시작하기')).not.toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: '자료 링크' });
    await user.type(input, 'https://vimeo.com/123456789');
    await user.click(screen.getByRole('button', { name: '링크 추가' }));
    await waitFor(() => expect(screen.getByText('vimeo.com')).toBeInTheDocument());

    await user.type(input, 'https://blog.example.com/react-course');
    await user.click(screen.getByRole('button', { name: '링크 추가' }));
    await waitFor(() => expect(screen.getByText('blog.example.com')).toBeInTheDocument());

    expect(document.querySelector('.source-link-item > .success')).toBeNull();
    expect(screen.getByText('2개 자료를 함께 분석해 정보와 썸네일을 만들어요')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /AI가 클래스 만들기/ }));

    await waitFor(() =>
      expect(screen.getByText('AI가 만든 공개 페이지를 확인하고 있어요')).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'AI가 클래스를 준비했어요' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '링크 추가' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
    expect(screen.getByText('AI가 만든 썸네일')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '참가비 수정' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '이런 분께 추천해요' })).toBeInTheDocument();
  });
  it('붙여넣은 여러 링크를 즉시 추가하고 프로필 링크로 강사 소개를 만든다', async () => {
    const user = userEvent.setup();
    renderCreator('/classes/new?source=video&step=2');

    expect(screen.getByRole('button', { name: '클립보드 링크 붙여넣기' })).toBeInTheDocument();
    fireEvent.paste(screen.getByRole('textbox', { name: '자료 링크' }), {
      clipboardData: {
        getData: () =>
          [
            'https://blog.example.com/react-guide',
            'https://files.example.com/guide.pdf',
            'https://www.instagram.com/mentor.studio',
          ].join('\n'),
      },
    });

    expect(await screen.findByText('blog.example.com')).toBeInTheDocument();
    expect(screen.getByText('학습 자료')).toBeInTheDocument();
    expect(screen.getByText('강사 프로필')).toBeInTheDocument();
    expect(screen.getByText('3개 자료를 함께 분석해 정보와 썸네일을 만들어요')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /AI가 클래스 만들기/ }));

    expect(await screen.findByRole('heading', { name: '강사 소개' })).toBeInTheDocument();
    expect(screen.getByText('Mentor Studio')).toBeInTheDocument();
    expect(screen.getByText(/프로필 링크 1개로 AI 자동 작성/)).toBeInTheDocument();
  });
  it('AI 미리보기에서 이전을 누르면 추가한 자료를 다시 편집할 수 있다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({
        deliverySelected: true,
        informationMode: 'generated',
        source: 'links',
        links: [
          {
            id: 'source-1',
            url: 'https://blog.example.com/class',
            provider: 'EXTERNAL',
          },
        ],
        step: 3,
        maxStep: 3,
      }),
    );
    renderCreator('/classes/new?step=3');

    expect(screen.getByText('AI가 만든 공개 페이지를 확인하고 있어요')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '이전' }));

    expect(screen.getByRole('heading', { name: '링크 추가' })).toBeInTheDocument();
    expect(screen.getByText('blog.example.com')).toBeInTheDocument();
  });
  it('일반 웹페이지 링크도 AI 참고자료로 추가한다', async () => {
    const user = userEvent.setup();
    renderCreator('/classes/new?source=video&step=2');

    await user.type(
      screen.getByRole('textbox', { name: '자료 링크' }),
      'https://video.example.com/watch/lesson',
    );
    await user.click(screen.getByRole('button', { name: '링크 추가' }));

    expect(await screen.findByText('video.example.com')).toBeInTheDocument();
    expect(screen.getByText('외부 링크')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI가 클래스 만들기/ })).toBeEnabled();
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

  it('별도 설정 페이지 없이 미리보기에서 운영 정보를 수정하고 주소 검색 포커스를 복원한다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      CLASS_DRAFT_KEY,
      JSON.stringify({
        ...initialClassDraft,
        type: 'offline',
        title: '오프라인 미리보기 클래스',
        summary: '운영 정보를 미리보기에서 바로 확인하는 클래스입니다.',
        description: '별도 설정 단계 없이 가격, 인원, 일정과 장소를 수정할 수 있습니다.',
        capacity: 20,
        address: '서울 마포구 양화로 45',
      }),
    );
    sessionStorage.setItem(
      creationMetaKey,
      JSON.stringify({ deliverySelected: true, informationMode: 'generated', step: 3, maxStep: 3 }),
    );
    const { container } = renderCreator('/classes/new?step=3');

    expect(container.querySelector('.settings-panel')).toBeNull();
    const facts = container.querySelector('.preview-facts.offline');
    expect(
      Array.from(facts?.children ?? []).map(
        (fact) => fact.querySelector('.preview-fact-copy small')?.textContent,
      ),
    ).toEqual(['참가비', '참가인원', '일정', '장소']);

    const addressTrigger = screen.getByRole('button', { name: '클래스 장소 수정' });
    await user.click(addressTrigger);
    await user.click(screen.getByRole('button', { name: '주소 검색' }));
    const searchInput = screen.getByPlaceholderText('도로명, 건물명 또는 지번 검색');
    expect(searchInput).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('button', { name: '주소 검색' })).toHaveFocus());
  });
});
