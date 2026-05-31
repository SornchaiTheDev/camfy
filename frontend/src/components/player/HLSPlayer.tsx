import { useHLS } from "../../hooks/useHLS";
import clsx from "clsx";

type Props = {
  src: string | null;
  className?: string;
  muted?: boolean;
  controls?: boolean;
  autoPlay?: boolean;
};

export function HLSPlayer({ src, className, muted = true, controls = false, autoPlay = true }: Props) {
  const videoRef = useHLS(src, { muted, autoPlay });

  return (
    <div className={clsx("relative bg-black overflow-hidden", className)}>
      {src ? (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          muted={muted}
          playsInline
          controls={controls}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-gray-500 text-sm">
          No stream
        </div>
      )}
    </div>
  );
}
