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

    const closeHelp = screen.getByRole('button', { name: '도움말 닫기' });
    await user.click(closeHelp);
    await waitFor(() => expect(screen.getByRole('button', { name: '편집 방법' })).toHaveFocus());
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
