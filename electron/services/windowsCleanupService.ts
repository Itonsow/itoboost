import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanupDefinitions } from '../../src/data/cleanup';
import type { CleanupId, CleanupListResult, CleanupRunResult } from '../../src/types/cleanup';
import { isRunningAsAdmin } from './adminService';
import { runExecutable, runPowerShellScript } from './powershellService';

interface CleanupState {
  lastCleanupAt: string | null;
}

interface SingleCleanupResult {
  id: CleanupId;
  success: boolean;
  message: string;
  cleanedBytes: number | null;
}

const allowedIds = new Set<CleanupId>(cleanupDefinitions.map((task) => task.id));

export function isCleanupId(value: unknown): value is CleanupId {
  return typeof value === 'string' && allowedIds.has(value as CleanupId);
}

function statePath() {
  return path.join(app.getPath('userData'), 'cleanup-state.json');
}

async function readState(): Promise<CleanupState> {
  try {
    return JSON.parse(await fs.readFile(statePath(), 'utf8')) as CleanupState;
  } catch {
    return { lastCleanupAt: null };
  }
}

async function writeState(state: CleanupState): Promise<void> {
  await fs.mkdir(path.dirname(statePath()), { recursive: true });
  await fs.writeFile(statePath(), JSON.stringify(state, null, 2), 'utf8');
}

async function estimateBytes(script: string): Promise<number | null> {
  const result = await runPowerShellScript(script, { timeoutMs: 30000 });
  const value = Number.parseInt(result.stdout.trim(), 10);
  return result.exitCode === 0 && Number.isFinite(value) ? value : null;
}

function sizeScript(pathsExpression: string): string {
  return `
$paths = ${pathsExpression}
$total = 0
foreach ($path in $paths) {
  if (Test-Path $path) {
    Get-ChildItem -LiteralPath $path -Force -Recurse -ErrorAction SilentlyContinue |
      ForEach-Object { if (-not $_.PSIsContainer) { $total += $_.Length } }
  }
}
[int64]$total
`;
}

async function estimateTaskBytes(id: CleanupId): Promise<number | null> {
  switch (id) {
    case 'temp-files':
      return estimateBytes(sizeScript('@($env:TEMP, "$env:WINDIR\\Temp")'));
    case 'prefetch-files':
      return estimateBytes(sizeScript('@("$env:WINDIR\\Prefetch")'));
    case 'recycle-bin':
      return estimateBytes(`
$shell = New-Object -ComObject Shell.Application
$bin = $shell.Namespace(0xA)
$total = 0
foreach ($item in $bin.Items()) {
  try { $total += [int64]($item.ExtendedProperty('Size')) } catch {}
}
[int64]$total
`);
    case 'windows-update-cache':
      return estimateBytes(sizeScript('@("$env:WINDIR\\SoftwareDistribution\\Download")'));
    case 'thumbnail-cache':
      return estimateBytes(`
$total = 0
Get-ChildItem "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*.db" -Force -ErrorAction SilentlyContinue |
  ForEach-Object { $total += $_.Length }
[int64]$total
`);
  }
}

async function restartExplorer(): Promise<void> {
  await runExecutable('taskkill.exe', ['/f', '/im', 'explorer.exe'], 10000);
  await runPowerShellScript('Start-Process explorer.exe', { timeoutMs: 10000 });
}

async function removePathContents(pathsExpression: string): Promise<void> {
  const result = await runPowerShellScript(
    `
$paths = ${pathsExpression}
foreach ($path in $paths) {
  if (Test-Path $path) {
    Get-ChildItem -LiteralPath $path -Force -ErrorAction SilentlyContinue |
      Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
  }
}
`,
    { timeoutMs: 120000 }
  );

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Falha ao remover arquivos.');
  }
}

async function runSingleCleanup(id: CleanupId): Promise<SingleCleanupResult> {
  const beforeBytes = await estimateTaskBytes(id);

  try {
    switch (id) {
      case 'temp-files':
        await removePathContents('@($env:TEMP, "$env:WINDIR\\Temp")');
        return {
          id,
          success: true,
          message: 'Arquivos temporários removidos.',
          cleanedBytes: beforeBytes
        };
      case 'prefetch-files':
        if (!(await isRunningAsAdmin())) {
          return {
            id,
            success: false,
            message: 'Limpar Prefetch exige executar o ItoBoost como administrador.',
            cleanedBytes: null
          };
        }
        await removePathContents('@("$env:WINDIR\\Prefetch")');
        return {
          id,
          success: true,
          message: 'Arquivos Prefetch removidos.',
          cleanedBytes: beforeBytes
        };
      case 'recycle-bin': {
        const result = await runPowerShellScript('Clear-RecycleBin -Force -ErrorAction Stop', { timeoutMs: 120000 });
        return {
          id,
          success: result.exitCode === 0,
          message: result.exitCode === 0 ? 'Lixeira esvaziada.' : 'Não foi possível esvaziar a Lixeira.',
          cleanedBytes: result.exitCode === 0 ? beforeBytes : null
        };
      }
      case 'windows-update-cache':
        if (!(await isRunningAsAdmin())) {
          return {
            id,
            success: false,
            message: 'Limpar cache do Windows Update exige executar o ItoBoost como administrador.',
            cleanedBytes: null
          };
        }
        await runPowerShellScript('Stop-Service wuauserv,bits -Force -ErrorAction SilentlyContinue', { timeoutMs: 30000 });
        await removePathContents('@("$env:WINDIR\\SoftwareDistribution\\Download")');
        await runPowerShellScript('Start-Service bits,wuauserv -ErrorAction SilentlyContinue', { timeoutMs: 30000 });
        return {
          id,
          success: true,
          message: 'Cache do Windows Update removido.',
          cleanedBytes: beforeBytes
        };
      case 'thumbnail-cache':
        await runExecutable('taskkill.exe', ['/f', '/im', 'explorer.exe'], 10000);
        await runPowerShellScript(
          'Remove-Item "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*.db" -Force -ErrorAction SilentlyContinue',
          { timeoutMs: 30000 }
        );
        await runPowerShellScript('Start-Process explorer.exe', { timeoutMs: 10000 });
        return {
          id,
          success: true,
          message: 'Cache de miniaturas removido. O Explorer foi reiniciado.',
          cleanedBytes: beforeBytes
        };
    }
  } catch (error) {
    return {
      id,
      success: false,
      message: error instanceof Error ? error.message : 'Falha ao executar limpeza.',
      cleanedBytes: null
    };
  }
}

export async function listCleanupTasks(): Promise<CleanupListResult> {
  const state = await readState();
  const tasks = await Promise.all(
    cleanupDefinitions.map(async (definition) => ({
      ...definition,
      estimatedBytes: await estimateTaskBytes(definition.id)
    }))
  );

  return {
    tasks,
    lastCleanupAt: state.lastCleanupAt
  };
}

export async function runCleanupTasks(ids: CleanupId[]): Promise<CleanupRunResult> {
  const validIds = ids.filter(isCleanupId);
  if (validIds.length === 0) {
    return {
      success: false,
      message: 'Nenhuma opção de limpeza válida foi selecionada.',
      cleanedBytes: null,
      requiresExplorerRestart: false,
      results: [],
      lastCleanupAt: (await readState()).lastCleanupAt
    };
  }

  const results: SingleCleanupResult[] = [];
  for (const id of validIds) {
    results.push(await runSingleCleanup(id));
  }

  const success = results.every((item) => item.success);
  const cleanedValues = results.map((item) => item.cleanedBytes).filter((value): value is number => value !== null);
  const cleanedBytes = cleanedValues.length ? cleanedValues.reduce((total, value) => total + value, 0) : null;
  const lastCleanupAt = success ? new Date().toISOString() : (await readState()).lastCleanupAt;

  if (success) {
    await writeState({ lastCleanupAt });
  }

  return {
    success,
    message: success ? 'Limpeza concluída com sucesso.' : 'Algumas limpezas não puderam ser concluídas.',
    cleanedBytes,
    requiresExplorerRestart: validIds.includes('thumbnail-cache'),
    results,
    lastCleanupAt
  };
}
