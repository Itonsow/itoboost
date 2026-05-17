import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { optimizationDefinitions } from '../../src/data/optimizations';
import type {
  OptimizationActionResult,
  OptimizationId,
  OptimizationListResult,
  OptimizationStatus,
  OptimizationStatusResult
} from '../../src/types/optimization';
import { isRunningAsAdmin } from './adminService';
import { logOptimizationAction } from './logService';
import { runExecutable, runPowerShellScript } from './powershellService';
import { deleteRegistryValue, readRegistryValue, writeRegistryValue } from './registryService';

const GUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const TASKBAR_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced';
const CRASH_CONTROL_KEY = 'HKLM\\System\\CurrentControlSet\\Control\\CrashControl';
const STORE_BACKGROUND_KEY = 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy';
const COPILOT_KEY = 'HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot';
const COPILOT_MACHINE_KEY = 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot';
const CORE_ISOLATION_KEY =
  'HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity';
const POWER_SESSION_KEY = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power';
const POWER_CONTROL_KEY = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power';
const GAME_DVR_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR';
const GAME_CONFIG_STORE_KEY = 'HKCU\\System\\GameConfigStore';
const GAME_BAR_KEY = 'HKCU\\Software\\Microsoft\\GameBar';
const LOCATION_CONSENT_KEY =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location';
const CONTENT_DELIVERY_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager';
const MOUSE_KEY = 'HKCU\\Control Panel\\Mouse';

interface OptimizationState {
  previousPowerPlanGuid?: string;
  ultimatePowerPlanGuid?: string;
}

const allowedIds = new Set<OptimizationId>(optimizationDefinitions.map((item) => item.id));

export function isOptimizationId(value: unknown): value is OptimizationId {
  return typeof value === 'string' && allowedIds.has(value as OptimizationId);
}

function statePath() {
  return path.join(app.getPath('userData'), 'optimization-state.json');
}

async function readState(): Promise<OptimizationState> {
  try {
    return JSON.parse(await fs.readFile(statePath(), 'utf8')) as OptimizationState;
  } catch {
    return {};
  }
}

async function writeState(state: OptimizationState): Promise<void> {
  await fs.mkdir(path.dirname(statePath()), { recursive: true });
  await fs.writeFile(statePath(), JSON.stringify(state, null, 2), 'utf8');
}

function result(
  success: boolean,
  message: string,
  requiresRestart = false,
  requiresExplorerRestart = false
): OptimizationActionResult {
  return { success, message, requiresRestart, requiresExplorerRestart };
}

async function ensureAdmin(id: OptimizationId): Promise<OptimizationActionResult | null> {
  const definition = optimizationDefinitions.find((item) => item.id === id);

  if (definition?.requiresAdmin && !(await isRunningAsAdmin())) {
    return result(false, 'Não foi possível aplicar o ajuste. Execute o ItoBoost como administrador.', false, false);
  }

  return null;
}

async function getActivePowerPlanGuid(): Promise<string | null> {
  const active = await runExecutable('powercfg.exe', ['/getactivescheme'], 10000);
  return active.stdout.match(GUID_PATTERN)?.[0] ?? null;
}

async function getUltimatePowerPlanGuid(): Promise<string> {
  const state = await readState();
  if (state.ultimatePowerPlanGuid) {
    return state.ultimatePowerPlanGuid;
  }

  const duplicate = await runExecutable(
    'powercfg.exe',
    ['-duplicatescheme', 'e9a42b02-d5df-448d-aa00-03f14749eb61'],
    15000
  );

  const guid = duplicate.stdout.match(GUID_PATTERN)?.[0];
  if (!guid || duplicate.exitCode !== 0) {
    throw new Error('Não foi possível criar o plano Ultimate Performance neste Windows.');
  }

  await writeState({ ...state, ultimatePowerPlanGuid: guid });
  return guid;
}

async function restartExplorer(): Promise<void> {
  await runExecutable('taskkill.exe', ['/f', '/im', 'explorer.exe'], 10000);
  await runPowerShellScript('Start-Process explorer.exe', { timeoutMs: 10000 });
}

function registryDwordIsActive(value: string | null, activeValue: number): OptimizationStatus {
  if (!value) return 'inactive';
  const normalized = value.toLowerCase();
  const numericValue = normalized.startsWith('0x') ? Number.parseInt(normalized, 16) : Number.parseInt(normalized, 10);
  return numericValue === activeValue ? 'active' : 'inactive';
}

function registryStringIsActive(value: string | null, activeValue: string): OptimizationStatus {
  if (!value) return 'inactive';
  return value.trim().toLowerCase() === activeValue.toLowerCase() ? 'active' : 'inactive';
}

async function getWindowsBuild(): Promise<number | null> {
  const currentVersion = await readRegistryValue('HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'CurrentBuild');
  return currentVersion.value ? Number.parseInt(currentVersion.value, 10) : null;
}

async function checkStatus(id: OptimizationId): Promise<OptimizationStatusResult> {
  try {
    switch (id) {
      case 'ultimate-performance': {
        const [active, state] = await Promise.all([getActivePowerPlanGuid(), readState()]);
        return { id, status: active && active === state.ultimatePowerPlanGuid ? 'active' : 'inactive' };
      }
      case 'taskbar-left': {
        const value = await readRegistryValue(TASKBAR_KEY, 'TaskbarAl');
        return { id, status: registryDwordIsActive(value.value, 0) };
      }
      case 'detailed-bsod': {
        const value = await readRegistryValue(CRASH_CONTROL_KEY, 'DisplayParameters');
        return { id, status: registryDwordIsActive(value.value, 1) };
      }
      case 'disable-store-background-apps': {
        const value = await readRegistryValue(STORE_BACKGROUND_KEY, 'LetAppsRunInBackground');
        return { id, status: registryDwordIsActive(value.value, 2) };
      }
      case 'disable-copilot': {
        const [userValue, machineValue] = await Promise.all([
          readRegistryValue(COPILOT_KEY, 'TurnOffWindowsCopilot'),
          readRegistryValue(COPILOT_MACHINE_KEY, 'TurnOffWindowsCopilot')
        ]);
        return {
          id,
          status:
            registryDwordIsActive(userValue.value, 1) === 'active' ||
            registryDwordIsActive(machineValue.value, 1) === 'active'
              ? 'active'
              : 'inactive'
        };
      }
      case 'disable-core-isolation': {
        const value = await readRegistryValue(CORE_ISOLATION_KEY, 'Enabled');
        return { id, status: registryDwordIsActive(value.value, 0) };
      }
      case 'disable-defender-realtime': {
        const status = await runPowerShellScript('(Get-MpPreference).DisableRealtimeMonitoring', { timeoutMs: 10000 });
        if (status.exitCode !== 0) {
          return { id, status: 'unknown', message: 'O Microsoft Defender não retornou o status atual.' };
        }

        return { id, status: status.stdout.trim().toLowerCase() === 'true' ? 'active' : 'inactive' };
      }
      case 'disable-dynamic-tick': {
        const bcd = await runExecutable('bcdedit.exe', ['/enum', '{current}'], 10000);
        if (bcd.exitCode !== 0) return { id, status: 'unknown', message: 'Não foi possível ler o BCD.' };
        return { id, status: /disabledynamictick\s+Yes/i.test(bcd.stdout) ? 'active' : 'inactive' };
      }
      case 'disable-fast-startup': {
        const value = await readRegistryValue(POWER_SESSION_KEY, 'HiberbootEnabled');
        return { id, status: registryDwordIsActive(value.value, 0) };
      }
      case 'disable-game-bar': {
        const [captureValue, dvrValue] = await Promise.all([
          readRegistryValue(GAME_DVR_KEY, 'AppCaptureEnabled'),
          readRegistryValue(GAME_CONFIG_STORE_KEY, 'GameDVR_Enabled')
        ]);
        return {
          id,
          status:
            registryDwordIsActive(captureValue.value, 0) === 'active' &&
            registryDwordIsActive(dvrValue.value, 0) === 'active'
              ? 'active'
              : 'inactive'
        };
      }
      case 'disable-hibernation': {
        const value = await readRegistryValue(POWER_CONTROL_KEY, 'HibernateEnabled');
        return { id, status: registryDwordIsActive(value.value, 0) };
      }
      case 'disable-location-tracking': {
        const value = await readRegistryValue(LOCATION_CONSENT_KEY, 'Value');
        return { id, status: registryStringIsActive(value.value, 'Deny') };
      }
      case 'disable-lock-screen-tips': {
        const [overlayValue, subscribedValue] = await Promise.all([
          readRegistryValue(CONTENT_DELIVERY_KEY, 'RotatingLockScreenOverlayEnabled'),
          readRegistryValue(CONTENT_DELIVERY_KEY, 'SubscribedContent-338387Enabled')
        ]);
        return {
          id,
          status:
            registryDwordIsActive(overlayValue.value, 0) === 'active' &&
            registryDwordIsActive(subscribedValue.value, 0) === 'active'
              ? 'active'
              : 'inactive'
        };
      }
      case 'disable-mouse-acceleration': {
        const [speed, threshold1, threshold2] = await Promise.all([
          readRegistryValue(MOUSE_KEY, 'MouseSpeed'),
          readRegistryValue(MOUSE_KEY, 'MouseThreshold1'),
          readRegistryValue(MOUSE_KEY, 'MouseThreshold2')
        ]);
        return {
          id,
          status:
            registryStringIsActive(speed.value, '0') === 'active' &&
            registryStringIsActive(threshold1.value, '0') === 'active' &&
            registryStringIsActive(threshold2.value, '0') === 'active'
              ? 'active'
              : 'inactive'
        };
      }
    }
  } catch (error) {
    return {
      id,
      status: 'unknown',
      message: error instanceof Error ? error.message : 'Não foi possível verificar o status.'
    };
  }
}

export async function listOptimizations(): Promise<OptimizationListResult> {
  const statuses = await Promise.all(optimizationDefinitions.map((item) => checkStatus(item.id)));
  const byId = new Map(statuses.map((status) => [status.id, status.status]));

  return {
    optimizations: optimizationDefinitions.map((definition) => ({
      ...definition,
      status: byId.get(definition.id) ?? 'unknown'
    }))
  };
}

export async function getOptimizationStatus(id: OptimizationId): Promise<OptimizationStatusResult> {
  const status = await checkStatus(id);
  await logOptimizationAction(id, 'status', status.status !== 'unknown', status.message ?? status.status);
  return status;
}

export async function applyOptimization(id: OptimizationId): Promise<OptimizationActionResult> {
  const adminFailure = await ensureAdmin(id);
  if (adminFailure) {
    await logOptimizationAction(id, 'apply', false, adminFailure.message);
    return adminFailure;
  }

  try {
    let response: OptimizationActionResult;

    switch (id) {
      case 'ultimate-performance': {
        const state = await readState();
        const current = await getActivePowerPlanGuid();
        const ultimate = await getUltimatePowerPlanGuid();

        if (current && current !== ultimate && !state.previousPowerPlanGuid) {
          await writeState({ ...state, previousPowerPlanGuid: current, ultimatePowerPlanGuid: ultimate });
        }

        const activation = await runExecutable('powercfg.exe', ['/setactive', ultimate], 10000);
        response =
          activation.exitCode === 0
            ? result(true, 'Plano de energia de desempenho máximo ativado com sucesso.')
            : result(false, 'Não foi possível ativar o plano de energia. Execute o ItoBoost como administrador.');
        break;
      }
      case 'taskbar-left':
        await writeRegistryValue(TASKBAR_KEY, 'TaskbarAl', 'REG_DWORD', 0);
        await restartExplorer();
        response = result(true, 'Barra de tarefas alinhada à esquerda. O Explorer foi reiniciado.', false, true);
        break;
      case 'detailed-bsod':
        await writeRegistryValue(CRASH_CONTROL_KEY, 'DisplayParameters', 'REG_DWORD', 1);
        response = result(true, 'BSOD detalhado ativado. Este ajuste é apenas informativo.');
        break;
      case 'disable-store-background-apps': {
        const build = await getWindowsBuild();
        if (build && build < 10240) {
          response = result(false, 'Esta versão do Windows não oferece suporte confiável para este ajuste.');
          break;
        }

        await writeRegistryValue(STORE_BACKGROUND_KEY, 'LetAppsRunInBackground', 'REG_DWORD', 2);
        response = result(true, 'Apps da Microsoft Store em segundo plano foram bloqueados por política local.');
        break;
      }
      case 'disable-copilot':
        await writeRegistryValue(COPILOT_KEY, 'TurnOffWindowsCopilot', 'REG_DWORD', 1);
        if (await isRunningAsAdmin()) {
          await writeRegistryValue(COPILOT_MACHINE_KEY, 'TurnOffWindowsCopilot', 'REG_DWORD', 1);
        }
        response = result(true, 'Copilot desativado por política de usuário quando disponível no sistema.');
        break;
      case 'disable-core-isolation':
        await writeRegistryValue(CORE_ISOLATION_KEY, 'Enabled', 'REG_DWORD', 0);
        response = result(true, 'Isolamento do Núcleo desativado. Reinicie o PC para concluir.', true, false);
        break;
      case 'disable-defender-realtime': {
        const defender = await runPowerShellScript('Set-MpPreference -DisableRealtimeMonitoring $true', {
          timeoutMs: 20000
        });
        response =
          defender.exitCode === 0
            ? result(true, 'Proteção em tempo real do Defender desativada temporariamente.')
            : result(
                false,
                'O Windows bloqueou a alteração do Defender. O ItoBoost não tenta contornar proteções do sistema.'
              );
        break;
      }
      case 'disable-dynamic-tick': {
        const dynamicTick = await runExecutable('bcdedit.exe', ['/set', 'disabledynamictick', 'yes'], 10000);
        response =
          dynamicTick.exitCode === 0
            ? result(true, 'Dynamic tick desativado. Reinicie o PC para concluir.', true, false)
            : result(false, 'Não foi possível alterar o BCD. Execute o ItoBoost como administrador.');
        break;
      }
      case 'disable-fast-startup':
        await writeRegistryValue(POWER_SESSION_KEY, 'HiberbootEnabled', 'REG_DWORD', 0);
        response = result(true, 'Inicialização Rápida desativada com sucesso.');
        break;
      case 'disable-game-bar':
        await writeRegistryValue(GAME_DVR_KEY, 'AppCaptureEnabled', 'REG_DWORD', 0);
        await writeRegistryValue(GAME_CONFIG_STORE_KEY, 'GameDVR_Enabled', 'REG_DWORD', 0);
        await writeRegistryValue(GAME_BAR_KEY, 'AutoGameModeEnabled', 'REG_DWORD', 0);
        response = result(true, 'Barra de Jogos do Xbox desativada para o usuário atual.');
        break;
      case 'disable-hibernation': {
        const hibernate = await runExecutable('powercfg.exe', ['/hibernate', 'off'], 20000);
        response =
          hibernate.exitCode === 0
            ? result(true, 'Hibernação desativada e hiberfil.sys removido pelo Windows.')
            : result(false, 'Não foi possível desativar a hibernação. Execute o ItoBoost como administrador.');
        break;
      }
      case 'disable-location-tracking':
        await writeRegistryValue(LOCATION_CONSENT_KEY, 'Value', 'REG_SZ', 'Deny');
        response = result(true, 'Rastreamento de localização desativado para o usuário atual.');
        break;
      case 'disable-lock-screen-tips':
        await writeRegistryValue(CONTENT_DELIVERY_KEY, 'RotatingLockScreenOverlayEnabled', 'REG_DWORD', 0);
        await writeRegistryValue(CONTENT_DELIVERY_KEY, 'SubscribedContent-338387Enabled', 'REG_DWORD', 0);
        response = result(true, 'Dicas da tela de bloqueio desativadas.');
        break;
      case 'disable-mouse-acceleration':
        await writeRegistryValue(MOUSE_KEY, 'MouseSpeed', 'REG_SZ', '0');
        await writeRegistryValue(MOUSE_KEY, 'MouseThreshold1', 'REG_SZ', '0');
        await writeRegistryValue(MOUSE_KEY, 'MouseThreshold2', 'REG_SZ', '0');
        response = result(true, 'Aceleração do mouse desativada para o usuário atual.');
        break;
    }

    await logOptimizationAction(id, 'apply', response.success, response.message);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível aplicar o ajuste.';
    await logOptimizationAction(id, 'apply', false, message);
    return result(false, message);
  }
}

export async function revertOptimization(id: OptimizationId): Promise<OptimizationActionResult> {
  const adminFailure = await ensureAdmin(id);
  if (adminFailure) {
    await logOptimizationAction(id, 'revert', false, adminFailure.message);
    return adminFailure;
  }

  try {
    let response: OptimizationActionResult;

    switch (id) {
      case 'ultimate-performance': {
        const state = await readState();
        if (!state.previousPowerPlanGuid) {
          response = result(false, 'Nenhum plano de energia anterior foi salvo para reverter.');
          break;
        }

        const rollback = await runExecutable('powercfg.exe', ['/setactive', state.previousPowerPlanGuid], 10000);
        response =
          rollback.exitCode === 0
            ? result(true, 'Plano de energia anterior restaurado com sucesso.')
            : result(false, 'Não foi possível restaurar o plano de energia anterior.');
        break;
      }
      case 'taskbar-left':
        await writeRegistryValue(TASKBAR_KEY, 'TaskbarAl', 'REG_DWORD', 1);
        await restartExplorer();
        response = result(true, 'Barra de tarefas centralizada novamente. O Explorer foi reiniciado.', false, true);
        break;
      case 'detailed-bsod':
        await writeRegistryValue(CRASH_CONTROL_KEY, 'DisplayParameters', 'REG_DWORD', 0);
        response = result(true, 'BSOD detalhado desativado.');
        break;
      case 'disable-store-background-apps':
        await deleteRegistryValue(STORE_BACKGROUND_KEY, 'LetAppsRunInBackground');
        response = result(true, 'Política de apps em segundo plano removida.');
        break;
      case 'disable-copilot':
        await deleteRegistryValue(COPILOT_KEY, 'TurnOffWindowsCopilot');
        if (await isRunningAsAdmin()) {
          await deleteRegistryValue(COPILOT_MACHINE_KEY, 'TurnOffWindowsCopilot');
        }
        response = result(true, 'Política do Copilot revertida.');
        break;
      case 'disable-core-isolation':
        await writeRegistryValue(CORE_ISOLATION_KEY, 'Enabled', 'REG_DWORD', 1);
        response = result(true, 'Isolamento do Núcleo reativado. Reinicie o PC para concluir.', true, false);
        break;
      case 'disable-defender-realtime': {
        const defender = await runPowerShellScript('Set-MpPreference -DisableRealtimeMonitoring $false', {
          timeoutMs: 20000
        });
        response =
          defender.exitCode === 0
            ? result(true, 'Proteção em tempo real do Defender reativada.')
            : result(false, 'O Windows bloqueou a alteração do Defender.');
        break;
      }
      case 'disable-dynamic-tick': {
        const dynamicTick = await runExecutable('bcdedit.exe', ['/deletevalue', 'disabledynamictick'], 10000);
        response =
          dynamicTick.exitCode === 0
            ? result(true, 'Dynamic tick restaurado. Reinicie o PC para concluir.', true, false)
            : result(true, 'Dynamic tick já não estava configurado no BCD.', true, false);
        break;
      }
      case 'disable-fast-startup':
        await writeRegistryValue(POWER_SESSION_KEY, 'HiberbootEnabled', 'REG_DWORD', 1);
        response = result(true, 'Inicialização Rápida reativada.');
        break;
      case 'disable-game-bar':
        await writeRegistryValue(GAME_DVR_KEY, 'AppCaptureEnabled', 'REG_DWORD', 1);
        await writeRegistryValue(GAME_CONFIG_STORE_KEY, 'GameDVR_Enabled', 'REG_DWORD', 1);
        await writeRegistryValue(GAME_BAR_KEY, 'AutoGameModeEnabled', 'REG_DWORD', 1);
        response = result(true, 'Barra de Jogos do Xbox reativada para o usuário atual.');
        break;
      case 'disable-hibernation': {
        const hibernate = await runExecutable('powercfg.exe', ['/hibernate', 'on'], 20000);
        response =
          hibernate.exitCode === 0
            ? result(true, 'Hibernação reativada.')
            : result(false, 'Não foi possível reativar a hibernação. Execute o ItoBoost como administrador.');
        break;
      }
      case 'disable-location-tracking':
        await writeRegistryValue(LOCATION_CONSENT_KEY, 'Value', 'REG_SZ', 'Allow');
        response = result(true, 'Rastreamento de localização reativado para o usuário atual.');
        break;
      case 'disable-lock-screen-tips':
        await writeRegistryValue(CONTENT_DELIVERY_KEY, 'RotatingLockScreenOverlayEnabled', 'REG_DWORD', 1);
        await writeRegistryValue(CONTENT_DELIVERY_KEY, 'SubscribedContent-338387Enabled', 'REG_DWORD', 1);
        response = result(true, 'Dicas da tela de bloqueio reativadas.');
        break;
      case 'disable-mouse-acceleration':
        await writeRegistryValue(MOUSE_KEY, 'MouseSpeed', 'REG_SZ', '1');
        await writeRegistryValue(MOUSE_KEY, 'MouseThreshold1', 'REG_SZ', '6');
        await writeRegistryValue(MOUSE_KEY, 'MouseThreshold2', 'REG_SZ', '10');
        response = result(true, 'Aceleração do mouse restaurada para o padrão do Windows.');
        break;
    }

    await logOptimizationAction(id, 'revert', response.success, response.message);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível reverter o ajuste.';
    await logOptimizationAction(id, 'revert', false, message);
    return result(false, message);
  }
}
