import type { AppDefinition } from '../types/apps';

export const appDefinitions: AppDefinition[] = [
  {
    id: 'brave',
    name: 'Brave',
    description: 'Navegador focado em privacidade, bloqueio de rastreadores e desempenho.',
    category: 'Navegador',
    installKind: 'winget',
    wingetId: 'Brave.Brave',
    requiresAdmin: false
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    description: 'Editor principal para codigo, extensoes e fluxos de desenvolvimento.',
    category: 'Dev',
    installKind: 'winget',
    wingetId: 'Microsoft.VisualStudioCode',
    requiresAdmin: false
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    description: 'Ferramenta da OpenAI para usar o Codex direto no terminal.',
    category: 'Dev',
    installKind: 'winget',
    wingetId: 'OpenAI.Codex',
    requiresAdmin: false,
    note: 'Instala o pacote oficial OpenAI.Codex disponivel no winget.'
  },
  {
    id: 'nvidia-driver',
    name: 'Driver NVIDIA',
    description: 'Abre a pagina oficial da NVIDIA para detectar e baixar o driver correto da GPU.',
    category: 'Drivers',
    installKind: 'external',
    downloadUrl: 'https://www.nvidia.com/Download/index.aspx',
    requiresAdmin: true,
    note: 'Drivers dependem do modelo da GPU. O ItoBoost abre a fonte oficial para evitar pacote incorreto.'
  },
  {
    id: 'amd-driver',
    name: 'Driver AMD',
    description: 'Abre a pagina oficial da AMD para baixar o Adrenalin/driver correto.',
    category: 'Drivers',
    installKind: 'external',
    downloadUrl: 'https://www.amd.com/en/support/download/drivers.html',
    requiresAdmin: true,
    note: 'Drivers dependem do hardware. O download deve vir da pagina oficial da AMD.'
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Chat de voz, comunidades, chamadas e overlay para jogos.',
    category: 'Comunicacao',
    installKind: 'winget',
    wingetId: 'Discord.Discord',
    requiresAdmin: false
  },
  {
    id: 'vencord',
    name: 'Vencord',
    description: 'Cliente/mod para customizar a experiencia do Discord.',
    category: 'Comunicacao',
    installKind: 'winget',
    wingetId: 'Vendicated.Vencord',
    requiresAdmin: false
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Player de musica e podcasts para desktop.',
    category: 'Midia',
    installKind: 'winget',
    wingetId: 'Spotify.Spotify',
    requiresAdmin: false
  },
  {
    id: 'steam',
    name: 'Steam',
    description: 'Loja, biblioteca e launcher de jogos para PC.',
    category: 'Gaming',
    installKind: 'winget',
    wingetId: 'Valve.Steam',
    requiresAdmin: false
  },
  {
    id: 'idm',
    name: 'Internet Download Manager',
    description: 'Gerenciador de downloads com aceleracao, filas e retomada.',
    category: 'Utilitario',
    installKind: 'winget',
    wingetId: 'Tonec.InternetDownloadManager',
    requiresAdmin: true,
    note: 'Software comercial: pode instalar versao de avaliacao ou pedir licenca.'
  },
  {
    id: 'logitech-ghub',
    name: 'Logitech G HUB',
    description: 'Controle de mouse, teclado, headset e perfis Logitech G.',
    category: 'Utilitario',
    installKind: 'winget',
    wingetId: 'Logitech.GHUB',
    requiresAdmin: true
  }
];
