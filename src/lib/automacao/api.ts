import { supabase } from "@/integrations/supabase/client";

/** Tabelas novas ainda não estão nos tipos gerados. */
const db = supabase as unknown as {
  from: (t: string) => any;
};

export type TipoBloco =
  | "luz"
  | "tomada"
  | "portao"
  | "sensor"
  | "cena"
  | "camera"
  | "mapa"
  | "grafico"
  | "icone"
  | "imagem"
  | "rastreamento"
  | "portaria"
  | "interfone"
  | "pilarfone"
  | "ambiente"
  | "imagemluz"
  | "texto"
  | "forma"
  | "clima";

export interface Ambiente {
  id: string;
  nome: string;
  icone: string | null;
  ordem: number;
  /** Tamanho da tela de parede em pontos (ex.: 1920 x 1080). */
  tela_largura: number | null;
  tela_altura: number | null;
  /** Posicionamento dos elementos: "grade" ou "livre". */
  modo: "grade" | "livre" | null;
  /** Foto de fundo do painel (caminho no armazenamento ou endereço da internet). */
  fundo_caminho: string | null;
  /** Transparência da foto de fundo, de 0 (invisível) a 100 (opaca). */
  fundo_opacidade: number | null;
  /** Como a foto ocupa a tela: "cobrir", "conter" ou "esticar". */
  fundo_ajuste: string | null;
  /** Painel ligado (aparece para todos) ou desativado (só administradores veem). */
  ativo?: boolean | null;
}

/** Guarda no banco como os elementos são posicionados no ambiente. */
export async function salvarModoAmbiente(id: string, modo: "grade" | "livre") {
  await db.from("automacao_ambientes").update({ modo }).eq("id", id);
}

/** Tamanho usado quando o ambiente ainda não tem tela definida. */
export const TELA_PADRAO = { largura: 1920, altura: 1080 };

export const PROPORCOES = [
  { valor: "16:9", label: "16:9 — TV widescreen", largura: 1920, altura: 1080 },
  { valor: "9:16", label: "9:16 — TV em pé (retrato)", largura: 1080, altura: 1920 },
  { valor: "4:3", label: "4:3 — monitor clássico", largura: 1600, altura: 1200 },
  { valor: "21:9", label: "21:9 — tela ultrawide", largura: 2560, altura: 1080 },
  { valor: "1:1", label: "1:1 — quadrada", largura: 1200, altura: 1200 },
] as const;

export interface Bloco {
  id: string;
  ambiente_id: string | null;
  tipo: TipoBloco;
  nome: string;
  icone: string | null;
  device_id: string | null;
  canal: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Define se o bloco é exibido no painel (true) ou fica oculto (false). */
  visivel: boolean;
  config: Record<string, unknown>;
}

export interface DispositivoSimples {
  id: string;
  nome: string;
  tipo: string;
  ip: string | null;
  habilitado: boolean;
  status: string | null;
}

export interface DispositivoDetalhado extends DispositivoSimples {
  modelo: string | null;
  porta: number | null;
  localizacao: string | null;
  ultima_comunicacao: string | null;
}

/** Lista os equipamentos com os dados usados na tela de estado. */
export async function listarDispositivosDetalhados(): Promise<DispositivoDetalhado[]> {
  const { data } = await db
    .from("port_devices")
    .select("id, nome, tipo, modelo, ip, porta, localizacao, habilitado, status, ultima_comunicacao")
    .order("nome");
  return (data ?? []) as DispositivoDetalhado[];
}

export const TIPOS_BLOCO: {
  valor: TipoBloco;
  label: string;
  descricao: string;
  grupo: "Controle" | "Visual" | "Informação";
  /** Tipos antigos que foram substituídos: só aparecem se o elemento já usa. */
  legado?: boolean;
}[] = [
  { valor: "luz", label: "Luz", descricao: "Liga e desliga a iluminação", grupo: "Controle" },
  { valor: "tomada", label: "Tomada", descricao: "Liga e desliga um equipamento", grupo: "Controle" },
  { valor: "portao", label: "Portão / Porta", descricao: "Um toque abre (acionamento por pulso)", grupo: "Controle" },
  { valor: "icone", label: "Elemento animado", descricao: "Escolha o desenho (lâmpada, ventilador, portão...) e a animação", grupo: "Controle" },
  { valor: "cena", label: "Botão animado", descricao: "Substituído por Elemento animado", grupo: "Controle", legado: true },
  { valor: "sensor", label: "Sensor / Status", descricao: "Só mostra a situação, sem acionar", grupo: "Informação" },
  { valor: "grafico", label: "Gráfico", descricao: "Acompanha a situação ao longo do tempo", grupo: "Informação" },
  { valor: "camera", label: "Câmera ao vivo", descricao: "Mostra a imagem de uma câmera", grupo: "Informação" },
  { valor: "mapa", label: "Mapa", descricao: "Mostra um local no mapa", grupo: "Informação" },
  { valor: "rastreamento", label: "Rastreamento de veículos", descricao: "Mapa ao vivo com todos os veículos ou os de uma unidade", grupo: "Informação" },
  { valor: "portaria", label: "Controle de portaria", descricao: "Visitantes, transportadoras, veículos internos, ocorrências ou encomendas", grupo: "Informação" },
  { valor: "interfone", label: "Interfone", descricao: "Avisa a campainha e abre as câmeras em tela cheia", grupo: "Controle" },
  { valor: "pilarfone", label: "Pilar Fone", descricao: "Atalho para ligar ou abrir o telefone do sistema", grupo: "Controle" },
  { valor: "imagem", label: "Imagem", descricao: "Planta da casa, foto do ambiente ou fundo", grupo: "Visual" },
  { valor: "texto", label: "Texto", descricao: "Escreva títulos, avisos ou legendas na tela", grupo: "Visual" },
  { valor: "forma", label: "Retângulo / bola", descricao: "Desenho simples com cor de fundo, borda e cantos ajustáveis", grupo: "Visual" },
  { valor: "clima", label: "Data, hora e clima", descricao: "Relógio com data e a previsão do tempo da cidade", grupo: "Informação" },
  { valor: "ambiente", label: "Cartão de ambiente (foto)", descricao: "Foto que fica clara ao ligar e escura ao desligar", grupo: "Controle" },
  { valor: "imagemluz", label: "Imagem acesa / apagada", descricao: "Imagem com fundo transparente que aparece ao ligar (ideal para sobrepor)", grupo: "Controle" },
];


/** Envia uma imagem para o painel e devolve o caminho salvo. */
export async function enviarImagemAutomacao(arquivo: File): Promise<string | null> {
  const ext = arquivo.name.split(".").pop()?.toLowerCase() || "png";
  const caminho = `paineis/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("automacao").upload(caminho, arquivo, {
    upsert: false,
    contentType: arquivo.type || undefined,
  });
  return error ? null : caminho;
}

export async function urlImagemAutomacao(caminho: string): Promise<string | null> {
  const { data } = await supabase.storage.from("automacao").createSignedUrl(caminho, 60 * 60 * 8);
  return data?.signedUrl ?? null;
}

export interface UnidadeSimples {
  id: string;
  nome: string;
}

/** Unidades usadas para filtrar os veículos do elemento de rastreamento. */
export async function listarUnidades(): Promise<UnidadeSimples[]> {
  const { data } = await db.from("unidades").select("id, nome").order("nome");
  return (data ?? []) as UnidadeSimples[];
}

export interface CameraSimples {
  id: string;
  nome: string;
  filial_id: string | null;
}

export async function listarCameras(): Promise<CameraSimples[]> {
  const { data } = await db
    .from("cv_cameras")
    .select("id, nome, filial_id")
    .eq("ativo", true)
    .order("nome");
  return (data ?? []) as CameraSimples[];
}

export async function listarAmbientes(): Promise<Ambiente[]> {
  const { data } = await db.from("automacao_ambientes").select("*").order("ordem").order("nome");
  return (data ?? []) as Ambiente[];
}

export async function salvarAmbiente(a: Partial<Ambiente>): Promise<Ambiente | null> {
  const payload = {
    nome: a.nome,
    icone: a.icone ?? null,
    ordem: a.ordem ?? 0,
    tela_largura: a.tela_largura ?? null,
    tela_altura: a.tela_altura ?? null,
    fundo_caminho: a.fundo_caminho ?? null,
    fundo_opacidade: a.fundo_opacidade ?? 100,
    fundo_ajuste: a.fundo_ajuste ?? "cobrir",
    ativo: a.ativo !== false,
  };
  if (a.id) {
    const { data } = await db.from("automacao_ambientes").update(payload).eq("id", a.id).select().maybeSingle();
    return data as Ambiente | null;
  }
  const { data } = await db.from("automacao_ambientes").insert(payload).select().maybeSingle();
  return data as Ambiente | null;
}

export async function excluirAmbiente(id: string) {
  await db.from("automacao_ambientes").delete().eq("id", id);
}

export async function listarBlocos(): Promise<Bloco[]> {
  const { data } = await db.from("automacao_blocos").select("*").order("y").order("x");
  return (data ?? []) as Bloco[];
}

export async function salvarBloco(b: Partial<Bloco>): Promise<Bloco | null> {
  const payload = {
    ambiente_id: b.ambiente_id ?? null,
    tipo: b.tipo ?? "luz",
    nome: b.nome,
    icone: b.icone ?? null,
    device_id: b.device_id ?? null,
    canal: b.canal ?? 0,
    x: b.x ?? 0,
    y: b.y ?? 0,
    w: b.w ?? 2,
    h: b.h ?? 2,
    visivel: b.visivel !== false,
    config: b.config ?? {},
  };
  if (b.id) {
    const { data } = await db.from("automacao_blocos").update(payload).eq("id", b.id).select().maybeSingle();
    return data as Bloco | null;
  }
  const { data } = await db.from("automacao_blocos").insert(payload).select().maybeSingle();
  return data as Bloco | null;
}

export async function moverBloco(id: string, pos: { x: number; y: number; w?: number; h?: number }) {
  await db.from("automacao_blocos").update(pos).eq("id", id);
}

export async function excluirBloco(id: string) {
  await db.from("automacao_blocos").delete().eq("id", id);
}

export async function listarDispositivos(): Promise<DispositivoSimples[]> {
  const { data } = await db
    .from("port_devices")
    .select("id, nome, tipo, ip, habilitado, status")
    .order("nome");
  return (data ?? []) as DispositivoSimples[];
}

export interface RespostaAutomacao {
  ok: boolean;
  mensagem: string;
  ligado?: boolean | null;
}

export async function comandoAutomacao(
  deviceId: string,
  acao: "ligar" | "desligar" | "pulso" | "status",
  canal = 0,
): Promise<RespostaAutomacao> {
  const { data, error } = await supabase.functions.invoke("automacao-comando", {
    body: { acao, device_id: deviceId, canal },
  });
  if (error) return { ok: false, mensagem: error.message || "Falha ao enviar o comando." };
  const r = data as { ok?: boolean; error?: string; ligado?: boolean | null } | null;
  return {
    ok: !!r?.ok,
    mensagem: r?.ok ? "Comando enviado." : r?.error || "Não foi possível concluir o comando.",
    ligado: r?.ligado ?? null,
  };
}
