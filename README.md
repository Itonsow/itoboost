# ItoBoost

![Electron](https://img.shields.io/badge/Electron-33-47848F?style=flat-square&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Windows](https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square&logo=windows11&logoColor=white)

A Windows desktop utility that brings system monitoring, cleanup and configurable operating-system adjustments into one interface. Built with Electron, React and TypeScript.

> [!WARNING]
> ItoBoost is under active development. Some actions modify Windows settings, services or Registry values. Review each warning, create a restore point and understand the change before applying it.

## Features

- Real-time CPU, GPU, memory, storage and operating-system information
- Searchable optimization catalog with category and risk filters
- Reversible adjustments with previous-state tracking where supported
- Clear indicators for administrator, restart and Explorer-restart requirements
- Optional restore-point creation before high-risk changes
- Cleanup tasks with explicit confirmation
- Essential-app installer and gaming-oriented utilities
- Custom desktop window and responsive React interface

## Architecture

ItoBoost separates privileged operating-system work from the user interface through Electron's IPC boundary.

```text
React renderer
    ↓ typed service calls
Electron preload / context bridge
    ↓ validated IPC messages
Electron main process
    ↓
Windows services, PowerShell and Registry
```

| Area | Location |
| --- | --- |
| React pages and components | `src/pages`, `src/components` |
| Typed renderer services | `src/services` |
| Shared types and definitions | `src/types`, `src/data` |
| Secure context bridge | `electron/preload.ts` |
| IPC handlers | `electron/main.ts` |
| Windows integrations | `electron/services` |

## Requirements

- Windows 10 or Windows 11
- Node.js LTS
- npm
- Git

## Development

```bash
git clone https://github.com/Itonsow/itoboost.git
cd itoboost
npm ci
npm run electron:dev
```

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run electron:dev` | Start Vite and the Electron application |
| `npm run typecheck` | Validate the TypeScript codebase |
| `npm run build` | Build the renderer and Electron main process |
| `npm run dist` | Create the Windows installer |
| `npm run preview` | Preview the production renderer build |

The installer is generated in `release/` as `ItoBoost-Setup-<version>.exe`.

## Safety model

- Renderer code does not receive direct Node.js access.
- System operations are exposed through a limited context bridge.
- Optimization identifiers are validated in the main process.
- Risky actions display their requirements and warnings before execution.
- Supported adjustments save enough state to offer a revert operation.

## Status

The project is evolving toward broader validation across Windows versions, improved automated testing and clearer documentation for every supported adjustment.
