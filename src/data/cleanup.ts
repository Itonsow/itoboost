import type { CleanupDefinition } from '../types/cleanup';

export const cleanupDefinitions: CleanupDefinition[] = [
  {
    id: 'temp-files',
    title: 'Limpar Arquivos Temporários',
    description: 'Remove arquivos temporários do sistema e do usuário.',
    riskLevel: 'low',
    requiresAdmin: false,
    requiresExplorerRestart: false
  },
  {
    id: 'prefetch-files',
    title: 'Limpar Arquivos Prefetch',
    description: 'Exclui arquivos da pasta Prefetch do Windows.',
    riskLevel: 'medium',
    requiresAdmin: true,
    requiresExplorerRestart: false,
    warningMessage: 'O Windows pode recriar esses arquivos automaticamente conforme os apps forem usados.'
  },
  {
    id: 'recycle-bin',
    title: 'Esvaziar Lixeira (Perigoso)',
    description: 'Remove permanentemente arquivos da Lixeira.',
    riskLevel: 'high',
    requiresAdmin: false,
    requiresExplorerRestart: false,
    warningMessage: 'Arquivos removidos da Lixeira não são restaurados pelo ItoBoost.'
  },
  {
    id: 'windows-update-cache',
    title: 'Limpar Cache do Windows Update',
    description: 'Remove arquivos de instalação baixados do Windows Update.',
    riskLevel: 'medium',
    requiresAdmin: true,
    requiresExplorerRestart: false,
    warningMessage: 'Serviços do Windows Update serão pausados rapidamente e iniciados novamente.'
  },
  {
    id: 'thumbnail-cache',
    title: 'Limpar Cache de Miniaturas',
    description: 'Remove imagens em miniatura armazenadas em cache usadas pelo Explorador de Arquivos.',
    riskLevel: 'low',
    requiresAdmin: false,
    requiresExplorerRestart: true,
    warningMessage: 'O Explorer será reiniciado para liberar os arquivos de cache.'
  }
];
