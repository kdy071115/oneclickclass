import type { LessonContentType } from '../types/class';

export type ContentProvider =
  | 'FILE'
  | 'YOUTUBE'
  | 'VIMEO'
  | 'LIVE'
  | 'DOCUMENT'
  | 'ASSIGNMENT'
  | 'EXTERNAL';

export type SupportedVideoProvider = Extract<ContentProvider, 'FILE' | 'YOUTUBE' | 'VIMEO'>;

const videoFilePattern = /\.(mp4|mov|webm)(?:$|[?#])/i;

const providerHint = (value: string): ContentProvider | undefined => {
  const normalized = value.toUpperCase() as ContentProvider;
  return ['FILE', 'YOUTUBE', 'VIMEO', 'LIVE', 'DOCUMENT', 'ASSIGNMENT', 'EXTERNAL'].includes(
    normalized,
  )
    ? normalized
    : undefined;
};

const parsedUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

const hasHost = (url: URL | undefined, host: string) =>
  Boolean(url && (url.hostname === host || url.hostname.endsWith(`.${host}`)));

export const getYouTubeVideoId = (value: string) => {
  const url = parsedUrl(value);
  if (!url) return '';
  const host = url.hostname.replace(/^www\./, '');
  const id =
    host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : host === 'youtube.com' || host === 'm.youtube.com'
        ? url.searchParams.get('v') ||
          (/^\/(shorts|embed)\//.test(url.pathname)
            ? url.pathname.split('/').filter(Boolean)[1]
            : '')
        : '';
  return id && /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : '';
};

export const getVimeoVideoId = (value: string) => {
  const url = parsedUrl(value);
  if (!hasHost(url, 'vimeo.com')) return '';
  return url?.pathname.split('/').filter(Boolean).reverse().find((part) => /^\d+$/.test(part)) ?? '';
};

export const getVimeoEmbedUrl = (value: string) => {
  const url = parsedUrl(value);
  const videoId = getVimeoVideoId(value);
  if (!url || !videoId) return '';
  const parts = url.pathname.split('/').filter(Boolean);
  const idIndex = parts.indexOf(videoId);
  const privacyHash = url.searchParams.get('h') || parts[idIndex + 1] || '';
  const params = new URLSearchParams({ api: '1', dnt: '1', playsinline: '1' });
  if (privacyHash && !/^\d+$/.test(privacyHash)) params.set('h', privacyHash);
  return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
};

export const detectContentProvider = (
  contentUrl = '',
  contentType: LessonContentType | string = 'video',
): ContentProvider => {
  const hint = providerHint(contentType);
  if (hint) return hint;
  const type = contentType.toLowerCase();
  if (type.includes('live')) return 'LIVE';
  if (type.includes('document')) return 'DOCUMENT';
  if (type.includes('assignment')) return 'ASSIGNMENT';
  const url = parsedUrl(contentUrl);
  if (hasHost(url, 'youtu.be') || hasHost(url, 'youtube.com')) return 'YOUTUBE';
  if (hasHost(url, 'vimeo.com')) return 'VIMEO';
  if (/^(blob:|data:video\/)/i.test(contentUrl) || videoFilePattern.test(contentUrl)) return 'FILE';
  return 'EXTERNAL';
};

export const isSupportedVideoProvider = (
  provider: ContentProvider,
): provider is SupportedVideoProvider =>
  provider === 'FILE' || provider === 'YOUTUBE' || provider === 'VIMEO';

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
  if (provider === 'YOUTUBE' && !getYouTubeVideoId(value))
    return '재생할 수 있는 YouTube 영상 주소인지 확인해 주세요.';
  if (provider === 'VIMEO' && !getVimeoVideoId(value))
    return 'Vimeo 영상 번호가 포함된 주소를 입력해 주세요.';
  if (contentType === 'video' && provider === 'EXTERNAL')
    return 'YouTube, Vimeo 또는 MP4·MOV·WEBM 영상 파일 주소를 입력해 주세요.';
  return '';
}
