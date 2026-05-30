export type CleanupId =
  | 'temp-files'
  | 'prefetch-files'
  | 'recycle-bin'
  | 'windows-update-cache'
  | 'thumbnail-cache';

export type CleanupRiskLevel = 'low' | 'medium' | 'high';

export interface CleanupDefinition {
  id: CleanupId;
  title: string;
  description: string;
  riskLevel: CleanupRiskLevel;
  requiresAdmin: boolean;
  requiresExplorerRestart: boolean;
  warningMessage?: string;
}

export interface CleanupTask extends CleanupDefinition {
  estimatedBytes: number | null;
}

export interface CleanupListResult {
  tasks: CleanupTask[];
  lastCleanupAt: string | null;
}

export interface CleanupRunResult {
  success: boolean;
  message: string;
  cleanedBytes: number | null;
  requiresExplorerRestart: boolean;
  results: Array<{
    id: CleanupId;
    success: boolean;
    message: string;
    cleanedBytes: number | null;
  }>;
  lastCleanupAt: string | null;
}
