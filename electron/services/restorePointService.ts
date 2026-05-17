import { isRunningAsAdmin } from './adminService';
import { runPowerShellScript } from './powershellService';
import type { CreateRestorePointResult } from '../../src/types/optimization';

export async function createRestorePoint(): Promise<CreateRestorePointResult> {
  if (!(await isRunningAsAdmin())) {
    return {
      success: false,
      message: 'Para criar ponto de restauração, execute o ItoBoost como administrador.'
    };
  }

  const result = await runPowerShellScript(
    "Checkpoint-Computer -Description 'ItoBoost antes de otimização sensível' -RestorePointType 'MODIFY_SETTINGS'",
    { timeoutMs: 60000 }
  );

  if (result.exitCode !== 0) {
    return {
      success: false,
      message:
        'Não foi possível criar o ponto de restauração. Verifique se a Proteção do Sistema está ativa no Windows.'
    };
  }

  return {
    success: true,
    message: 'Ponto de restauração criado com sucesso.'
  };
}
