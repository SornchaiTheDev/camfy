import { useEffect, useRef } from "react";
import Hls from "hls.js";

type Options = {
  autoPlay?: boolean;
  muted?: boolean;
};

export function useHLS(src: string | null, options: Options = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        // Keep the live window small for low latency, but not so tight that a
        // camera hiccup (e.g. VStarcam IR day/night switch) desyncs it. The
        // watchdog below recovers if it stalls anyway.
        lowLatencyMode: false,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 6,
        enableWorker: true,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (options.autoPlay !== false) {
          video.play().catch(() => {
            // autoplay may be blocked — ignore
          });
        }
      });

      const seekToLiveEdge = () => {
        hls.startLoad();
        if (hls.liveSyncPosition != null) video.currentTime = hls.liveSyncPosition;
        video.play().catch(() => {});
      };

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        // A camera hiccup stalls the live buffer without a fatal error. Recover
        // by reloading and jumping to the live edge instead of staying frozen.
        if (!data.fatal && data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          seekToLiveEdge();
          return;
        }
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      // Watchdog: if <video> stops advancing while playing and no error fires,
      // the live edge has desynced (the IR-switch freeze). Force a re-sync.
      let lastTime = 0;
      let stalledTicks = 0;
      const watchdog = setInterval(() => {
        if (video.paused || video.seeking) return;
        if (video.currentTime === lastTime) {
          if (++stalledTicks >= 3) {
            seekToLiveEdge();
            stalledTicks = 0;
          }
        } else {
          stalledTicks = 0;
          lastTime = video.currentTime;
        }
      }, 2000);

      return () => {
        clearInterval(watchdog);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;
      if (options.autoPlay !== false) video.play().catch(() => {});
    }
  }, [src]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = options.muted ?? true;
    }
  }, [options.muted]);

  return videoRef;
}
