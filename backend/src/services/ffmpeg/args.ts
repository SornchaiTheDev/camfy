import { join } from "path";
import type { Camera } from "../../types/db";

// The live grid is played by hls.js via MSE, which refuses high-res High-profile
// H.264 (e.g. 2304x1296 @ level 5.0 → avc1.640032) on many browsers/devices →
// black tile. The archive plays fine because it's remuxed to mp4 and decoded by
// the native (hardware) decoder. Fix: feed the live grid the camera's low-res
// substream while the archive keeps recording the mainstream.
//
// These cameras expose the substream by swapping the stream index in the RTSP
// path (".../av0_0" → ".../av0_1"). Returns null when no substream can be
// derived (e.g. ONVIF-resolved URLs), in which case live falls back to the
// mainstream — same behaviour as before.
export function deriveSubstreamUrl(rtspUrl: string): string | null {
  if (/\/av0_0(\b|$)/.test(rtspUrl)) return rtspUrl.replace("/av0_0", "/av0_1");
  return null;
}

export function buildFFmpegArgs(
  camera: Camera,
  chunkSecs: number,
  storagePath: string,
  dateStr: string  // e.g. "2024-01-15" — caller pre-creates this dir
): string[] {
  const camDir = join(storagePath, camera.id);
  const livePath = join(camDir, "live.m3u8");
  const archiveDir = join(camDir, dateStr);
  const archiveSegPattern = join(archiveDir, "seg_%05d.ts");
  const archivePlaylist = join(archiveDir, "archive.m3u8");

  const mainUrl = camera.rtsp_url!;
  const subUrl = deriveSubstreamUrl(mainUrl);

  // Per-input options must precede each -i.
  const inputOpts = ["-rtsp_transport", "tcp", "-timeout", "10000000"];

  const inputs = subUrl
    ? [...inputOpts, "-i", mainUrl, ...inputOpts, "-i", subUrl]
    : [...inputOpts, "-i", mainUrl];

  // When a substream exists: input 0 (main) → archive, input 1 (sub) → live.
  // When it doesn't: both outputs map the single input (no -map needed).
  const liveMap = subUrl ? ["-map", "1:v", "-map", "1:a?"] : [];
  const archiveMap = subUrl ? ["-map", "0:v", "-map", "0:a?"] : [];

  return [
    "-loglevel", "error",
    ...inputs,

    // Output 1: live (short segments, rolling window of 6) — segment length is
    // keyframe-bound under "-c:v copy", so true segment size = camera GOP. Lower
    // the camera keyframe interval to ~1-2s to actually hit this target. Fed by
    // the low-res substream so MSE/hls.js can decode it on every device.
    ...liveMap,
    "-c:v", "copy",
    "-c:a", "aac",
    "-f", "hls",
    "-hls_time", "1",
    "-hls_list_size", "6",
    "-hls_flags", "delete_segments+program_date_time",
    "-hls_segment_type", "mpegts",
    "-hls_segment_filename", join(camDir, "live_%05d.ts"),
    livePath,

    // Output 2: archive (long segments, unlimited list, append) — mainstream.
    ...archiveMap,
    "-c:v", "copy",
    "-c:a", "aac",
    "-f", "hls",
    "-hls_time", String(chunkSecs),
    "-hls_list_size", "0",
    "-hls_flags", "append_list+program_date_time",
    "-hls_segment_type", "mpegts",
    "-hls_segment_filename", archiveSegPattern,
    archivePlaylist,
  ];
}
