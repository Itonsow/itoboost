import { runExecutable } from './powershellService';

export type RegistryValueKind = 'REG_DWORD' | 'REG_SZ';

export interface RegistryReadResult {
  exists: boolean;
  value: string | null;
}

export async function readRegistryValue(path: string, name: string): Promise<RegistryReadResult> {
  const result = await runExecutable('reg.exe', ['query', path, '/v', name], 10000);

  if (result.exitCode !== 0) {
    return { exists: false, value: null };
  }

  const line = result.stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.toLowerCase().startsWith(name.toLowerCase()));

  if (!line) {
    return { exists: false, value: null };
  }

  const parts = line.split(/\s+/);
  return { exists: true, value: parts[parts.length - 1] ?? null };
}

export async function writeRegistryValue(
  path: string,
  name: string,
  type: RegistryValueKind,
  value: string | number
): Promise<void> {
  const result = await runExecutable('reg.exe', ['add', path, '/v', name, '/t', type, '/d', String(value), '/f'], 10000);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Falha ao gravar valor no registro.');
  }
}

export async function deleteRegistryValue(path: string, name: string): Promise<void> {
  const result = await runExecutable('reg.exe', ['delete', path, '/v', name, '/f'], 10000);

  if (result.exitCode !== 0 && !result.stderr.toLowerCase().includes('unable to find')) {
    throw new Error(result.stderr || result.stdout || 'Falha ao remover valor do registro.');
  }
}
