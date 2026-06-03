export function getDiskUsageBytes(path: string): number {
  try {
    const result = Bun.spawnSync(["du", "-sb", path]);
    if (result.exitCode !== 0) return 0;
    const output = new TextDecoder().decode(result.stdout);
    return parseInt(output.split("\t")[0], 10) || 0;
  } catch {
    return 0;
  }
}

// Actual filesystem usage at `path`, read straight from df's own columns
// (Used / Use%). This is the real "how full is the disk" figure and matches what
// `df -h` reports, including reserved-block accounting. Do NOT confuse with
// getDiskUsageBytes, which is the recordings-folder size (disk deletion policy).
export function getDiskStats(path: string): { used_bytes: number; total_bytes: number; percent: number } {
  try {
    // df -B1 cols: Filesystem 1B-blocks(total) Used Available Use% Mounted
    const result = Bun.spawnSync(["df", "-B1", path]);
    if (result.exitCode !== 0) return { used_bytes: 0, total_bytes: 0, percent: 0 };
    const lines = new TextDecoder().decode(result.stdout).trim().split("\n");
    const parts = lines[1]?.split(/\s+/) ?? [];
    const total = parseInt(parts[1] ?? "0", 10) || 0;
    const used = parseInt(parts[2] ?? "0", 10) || 0;
    const percent = parseInt((parts[4] ?? "0").replace("%", ""), 10) || 0;
    return { used_bytes: used, total_bytes: total, percent };
  } catch {
    return { used_bytes: 0, total_bytes: 0, percent: 0 };
  }
}
