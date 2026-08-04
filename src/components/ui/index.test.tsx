import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge, BarChart, Toggle } from '.';

describe('공통 UI', () => {
  it('상태 톤에 맞는 배지를 표시한다', () => {
    render(<Badge tone="success">출석</Badge>);
    expect(screen.getByText('출석')).toHaveClass('ui-badge-success');
  });

  it('토글을 키보드 접근 가능한 switch로 동작시킨다', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="알림 받기" />);
    const toggle = screen.getByRole('switch', { name: '알림 받기' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('막대 차트의 월별 값을 접근 가능한 이름으로 제공한다', () => {
    render(
      <BarChart
        label="클래스 신청 추이"
        data={[
          { label: '6월', value: 14 },
          { label: '7월', value: 16 },
        ]}
      />,
    );

    expect(
      screen.getByRole('img', { name: '클래스 신청 추이: 6월 14건, 7월 16건' }),
    ).toBeInTheDocument();
  });
});
