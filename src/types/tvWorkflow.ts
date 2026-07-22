import type { LucideIcon } from "lucide-react";
import {
  Zap, Clock, Webhook, GitBranch, CalendarDays, Filter as FilterIcon,
  Bell, Timer, MonitorPlay, Terminal, Volume2, FileText, Play,
  Truck, ShoppingCart, Camera, Users, AlertTriangle, Package,
  DollarSign, HeartPulse, Wifi, WifiOff, Battery, Thermometer,
  PhoneCall, MessageSquare, Send, RefreshCw, Sun, Power,
  ClipboardList, MapPin, TrendingUp, TrendingDown, Sparkles,
  Radio, Image as ImageIcon, ListVideo, Repeat, Fingerprint,
  ShieldAlert, CarFront, PackageCheck, Boxes, UserCheck, UserX,
  CalendarClock, Globe, Percent, Award, FileWarning, LayoutGrid,
} from "lucide-react";

export type TvBlockCategory = "gatilho" | "condicao" | "acao";

export interface TvBlockDefinition {
  type: string;
  label: string;
  description: string;
  category: TvBlockCategory;
  /** Nome do grupo exibido na biblioteca (visual do bot). */
  group: string;
  icon: LucideIcon;
  color: string;
  defaultData: Record<string, any>;
  outputs?: { id: string; label: string }[];
  hasInput?: boolean;
}

// Cores por família (paleta consistente com bot builder)
const C = {
  trigger: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  logistica: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  vendas: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  seguranca: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  rh: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  estoque: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  sistema: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
  cond: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  acaoUi: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  acaoDisp: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  acaoInteg: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
};

// Utilitário para criar gatilhos de evento pré-configurados
const gatilhoEvento = (
  type: string,
  label: string,
  description: string,
  group: string,
  icon: LucideIcon,
  color: string,
  evento: string,
): TvBlockDefinition => ({
  type,
  label,
  description,
  category: "gatilho",
  group,
  icon,
  color,
  hasInput: false,
  defaultData: { evento },
});

export const TV_BLOCK_DEFINITIONS: TvBlockDefinition[] = [
  // ─── Gatilhos gerais ─────────────────────────────────────────
  {
    type: "gatilho_evento",
    label: "Evento do sistema",
    description: "Dispara quando um evento acontece (genérico)",
    category: "gatilho",
    group: "Gatilhos — Genéricos",
    icon: Zap,
    color: C.trigger,
    hasInput: false,
    defaultData: { evento: "manual" },
  },
  {
    type: "gatilho_agendado",
    label: "Agendado (cron)",
    description: "Dispara em horário definido",
    category: "gatilho",
    group: "Gatilhos — Genéricos",
    icon: CalendarDays,
    color: C.trigger,
    hasInput: false,
    defaultData: { cron: "0 8 * * *" },
  },
  {
    type: "gatilho_webhook",
    label: "Webhook externo",
    description: "Dispara ao receber POST no endpoint público",
    category: "gatilho",
    group: "Gatilhos — Genéricos",
    icon: Webhook,
    color: C.trigger,
    hasInput: false,
    defaultData: {},
  },
  {
    type: "gatilho_intervalo",
    label: "A cada X minutos",
    description: "Dispara em intervalos regulares",
    category: "gatilho",
    group: "Gatilhos — Genéricos",
    icon: Repeat,
    color: C.trigger,
    hasInput: false,
    defaultData: { intervalo_min: 15 },
  },

  // ─── Gatilhos Logística ──────────────────────────────────────
  gatilhoEvento("gatilho_caminhao_parado", "Caminhão parado", "Veículo sem movimento por X min", "Gatilhos — Logística", Truck, C.logistica, "caminhao_parado"),
  gatilhoEvento("gatilho_caminhao_movimento", "Caminhão em movimento", "Veículo retomou movimento", "Gatilhos — Logística", CarFront, C.logistica, "caminhao_movimento"),
  gatilhoEvento("gatilho_saida_veiculo", "Saída de veículo", "Motorista registrou saída", "Gatilhos — Logística", Send, C.logistica, "saida_veiculo"),
  gatilhoEvento("gatilho_chegada_veiculo", "Chegada de veículo", "Veículo retornou ao pátio", "Gatilhos — Logística", MapPin, C.logistica, "chegada_veiculo"),
  gatilhoEvento("gatilho_excesso_velocidade", "Excesso de velocidade", "Veículo acima do limite", "Gatilhos — Logística", TrendingUp, C.logistica, "excesso_velocidade"),
  gatilhoEvento("gatilho_cerca_entrar", "Entrou em cerca virtual", "Veículo entrou em geofence", "Gatilhos — Logística", MapPin, C.logistica, "cerca_entrar"),
  gatilhoEvento("gatilho_cerca_sair", "Saiu de cerca virtual", "Veículo saiu de geofence", "Gatilhos — Logística", MapPin, C.logistica, "cerca_sair"),
  gatilhoEvento("gatilho_rota_desviada", "Rota desviada", "Motorista fora da rota planejada", "Gatilhos — Logística", AlertTriangle, C.logistica, "rota_desviada"),
  gatilhoEvento("gatilho_visita_iniciada", "Visita iniciada", "Vendedor iniciou uma visita", "Gatilhos — Logística", UserCheck, C.logistica, "visita_iniciada"),
  gatilhoEvento("gatilho_visita_finalizada", "Visita finalizada", "Vendedor encerrou visita", "Gatilhos — Logística", UserX, C.logistica, "visita_finalizada"),

  // ─── Gatilhos Vendas / Pedidos ───────────────────────────────
  gatilhoEvento("gatilho_venda_realizada", "Venda realizada", "Nova venda registrada", "Gatilhos — Vendas", ShoppingCart, C.vendas, "venda_realizada"),
  gatilhoEvento("gatilho_pedido_novo", "Novo pedido", "Pedido criado no sistema", "Gatilhos — Vendas", ClipboardList, C.vendas, "pedido_novo"),
  gatilhoEvento("gatilho_pedido_aprovado", "Pedido aprovado", "Pedido teve aprovação", "Gatilhos — Vendas", PackageCheck, C.vendas, "pedido_aprovado"),
  gatilhoEvento("gatilho_pedido_cancelado", "Pedido cancelado", "Pedido foi cancelado", "Gatilhos — Vendas", FileWarning, C.vendas, "pedido_cancelado"),
  gatilhoEvento("gatilho_meta_atingida", "Meta atingida", "Meta de vendas batida", "Gatilhos — Vendas", Award, C.vendas, "meta_atingida"),
  gatilhoEvento("gatilho_meta_perdida", "Abaixo da meta", "Meta de vendas em risco", "Gatilhos — Vendas", TrendingDown, C.vendas, "meta_perdida"),
  gatilhoEvento("gatilho_ticket_alto", "Ticket alto", "Venda acima do valor X", "Gatilhos — Vendas", DollarSign, C.vendas, "ticket_alto"),
  gatilhoEvento("gatilho_orcamento_criado", "Orçamento criado", "Orçamento novo lançado", "Gatilhos — Vendas", FileText, C.vendas, "orcamento_criado"),

  // ─── Gatilhos Estoque / Compras ──────────────────────────────
  gatilhoEvento("gatilho_estoque_baixo", "Estoque baixo", "Produto abaixo do mínimo", "Gatilhos — Estoque", Boxes, C.estoque, "estoque_baixo"),
  gatilhoEvento("gatilho_estoque_zerado", "Estoque zerado", "Produto sem saldo", "Gatilhos — Estoque", Package, C.estoque, "estoque_zerado"),
  gatilhoEvento("gatilho_recebimento_mercadoria", "Recebimento de mercadoria", "Nova entrada no estoque", "Gatilhos — Estoque", PackageCheck, C.estoque, "recebimento_mercadoria"),

  // ─── Gatilhos Segurança / Câmeras ────────────────────────────
  gatilhoEvento("gatilho_alerta_camera", "Alerta de câmera", "Movimento ou pessoa detectada", "Gatilhos — Segurança", Camera, C.seguranca, "alerta_camera"),
  gatilhoEvento("gatilho_camera_offline", "Câmera offline", "Câmera perdeu conexão", "Gatilhos — Segurança", WifiOff, C.seguranca, "camera_offline"),
  gatilhoEvento("gatilho_intrusao", "Detecção de intrusão", "Sensor de intrusão ativado", "Gatilhos — Segurança", ShieldAlert, C.seguranca, "intrusao"),
  gatilhoEvento("gatilho_reconhecimento_facial", "Reconhecimento facial", "Rosto conhecido/desconhecido", "Gatilhos — Segurança", Fingerprint, C.seguranca, "reconhecimento_facial"),

  // ─── Gatilhos RH / Ponto ─────────────────────────────────────
  gatilhoEvento("gatilho_ponto_batido", "Ponto batido", "Colaborador registrou ponto", "Gatilhos — RH", Fingerprint, C.rh, "ponto_batido"),
  gatilhoEvento("gatilho_atraso", "Atraso de colaborador", "Batida fora do horário", "Gatilhos — RH", CalendarClock, C.rh, "atraso"),
  gatilhoEvento("gatilho_falta", "Falta registrada", "Colaborador não bateu ponto", "Gatilhos — RH", UserX, C.rh, "falta"),
  gatilhoEvento("gatilho_aniversario", "Aniversário", "Aniversário de colaborador/cliente", "Gatilhos — RH", Sparkles, C.rh, "aniversario"),

  // ─── Gatilhos Financeiro / CRM ───────────────────────────────
  gatilhoEvento("gatilho_pagamento_recebido", "Pagamento recebido", "Conta a receber baixada", "Gatilhos — Financeiro / CRM", DollarSign, C.vendas, "pagamento_recebido"),
  gatilhoEvento("gatilho_boleto_vencido", "Boleto vencido", "Cliente inadimplente", "Gatilhos — Financeiro / CRM", FileWarning, C.vendas, "boleto_vencido"),
  gatilhoEvento("gatilho_lead_novo", "Novo lead", "Lead cadastrado no CRM", "Gatilhos — Financeiro / CRM", Users, C.vendas, "lead_novo"),
  gatilhoEvento("gatilho_prospect_convertido", "Prospect convertido", "Prospect virou cliente", "Gatilhos — Financeiro / CRM", Percent, C.vendas, "prospect_convertido"),
  gatilhoEvento("gatilho_atendimento_aberto", "Atendimento aberto", "Chat/ticket iniciado", "Gatilhos — Financeiro / CRM", MessageSquare, C.vendas, "atendimento_aberto"),

  // ─── Gatilhos Sistema / Dispositivo ──────────────────────────
  gatilhoEvento("gatilho_dispositivo_online", "Dispositivo online", "Tela remota conectou", "Gatilhos — Sistema", Wifi, C.sistema, "dispositivo_online"),
  gatilhoEvento("gatilho_dispositivo_offline", "Dispositivo offline", "Tela remota perdeu conexão", "Gatilhos — Sistema", WifiOff, C.sistema, "dispositivo_offline"),
  gatilhoEvento("gatilho_bateria_baixa", "Bateria baixa", "Dispositivo com bateria crítica", "Gatilhos — Sistema", Battery, C.sistema, "bateria_baixa"),
  gatilhoEvento("gatilho_temperatura_alta", "Temperatura alta", "Dispositivo superaquecendo", "Gatilhos — Sistema", Thermometer, C.sistema, "temperatura_alta"),
  gatilhoEvento("gatilho_erro_sistema", "Erro do sistema", "Erro reportado por qualquer módulo", "Gatilhos — Sistema", AlertTriangle, C.sistema, "erro_sistema"),

  // ─── Condições ───────────────────────────────────────────────
  {
    type: "condicao_filtro",
    label: "Filtro por variável",
    description: "Compara uma variável do evento",
    category: "condicao",
    group: "Condições",
    icon: FilterIcon,
    color: C.cond,
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
    group: "Condições",
    icon: Clock,
    color: C.cond,
    outputs: [
      { id: "yes", label: "Dentro" },
      { id: "no", label: "Fora" },
    ],
    defaultData: { hora_inicio: "08:00", hora_fim: "18:00", dias: [1, 2, 3, 4, 5] },
  },
  {
    type: "condicao_escopo",
    label: "Escopo do dispositivo",
    description: "Filtra dispositivos-alvo",
    category: "condicao",
    group: "Condições",
    icon: GitBranch,
    color: C.cond,
    outputs: [
      { id: "yes", label: "Corresponde" },
      { id: "no", label: "Não" },
    ],
    defaultData: { escopo_tipo: "todos", escopo_ids: [] as string[], dashboard_id: null as string | null },
  },
  {
    type: "condicao_grupo",
    label: "Grupo de dispositivos",
    description: "Só continua se pertence a um grupo",
    category: "condicao",
    group: "Condições",
    icon: LayoutGrid,
    color: C.cond,
    outputs: [
      { id: "yes", label: "Sim" },
      { id: "no", label: "Não" },
    ],
    defaultData: { grupo_ids: [] as string[] },
  },
  {
    type: "condicao_estabelecimento",
    label: "Estabelecimento",
    description: "Restringe por estabelecimento",
    category: "condicao",
    group: "Condições",
    icon: Globe,
    color: C.cond,
    outputs: [
      { id: "yes", label: "Sim" },
      { id: "no", label: "Não" },
    ],
    defaultData: { estabelecimento_ids: [] as string[] },
  },

  // ─── Ações — Barra & UI ──────────────────────────────────────
  {
    type: "acao_duracao",
    label: "Definir duração",
    description: "Define por quantos segundos a próxima mensagem fica na tela",
    category: "acao",
    group: "Ações — Tela",
    icon: Clock,
    color: C.acaoUi,
    defaultData: { segundos: 8 },
  },
  {
    type: "acao_barra",
    label: "Mostrar barra",
    description: "Exibe a barra de notificação",
    category: "acao",
    group: "Ações — Tela",
    icon: Bell,
    color: C.acaoUi,
    defaultData: {
      mensagem: "",
      duracao_segundos: 8,
      estilo: { bg: "#0f172a", fg: "#ffffff", icone: "Bell", posicao: "bottom" },
    },
  },
  {
    type: "acao_popup",
    label: "Pop-up em tela",
    description: "Exibe um cartão sobre o dashboard",
    category: "acao",
    group: "Ações — Tela",
    icon: MessageSquare,
    color: C.acaoUi,
    defaultData: { titulo: "", mensagem: "", duracao_segundos: 10 },
  },
  {
    type: "acao_imagem",
    label: "Mostrar imagem",
    description: "Exibe uma imagem em destaque",
    category: "acao",
    group: "Ações — Tela",
    icon: ImageIcon,
    color: C.acaoUi,
    defaultData: { url: "", duracao_segundos: 8 },
  },
  {
    type: "acao_trocar_dashboard",
    label: "Trocar dashboard",
    description: "Muda o dashboard exibido",
    category: "acao",
    group: "Ações — Tela",
    icon: MonitorPlay,
    color: C.acaoUi,
    defaultData: { dashboard_id: "" },
  },
  {
    type: "acao_trocar_playlist",
    label: "Trocar playlist",
    description: "Muda a playlist em rotação",
    category: "acao",
    group: "Ações — Tela",
    icon: ListVideo,
    color: C.acaoUi,
    defaultData: { playlist_id: "" },
  },
  {
    type: "acao_aguardar",
    label: "Aguardar",
    description: "Pausa antes de seguir",
    category: "acao",
    group: "Ações — Tela",
    icon: Timer,
    color: C.acaoUi,
    defaultData: { segundos: 5 },
  },

  // ─── Ações — Dispositivo ─────────────────────────────────────
  {
    type: "acao_comando",
    label: "Enviar comando",
    description: "Reiniciar app, limpar cache, etc.",
    category: "acao",
    group: "Ações — Dispositivo",
    icon: Terminal,
    color: C.acaoDisp,
    defaultData: { comando: "reiniciar_app", payload: {} as Record<string, any> },
  },
  {
    type: "acao_som",
    label: "Tocar som",
    description: "Beep/alerta no dispositivo",
    category: "acao",
    group: "Ações — Dispositivo",
    icon: Volume2,
    color: C.acaoDisp,
    defaultData: { som: "beep", volume: 80 },
  },
  {
    type: "acao_brilho",
    label: "Ajustar brilho",
    description: "Altera o brilho da tela",
    category: "acao",
    group: "Ações — Dispositivo",
    icon: Sun,
    color: C.acaoDisp,
    defaultData: { brilho: 80 },
  },
  {
    type: "acao_screenshot",
    label: "Capturar tela",
    description: "Solicita screenshot do dispositivo",
    category: "acao",
    group: "Ações — Dispositivo",
    icon: Camera,
    color: C.acaoDisp,
    defaultData: {},
  },
  {
    type: "acao_reiniciar",
    label: "Reiniciar dispositivo",
    description: "Reinicia o aparelho",
    category: "acao",
    group: "Ações — Dispositivo",
    icon: Power,
    color: C.acaoDisp,
    defaultData: {},
  },
  {
    type: "acao_atualizar",
    label: "Atualizar conteúdo",
    description: "Força refresh do dashboard",
    category: "acao",
    group: "Ações — Dispositivo",
    icon: RefreshCw,
    color: C.acaoDisp,
    defaultData: {},
  },

  // ─── Ações — Integrações ─────────────────────────────────────
  {
    type: "acao_whatsapp",
    label: "Enviar WhatsApp",
    description: "Dispara mensagem via canal WhatsApp",
    category: "acao",
    group: "Ações — Integrações",
    icon: PhoneCall,
    color: C.acaoInteg,
    defaultData: { sessao_id: "", destinatario: "", mensagem: "" },
  },
  {
    type: "acao_push",
    label: "Enviar push",
    description: "Notificação push para usuários",
    category: "acao",
    group: "Ações — Integrações",
    icon: Radio,
    color: C.acaoInteg,
    defaultData: { titulo: "", mensagem: "", url: "" },
  },
  {
    type: "acao_webhook_out",
    label: "Chamar webhook",
    description: "POST para URL externa",
    category: "acao",
    group: "Ações — Integrações",
    icon: Webhook,
    color: C.acaoInteg,
    defaultData: { url: "", metodo: "POST", body: "" },
  },
  {
    type: "acao_log",
    label: "Registrar log",
    description: "Salva evento no histórico",
    category: "acao",
    group: "Ações — Integrações",
    icon: FileText,
    color: C.acaoInteg,
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

// Ordem dos grupos exibidos na biblioteca (estilo bot builder)
export const TV_LIBRARY_GROUPS: { name: string; icon: string }[] = [
  { name: "Gatilhos — Genéricos", icon: "Zap" },
  { name: "Gatilhos — Logística", icon: "Truck" },
  { name: "Gatilhos — Vendas", icon: "ShoppingCart" },
  { name: "Gatilhos — Estoque", icon: "Boxes" },
  { name: "Gatilhos — Segurança", icon: "ShieldAlert" },
  { name: "Gatilhos — RH", icon: "Fingerprint" },
  { name: "Gatilhos — Financeiro / CRM", icon: "DollarSign" },
  { name: "Gatilhos — Sistema", icon: "Wifi" },
  { name: "Condições", icon: "GitBranch" },
  { name: "Ações — Tela", icon: "MonitorPlay" },
  { name: "Ações — Dispositivo", icon: "Terminal" },
  { name: "Ações — Integrações", icon: "Send" },
];

// Eventos disponíveis no bloco "Evento do sistema" (agrupados)
export const EVENTOS_SISTEMA_GRUPOS: { grupo: string; itens: { value: string; label: string }[] }[] = [
  {
    grupo: "Genérico",
    itens: [{ value: "manual", label: "Manual (via botão / API)" }],
  },
  {
    grupo: "Logística",
    itens: [
      { value: "caminhao_parado", label: "Caminhão parado" },
      { value: "caminhao_movimento", label: "Caminhão em movimento" },
      { value: "saida_veiculo", label: "Saída de veículo" },
      { value: "chegada_veiculo", label: "Chegada de veículo" },
      { value: "excesso_velocidade", label: "Excesso de velocidade" },
      { value: "cerca_entrar", label: "Entrou em cerca virtual" },
      { value: "cerca_sair", label: "Saiu de cerca virtual" },
      { value: "rota_desviada", label: "Rota desviada" },
      { value: "visita_iniciada", label: "Visita iniciada" },
      { value: "visita_finalizada", label: "Visita finalizada" },
    ],
  },
  {
    grupo: "Vendas",
    itens: [
      { value: "venda_realizada", label: "Venda realizada" },
      { value: "pedido_novo", label: "Novo pedido" },
      { value: "pedido_aprovado", label: "Pedido aprovado" },
      { value: "pedido_cancelado", label: "Pedido cancelado" },
      { value: "meta_atingida", label: "Meta atingida" },
      { value: "meta_perdida", label: "Abaixo da meta" },
      { value: "ticket_alto", label: "Ticket alto" },
      { value: "orcamento_criado", label: "Orçamento criado" },
    ],
  },
  {
    grupo: "Estoque",
    itens: [
      { value: "estoque_baixo", label: "Estoque baixo" },
      { value: "estoque_zerado", label: "Estoque zerado" },
      { value: "recebimento_mercadoria", label: "Recebimento de mercadoria" },
    ],
  },
  {
    grupo: "Segurança",
    itens: [
      { value: "alerta_camera", label: "Alerta de câmera" },
      { value: "camera_offline", label: "Câmera offline" },
      { value: "intrusao", label: "Detecção de intrusão" },
      { value: "reconhecimento_facial", label: "Reconhecimento facial" },
    ],
  },
  {
    grupo: "RH",
    itens: [
      { value: "ponto_batido", label: "Ponto batido" },
      { value: "atraso", label: "Atraso" },
      { value: "falta", label: "Falta" },
      { value: "aniversario", label: "Aniversário" },
    ],
  },
  {
    grupo: "Financeiro / CRM",
    itens: [
      { value: "pagamento_recebido", label: "Pagamento recebido" },
      { value: "boleto_vencido", label: "Boleto vencido" },
      { value: "lead_novo", label: "Novo lead" },
      { value: "prospect_convertido", label: "Prospect convertido" },
      { value: "atendimento_aberto", label: "Atendimento aberto" },
    ],
  },
  {
    grupo: "Sistema",
    itens: [
      { value: "dispositivo_online", label: "Dispositivo online" },
      { value: "dispositivo_offline", label: "Dispositivo offline" },
      { value: "bateria_baixa", label: "Bateria baixa" },
      { value: "temperatura_alta", label: "Temperatura alta" },
      { value: "erro_sistema", label: "Erro do sistema" },
    ],
  },
];

// Lista plana — mantida para retrocompatibilidade
export const EVENTOS_SISTEMA = EVENTOS_SISTEMA_GRUPOS.flatMap((g) => g.itens);

export const ICONES_BARRA = ["Bell", "AlertTriangle", "CheckCircle2", "Info", "Truck", "ShoppingCart", "Camera", "Users", "Zap"];
