export type AppInstallId =
  | 'brave'
  | 'vscode'
  | 'codex'
  | 'nvidia-driver'
  | 'amd-driver'
  | 'discord'
  | 'vencord'
  | 'spotify'
  | 'steam'
  | 'idm'
  | 'logitech-ghub';

export type AppCategory = 'Navegador' | 'Dev' | 'Drivers' | 'Comunicacao' | 'Midia' | 'Gaming' | 'Utilitario';

export type AppInstallKind = 'winget' | 'external';

export type AppInstallStatus = 'installed' | 'available' | 'external' | 'unknown';

export interface AppDefinition {
  id: AppInstallId;
  name: string;
  description: string;
  category: AppCategory;
  installKind: AppInstallKind;
  wingetId?: string;
  downloadUrl?: string;
  requiresAdmin: boolean;
  note?: string;
}

export interface AppInstallItem extends AppDefinition {
  status: AppInstallStatus;
  version: string | null;
}

export interface AppListResult {
  apps: AppInstallItem[];
  wingetAvailable: boolean;
}

export interface AppInstallResult {
  id: AppInstallId;
  success: boolean;
  message: string;
  status: AppInstallStatus;
}
