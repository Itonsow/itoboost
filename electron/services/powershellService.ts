import { execFile, type ChildProcess } from 'node:child_process';

const MAX_BUFFER_BYTES = 1024 * 1024;
const PROCESS_TREE_KILL_TIMEOUT_MS = 5000;
let unresolvedProcessTermination = false;

export type CommandFailure = 'timeout' | 'spawn-error' | 'output-limit' | 'exit-error' | null;

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  failure: CommandFailure;
  errorMessage: string | null;
}

export function hasUnresolvedProcessTermination(): boolean {
  return unresolvedProcessTermination;
}

interface PowerShellOptions {
  timeoutMs?: number;
}

function normalizeOutput(value: string | Buffer | undefined): string {
  if (typeof value === 'string') return value;
  return value?.toString() ?? '';
}

function errorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return error == null ? null : String(error);
}

function isOutputLimitError(error: NodeJS.ErrnoException | null): boolean {
  return error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
}

function isSpawnError(error: NodeJS.ErrnoException | null): boolean {
  return typeof error?.code === 'string' && !isOutputLimitError(error);
}

function terminateProcessTree(pid: number | undefined): Promise<boolean> {
  if (!pid || process.platform !== 'win32') {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (terminated: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(terminated);
    };

    const timer = setTimeout(() => finish(false), PROCESS_TREE_KILL_TIMEOUT_MS);

    try {
      const killer = execFile(
        'taskkill.exe',
        ['/pid', String(pid), '/t', '/f'],
        {
          windowsHide: true,
          maxBuffer: MAX_BUFFER_BYTES
        },
        (error) => finish(!error)
      );
      killer.once('error', () => finish(false));
    } catch {
      finish(false);
    }
  });
}

function createCommandResult(
  error: NodeJS.ErrnoException | null,
  stdout: string,
  stderr: string,
  timedOut: boolean,
  timeoutMs: number
): CommandResult {
  const failure: CommandFailure = timedOut
    ? 'timeout'
    : isOutputLimitError(error)
      ? 'output-limit'
      : isSpawnError(error)
        ? 'spawn-error'
        : error
          ? 'exit-error'
          : null;

  const detail = errorMessage(error);
  const timeoutDetail = timedOut ? `O processo excedeu o tempo limite de ${timeoutMs} ms.` : null;

  return {
    stdout,
    stderr,
    exitCode: typeof error?.code === 'number' && Number.isFinite(error.code) ? error.code : error || timedOut ? 1 : 0,
    failure,
    errorMessage: timeoutDetail ?? detail
  };
}

function runCommand(file: string, args: string[], timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve) => {
    let child: ChildProcess | null = null;
    let timeoutTimer: NodeJS.Timeout | undefined;
    let timedOut = false;
    let timeoutTerminationStarted = false;
    let timeoutCompletion: {
      error: NodeJS.ErrnoException | null;
      stdout: string | Buffer | undefined;
      stderr: string | Buffer | undefined;
    } | null = null;
    let settled = false;

    const settle = (
      error: NodeJS.ErrnoException | null,
      stdout: string | Buffer | undefined,
      stderr: string | Buffer | undefined
    ) => {
      if (settled) return;
      settled = true;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      resolve(createCommandResult(error, normalizeOutput(stdout), normalizeOutput(stderr), timedOut, timeoutMs));
    };

    const finish = (
      error: NodeJS.ErrnoException | null,
      stdout: string | Buffer | undefined,
      stderr: string | Buffer | undefined
    ) => {
      if (settled) return;
      if (timeoutTerminationStarted) {
        timeoutCompletion = { error, stdout, stderr };
        return;
      }

      settle(error, stdout, stderr);
    };

    const finishAfterTimeout = () => {
      const completion = timeoutCompletion ?? {
        error: new Error(`O processo excedeu o tempo limite de ${timeoutMs} ms.`) as NodeJS.ErrnoException,
        stdout: '',
        stderr: ''
      };
      settle(completion.error, completion.stdout, completion.stderr);
    };

    const onTimeout = () => {
      if (settled) return;
      timedOut = true;
      timeoutTerminationStarted = true;

      if (process.platform !== 'win32') {
        try {
          child?.kill();
        } catch {
          // The process may have exited between the timeout and this call.
        }
      }

      void terminateProcessTree(child?.pid).then((terminated) => {
        if (!terminated) unresolvedProcessTermination = true;
        finishAfterTimeout();
      }, () => {
        unresolvedProcessTermination = true;
        finishAfterTimeout();
      });
    };

    try {
      child = execFile(
        file,
        args,
        {
          windowsHide: true,
          maxBuffer: MAX_BUFFER_BYTES
        },
        (error, stdout, stderr) => finish(error as NodeJS.ErrnoException | null, stdout, stderr)
      );
      child.once('error', (error) => finish(error as NodeJS.ErrnoException, '', ''));

      if (timeoutMs > 0) {
        timeoutTimer = setTimeout(onTimeout, timeoutMs);
      }
    } catch (error) {
      finish(error as NodeJS.ErrnoException, '', '');
    }
  });
}

export function commandFailureMessage(result: CommandResult, fallback: string): string {
  const detail = result.errorMessage || result.stderr.trim() || result.stdout.trim();
  const suffix = detail ? ` Detalhes: ${detail.slice(0, 1000)}` : '';

  switch (result.failure) {
    case 'timeout':
      return `${fallback} A operação excedeu o tempo limite.${suffix}`;
    case 'spawn-error':
      return `${fallback} Não foi possível iniciar o processo.${suffix}`;
    case 'output-limit':
      return `${fallback} A saída do processo excedeu o limite permitido.${suffix}`;
    case 'exit-error':
      return `${fallback}${suffix}`;
    default:
      return fallback;
  }
}

export function runPowerShellScript(script: string, options: PowerShellOptions = {}): Promise<CommandResult> {
  return runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], options.timeoutMs ?? 20000);
}

export function runExecutable(file: string, args: string[], timeoutMs = 15000): Promise<CommandResult> {
  return runCommand(file, args, timeoutMs);
}
