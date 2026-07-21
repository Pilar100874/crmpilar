import type { LucideIcon } from "lucide-react";
import {
  Zap, Clock, Webhook, GitBranch, CalendarDays, Filter as FilterIcon,
  Bell, Timer, MonitorPlay, Terminal, Volume2, FileText, Play,
} from "lucide-react";

export type TvBlockCategory = "gatilho" | "condicao" | "acao";

export interface TvBlockDefinition {
  type: string;
  label: string;
  description: string;
  category: TvBlockCategory;
  icon: LucideIcon;
  color: string; // classes tailwind bg-*/text-*/border-*
  defaultData: Record<string, any>;
  /** Handles de saída. Vazio = uma saída padrão. */
  outputs?: { id: string; label: string }[];
  /** false => bloco não pode receber conexão (é ponto de partida) */
  hasInput?: boolean;
}

export const TV_BLOCK_DEFINITIONS: TvBlockDefinition[] = [
  // ─── Gatilhos ────────────────────────────────────────────────
  {
    type: "gatilho_evento",
    label: "Evento do sistema",
    description: "Dispara quando um evento acontece (venda, caminhão parado, etc.)",
    category: "gatilho",
    icon: Zap,
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
    hasInput: false,
    defaultData: { evento: "manual" },
  },
  {
    type: "gatilho_agendado",
    label: "Agendado",
    description: "Dispara em horário definido (cron)",
    category: "gatilho",
    icon: CalendarDays,
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
    hasInput: false,
    defaultData: { cron: "0 8 * * *" },
  },
  {
    type: "gatilho_webhook",
    label: "Webhook externo",
    description: "Dispara ao receber um POST no endpoint público",
    category: "gatilho",
    icon: Webhook,
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
    hasInput: false,
    defaultData: {},
  },

  // ─── Condições ───────────────────────────────────────────────
  {
    type: "condicao_filtro",
    label: "Filtro por variável",
    description: "Compara uma variável do evento (ex.: placa, valor)",
    category: "condicao",
    icon: FilterIcon,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    outputs: [
      { id: "yes", label: "Sim" },
      { id: "no", label: "Não" },
    ],
    defaultData: { campo: "", operador: "=", valor: "" },
  },
  {
    type: "condicao_horario",
    label: "Horário / Dia",
    description: "Só executa em horário/dia da semana",
    category: "condicao",
    icon: Clock,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    outputs: [
      { id: "yes", label: "Dentro" },
      { id: "no", label: "Fora" },
    ],
    defaultData: { hora_inicio: "08:00", hora_fim: "18:00", dias: [1, 2, 3, 4, 5] },
  },
  {
    type: "condicao_escopo",
    label: "Escopo do dispositivo",
    description: "Só continua se o dispositivo bate com o filtro",
    category: "condicao",
    icon: GitBranch,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    outputs: [
      { id: "yes", label: "Corresponde" },
      { id: "no", label: "Não" },
    ],
    defaultData: { escopo_tipo: "todos", escopo_ids: [] as string[], dashboard_id: null as string | null },
  },

  // ─── Ações ───────────────────────────────────────────────────
  {
    type: "acao_barra",
    label: "Mostrar barra",
    description: "Exibe a barra de notificação na tela do dispositivo",
    category: "acao",
    icon: Bell,
    color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    defaultData: {
      mensagem: "",
      duracao_segundos: 8,
      estilo: { bg: "#0f172a", fg: "#ffffff", icone: "Bell", posicao: "bottom" },
    },
  },
  {
    type: "acao_aguardar",
    label: "Aguardar",
    description: "Pausa antes de seguir para o próximo bloco",
    category: "acao",
    icon: Timer,
    color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    defaultData: { segundos: 5 },
  },
  {
    type: "acao_trocar_dashboard",
    label: "Trocar dashboard",
    description: "Muda o dashboard exibido no dispositivo",
    category: "acao",
    icon: MonitorPlay,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    defaultData: { dashboard_id: "" },
  },
  {
    type: "acao_comando",
    label: "Enviar comando",
    description: "Reiniciar app, limpar cache, alterar brilho, etc.",
    category: "acao",
    icon: Terminal,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    defaultData: { comando: "reiniciar_app", payload: {} as Record<string, any> },
  },
  {
    type: "acao_som",
    label: "Tocar som",
    description: "Reproduz um beep/alerta no dispositivo",
    category: "acao",
    icon: Volume2,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    defaultData: { som: "beep", volume: 80 },
  },
  {
    type: "acao_log",
    label: "Registrar log",
    description: "Salva um evento no histórico do dispositivo",
    category: "acao",
    icon: FileText,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    defaultData: { titulo: "", mensagem: "", nivel: "info" },
  },
];

export const TV_BLOCK_BY_TYPE: Record<string, TvBlockDefinition> = Object.fromEntries(
  TV_BLOCK_DEFINITIONS.map((b) => [b.type, b]),
);

export interface TvFlowNodeData {
  type: string;
  label: string;
  config: Record<string, any>;
  nota?: string;
}

export const CATEGORY_LABELS: Record<TvBlockCategory, string> = {
  gatilho: "Gatilhos",
  condicao: "Condições",
  acao: "Ações",
};

export const EVENTOS_SISTEMA = [
  { value: "manual", label: "Manual" },
  { value: "caminhao_parado", label: "Caminhão parado" },
  { value: "caminhao_movimento", label: "Caminhão em movimento" },
  { value: "venda_realizada", label: "Venda realizada" },
  { value: "pedido_novo", label: "Novo pedido" },
  { value: "alerta_camera", label: "Alerta de câmera" },
  { value: "visita_iniciada", label: "Visita iniciada" },
  { value: "ponto_batido", label: "Ponto batido" },
];

export const ICONES_BARRA = ["Bell", "AlertTriangle", "CheckCircle2", "Info", "Truck", "ShoppingCart", "Camera", "Users", "Zap"];
