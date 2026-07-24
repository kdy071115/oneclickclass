import type { LessonContentType } from '../types/class';

export type ContentProvider =
  | 'FILE'
  | 'YOUTUBE'
  | 'VIMEO'
  | 'LIVE'
  | 'DOCUMENT'
  | 'ASSIGNMENT'
  | 'EXTERNAL';

export const detectContentProvider = (
  contentUrl = '',
  contentType: LessonContentType | string = 'video',
): ContentProvider => {
  const type = contentType.toLowerCase();
  if (type.includes('live')) return 'LIVE';
  if (type.includes('document')) return 'DOCUMENT';
  if (type.includes('assignment')) return 'ASSIGNMENT';
  if (/youtu\.be|youtube\.com/i.test(contentUrl)) return 'YOUTUBE';
  if (/vimeo\.com/i.test(contentUrl)) return 'VIMEO';
  return type.includes('video') ? 'FILE' : 'EXTERNAL';
};

export const contentProviderLabel: Record<ContentProvider, string> = {
  FILE: '일반 영상',
  YOUTUBE: 'YouTube 영상',
  VIMEO: 'Vimeo 영상',
  LIVE: '라이브 참여 링크',
  DOCUMENT: '학습 자료',
  ASSIGNMENT: '과제 안내',
  EXTERNAL: '외부 링크',
};

export function validateContentUrl(contentUrl: string, contentType: LessonContentType) {
  const value = contentUrl.trim();
  if (!value) return '';
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'http:// 또는 https://로 시작하는 전체 주소를 입력해 주세요.';
  }
  if (!['http:', 'https:'].includes(parsed.protocol))
    return '웹에서 열 수 있는 http 또는 https 주소만 사용할 수 있어요.';

  const provider = detectContentProvider(value, contentType);
  if (
    provider === 'YOUTUBE' &&
    !(
      parsed.hostname === 'youtu.be'
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get('v') || parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')
    )
  )
    return '재생할 수 있는 YouTube 영상 주소인지 확인해 주세요.';
  if (provider === 'VIMEO' && !/\/\d+(?:$|[/?#])/.test(parsed.pathname))
    return 'Vimeo 영상 번호가 포함된 주소를 입력해 주세요.';
  return '';
}
