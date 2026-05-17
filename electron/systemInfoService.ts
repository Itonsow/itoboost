import si from 'systeminformation';
import type { SystemInfo } from '../src/types/system';

const toNullableNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export async function getSystemInfo(): Promise<SystemInfo> {
  const [cpu, graphics, memory, disks, os] = await Promise.all([
    si.cpu(),
    si.graphics(),
    si.mem(),
    si.diskLayout(),
    si.osInfo()
  ]);

  const primaryGpu =
    graphics.controllers.find((controller) => controller.vram && controller.vram > 0) ??
    graphics.controllers[0];

  const primaryDisk = disks.find((disk) => disk.size && disk.size > 0) ?? disks[0];

  return {
    cpu: {
      brand: cpu.brand || null,
      manufacturer: cpu.manufacturer || null,
      cores: toNullableNumber(cpu.cores),
      physicalCores: toNullableNumber(cpu.physicalCores),
      speedGhz: toNullableNumber(cpu.speed)
    },
    gpu: {
      model: primaryGpu?.model || null,
      vendor: primaryGpu?.vendor || null,
      vramMb: toNullableNumber(primaryGpu?.vram)
    },
    memory: {
      totalBytes: toNullableNumber(memory.total)
    },
    storage: {
      name: primaryDisk?.name || primaryDisk?.device || null,
      type: primaryDisk?.type || primaryDisk?.interfaceType || null,
      sizeBytes: toNullableNumber(primaryDisk?.size)
    },
    os: {
      platform: os.platform || null,
      distro: os.distro || null,
      release: os.release || null,
      arch: os.arch || null,
      build: os.build || null
    },
    collectedAt: new Date().toISOString()
  };
}
