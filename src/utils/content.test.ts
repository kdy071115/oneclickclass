import { describe, expect, it } from 'vitest';
import { detectContentProvider, validateContentUrl } from './content';

describe('content helpers', () => {
  it('detects LX2 content providers from type and URL', () => {
    expect(detectContentProvider('https://youtu.be/abc123', 'video')).toBe('YOUTUBE');
    expect(detectContentProvider('https://vimeo.com/123456', 'video')).toBe('VIMEO');
    expect(detectContentProvider('https://cdn.example.com/class.mp4', 'video')).toBe('FILE');
    expect(detectContentProvider('https://zoom.us/j/123', 'live')).toBe('LIVE');
  });

  it('rejects malformed and incomplete media URLs', () => {
    expect(validateContentUrl('youtube.com/watch?v=abc', 'video')).toContain('전체 주소');
    expect(validateContentUrl('https://youtube.com/watch', 'video')).toContain('YouTube');
    expect(validateContentUrl('https://vimeo.com/channels/staffpicks', 'video')).toContain('Vimeo');
    expect(validateContentUrl('https://youtu.be/abc123', 'video')).toBe('');
  });
});
