import { shell } from 'electron';
import { appDefinitions } from '../../src/data/apps';
import type { AppInstallId, AppInstallItem, AppInstallResult, AppListResult } from '../../src/types/apps';
import { runExecutable } from './powershellService';

const appIds = new Set<AppInstallId>(appDefinitions.map((item) => item.id));

export function isAppInstallId(value: unknown): value is AppInstallId {
  return typeof value === 'string' && appIds.has(value as AppInstallId);
}

async function isWingetAvailable(): Promise<boolean> {
  const result = await runExecutable('winget.exe', ['--version'], 10000);
  return result.exitCode === 0;
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

async function getWingetStatus(wingetId: string): Promise<{ installed: boolean; version: string | null }> {
  const result = await runExecutable(
    'winget.exe',
    ['list', '--id', wingetId, '--exact', '--accept-source-agreements'],
    30000
  );

  const output = `${result.stdout}\n${result.stderr}`;
  const installed = result.exitCode === 0 && output.includes(wingetId);

  return {
    installed,
    version: installed ? parseWingetListVersion(output, wingetId) : null
  };
}

export async function listInstallableApps(): Promise<AppListResult> {
  const wingetAvailable = await isWingetAvailable();
  const apps: AppInstallItem[] = [];

  for (const definition of appDefinitions) {
    if (definition.installKind === 'external') {
      apps.push({
        ...definition,
        status: 'external',
        version: null
      });
      continue;
    }

    if (!wingetAvailable || !definition.wingetId) {
      apps.push({
        ...definition,
        status: 'unknown',
        version: null
      });
      continue;
    }

    const status = await getWingetStatus(definition.wingetId);
    apps.push({
      ...definition,
      status: status.installed ? 'installed' : 'available',
      version: status.version
    });
  }

  return { apps, wingetAvailable };
}

export async function installApp(id: AppInstallId): Promise<AppInstallResult> {
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

  if (!(await isWingetAvailable())) {
    return {
      id,
      success: false,
      message: 'O winget nao esta disponivel neste Windows.',
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
      : output || `Nao foi possivel instalar ${definition.name}.`,
    status: success ? 'installed' : 'available'
  };
}
