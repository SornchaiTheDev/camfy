import { join } from "path";
import type { Camera } from "../../types/db";

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

  return [
    "-loglevel", "error",
    "-rtsp_transport", "tcp",
    "-timeout", "10000000",
    "-i", camera.rtsp_url!,

    // Output 1: live (4s segments, rolling window of 6)
    "-c:v", "copy",
    "-c:a", "aac",
    "-f", "hls",
    "-hls_time", "4",
    "-hls_list_size", "6",
    "-hls_flags", "delete_segments+program_date_time",
    "-hls_segment_type", "mpegts",
    "-hls_segment_filename", join(camDir, "live_%05d.ts"),
    livePath,

    // Output 2: archive (long segments, unlimited list, append)
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
