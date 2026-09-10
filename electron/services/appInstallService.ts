import { shell } from 'electron';
import { appDefinitions } from '../../src/data/apps';
import type { AppInstallId, AppInstallItem, AppInstallResult, AppListResult } from '../../src/types/apps';
import { commandFailureMessage, runExecutable } from './powershellService';

const appIds = new Set<AppInstallId>(appDefinitions.map((item) => item.id));
const WINGET_STATUS_CONCURRENCY = 3;

export function isAppInstallId(value: unknown): value is AppInstallId {
  return typeof value === 'string' && appIds.has(value as AppInstallId);
}

interface WingetAvailability {
  available: boolean;
  message: string | null;
}

interface WingetStatus {
  status: 'installed' | 'available' | 'unknown';
  version: string | null;
  message: string | null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function getWingetAvailability(): Promise<WingetAvailability> {
  try {
    const result = await runExecutable('winget.exe', ['--version'], 10000);
    if (result.exitCode === 0) {
      return { available: true, message: null };
    }

    return {
      available: false,
      message: commandFailureMessage(result, 'O winget não está disponível neste Windows.')
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { available: false, message: `Não foi possível verificar o winget. Detalhes: ${detail}` };
  }
}

function parseWingetListVersion(output: string, wingetId: string): string | null {
  const line = output
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.includes(wingetId));

  if (!line) return null;

  const parts = line.split(/\s{2,}/).filter(Boolean);
  return parts.length >= 3 ? parts[2] : null;
}

async function getWingetStatus(wingetId: string): Promise<WingetStatus> {
  try {
    const result = await runExecutable(
      'winget.exe',
      ['list', '--id', wingetId, '--exact', '--accept-source-agreements'],
      30000
    );

    if (result.exitCode !== 0) {
      return {
        status: 'unknown',
        version: null,
        message: commandFailureMessage(result, `Não foi possível consultar o status de ${wingetId}.`)
      };
    }

    const output = `${result.stdout}\n${result.stderr}`;
    const installed = output.includes(wingetId);

    return {
      status: installed ? 'installed' : 'available',
      version: installed ? parseWingetListVersion(output, wingetId) : null,
      message: null
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      status: 'unknown',
      version: null,
      message: `Não foi possível consultar o status de ${wingetId}. Detalhes: ${detail}`
    };
  }
}

function withDiagnosticNote(item: AppInstallItem, message: string | null): AppInstallItem {
  if (!message) return item;
  return {
    ...item,
    note: item.note ? `${item.note} ${message}` : message
  };
}

export async function listInstallableApps(): Promise<AppListResult> {
  const winget = await getWingetAvailability();
  const wingetDefinitions = appDefinitions.filter((definition) => definition.installKind === 'winget');
  const statuses = winget.available
    ? await mapWithConcurrency(wingetDefinitions, WINGET_STATUS_CONCURRENCY, async (definition) => ({
        id: definition.id,
        status: await getWingetStatus(definition.wingetId as string)
      }))
    : [];
  const statusById = new Map(statuses.map((item) => [item.id, item.status]));

  const apps = appDefinitions.map((definition) => {
    if (definition.installKind === 'external') {
      return {
        ...definition,
        status: 'external' as const,
        version: null
      };
    }

    if (!winget.available) {
      return withDiagnosticNote(
        {
          ...definition,
          status: 'unknown' as const,
          version: null
        },
        winget.message
      );
    }

    const status = statusById.get(definition.id);
    return withDiagnosticNote(
      {
        ...definition,
        status: status?.status ?? 'unknown',
        version: status?.version ?? null
      },
      status?.message ?? null
    );
  });

  return { apps, wingetAvailable: winget.available };
}

async function installAppInternal(id: AppInstallId): Promise<AppInstallResult> {
  const definition = appDefinitions.find((item) => item.id === id);

  if (!definition) {
    return {
      id,
      success: false,
      message: 'Aplicativo invalido.',
      status: 'unknown'
    };
  }

  if (definition.installKind === 'external') {
    if (!definition.downloadUrl) {
      return {
        id,
        success: false,
        message: 'Link oficial de download nao configurado.',
        status: 'unknown'
      };
    }

    await shell.openExternal(definition.downloadUrl);
    return {
      id,
      success: true,
      message: `Pagina oficial do ${definition.name} aberta para download.`,
      status: 'external'
    };
  }

  if (!definition.wingetId) {
    return {
      id,
      success: false,
      message: 'Pacote winget nao configurado.',
      status: 'unknown'
    };
  }

  const winget = await getWingetAvailability();
  if (!winget.available) {
    return {
      id,
      success: false,
      message: winget.message ?? 'O winget nao esta disponivel neste Windows.',
      status: 'unknown'
    };
  }

  const installResult = await runExecutable(
    'winget.exe',
    [
      'install',
      '--id',
      definition.wingetId,
      '--exact',
      '--source',
      'winget',
      '--accept-source-agreements',
      '--accept-package-agreements',
      '--silent'
    ],
    900000
  );

  const output = `${installResult.stdout}\n${installResult.stderr}`.trim();
  const success = installResult.exitCode === 0;

  return {
    id,
    success,
    message: success
      ? `${definition.name} instalado ou atualizado com sucesso.`
      : commandFailureMessage(installResult, output || `Nao foi possivel instalar ${definition.name}.`),
    status: success ? 'installed' : 'available'
  };
}

export async function installApp(id: AppInstallId): Promise<AppInstallResult> {
  try {
    return await installAppInternal(id);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      id,
      success: false,
      message: `Não foi possível iniciar a instalação. Detalhes: ${detail}`,
      status: 'unknown'
    };
  }
}
