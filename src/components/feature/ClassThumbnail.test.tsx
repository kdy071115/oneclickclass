import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClassThumbnail } from './ClassThumbnail';

describe('ClassThumbnail', () => {
  it('uses the saved crop position for a representative image', () => {
    const { getByRole } = render(
      <ClassThumbnail
        src="https://cdn.example.com/class-thumbnail.jpg"
        position="top"
        title="업무 자동화"
        alt="저장된 업무 자동화 대표 이미지"
      />,
    );

    expect(getByRole('img', { name: '저장된 업무 자동화 대표 이미지' })).toHaveStyle({
      objectPosition: 'top',
    });
  });

  it('keeps the course title visible when no image was uploaded', () => {
    const { getByRole } = render(
      <ClassThumbnail title="업무 자동화" alt="업무 자동화 대표 이미지" />,
    );

    expect(getByRole('img', { name: '업무 자동화 대표 이미지' })).toHaveTextContent(
      '업무 자동화',
    );
  });
});
