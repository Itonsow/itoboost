# ItoBoost

Aplicativo desktop Windows com Electron, React, TypeScript, Vite e Tailwind CSS para exibir métricas reais do computador e servir como base para funções futuras de otimização.

## Pre-requisitos

- Windows 10 ou 11: https://www.microsoft.com/windows
- Node.js LTS: https://nodejs.org/
- npm: instalado automaticamente junto com o Node.js
- Git: https://git-scm.com/downloads

Depois de instalar os requisitos, confirme no terminal:

```bash
node --version
npm --version
git --version
```

## Rodar em desenvolvimento

```bash
npm install
npm run electron:dev
```

## Gerar instalador `.exe`

```bash
npm run dist
```

O instalador será gerado em `release/`.
