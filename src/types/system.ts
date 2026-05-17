export interface CpuInfo {
  brand: string | null;
  manufacturer: string | null;
  cores: number | null;
  physicalCores: number | null;
  speedGhz: number | null;
}

export interface GpuInfo {
  model: string | null;
  vendor: string | null;
  vramMb: number | null;
}

export interface MemoryInfo {
  totalBytes: number | null;
}

export interface StorageInfo {
  name: string | null;
  type: string | null;
  sizeBytes: number | null;
}

export interface OsInfo {
  platform: string | null;
  distro: string | null;
  release: string | null;
  arch: string | null;
  build: string | null;
}

export interface SystemInfo {
  cpu: CpuInfo;
  gpu: GpuInfo;
  memory: MemoryInfo;
  storage: StorageInfo;
  os: OsInfo;
  collectedAt: string;
}
