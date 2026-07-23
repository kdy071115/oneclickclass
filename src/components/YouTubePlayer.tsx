import { useEffect, useRef } from 'react';

type YouTubePlayerApi = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  pauseVideo: () => void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: { target: YouTubePlayerApi }) => void;
        onStateChange: (event: { data: number; target: YouTubePlayerApi }) => void;
      };
    },
  ) => YouTubePlayerApi;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeNamespace> | undefined;

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.getElementById('youtube-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });
  return apiPromise;
};

type YouTubePlayerProps = {
  videoId: string;
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

export function YouTubePlayer({
  videoId,
  startSeconds = 0,
  onPlayingChange,
  onProgress,
  onTimeChange,
  onDuration,
}: YouTubePlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onProgressRef = useRef(onProgress);
  const onTimeChangeRef = useRef(onTimeChange);
  const onDurationRef = useRef(onDuration);
  onPlayingChangeRef.current = onPlayingChange;
  onProgressRef.current = onProgress;
  onTimeChangeRef.current = onTimeChange;
  onDurationRef.current = onDuration;

  useEffect(() => {
    let player: YouTubePlayerApi | undefined;
    let progressTimer: number | undefined;
    let timeTimer: number | undefined;
    let active = true;
    const wrapper = wrapperRef.current;
    const report = (target: YouTubePlayerApi, playing: boolean, ended = false) =>
      onProgressRef.current(target.getCurrentTime(), target.getDuration(), playing, ended);

    void loadYouTubeApi().then((YT) => {
      if (!active || !wrapper) return;
      const mount = document.createElement('div');
      wrapper.replaceChildren(mount);
      player = new YT.Player(mount, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: ({ target }) => {
            if (startSeconds > 0) target.seekTo(startSeconds, true);
            const duration = target.getDuration();
            if (duration > 0) onDurationRef.current?.(duration);
          },
          onStateChange: ({ data, target }) => {
            if (progressTimer) window.clearInterval(progressTimer);
            if (timeTimer) window.clearInterval(timeTimer);
            const playing = data === YT.PlayerState.PLAYING;
            onPlayingChangeRef.current(playing);
            if (playing) {
              progressTimer = window.setInterval(() => report(target, true), 10000);
              timeTimer = window.setInterval(() => {
                if (onTimeChangeRef.current?.(target.getCurrentTime())) target.pauseVideo();
              }, 500);
            } else if (data === YT.PlayerState.PAUSED || data === YT.PlayerState.ENDED) {
              report(target, false, data === YT.PlayerState.ENDED);
            }
          },
        },
      });
    });

    return () => {
      active = false;
      if (progressTimer) window.clearInterval(progressTimer);
      if (timeTimer) window.clearInterval(timeTimer);
      player?.destroy();
    };
  }, [startSeconds, videoId]);

  return <div className="youtube-player" ref={wrapperRef} />;
}
