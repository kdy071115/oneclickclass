import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  Image as ImageIcon,
  Play,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { getVimeoEmbedUrl, getYouTubeVideoId, type ContentProvider } from '../../utils/content';

export type SourcePreviewItem = {
  id: string;
  title: string;
  label: string;
  url: string;
  previewUrl: string;
  provider: ContentProvider;
  contentType: 'video' | 'document' | 'link';
  mimeType?: string;
  thumbnailUrl?: string;
  detail?: string;
  status?: string;
};

type SourcePreviewPanelProps = {
  item: SourcePreviewItem;
  index: number;
  count: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

const fileExtension = (value: string) => {
  const pathname = value.split(/[?#]/)[0];
  return pathname.split('.').pop()?.toLowerCase() ?? '';
};

function SourcePreviewVisual({ item }: { item: SourcePreviewItem }) {
  const previewUrl = item.previewUrl || item.url;
  const extension = fileExtension(item.title || previewUrl);
  const youtubeId = item.provider === 'YOUTUBE' ? getYouTubeVideoId(item.url) : '';
  const vimeoUrl = item.provider === 'VIMEO' ? getVimeoEmbedUrl(item.url) : '';
  const isImage =
    item.mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension);
  const isPdf =
    item.mimeType === 'application/pdf' ||
    extension === 'pdf' ||
    /\.pdf(?:$|[?#])/i.test(previewUrl);
  const isVideo =
    item.contentType === 'video' ||
    item.mimeType?.startsWith('video/') ||
    ['mp4', 'mov', 'webm'].includes(extension);

  if (youtubeId) {
    return (
      <div className="source-preview-frame is-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
          title={`${item.title} 미리보기`}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (vimeoUrl) {
    return (
      <div className="source-preview-frame is-video">
        <iframe
          src={vimeoUrl}
          title={`${item.title} 미리보기`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (previewUrl && isVideo) {
    return (
      <div className="source-preview-frame is-video">
        <video src={previewUrl} controls preload="metadata">
          이 브라우저에서는 영상 미리보기를 지원하지 않아요.
        </video>
      </div>
    );
  }

  if (previewUrl && isImage) {
    return (
      <div className="source-preview-frame is-image">
        <img src={previewUrl} alt={`${item.title} 미리보기`} />
      </div>
    );
  }

  if (previewUrl && isPdf) {
    return (
      <div className="source-preview-frame is-document">
        <iframe src={previewUrl} title={`${item.title} 문서 미리보기`} />
      </div>
    );
  }

  const PlaceholderIcon =
    item.provider === 'SOCIAL'
      ? Users
      : item.contentType === 'document'
        ? FileText
        : item.contentType === 'video'
          ? Play
          : item.thumbnailUrl
            ? ImageIcon
            : Globe2;
  const message =
    item.provider === 'SOCIAL'
      ? '이 프로필은 강사 소개를 구성할 때 사용해요.'
      : item.contentType === 'document'
        ? '이 문서 형식은 브라우저에서 직접 표시하기 어려워요. 원본을 열어 확인해 주세요.'
        : '이 사이트는 안전을 위해 화면 안에서 직접 열지 않아요. 원본 페이지에서 확인해 주세요.';

  return (
    <div className="source-preview-placeholder">
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" />
      ) : (
        <i aria-hidden="true">
          <PlaceholderIcon />
        </i>
      )}
      <strong>{item.label}</strong>
      <p>{message}</p>
    </div>
  );
}

export function SourcePreviewPanel({
  item,
  index,
  count,
  onClose,
  onPrevious,
  onNext,
}: SourcePreviewPanelProps) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || panel.open) return;
    panel.showModal();
    closeButtonRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={panelRef}
      className="source-preview-panel"
      aria-modal="true"
      aria-labelledby="source-preview-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="source-preview-header">
        <span>
          <h2 id="source-preview-title">자료 미리보기</h2>
          <p>
            {index + 1} / {count}
          </p>
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="자료 미리보기 닫기"
          onClick={onClose}
        >
          <X />
        </button>
      </header>

      <nav className="source-preview-navigation" aria-label="미리볼 자료 선택">
        <button type="button" disabled={count < 2} onClick={onPrevious}>
          <ChevronLeft />
          이전 자료
        </button>
        <button type="button" disabled={count < 2} onClick={onNext}>
          다음 자료
          <ChevronRight />
        </button>
      </nav>

      <div className="source-preview-body">
        <section className="source-preview-summary">
          <small>{item.label}</small>
          <h3>{item.title}</h3>
          <p>{item.url || item.detail}</p>
        </section>

        <SourcePreviewVisual item={item} />

        <section className="source-preview-analysis" aria-labelledby="source-analysis-title">
          <span>
            <h3 id="source-analysis-title">AI가 분석할 정보</h3>
            <p>클래스를 만들 때 다른 자료와 함께 내용을 분석해요.</p>
          </span>
          <dl>
            <div>
              <dt>자료 유형</dt>
              <dd>{item.label}</dd>
            </div>
            {item.detail && (
              <div>
                <dt>자료 정보</dt>
                <dd>{item.detail}</dd>
              </div>
            )}
            {item.status && (
              <div>
                <dt>상태</dt>
                <dd>{item.status}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      {item.url && (
        <a className="source-preview-open" href={item.url} target="_blank" rel="noreferrer">
          원본 열기
          <ExternalLink />
        </a>
      )}
    </dialog>
  );
}
