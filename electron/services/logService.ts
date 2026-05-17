import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { OptimizationId } from '../../src/types/optimization';

export async function logOptimizationAction(
  id: OptimizationId,
  action: 'apply' | 'revert' | 'status' | 'restore-point',
  success: boolean,
  message: string
): Promise<void> {
  const logDir = path.join(app.getPath('userData'), 'logs');
  const logPath = path.join(logDir, 'optimizations.log');
  const line = JSON.stringify({
    at: new Date().toISOString(),
    id,
    action,
    success,
    message
  });

  await fs.mkdir(logDir, { recursive: true });
  await fs.appendFile(logPath, `${line}\n`, 'utf8');
}
