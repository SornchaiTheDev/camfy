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

export function getDiskTotalBytes(path: string): { total: number; free: number } {
  try {
    const result = Bun.spawnSync(["df", "-B1", path]);
    if (result.exitCode !== 0) return { total: 0, free: 0 };
    const lines = new TextDecoder().decode(result.stdout).trim().split("\n");
    const parts = lines[1]?.split(/\s+/) ?? [];
    return {
      total: parseInt(parts[1] ?? "0", 10),
      free: parseInt(parts[3] ?? "0", 10),
    };
  } catch {
    return { total: 0, free: 0 };
  }
}
