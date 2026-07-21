export type TvDevice = {
  id: string;
  estabelecimento_id: string;
  codigo: string;
  nome: string;
  local: string | null;
  grupo_id: string | null;
  dashboard_atual_id: string | null;
  playlist_id: string | null;
  status: "online" | "offline" | "erro" | "bloqueado";
  bloqueado: boolean;
  versao_app: string | null;
  versao_min_requerida: string | null;
  resolucao: string | null;
  ip: string | null;
  memoria_uso: number | null;
  cpu_uso: number | null;
  armazenamento: number | null;
  uptime_segundos: number | null;
  tema: string | null;
  idioma: string | null;
  ultima_comunicacao: string | null;
  emparelhado_em: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type TvDashboard = {
  id: string;
  estabelecimento_id: string;
  nome: string;
  tipo: "url_externa" | "tela_interna";
  url: string | null;
  rota_interna: string | null;
  refresh_segundos: number;
  fullscreen: boolean;
  cache_offline: boolean;
  auto_update: boolean;
  timeout_segundos: number;
  descricao: string | null;
};

export type TvPlaylist = {
  id: string;
  estabelecimento_id: string;
  nome: string;
  loop: boolean;
};

export type TvPlaylistItem = {
  id: string;
  playlist_id: string;
  dashboard_id: string;
  ordem: number;
  duracao_segundos: number;
};

export type TvGroup = {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  local: string | null;
};

export type TvCommandTipo =
  | "atualizar_dashboard"
  | "atualizar_url"
  | "reiniciar_app"
  | "limpar_cache"
  | "atualizar_config"
  | "alterar_refresh"
  | "bloquear"
  | "desbloquear"
  | "sincronizar"
  | "atualizar_versao";

export const TV_COMMAND_LABELS: Record<TvCommandTipo, string> = {
  atualizar_dashboard: "Atualizar Dashboard",
  atualizar_url: "Atualizar URL",
  reiniciar_app: "Reiniciar Aplicativo",
  limpar_cache: "Limpar Cache",
  atualizar_config: "Atualizar Configuração",
  alterar_refresh: "Alterar Refresh",
  bloquear: "Bloquear Dispositivo",
  desbloquear: "Desbloquear",
  sincronizar: "Solicitar Sincronização",
  atualizar_versao: "Atualizar Versão",
};

export type TvCommand = {
  id: string;
  device_id: string;
  tipo: TvCommandTipo;
  payload: Record<string, any>;
  status: "pendente" | "enviado" | "confirmado" | "erro";
  criado_por: string | null;
  confirmado_em: string | null;
  resultado: any;
  created_at: string;
};
