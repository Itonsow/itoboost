export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (!bytes || bytes <= 0) return 'Indisponível';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(decimals)} ${units[index]}`;
}

export function formatGpuMemory(vramMb: number | null | undefined): string {
  if (!vramMb || vramMb <= 0) return 'VRAM indisponível';

  if (vramMb >= 1024) {
    return `${(vramMb / 1024).toFixed(1)} GB VRAM`;
  }

  return `${Math.round(vramMb)} MB VRAM`;
}

export function formatCores(cores: number | null | undefined): string {
  if (!cores || cores <= 0) return 'Núcleos indisponíveis';
  return `${cores} núcleos`;
}

export function textFallback(value: string | null | undefined, fallback = 'Indisponível'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}
