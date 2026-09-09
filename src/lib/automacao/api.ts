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
  | "imagem";

export interface Ambiente {
  id: string;
  nome: string;
  icone: string | null;
  ordem: number;
}

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

export const TIPOS_BLOCO: { valor: TipoBloco; label: string; descricao: string }[] = [
  { valor: "luz", label: "Luz", descricao: "Liga e desliga a iluminação" },
  { valor: "tomada", label: "Tomada", descricao: "Liga e desliga um equipamento" },
  { valor: "portao", label: "Portão / Porta", descricao: "Acionamento por pulso" },
  { valor: "sensor", label: "Sensor / Status", descricao: "Mostra o estado do equipamento" },
  { valor: "cena", label: "Botão animado", descricao: "Botão grande com animação ao acionar" },
  { valor: "camera", label: "Câmera ao vivo", descricao: "Mostra a imagem de uma câmera" },
  { valor: "mapa", label: "Mapa", descricao: "Mostra um local no mapa" },
  { valor: "grafico", label: "Gráfico", descricao: "Acompanha o estado do equipamento ao longo do tempo" },
];

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
  const payload = { nome: a.nome, icone: a.icone ?? null, ordem: a.ordem ?? 0 };
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
