import { describe, expect, it } from 'vitest';
import {
  detectContentProvider,
  getVimeoEmbedUrl,
  getVimeoVideoId,
  validateContentUrl,
} from './content';

describe('content helpers', () => {
  it('detects LX2 content providers from type and URL', () => {
    expect(detectContentProvider('https://youtu.be/abc123', 'video')).toBe('YOUTUBE');
    expect(detectContentProvider('https://vimeo.com/123456', 'video')).toBe('VIMEO');
    expect(detectContentProvider('https://cdn.example.com/class.mp4', 'video')).toBe('FILE');
    expect(detectContentProvider('https://video.example.com/watch/lesson', 'video')).toBe(
      'EXTERNAL',
    );
    expect(detectContentProvider('https://zoom.us/j/123', 'live')).toBe('LIVE');
    expect(detectContentProvider('https://files.example.com/guide.pdf', 'link')).toBe('DOCUMENT');
    expect(detectContentProvider('https://docs.google.com/document/d/abc', 'link')).toBe(
      'DOCUMENT',
    );
    expect(detectContentProvider('https://www.instagram.com/teacher', 'link')).toBe('SOCIAL');
  });

  it('rejects malformed and incomplete media URLs', () => {
    expect(validateContentUrl('youtube.com/watch?v=abc', 'video')).toContain('전체 주소');
    expect(validateContentUrl('https://youtube.com/watch', 'video')).toContain('YouTube');
    expect(validateContentUrl('https://vimeo.com/channels/staffpicks', 'video')).toContain('Vimeo');
    expect(validateContentUrl('https://video.example.com/watch/lesson', 'video')).toContain(
      'YouTube',
    );
    expect(validateContentUrl('https://youtu.be/abc123', 'video')).toBe('');
    expect(validateContentUrl('https://vimeo.com/123456789', 'video')).toBe('');
    expect(validateContentUrl('https://cdn.example.com/class.webm?token=abc', 'video')).toBe('');
    expect(validateContentUrl('https://files.example.com/guide.pdf', 'document')).toBe('');
    expect(getVimeoVideoId('https://player.vimeo.com/video/123456789')).toBe('123456789');
    expect(getVimeoEmbedUrl('https://vimeo.com/123456789/privateHash')).toContain('h=privateHash');
  });
});
