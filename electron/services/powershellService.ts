import { execFile } from 'node:child_process';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface PowerShellOptions {
  timeoutMs?: number;
}

export function runPowerShellScript(script: string, options: PowerShellOptions = {}): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      {
        timeout: options.timeoutMs ?? 20000,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      },
      (error, stdout, stderr) => {
        const nodeError = error as NodeJS.ErrnoException | null;
        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode: typeof nodeError?.code === 'number' ? nodeError.code : nodeError ? 1 : 0
        });
      }
    );
  });
}

export function runExecutable(file: string, args: string[], timeoutMs = 15000): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      file,
      args,
      {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      },
      (error, stdout, stderr) => {
        const nodeError = error as NodeJS.ErrnoException | null;
        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode: typeof nodeError?.code === 'number' ? nodeError.code : nodeError ? 1 : 0
        });
      }
    );
  });
}
