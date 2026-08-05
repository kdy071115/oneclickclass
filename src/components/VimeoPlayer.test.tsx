import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VimeoPlayer } from './VimeoPlayer';

describe('VimeoPlayer', () => {
  it('비공개 해시를 보존한 Vimeo 플레이어를 렌더링한다', () => {
    render(
      <VimeoPlayer
        url="https://vimeo.com/123456789/privateHash"
        onPlayingChange={vi.fn()}
        onProgress={vi.fn()}
      />,
    );

    const iframe = screen.getByTitle('Vimeo 강의 영상');
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining('https://player.vimeo.com/video/123456789?'),
    );
    expect(iframe).toHaveAttribute('src', expect.stringContaining('h=privateHash'));
    expect(screen.getByRole('status')).toHaveTextContent('영상을 준비하고 있어요.');

    fireEvent.load(iframe);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
