import { useEffect, useRef, useState } from 'react';
import { getVimeoEmbedUrl } from '../utils/content';

type VimeoPlayerProps = {
  url: string;
  startSeconds?: number;
  onPlayingChange: (playing: boolean) => void;
  onProgress: (
    currentSeconds: number,
    durationSeconds: number,
    playing: boolean,
    ended: boolean,
  ) => void;
  onTimeChange?: (currentSeconds: number) => boolean;
  onDuration?: (durationSeconds: number) => void;
};

type VimeoMessage = {
  event?: string;
  method?: string;
  value?: number;
  data?: number | { seconds?: number; duration?: number };
};

const parseMessage = (value: unknown): VimeoMessage | undefined => {
  if (typeof value === 'object' && value) return value as VimeoMessage;
  if (typeof value !== 'string') return undefined;
  try {
    return JSON.parse(value) as VimeoMessage;
  } catch {
    return undefined;
  }
};

export function VimeoPlayer({
  url,
  startSeconds = 0,
  onPlayingChange,
  onProgress,
  onTimeChange,
  onDuration,
}: VimeoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const currentSecondsRef = useRef(0);
  const durationSecondsRef = useRef(0);
  const playingRef = useRef(false);
  const lastReportRef = useRef(0);
  const callbacksRef = useRef({ onPlayingChange, onProgress, onTimeChange, onDuration });
  callbacksRef.current = { onPlayingChange, onProgress, onTimeChange, onDuration };

  useEffect(() => {
    const iframe = iframeRef.current;
    const player = iframe?.contentWindow;
    if (!iframe || !player) return;
    setReady(false);
    currentSecondsRef.current = startSeconds;
    durationSecondsRef.current = 0;
    playingRef.current = false;
    lastReportRef.current = startSeconds;
    const post = (message: Record<string, unknown>) =>
      player.postMessage(JSON.stringify(message), 'https://player.vimeo.com');
    const report = (ended = false) =>
      callbacksRef.current.onProgress(
        currentSecondsRef.current,
        durationSecondsRef.current,
        playingRef.current,
        ended,
      );
    const subscribe = () => {
      ['play', 'pause', 'timeupdate', 'ended', 'durationchange'].forEach((event) =>
        post({ method: 'addEventListener', value: event }),
      );
      post({ method: 'getDuration' });
      if (startSeconds > 0) post({ method: 'setCurrentTime', value: startSeconds });
      setReady(true);
    };
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== 'https://player.vimeo.com' || event.source !== player) return;
      const message = parseMessage(event.data);
      if (!message) return;
      const messageData = typeof message.data === 'object' ? message.data : undefined;
      const seconds = messageData?.seconds;
      const duration =
        messageData?.duration ??
        (message.method === 'getDuration'
          ? typeof message.data === 'number'
            ? message.data
            : message.value
          : undefined);
      if (typeof duration === 'number' && duration > 0) {
        durationSecondsRef.current = duration;
        callbacksRef.current.onDuration?.(duration);
      }
      if (typeof seconds === 'number') {
        currentSecondsRef.current = seconds;
        if (callbacksRef.current.onTimeChange?.(seconds)) post({ method: 'pause' });
        if (seconds - lastReportRef.current >= 10) {
          lastReportRef.current = seconds;
          report();
        }
      }
      if (message.event === 'play') {
        playingRef.current = true;
        callbacksRef.current.onPlayingChange(true);
      }
      if (message.event === 'pause') {
        playingRef.current = false;
        callbacksRef.current.onPlayingChange(false);
        report();
      }
      if (message.event === 'ended') {
        playingRef.current = false;
        callbacksRef.current.onPlayingChange(false);
        report(true);
      }
    };
    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', subscribe);
    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', subscribe);
    };
  }, [startSeconds, url]);

  const embedUrl = getVimeoEmbedUrl(url);
  return (
    <div className="youtube-player vimeo-player" aria-busy={!ready}>
      {!ready && (
        <div className="youtube-player-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>영상을 준비하고 있어요.</span>
        </div>
      )}
      <div className="youtube-player-mount">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="Vimeo 강의 영상"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
