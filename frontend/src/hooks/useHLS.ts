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
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
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

      hls.on(Hls.Events.ERROR, (_evt, data) => {
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

      return () => {
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
