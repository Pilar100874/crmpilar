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
  | "clima"
  | "abas"
  | "bubble"
  | "expansivel";

export interface Ambiente {
  id: string;
  nome: string;
  /** Nome da tela (grupo de abas) a que este ambiente pertence. */
  tela_nome?: string | null;
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
  /** Para qual tipo de tela este painel foi montado. */
  dispositivo?: TipoTela | null;
  /** Em tablet/celular, permite que a tela role para baixo. */
  rolagem?: boolean | null;
  /** Mostra a barra de abas de ambientes na tela de parede. */
  mostrar_abas?: boolean | null;
}

/** Guarda no banco como os elementos são posicionados no ambiente. */
export async function salvarModoAmbiente(id: string, modo: "grade" | "livre") {
  await db.from("automacao_ambientes").update({ modo }).eq("id", id);
}

/** Tamanho usado quando o ambiente ainda não tem tela definida. */
export const TELA_PADRAO = { largura: 1920, altura: 1080 };

export type TipoTela = "tv" | "computador" | "tablet" | "celular";

export const TIPOS_TELA: { valor: TipoTela; label: string; descricao: string }[] = [
  { valor: "tv", label: "TV / painel de parede", descricao: "Televisão ou monitor grande fixo na parede" },
  { valor: "computador", label: "Computador", descricao: "Notebook ou monitor de mesa" },
  { valor: "tablet", label: "Tablet", descricao: "iPad e similares, com rolagem opcional" },
  { valor: "celular", label: "Celular", descricao: "Telefone, com rolagem para baixo" },
];

/** Formatos de tela sugeridos para cada tipo de aparelho. */
export const FORMATOS_TELA: Record<TipoTela, { valor: string; label: string; largura: number; altura: number }[]> = {
  tv: [
    { valor: "16:9", label: "16:9 — TV widescreen", largura: 1920, altura: 1080 },
    { valor: "9:16", label: "9:16 — TV em pé", largura: 1080, altura: 1920 },
    { valor: "21:9", label: "21:9 — ultrawide", largura: 2560, altura: 1080 },
    { valor: "4:3", label: "4:3 — clássica", largura: 1600, altura: 1200 },
  ],
  computador: [
    { valor: "1920", label: "Full HD (1920 × 1080)", largura: 1920, altura: 1080 },
    { valor: "1440", label: "Notebook (1440 × 900)", largura: 1440, altura: 900 },
    { valor: "1366", label: "Notebook menor (1366 × 768)", largura: 1366, altura: 768 },
    { valor: "2560", label: "Monitor grande (2560 × 1440)", largura: 2560, altura: 1440 },
  ],
  tablet: [
    { valor: "tablet-retrato", label: "Tablet em pé (834 × 1194)", largura: 834, altura: 1194 },
    { valor: "tablet-paisagem", label: "Tablet deitado (1194 × 834)", largura: 1194, altura: 834 },
    { valor: "tablet-android", label: "Tablet Android (800 × 1280)", largura: 800, altura: 1280 },
  ],
  celular: [
    { valor: "cel-medio", label: "Celular comum (390 × 844)", largura: 390, altura: 844 },
    { valor: "cel-grande", label: "Celular grande (430 × 932)", largura: 430, altura: 932 },
    { valor: "cel-longo", label: "Celular com rolagem (390 × 1400)", largura: 390, altura: 1400 },
  ],
};

/** Descobre o tipo de tela pelo tamanho da janela do aparelho. */
export function detectarTipoTela(largura = typeof window === "undefined" ? 1920 : window.innerWidth): TipoTela {
  if (largura < 640) return "celular";
  if (largura < 1024) return "tablet";
  if (largura < 1600) return "computador";
  return "tv";
}

export const PROPORCOES = FORMATOS_TELA.tv;


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
  { valor: "abas", label: "Abas de ambientes", descricao: "Botões para trocar de ambiente dentro do próprio painel", grupo: "Visual" },
  { valor: "clima", label: "Data, hora e clima", descricao: "Relógio com data e a previsão do tempo da cidade", grupo: "Informação" },
  { valor: "ambiente", label: "Cartão de ambiente (foto)", descricao: "Foto que fica clara ao ligar e escura ao desligar", grupo: "Controle" },
  { valor: "imagemluz", label: "Imagem acesa / apagada", descricao: "Imagem com fundo transparente que aparece ao ligar (ideal para sobrepor)", grupo: "Controle" },
  { valor: "bubble", label: "Controle Rápido", descricao: "Ícone, estado e botão de ação", grupo: "Controle" },
  { valor: "expansivel", label: "Grupo expansível", descricao: "Um toque abre outros elementos escolhidos", grupo: "Controle" },
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
    tela_nome: a.tela_nome?.trim() || null,
    icone: a.icone ?? null,
    ordem: a.ordem ?? 0,
    tela_largura: a.tela_largura ?? null,
    tela_altura: a.tela_altura ?? null,
    fundo_caminho: a.fundo_caminho ?? null,
    fundo_opacidade: a.fundo_opacidade ?? 100,
    fundo_ajuste: a.fundo_ajuste ?? "cobrir",
    ativo: a.ativo !== false,
    dispositivo: a.dispositivo ?? "tv",
    rolagem: a.rolagem === true,
    mostrar_abas: a.mostrar_abas !== false,

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

/**
 * Aplica o mesmo aparelho e formato a todas as telas do grupo, para as abas
 * de um mesmo aparelho ficarem sempre no mesmo tamanho.
 */
export async function aplicarFormatoGrupo(
  dispositivoAtual: TipoTela,
  campos: { dispositivo: TipoTela; tela_largura: number; tela_altura: number; rolagem: boolean },
  telaNome?: string | null,
) {
  let q = db.from("automacao_ambientes").update(campos).eq("dispositivo", dispositivoAtual);
  if (telaNome) q = q.eq("tela_nome", telaNome);
  await q;
}

/** Renomeia a tela (grupo de abas) inteira de uma vez. */
export async function renomearTela(dispositivo: TipoTela, telaNome: string, novoNome: string) {
  await db
    .from("automacao_ambientes")
    .update({ tela_nome: novoNome.trim() })
    .eq("dispositivo", dispositivo)
    .eq("tela_nome", telaNome);
}

/** Liga ou desliga um painel sem apagar nada. */
export async function definirAtivoAmbiente(id: string, ativo: boolean) {
  await db.from("automacao_ambientes").update({ ativo }).eq("id", id);
}

/** Cria uma cópia completa do painel, com todos os elementos. */
export async function duplicarAmbiente(a: Ambiente): Promise<Ambiente | null> {
  return duplicarAmbienteComNome(a, `${a.nome} (cópia)`, a.tela_nome ?? null);
}

/**
 * Duplica uma tela inteira (todas as abas do grupo), criando um novo grupo
 * com o nome da tela seguido de "(cópia)".
 */
export async function duplicarTela(abas: Ambiente[]): Promise<number> {
  const primeira = abas[0];
  if (!primeira) return 0;
  const novaTelaNome = `${primeira.tela_nome?.trim() || primeira.nome} (cópia)`;
  let criados = 0;
  for (const aba of abas) {
    const novo = await duplicarAmbienteComNome(aba, aba.nome, novaTelaNome);
    if (novo) criados++;
  }
  return criados;
}

/** Cria uma cópia completa do painel, com todos os elementos, usando os nomes informados. */
export async function duplicarAmbienteComNome(
  a: Ambiente,
  novoNome: string,
  novaTelaNome: string | null,
): Promise<Ambiente | null> {
  const { data: novo } = await db
    .from("automacao_ambientes")
    .insert({
      nome: novoNome,
      tela_nome: novaTelaNome,
      icone: a.icone ?? null,
      ordem: (a.ordem ?? 0) + 1,
      tela_largura: a.tela_largura,
      tela_altura: a.tela_altura,
      modo: a.modo ?? "grade",
      fundo_caminho: a.fundo_caminho,
      fundo_opacidade: a.fundo_opacidade ?? 100,
      fundo_ajuste: a.fundo_ajuste ?? "cobrir",
      ativo: a.ativo !== false,
      dispositivo: a.dispositivo ?? "tv",
      rolagem: a.rolagem === true,
      mostrar_abas: a.mostrar_abas !== false,

    })
    .select()
    .maybeSingle();
  const criado = novo as Ambiente | null;
  if (!criado) return null;

  await copiarBlocosERegras(a.id, criado.id);
  return criado;
}

/** Troca os ids de elementos antigos pelos novos dentro do JSON da automação. */
function trocarBlocoId<T extends { bloco_id?: string | null }>(item: T, mapa: Map<string, string>): T {
  if (!item?.bloco_id) return item;
  const novo = mapa.get(item.bloco_id);
  return novo ? { ...item, bloco_id: novo } : item;
}

/**
 * Copia todos os elementos de um ambiente e também as automações dele,
 * já apontando para os elementos novos para funcionarem de imediato.
 */
async function copiarBlocosERegras(
  origemId: string,
  destinoId: string,
  fx = 1,
  fy = 1,
): Promise<void> {
  const { data: originais } = await db.from("automacao_blocos").select("*").eq("ambiente_id", origemId);
  const blocos = (originais ?? []) as Bloco[];
  const mapa = new Map<string, string>();

  for (const b of blocos) {
    const { data: novoBloco } = await db
      .from("automacao_blocos")
      .insert({
        ambiente_id: destinoId,
        tipo: b.tipo,
        nome: b.nome,
        icone: b.icone,
        device_id: b.device_id,
        canal: b.canal ?? 0,
        x: Math.round((b.x ?? 0) * fx),
        y: Math.round((b.y ?? 0) * fy),
        w: Math.max(1, Math.round((b.w ?? 1) * fx)),
        h: Math.max(1, Math.round((b.h ?? 1) * fy)),
        visivel: b.visivel !== false,
        config: b.config ?? {},
      })
      .select("id")
      .maybeSingle();
    if (novoBloco?.id) mapa.set(b.id, novoBloco.id as string);
  }

  const { data: regras } = await db.from("automacao_regras").select("*").eq("ambiente_id", origemId);
  const copiasRegras = ((regras ?? []) as any[]).map((r) => ({
    ambiente_id: destinoId,
    nome: r.nome,
    ativo: r.ativo !== false,
    ordem: r.ordem ?? 0,
    combinador: r.combinador ?? "todas",
    gatilho: trocarBlocoId(r.gatilho ?? {}, mapa),
    condicoes: Array.isArray(r.condicoes) ? r.condicoes.map((c: any) => trocarBlocoId(c, mapa)) : [],
    acoes: Array.isArray(r.acoes) ? r.acoes.map((ac: any) => trocarBlocoId(ac, mapa)) : [],
  }));
  if (copiasRegras.length) await db.from("automacao_regras").insert(copiasRegras);
}

/**
 * Copia uma aba (ambiente) para outra tela, mesmo que o formato seja diferente.
 * Os elementos são reposicionados proporcionalmente ao novo tamanho.
 */
export async function copiarAmbienteParaTela(
  origem: Ambiente,
  destino: Ambiente,
  novoNome?: string,
): Promise<Ambiente | null> {
  const larguraOrigem = origem.tela_largura ?? TELA_PADRAO.largura;
  const alturaOrigem = origem.tela_altura ?? TELA_PADRAO.altura;
  const larguraDestino = destino.tela_largura ?? TELA_PADRAO.largura;
  const alturaDestino = destino.tela_altura ?? TELA_PADRAO.altura;
  const fx = larguraOrigem > 0 ? larguraDestino / larguraOrigem : 1;
  const fy = alturaOrigem > 0 ? alturaDestino / alturaOrigem : 1;

  const { data: novo } = await db
    .from("automacao_ambientes")
    .insert({
      nome: (novoNome?.trim() || origem.nome),
      tela_nome: destino.tela_nome?.trim() || destino.nome,
      icone: origem.icone ?? null,
      ordem: (destino.ordem ?? 0) + 1,
      tela_largura: larguraDestino,
      tela_altura: alturaDestino,
      modo: origem.modo ?? "grade",
      fundo_caminho: origem.fundo_caminho,
      fundo_opacidade: origem.fundo_opacidade ?? 100,
      fundo_ajuste: origem.fundo_ajuste ?? "cobrir",
      ativo: true,
      dispositivo: destino.dispositivo ?? "tv",
      rolagem: destino.rolagem === true,
      mostrar_abas: destino.mostrar_abas !== false,
    })
    .select()
    .maybeSingle();
  const criado = novo as Ambiente | null;
  if (!criado) return null;

  await copiarBlocosERegras(origem.id, criado.id, fx, fy);
  return criado;
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

/**
 * Lê no equipamento a situação atual (ligado/desligado) de cada elemento do painel.
 * Consulta uma vez por equipamento+canal e devolve o resultado por elemento,
 * para os botões já aparecerem com a condição real assim que a tela abre.
 */
export async function lerEstadosDosBlocos(
  blocos: Bloco[],
): Promise<Record<string, boolean | null>> {
  const alvos = new Map<string, { deviceId: string; canal: number }>();
  for (const b of blocos) {
    if (!b.device_id) continue;
    const chave = `${b.device_id}:${b.canal ?? 0}`;
    if (!alvos.has(chave)) alvos.set(chave, { deviceId: b.device_id, canal: b.canal ?? 0 });
  }
  if (!alvos.size) return {};

  const porChave: Record<string, boolean | null> = {};
  await Promise.all(
    [...alvos.entries()].map(async ([chave, alvo]) => {
      try {
        const r = await comandoAutomacao(alvo.deviceId, "status", alvo.canal);
        porChave[chave] = r.ok ? r.ligado ?? null : null;
      } catch {
        porChave[chave] = null;
      }
    }),
  );

  const saida: Record<string, boolean | null> = {};
  for (const b of blocos) {
    if (!b.device_id) continue;
    saida[b.id] = porChave[`${b.device_id}:${b.canal ?? 0}`] ?? null;
  }
  return saida;
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
