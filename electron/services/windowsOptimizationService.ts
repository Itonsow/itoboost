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
import {
  deleteRegistryKey,
  deleteRegistryValue,
  readRegistryValue,
  writeRegistryValue
} from './registryService';

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
const WIFI_SENSE_CONFIG_KEY = 'HKLM\\SOFTWARE\\Microsoft\\WcmSvc\\wifinetworkmanager\\config';
const WIFI_HOTSPOT_POLICY_KEY = 'HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\default\\WiFi\\AllowWiFiHotSpotReporting';
const WIFI_AUTOCONNECT_POLICY_KEY =
  'HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\default\\WiFi\\AllowAutoConnectToWiFiSenseHotspots';
const DARK_MODE_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize';
const GRAPHICS_DRIVERS_KEY = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers';
const DIRECTX_GRAPHICS_SETTINGS_KEY = 'HKCU\\Software\\Microsoft\\DirectX\\GraphicsSettings';
const DESKTOP_KEY = 'HKCU\\Control Panel\\Desktop';
const MULTIMEDIA_SYSTEM_PROFILE_KEY =
  'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile';
const ITOBOOST_OPTIMIZATION_MARKERS_KEY = 'HKCU\\Software\\ItoBoost\\Optimizations';
const CLASSIC_CONTEXT_MENU_KEY =
  'HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32';
const CLASSIC_CONTEXT_MENU_ROOT_KEY =
  'HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}';
const TIME_ZONE_INFORMATION_KEY = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\TimeZoneInformation';
const PRIORITY_CONTROL_KEY = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl';

const OPTIONAL_MANUAL_SERVICES = [
  'XblAuthManager',
  'XblGameSave',
  'XboxGipSvc',
  'XboxNetApiSvc',
  'MapsBroker',
  'Fax',
  'RetailDemo',
  'WMPNetworkSvc'
];

interface OptimizationState {
  previousPowerPlanGuid?: string;
  ultimatePowerPlanGuid?: string;
  previousWindowsTerminalDefaultProfile?: string;
  previousServiceStartModes?: Record<string, string>;
  previousWin32PrioritySeparation?: string | null;
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function getWindowsBuild(): Promise<number | null> {
  const currentVersion = await readRegistryValue('HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'CurrentBuild');
  return currentVersion.value ? Number.parseInt(currentVersion.value, 10) : null;
}

async function registryKeyExists(path: string): Promise<boolean> {
  const query = await runExecutable('reg.exe', ['query', path], 10000);
  return query.exitCode === 0;
}

async function enableClassicContextMenu(): Promise<void> {
  const write = await runExecutable(
    'reg.exe',
    ['add', CLASSIC_CONTEXT_MENU_KEY, '/ve', '/t', 'REG_SZ', '/d', '', '/f'],
    10000
  );

  if (write.exitCode !== 0) {
    throw new Error(write.stderr || write.stdout || 'Falha ao ativar o menu de contexto clássico.');
  }

  if (!(await registryKeyExists(CLASSIC_CONTEXT_MENU_KEY))) {
    throw new Error('A chave do menu de contexto clássico não foi criada no registro.');
  }
}

async function disableClassicContextMenu(): Promise<void> {
  await deleteRegistryKey(CLASSIC_CONTEXT_MENU_ROOT_KEY);

  if (await registryKeyExists(CLASSIC_CONTEXT_MENU_KEY)) {
    throw new Error('A chave do menu de contexto clássico ainda existe no registro.');
  }
}

async function hasNvidiaGpu(): Promise<boolean> {
  const result = await runPowerShellScript(
    "(Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match 'NVIDIA' } | Select-Object -First 1 -ExpandProperty Name)",
    { timeoutMs: 10000 }
  );

  return result.exitCode === 0 && result.stdout.trim().length > 0;
}

async function oneDriveSetupPath(): Promise<string | null> {
  const script = `
$paths = @(
  "$env:SystemRoot\\SysWOW64\\OneDriveSetup.exe",
  "$env:SystemRoot\\System32\\OneDriveSetup.exe",
  "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDriveSetup.exe"
)
$paths | Where-Object { Test-Path $_ } | Select-Object -First 1
`;
  const result = await runPowerShellScript(script, { timeoutMs: 10000 });
  const setupPath = result.stdout.trim();
  return result.exitCode === 0 && setupPath ? setupPath : null;
}

async function hasOneDriveKnownFolderPaths(): Promise<boolean> {
  const script = `
$keys = @(
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders',
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders'
)
$names = @('Personal', 'Desktop', 'My Pictures')
foreach ($key in $keys) {
  $item = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
  foreach ($name in $names) {
    $value = [string]$item.PSObject.Properties[$name].Value
    $expanded = [Environment]::ExpandEnvironmentVariables($value)
    if ($expanded -match '\\\\OneDrive(\\\\|$)') { 'present'; exit 0 }
  }
}
'absent'
`;
  const result = await runPowerShellScript(script, { timeoutMs: 10000 });
  return result.exitCode === 0 && result.stdout.includes('present');
}

async function hasOneDriveInstallation(): Promise<boolean> {
  const script = `
if (Get-Process OneDrive -ErrorAction SilentlyContinue) { 'present'; exit 0 }
if (Test-Path "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDrive.exe") { 'present'; exit 0 }
if (Test-Path "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDrive.App.exe") { 'present'; exit 0 }
if (Get-AppxPackage *OneDrive* -ErrorAction SilentlyContinue) { 'present'; exit 0 }
'absent'
`;
  const result = await runPowerShellScript(script, { timeoutMs: 10000 });
  return result.exitCode === 0 && result.stdout.includes('present');
}

async function restoreKnownFoldersFromOneDrive(): Promise<void> {
  const script = `
$ErrorActionPreference = 'Stop'
$folderMap = @(
  @{ UserShellName = 'Personal'; ShellName = 'Personal'; Source = "$env:USERPROFILE\\OneDrive\\Documents"; Target = "$env:USERPROFILE\\Documents"; UserShellValue = '%USERPROFILE%\\Documents' },
  @{ UserShellName = 'Desktop'; ShellName = 'Desktop'; Source = "$env:USERPROFILE\\OneDrive\\Desktop"; Target = "$env:USERPROFILE\\Desktop"; UserShellValue = '%USERPROFILE%\\Desktop' },
  @{ UserShellName = 'My Pictures'; ShellName = 'My Pictures'; Source = "$env:USERPROFILE\\OneDrive\\Pictures"; Target = "$env:USERPROFILE\\Pictures"; UserShellValue = '%USERPROFILE%\\Pictures' }
)

foreach ($folder in $folderMap) {
  New-Item -ItemType Directory -Path $folder.Target -Force | Out-Null
  if (Test-Path -LiteralPath $folder.Source) {
    robocopy $folder.Source $folder.Target /E /XC /XN /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "Falha ao copiar arquivos de $($folder.Source) para $($folder.Target)." }
  }

  reg add 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders' /v $folder.UserShellName /t REG_EXPAND_SZ /d $folder.UserShellValue /f | Out-Null
  reg add 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders' /v $folder.ShellName /t REG_SZ /d $folder.Target /f | Out-Null
}
'done'
`;
  const result = await runPowerShellScript(script, { timeoutMs: 60000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Não foi possível restaurar as pastas do usuário fora do OneDrive.');
  }
}

async function removeModernOneDrivePackage(): Promise<void> {
  const script = `
$packages = Get-AppxPackage *OneDrive* -ErrorAction SilentlyContinue
foreach ($package in $packages) {
  Remove-AppxPackage -Package $package.PackageFullName -ErrorAction SilentlyContinue
}
'done'
`;
  const result = await runPowerShellScript(script, { timeoutMs: 120000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Não foi possível remover o pacote moderno do OneDrive.');
  }
}

async function removeOneDriveAppData(): Promise<void> {
  const script = `
$path = "$env:LOCALAPPDATA\\Microsoft\\OneDrive"
if (Test-Path -LiteralPath $path) {
  Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
}
'done'
`;
  const result = await runPowerShellScript(script, { timeoutMs: 30000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Não foi possível remover os arquivos de aplicativo do OneDrive.');
  }
}

async function removeOneDriveUserFolder(): Promise<void> {
  const script = `
$ErrorActionPreference = 'Stop'
$path = Join-Path $env:USERPROFILE 'OneDrive'
$resolved = Resolve-Path -LiteralPath $path -ErrorAction SilentlyContinue
if (-not $resolved) { 'done'; exit 0 }

$keys = @(
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders',
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders'
)
$names = @('Personal', 'Desktop', 'My Pictures')
foreach ($key in $keys) {
  $item = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
  foreach ($name in $names) {
    $value = [string]$item.PSObject.Properties[$name].Value
    $expanded = [Environment]::ExpandEnvironmentVariables($value)
    if ($expanded -and $expanded.StartsWith($resolved.Path, [StringComparison]::OrdinalIgnoreCase)) {
      throw "A pasta $path ainda está em uso pelo Windows como $name."
    }
  }
}

if ($resolved.Path -ne $path) {
  throw "Caminho inesperado para a pasta OneDrive: $($resolved.Path)."
}

Remove-Item -LiteralPath $resolved.Path -Recurse -Force
'done'
`;
  const result = await runPowerShellScript(script, { timeoutMs: 60000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Não foi possível remover a pasta residual do OneDrive.');
  }
}

async function nvidiaSmiPath(): Promise<string | null> {
  const script = `
$commands = @(
  "$env:ProgramFiles\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe",
  "$env:SystemRoot\\System32\\nvidia-smi.exe"
)
$found = $commands | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $found) {
  $cmd = Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue
  if ($cmd) { $found = $cmd.Source }
}
$found
`;
  const result = await runPowerShellScript(script, { timeoutMs: 10000 });
  const smiPath = result.stdout.trim();
  return result.exitCode === 0 && smiPath ? smiPath : null;
}

async function getWindowsTerminalSettingsPath(): Promise<string | null> {
  const script = `
$paths = @(
  "$env:LOCALAPPDATA\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json",
  "$env:LOCALAPPDATA\\Packages\\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\\LocalState\\settings.json",
  "$env:LOCALAPPDATA\\Microsoft\\Windows Terminal\\settings.json"
)
$paths | Where-Object { Test-Path $_ } | Select-Object -First 1
`;
  const result = await runPowerShellScript(script, { timeoutMs: 10000 });
  const settingsPath = result.stdout.trim();
  return result.exitCode === 0 && settingsPath ? settingsPath : null;
}

async function hasPowerShell7(): Promise<boolean> {
  const result = await runPowerShellScript('if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { "present" }', {
    timeoutMs: 10000
  });
  return result.exitCode === 0 && result.stdout.includes('present');
}

async function isPowerShell7Default(): Promise<boolean> {
  const script = `
$paths = @(
  "$env:LOCALAPPDATA\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json",
  "$env:LOCALAPPDATA\\Packages\\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\\LocalState\\settings.json",
  "$env:LOCALAPPDATA\\Microsoft\\Windows Terminal\\settings.json"
)
$path = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $path) { 'missing'; exit 0 }
$settings = Get-Content $path -Raw | ConvertFrom-Json
$profiles = @($settings.profiles.list)
$default = $profiles | Where-Object { $_.guid -eq $settings.defaultProfile } | Select-Object -First 1
if ($default -and (($default.commandline -match 'pwsh') -or ($default.source -match 'PowershellCore') -or ($default.name -match 'PowerShell 7'))) { 'true' } else { 'false' }
`;
  const result = await runPowerShellScript(script, { timeoutMs: 10000 });
  return result.exitCode === 0 && result.stdout.trim().toLowerCase() === 'true';
}

async function setPowerShell7Default(): Promise<string | null> {
  const script = `
$paths = @(
  "$env:LOCALAPPDATA\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json",
  "$env:LOCALAPPDATA\\Packages\\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\\LocalState\\settings.json",
  "$env:LOCALAPPDATA\\Microsoft\\Windows Terminal\\settings.json"
)
$path = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $path) { Write-Error 'Windows Terminal settings.json não encontrado.'; exit 1 }
$settings = Get-Content $path -Raw | ConvertFrom-Json
$profiles = @($settings.profiles.list)
$pwsh = $profiles | Where-Object { ($_.commandline -match 'pwsh') -or ($_.source -match 'PowershellCore') -or ($_.name -match 'PowerShell 7') } | Select-Object -First 1
if (-not $pwsh) { Write-Error 'Perfil do PowerShell 7 não encontrado no Windows Terminal.'; exit 1 }
$previous = [string]$settings.defaultProfile
$settings.defaultProfile = $pwsh.guid
$settings | ConvertTo-Json -Depth 100 | Set-Content $path -Encoding UTF8
$previous
`;
  const result = await runPowerShellScript(script, { timeoutMs: 15000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Não foi possível definir PowerShell 7 como padrão.');
  }
  return result.stdout.trim() || null;
}

async function restoreWindowsTerminalDefault(profileGuid: string): Promise<void> {
  const settingsPath = await getWindowsTerminalSettingsPath();
  if (!settingsPath) {
    throw new Error('Windows Terminal settings.json não encontrado.');
  }

  const script = `
$path = ${JSON.stringify(settingsPath)}
$settings = Get-Content $path -Raw | ConvertFrom-Json
$settings.defaultProfile = ${JSON.stringify(profileGuid)}
$settings | ConvertTo-Json -Depth 100 | Set-Content $path -Encoding UTF8
`;
  const result = await runPowerShellScript(script, { timeoutMs: 15000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Não foi possível restaurar o shell padrão anterior.');
  }
}

async function readServiceStartModes(): Promise<Record<string, string>> {
  const names = OPTIONAL_MANUAL_SERVICES.map((name) => `'${name}'`).join(',');
  const script = `
$names = @(${names})
$items = foreach ($name in $names) {
  $svc = Get-CimInstance Win32_Service -Filter "Name='$name'" -ErrorAction SilentlyContinue
  if ($svc) { [pscustomobject]@{ Name = $svc.Name; StartMode = $svc.StartMode } }
}
$items | ConvertTo-Json -Compress
`;
  const result = await runPowerShellScript(script, { timeoutMs: 15000 });
  if (result.exitCode !== 0 || !result.stdout.trim()) return {};
  const parsed = JSON.parse(result.stdout.trim()) as Array<{ Name: string; StartMode: string }> | { Name: string; StartMode: string };
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  return Object.fromEntries(entries.map((entry) => [entry.Name, entry.StartMode]));
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
        const [captureValue, dvrValue, startupPanelValue] = await Promise.all([
          readRegistryValue(GAME_DVR_KEY, 'AppCaptureEnabled'),
          readRegistryValue(GAME_CONFIG_STORE_KEY, 'GameDVR_Enabled'),
          readRegistryValue(GAME_BAR_KEY, 'ShowStartupPanel')
        ]);
        return {
          id,
          status:
            registryDwordIsActive(captureValue.value, 0) === 'active' &&
            registryDwordIsActive(dvrValue.value, 0) === 'active' &&
            registryDwordIsActive(startupPanelValue.value, 0) === 'active'
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
      case 'disable-wifi-sense': {
        const [oem, hotspot, autoconnect] = await Promise.all([
          readRegistryValue(WIFI_SENSE_CONFIG_KEY, 'AutoConnectAllowedOEM'),
          readRegistryValue(WIFI_HOTSPOT_POLICY_KEY, 'value'),
          readRegistryValue(WIFI_AUTOCONNECT_POLICY_KEY, 'value')
        ]);
        return {
          id,
          status:
            registryDwordIsActive(oem.value, 0) === 'active' ||
            (registryDwordIsActive(hotspot.value, 0) === 'active' &&
              registryDwordIsActive(autoconnect.value, 0) === 'active')
              ? 'active'
              : 'inactive'
        };
      }
      case 'enable-dark-mode': {
        const [apps, system] = await Promise.all([
          readRegistryValue(DARK_MODE_KEY, 'AppsUseLightTheme'),
          readRegistryValue(DARK_MODE_KEY, 'SystemUsesLightTheme')
        ]);
        return {
          id,
          status:
            registryDwordIsActive(apps.value, 0) === 'active' &&
            registryDwordIsActive(system.value, 0) === 'active'
              ? 'active'
              : 'inactive'
        };
      }
      case 'enable-end-task-context-menu': {
        const value = await readRegistryValue(TASKBAR_KEY, 'TaskbarEndTask');
        return { id, status: registryDwordIsActive(value.value, 1) };
      }
      case 'enable-game-mode': {
        const [allowValue, enabledValue] = await Promise.all([
          readRegistryValue(GAME_BAR_KEY, 'AllowAutoGameMode'),
          readRegistryValue(GAME_BAR_KEY, 'AutoGameModeEnabled')
        ]);
        return {
          id,
          status:
            registryDwordIsActive(allowValue.value, 1) === 'active' ||
            registryDwordIsActive(enabledValue.value, 1) === 'active'
              ? 'active'
              : 'inactive'
        };
      }
      case 'enable-hags': {
        const value = await readRegistryValue(GRAPHICS_DRIVERS_KEY, 'HwSchMode');
        return { id, status: registryDwordIsActive(value.value, 2) };
      }
      case 'enable-hpet': {
        const bcd = await runExecutable('bcdedit.exe', ['/enum', '{current}'], 10000);
        if (bcd.exitCode !== 0) return { id, status: 'unknown', message: 'Não foi possível ler o BCD.' };
        return { id, status: /useplatformclock\s+Yes/i.test(bcd.stdout) ? 'active' : 'inactive' };
      }
      case 'enable-windowed-game-optimizations': {
        const value = await readRegistryValue(DIRECTX_GRAPHICS_SETTINGS_KEY, 'SwapEffectUpgradeEnable');
        return { id, status: registryDwordIsActive(value.value, 1) };
      }
      case 'remove-menu-delay': {
        const value = await readRegistryValue(DESKTOP_KEY, 'MenuShowDelay');
        return { id, status: registryStringIsActive(value.value, '0') };
      }
      case 'optimize-network-settings': {
        const [throttle, responsiveness] = await Promise.all([
          readRegistryValue(MULTIMEDIA_SYSTEM_PROFILE_KEY, 'NetworkThrottlingIndex'),
          readRegistryValue(MULTIMEDIA_SYSTEM_PROFILE_KEY, 'SystemResponsiveness')
        ]);
        return {
          id,
          status:
            registryDwordIsActive(throttle.value, 0xffffffff) === 'active' &&
            registryDwordIsActive(responsiveness.value, 0) === 'active'
              ? 'active'
              : 'inactive'
        };
      }
      case 'optimize-nvidia-settings': {
        if (!(await hasNvidiaGpu())) {
          return { id, status: 'unknown', message: 'Nenhuma GPU Nvidia foi detectada.' };
        }

        const marker = await readRegistryValue(ITOBOOST_OPTIMIZATION_MARKERS_KEY, 'NvidiaSafeProfile');
        return { id, status: registryDwordIsActive(marker.value, 1) };
      }
      case 'remove-gaming-apps': {
        const script = `
$packages = Get-AppxPackage | Where-Object {
  $_.Name -like 'Microsoft.Xbox*' -or
  $_.Name -eq 'Microsoft.GamingApp' -or
  $_.Name -eq 'Microsoft.GamingServices' -or
  $_.Name -eq 'Microsoft.XboxGamingOverlay'
}
if ($packages) { 'present' } else { 'absent' }
`;
        const status = await runPowerShellScript(script, { timeoutMs: 15000 });
        return {
          id,
          status: status.exitCode === 0 && status.stdout.includes('absent') ? 'active' : 'inactive'
        };
      }
      case 'remove-onedrive': {
        const [hasRedirectedFolders, installed] = await Promise.all([
          hasOneDriveKnownFolderPaths(),
          hasOneDriveInstallation()
        ]);
        return {
          id,
          status: !hasRedirectedFolders && !installed ? 'active' : 'inactive'
        };
      }
      case 'classic-context-menu': {
        const value = await runExecutable('reg.exe', ['query', CLASSIC_CONTEXT_MENU_KEY], 10000);
        return { id, status: value.exitCode === 0 ? 'active' : 'inactive' };
      }
      case 'run-disk-cleanup':
        return { id, status: 'inactive', message: 'A limpeza de disco é uma ação pontual.' };
      case 'set-powershell7-default':
        return {
          id,
          status: (await isPowerShell7Default()) ? 'active' : 'inactive',
          message: (await hasPowerShell7()) ? undefined : 'PowerShell 7 não foi encontrado.'
        };
      case 'set-services-manual': {
        const modes = await readServiceStartModes();
        const values = Object.values(modes);
        return {
          id,
          status: values.length > 0 && values.every((mode) => mode.toLowerCase() === 'manual') ? 'active' : 'inactive'
        };
      }
      case 'set-time-utc': {
        const value = await readRegistryValue(TIME_ZONE_INFORMATION_KEY, 'RealTimeIsUniversal');
        return { id, status: registryDwordIsActive(value.value, 1) };
      }
      case 'configure-win32-priority-separation': {
        const value = await readRegistryValue(PRIORITY_CONTROL_KEY, 'Win32PrioritySeparation');
        return { id, status: registryDwordIsActive(value.value, 38) };
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
  const statuses = await mapWithConcurrency(optimizationDefinitions, 4, (item) => checkStatus(item.id));
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
        await writeRegistryValue(GAME_BAR_KEY, 'ShowStartupPanel', 'REG_DWORD', 0);
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
      case 'disable-wifi-sense':
        await writeRegistryValue(WIFI_SENSE_CONFIG_KEY, 'AutoConnectAllowedOEM', 'REG_DWORD', 0);
        await writeRegistryValue(WIFI_HOTSPOT_POLICY_KEY, 'value', 'REG_DWORD', 0);
        await writeRegistryValue(WIFI_AUTOCONNECT_POLICY_KEY, 'value', 'REG_DWORD', 0);
        response = result(true, 'WiFi Sense desativado por política do Windows.');
        break;
      case 'enable-dark-mode':
        await writeRegistryValue(DARK_MODE_KEY, 'AppsUseLightTheme', 'REG_DWORD', 0);
        await writeRegistryValue(DARK_MODE_KEY, 'SystemUsesLightTheme', 'REG_DWORD', 0);
        response = result(true, 'Modo escuro do Windows ativado.');
        break;
      case 'enable-end-task-context-menu':
        await writeRegistryValue(TASKBAR_KEY, 'TaskbarEndTask', 'REG_DWORD', 1);
        response = result(true, 'Opção "Finalizar Tarefa" habilitada no menu da barra de tarefas.');
        break;
      case 'enable-game-mode':
        await writeRegistryValue(GAME_BAR_KEY, 'AllowAutoGameMode', 'REG_DWORD', 1);
        await writeRegistryValue(GAME_BAR_KEY, 'AutoGameModeEnabled', 'REG_DWORD', 1);
        response = result(true, 'Modo de Jogo do Windows ativado.');
        break;
      case 'enable-hags':
        await writeRegistryValue(GRAPHICS_DRIVERS_KEY, 'HwSchMode', 'REG_DWORD', 2);
        response = result(true, 'HAGS ativado. Reinicie o PC para concluir.', true, false);
        break;
      case 'enable-hpet': {
        const hpet = await runExecutable('bcdedit.exe', ['/set', 'useplatformclock', 'true'], 10000);
        response =
          hpet.exitCode === 0
            ? result(true, 'HPET ativado. Reinicie o PC para concluir.', true, false)
            : result(false, 'Não foi possível alterar o BCD. Execute o ItoBoost como administrador.');
        break;
      }
      case 'enable-windowed-game-optimizations':
        await writeRegistryValue(DIRECTX_GRAPHICS_SETTINGS_KEY, 'SwapEffectUpgradeEnable', 'REG_DWORD', 1);
        response = result(true, 'Otimizações para jogos em janela ativadas.');
        break;
      case 'remove-menu-delay':
        await writeRegistryValue(DESKTOP_KEY, 'MenuShowDelay', 'REG_SZ', '0');
        response = result(true, 'Atraso de menus eliminado para o usuário atual.');
        break;
      case 'optimize-network-settings': {
        await writeRegistryValue(MULTIMEDIA_SYSTEM_PROFILE_KEY, 'NetworkThrottlingIndex', 'REG_DWORD', 0xffffffff);
        await writeRegistryValue(MULTIMEDIA_SYSTEM_PROFILE_KEY, 'SystemResponsiveness', 'REG_DWORD', 0);
        const netshResults = await Promise.all([
          runExecutable('netsh.exe', ['int', 'tcp', 'set', 'global', 'rss=enabled'], 10000),
          runExecutable('netsh.exe', ['int', 'tcp', 'set', 'global', 'ecncapability=disabled'], 10000),
          runExecutable('netsh.exe', ['int', 'tcp', 'set', 'global', 'timestamps=disabled'], 10000)
        ]);
        response = netshResults.every((item) => item.exitCode === 0)
          ? result(true, 'Configurações de rede otimizadas para menor latência.')
          : result(false, 'Parte das configurações de rede foi bloqueada pelo Windows ou pelo driver.');
        break;
      }
      case 'optimize-nvidia-settings': {
        if (!(await hasNvidiaGpu())) {
          response = result(false, 'Nenhuma GPU Nvidia foi detectada neste computador.');
          break;
        }

        const smiPath = await nvidiaSmiPath();
        if (!smiPath) {
          response = result(false, 'GPU Nvidia detectada, mas o utilitário nvidia-smi não está disponível.');
          break;
        }

        const nvidia = await runExecutable(smiPath, ['-pm', '1'], 15000);
        if (nvidia.exitCode !== 0) {
          response = result(
            false,
            'O driver Nvidia não permitiu aplicar o modo de persistência. Nenhuma alteração agressiva foi tentada.'
          );
          break;
        }

        await writeRegistryValue(ITOBOOST_OPTIMIZATION_MARKERS_KEY, 'NvidiaSafeProfile', 'REG_DWORD', 1);
        response = result(true, 'Configuração segura da Nvidia aplicada pelo nvidia-smi.');
        break;
      }
      case 'remove-gaming-apps': {
        const removeGamingApps = await runPowerShellScript(
          `
$packages = Get-AppxPackage | Where-Object {
  $_.Name -like 'Microsoft.Xbox*' -or
  $_.Name -eq 'Microsoft.GamingApp' -or
  $_.Name -eq 'Microsoft.GamingServices' -or
  $_.Name -eq 'Microsoft.XboxGamingOverlay'
}
foreach ($package in $packages) {
  Remove-AppxPackage -Package $package.PackageFullName -ErrorAction SilentlyContinue
}
'done'
`,
          { timeoutMs: 60000 }
        );
        response =
          removeGamingApps.exitCode === 0
            ? result(true, 'Apps de jogos pré-instalados foram removidos do usuário atual.')
            : result(false, 'Não foi possível remover os apps de jogos encontrados.');
        break;
      }
      case 'remove-onedrive': {
        const setupPath = await oneDriveSetupPath();
        await restoreKnownFoldersFromOneDrive();

        if (!setupPath) {
          await removeModernOneDrivePackage();
          await removeOneDriveAppData();
          await removeOneDriveUserFolder();
          await deleteRegistryValue('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive');
          await restartExplorer();
          response = result(true, 'Pastas do usuário restauradas. OneDrive não foi encontrado neste sistema.', false, true);
          break;
        }

        await runExecutable('taskkill.exe', ['/f', '/im', 'OneDrive.exe'], 10000);
        const uninstall = await runExecutable(setupPath, ['/uninstall'], 60000);
        await removeModernOneDrivePackage();
        await removeOneDriveAppData();
        await removeOneDriveUserFolder();
        await deleteRegistryValue('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive');
        await restartExplorer();
        const stillInstalled = await hasOneDriveInstallation();
        const stillRedirected = await hasOneDriveKnownFolderPaths();
        response =
          uninstall.exitCode === 0 || (!stillInstalled && !stillRedirected)
            ? result(true, 'OneDrive removido e pastas do usuário restauradas. O Explorer foi reiniciado.', false, true)
            : result(false, 'O instalador do OneDrive não concluiu a remoção.', false, true);
        break;
      }
      case 'classic-context-menu':
        await enableClassicContextMenu();
        await restartExplorer();
        response = result(
          true,
          'Menu de contexto clássico do Windows 10 ativado. O Explorer foi reiniciado.',
          false,
          true
        );
        break;
      case 'run-disk-cleanup': {
        const cleanup = await runExecutable('cleanmgr.exe', ['/verylowdisk'], 300000);
        response =
          cleanup.exitCode === 0
            ? result(true, 'Limpeza de Disco executada com sucesso.')
            : result(false, 'Não foi possível executar a Limpeza de Disco do Windows.');
        break;
      }
      case 'set-powershell7-default': {
        if (!(await hasPowerShell7())) {
          response = result(false, 'PowerShell 7 não foi encontrado. Instale o PowerShell 7 antes de aplicar.');
          break;
        }

        const state = await readState();
        const previous = await setPowerShell7Default();
        if (previous && !state.previousWindowsTerminalDefaultProfile) {
          await writeState({ ...state, previousWindowsTerminalDefaultProfile: previous });
        }
        response = result(true, 'PowerShell 7 definido como perfil padrão do Windows Terminal.');
        break;
      }
      case 'set-services-manual': {
        const state = await readState();
        if (!state.previousServiceStartModes) {
          await writeState({ ...state, previousServiceStartModes: await readServiceStartModes() });
        }

        const names = OPTIONAL_MANUAL_SERVICES.map((name) => `'${name}'`).join(',');
        const serviceResult = await runPowerShellScript(
          `
$names = @(${names})
foreach ($name in $names) {
  $service = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($service) { Set-Service -Name $name -StartupType Manual -ErrorAction SilentlyContinue }
}
'done'
`,
          { timeoutMs: 30000 }
        );
        response =
          serviceResult.exitCode === 0
            ? result(true, 'Serviços opcionais definidos como inicialização manual.')
            : result(false, 'Não foi possível ajustar os serviços opcionais.');
        break;
      }
      case 'set-time-utc':
        await writeRegistryValue(TIME_ZONE_INFORMATION_KEY, 'RealTimeIsUniversal', 'REG_DWORD', 1);
        response = result(true, 'Horário em UTC ativado para o relógio do sistema.');
        break;
      case 'configure-win32-priority-separation': {
        const state = await readState();
        if (state.previousWin32PrioritySeparation === undefined) {
          const previous = await readRegistryValue(PRIORITY_CONTROL_KEY, 'Win32PrioritySeparation');
          await writeState({ ...state, previousWin32PrioritySeparation: previous.value });
        }
        await writeRegistryValue(PRIORITY_CONTROL_KEY, 'Win32PrioritySeparation', 'REG_DWORD', 38);
        response = result(true, 'Separação de prioridade Win32 otimizada para programas em primeiro plano.');
        break;
      }
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
        await writeRegistryValue(GAME_BAR_KEY, 'ShowStartupPanel', 'REG_DWORD', 1);
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
      case 'disable-wifi-sense':
        await writeRegistryValue(WIFI_SENSE_CONFIG_KEY, 'AutoConnectAllowedOEM', 'REG_DWORD', 1);
        await writeRegistryValue(WIFI_HOTSPOT_POLICY_KEY, 'value', 'REG_DWORD', 1);
        await writeRegistryValue(WIFI_AUTOCONNECT_POLICY_KEY, 'value', 'REG_DWORD', 1);
        response = result(true, 'WiFi Sense reativado nas políticas conhecidas do Windows.');
        break;
      case 'enable-dark-mode':
        await writeRegistryValue(DARK_MODE_KEY, 'AppsUseLightTheme', 'REG_DWORD', 1);
        await writeRegistryValue(DARK_MODE_KEY, 'SystemUsesLightTheme', 'REG_DWORD', 1);
        response = result(true, 'Modo claro do Windows restaurado.');
        break;
      case 'enable-end-task-context-menu':
        await writeRegistryValue(TASKBAR_KEY, 'TaskbarEndTask', 'REG_DWORD', 0);
        response = result(true, 'Opção "Finalizar Tarefa" removida do menu da barra de tarefas.');
        break;
      case 'enable-game-mode':
        await writeRegistryValue(GAME_BAR_KEY, 'AllowAutoGameMode', 'REG_DWORD', 0);
        await writeRegistryValue(GAME_BAR_KEY, 'AutoGameModeEnabled', 'REG_DWORD', 0);
        response = result(true, 'Modo de Jogo do Windows desativado.');
        break;
      case 'enable-hags':
        await writeRegistryValue(GRAPHICS_DRIVERS_KEY, 'HwSchMode', 'REG_DWORD', 1);
        response = result(true, 'HAGS desativado. Reinicie o PC para concluir.', true, false);
        break;
      case 'enable-hpet': {
        const hpet = await runExecutable('bcdedit.exe', ['/deletevalue', 'useplatformclock'], 10000);
        response =
          hpet.exitCode === 0
            ? result(true, 'HPET voltou ao comportamento automático do Windows. Reinicie o PC para concluir.', true, false)
            : result(true, 'HPET já não estava forçado no BCD.', true, false);
        break;
      }
      case 'enable-windowed-game-optimizations':
        await writeRegistryValue(DIRECTX_GRAPHICS_SETTINGS_KEY, 'SwapEffectUpgradeEnable', 'REG_DWORD', 0);
        response = result(true, 'Otimizações para jogos em janela desativadas.');
        break;
      case 'remove-menu-delay':
        await writeRegistryValue(DESKTOP_KEY, 'MenuShowDelay', 'REG_SZ', '400');
        response = result(true, 'Atraso padrão de menus restaurado.');
        break;
      case 'optimize-network-settings':
        await writeRegistryValue(MULTIMEDIA_SYSTEM_PROFILE_KEY, 'NetworkThrottlingIndex', 'REG_DWORD', 10);
        await writeRegistryValue(MULTIMEDIA_SYSTEM_PROFILE_KEY, 'SystemResponsiveness', 'REG_DWORD', 20);
        {
          const netshResults = await Promise.all([
            runExecutable('netsh.exe', ['int', 'tcp', 'set', 'global', 'ecncapability=default'], 10000),
            runExecutable('netsh.exe', ['int', 'tcp', 'set', 'global', 'timestamps=default'], 10000)
          ]);
          response = netshResults.every((item) => item.exitCode === 0)
            ? result(true, 'Configurações de rede restauradas para valores conservadores do Windows.')
            : result(false, 'Parte das configurações de rede não pôde ser restaurada pelo netsh.');
        }
        break;
      case 'optimize-nvidia-settings': {
        const smiPath = await nvidiaSmiPath();
        if (smiPath) {
          await runExecutable(smiPath, ['-pm', '0'], 15000);
        }
        await deleteRegistryValue(ITOBOOST_OPTIMIZATION_MARKERS_KEY, 'NvidiaSafeProfile');
        response = result(true, 'Configuração segura da Nvidia revertida quando suportada.');
        break;
      }
      case 'remove-gaming-apps':
        response = result(false, 'Este ajuste não possui reversão automática. Reinstale os apps pela Microsoft Store.');
        break;
      case 'remove-onedrive':
        response = result(false, 'Este ajuste não possui reversão automática. Reinstale o OneDrive pelo instalador oficial da Microsoft.');
        break;
      case 'classic-context-menu':
        await disableClassicContextMenu();
        await restartExplorer();
        response = result(true, 'Menu de contexto moderno do Windows 11 restaurado. O Explorer foi reiniciado.', false, true);
        break;
      case 'run-disk-cleanup':
        response = result(false, 'Limpeza de Disco é uma ação pontual e não possui reversão.');
        break;
      case 'set-powershell7-default': {
        const state = await readState();
        if (!state.previousWindowsTerminalDefaultProfile) {
          response = result(false, 'Nenhum perfil padrão anterior foi salvo para reverter.');
          break;
        }

        await restoreWindowsTerminalDefault(state.previousWindowsTerminalDefaultProfile);
        response = result(true, 'Perfil padrão anterior do Windows Terminal restaurado.');
        break;
      }
      case 'set-services-manual': {
        const state = await readState();
        if (!state.previousServiceStartModes || Object.keys(state.previousServiceStartModes).length === 0) {
          response = result(false, 'Nenhum estado anterior de serviços foi salvo para reverter.');
          break;
        }

        const mapJson = JSON.stringify(state.previousServiceStartModes).replace(/'/g, "''");
        const serviceResult = await runPowerShellScript(
          `
$modes = '${mapJson}' | ConvertFrom-Json
foreach ($property in $modes.PSObject.Properties) {
  $name = $property.Name
  $mode = [string]$property.Value
  $service = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($service) {
    $startupType = switch ($mode.ToLower()) {
      'auto' { 'Automatic' }
      'automatic' { 'Automatic' }
      'manual' { 'Manual' }
      'disabled' { 'Disabled' }
      default { 'Manual' }
    }
    Set-Service -Name $name -StartupType $startupType -ErrorAction SilentlyContinue
  }
}
'done'
`,
          { timeoutMs: 30000 }
        );
        response =
          serviceResult.exitCode === 0
            ? result(true, 'Serviços opcionais restaurados para os modos anteriores salvos.')
            : result(false, 'Não foi possível restaurar os serviços opcionais.');
        break;
      }
      case 'set-time-utc':
        await deleteRegistryValue(TIME_ZONE_INFORMATION_KEY, 'RealTimeIsUniversal');
        response = result(true, 'Configuração de horário UTC removida.');
        break;
      case 'configure-win32-priority-separation': {
        const state = await readState();
        if (state.previousWin32PrioritySeparation === undefined) {
          response = result(false, 'Nenhum valor anterior de prioridade Win32 foi salvo para reverter.');
          break;
        }

        if (state.previousWin32PrioritySeparation) {
          const normalized = state.previousWin32PrioritySeparation.toLowerCase();
          const previous = normalized.startsWith('0x')
            ? Number.parseInt(normalized, 16)
            : Number.parseInt(normalized, 10);
          await writeRegistryValue(PRIORITY_CONTROL_KEY, 'Win32PrioritySeparation', 'REG_DWORD', previous);
        } else {
          await deleteRegistryValue(PRIORITY_CONTROL_KEY, 'Win32PrioritySeparation');
        }
        response = result(true, 'Separação de prioridade Win32 restaurada para o valor anterior.');
        break;
      }
    }

    await logOptimizationAction(id, 'revert', response.success, response.message);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível reverter o ajuste.';
    await logOptimizationAction(id, 'revert', false, message);
    return result(false, message);
  }
}
