import { useEffect, useRef } from 'react';

type YouTubePlayerApi = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
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
  onProgress: (currentSeconds: number, durationSeconds: number, playing: boolean) => void;
};

export function YouTubePlayer({
  videoId,
  startSeconds = 0,
  onPlayingChange,
  onProgress,
}: YouTubePlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onProgressRef = useRef(onProgress);
  onPlayingChangeRef.current = onPlayingChange;
  onProgressRef.current = onProgress;

  useEffect(() => {
    let player: YouTubePlayerApi | undefined;
    let timer: number | undefined;
    let active = true;
    const wrapper = wrapperRef.current;
    const report = (target: YouTubePlayerApi, playing: boolean) =>
      onProgressRef.current(target.getCurrentTime(), target.getDuration(), playing);

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
          },
          onStateChange: ({ data, target }) => {
            if (timer) window.clearInterval(timer);
            const playing = data === YT.PlayerState.PLAYING;
            onPlayingChangeRef.current(playing);
            if (playing) {
              timer = window.setInterval(() => report(target, true), 10000);
            } else if (data === YT.PlayerState.PAUSED || data === YT.PlayerState.ENDED) {
              report(target, false);
            }
          },
        },
      });
    });

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
      player?.destroy();
      wrapper?.replaceChildren();
    };
  }, [startSeconds, videoId]);

  return <div className="youtube-player" ref={wrapperRef} />;
}
