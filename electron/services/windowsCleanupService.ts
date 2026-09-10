import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanupDefinitions } from '../../src/data/cleanup';
import type { CleanupId, CleanupListResult, CleanupRunResult } from '../../src/types/cleanup';
import { isRunningAsAdmin } from './adminService';
import { commandFailureMessage, runExecutable, runPowerShellScript } from './powershellService';

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

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

async function stopExplorer(): Promise<void> {
  const stop = await runExecutable('taskkill.exe', ['/f', '/im', 'explorer.exe'], 10000);
  if (stop.failure && stop.failure !== 'exit-error') {
    throw new Error(commandFailureMessage(stop, 'Não foi possível encerrar o Explorer.'));
  }
}

async function startExplorer(): Promise<void> {
  const start = await runPowerShellScript('Start-Process explorer.exe -ErrorAction Stop', { timeoutMs: 10000 });
  if (start.exitCode !== 0) {
    throw new Error(commandFailureMessage(start, 'Não foi possível reiniciar o Explorer.'));
  }
}

async function restartExplorer(): Promise<void> {
  await stopExplorer();

  await startExplorer();
}

async function removePathContents(pathsExpression: string): Promise<void> {
  const result = await runPowerShellScript(
    `
$paths = ${pathsExpression}
$errors = [System.Collections.Generic.List[string]]::new()
foreach ($path in $paths) {
  if (-not (Test-Path -LiteralPath $path)) { continue }

  try {
    $items = @(Get-ChildItem -LiteralPath $path -Force -ErrorAction Stop)
  } catch {
    [void]$errors.Add($path + ': ' + $_.Exception.Message)
    continue
  }

  foreach ($item in $items) {
    try {
      Remove-Item -LiteralPath $item.FullName -Force -Recurse -ErrorAction Stop
    } catch {
      [void]$errors.Add($item.FullName + ': ' + $_.Exception.Message)
    }
  }
}

if ($errors.Count -gt 0) {
  $errors | Select-Object -First 5 | ForEach-Object { Write-Error $_ }
  exit 1
}
`,
    { timeoutMs: 120000 }
  );

  if (result.exitCode !== 0) {
    throw new Error(commandFailureMessage(result, 'Falha ao remover arquivos.'));
  }
}

async function runSingleCleanup(id: CleanupId): Promise<SingleCleanupResult> {
  try {
    switch (id) {
      case 'temp-files': {
        const beforeBytes = await estimateTaskBytes(id);
        await removePathContents('@($env:TEMP, "$env:WINDIR\\Temp")');
        return {
          id,
          success: true,
          message: 'Arquivos temporários removidos.',
          cleanedBytes: beforeBytes
        };
      }
      case 'prefetch-files': {
        if (!(await isRunningAsAdmin())) {
          return {
            id,
            success: false,
            message: 'Limpar Prefetch exige executar o ItoBoost como administrador.',
            cleanedBytes: null
          };
        }
        const beforeBytes = await estimateTaskBytes(id);
        await removePathContents('@("$env:WINDIR\\Prefetch")');
        return {
          id,
          success: true,
          message: 'Arquivos Prefetch removidos.',
          cleanedBytes: beforeBytes
        };
      }
      case 'recycle-bin': {
        const beforeBytes = await estimateTaskBytes(id);
        const result = await runPowerShellScript('Clear-RecycleBin -Force -ErrorAction Stop', { timeoutMs: 120000 });
        return {
          id,
          success: result.exitCode === 0,
          message:
            result.exitCode === 0
              ? 'Lixeira esvaziada.'
              : commandFailureMessage(result, 'Não foi possível esvaziar a Lixeira.'),
          cleanedBytes: result.exitCode === 0 ? beforeBytes : null
        };
      }
      case 'windows-update-cache': {
        if (!(await isRunningAsAdmin())) {
          return {
            id,
            success: false,
            message: 'Limpar cache do Windows Update exige executar o ItoBoost como administrador.',
            cleanedBytes: null
          };
        }

        const beforeBytes = await estimateTaskBytes(id);
        let cleanupError: Error | null = null;
        try {
          const stopServices = await runPowerShellScript('Stop-Service wuauserv,bits -Force -ErrorAction Stop', {
            timeoutMs: 30000
          });
          if (stopServices.exitCode !== 0) {
            throw new Error(commandFailureMessage(stopServices, 'Não foi possível pausar o Windows Update.'));
          }
          await removePathContents('@("$env:WINDIR\\SoftwareDistribution\\Download")');
        } catch (error) {
          cleanupError = toError(error, 'Não foi possível limpar o cache do Windows Update.');
        }

        let restoreError: Error | null = null;
        try {
          const startServices = await runPowerShellScript('Start-Service bits,wuauserv -ErrorAction Stop', {
            timeoutMs: 30000
          });
          if (startServices.exitCode !== 0) {
            throw new Error(commandFailureMessage(startServices, 'Não foi possível reativar o Windows Update.'));
          }
        } catch (error) {
          restoreError = toError(error, 'Não foi possível reativar o Windows Update.');
        }

        if (cleanupError || restoreError) {
          const details = [cleanupError?.message, restoreError?.message].filter(Boolean).join(' ');
          throw new Error(details || 'Falha ao limpar o cache do Windows Update.');
        }

        return {
          id,
          success: true,
          message: 'Cache do Windows Update removido.',
          cleanedBytes: beforeBytes
        };
      }
      case 'thumbnail-cache': {
        const beforeBytes = await estimateTaskBytes(id);
        let removeError: Error | null = null;
        let restartError: Error | null = null;

        try {
          await stopExplorer();
          const removeCache = await runPowerShellScript(
            '$files = Get-ChildItem "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*.db" -Force -ErrorAction SilentlyContinue; if ($files) { $files | Remove-Item -Force -ErrorAction Stop }',
            { timeoutMs: 30000 }
          );
          if (removeCache.exitCode !== 0) {
            throw new Error(commandFailureMessage(removeCache, 'Não foi possível remover o cache de miniaturas.'));
          }
        } catch (error) {
          removeError = toError(error, 'Não foi possível remover o cache de miniaturas.');
        } finally {
          try {
            await startExplorer();
          } catch (error) {
            restartError = toError(error, 'Não foi possível reiniciar o Explorer.');
          }
        }

        if (removeError || restartError) {
          const details = [removeError?.message, restartError?.message].filter(Boolean).join(' ');
          throw new Error(details || 'Falha ao limpar o cache de miniaturas.');
        }

        return {
          id,
          success: true,
          message: 'Cache de miniaturas removido. O Explorer foi reiniciado.',
          cleanedBytes: beforeBytes
        };
      }
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
  const validIds = [...new Set(ids.filter(isCleanupId))];
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
  const previousState = await readState();
  const nextCleanupAt = new Date().toISOString();
  let lastCleanupAt = previousState.lastCleanupAt;
  let message = success ? 'Limpeza concluída com sucesso.' : 'Algumas limpezas não puderam ser concluídas.';
  let finalSuccess = success;

  if (success) {
    try {
      await writeState({ lastCleanupAt: nextCleanupAt });
      lastCleanupAt = nextCleanupAt;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      finalSuccess = false;
      message = `As limpezas foram executadas, mas o estado não pôde ser salvo. Detalhes: ${detail}`;
    }
  }

  return {
    success: finalSuccess,
    message,
    cleanedBytes,
    requiresExplorerRestart: validIds.includes('thumbnail-cache'),
    results,
    lastCleanupAt
  };
}
