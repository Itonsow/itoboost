import { runPowerShellScript } from './powershellService';

export async function isRunningAsAdmin(): Promise<boolean> {
  const script =
    '$identity = [Security.Principal.WindowsIdentity]::GetCurrent(); ' +
    '$principal = New-Object Security.Principal.WindowsPrincipal($identity); ' +
    '$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)';

  const result = await runPowerShellScript(script, { timeoutMs: 8000 });
  return result.exitCode === 0 && result.stdout.trim().toLowerCase() === 'true';
}
