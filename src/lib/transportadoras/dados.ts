import { supabase } from "@/integrations/supabase/client";
import type { PhotoAngle } from "@/components/cv/CVPhotoCapture";

export interface TranspEmpresa {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
}

export interface TranspMotorista {
  id: string;
  transportadora_id: string | null;
  nome: string;
  cpf: string | null;
  cnh: string | null;
  whatsapp: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface TranspVeiculo {
  id: string;
  transportadora_id: string | null;
  placa: string;
  descricao: string | null;
  tipo_veiculo: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface TranspSetor {
  id: string;
  nome: string;
  whatsapp: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface TranspMovimento {
  id: string;
  transportadora_id: string | null;
  veiculo_id: string | null;
  motorista_id: string | null;
  setor_id: string | null;
  placa: string | null;
  motorista_nome: string | null;
  ajudante_nome: string | null;
  documento: string | null;
  motivo: string | null;
  tipo_operacao: string | null;
  nfe_chave: string | null;
  saida_nfe_chave: string | null;
  entrada_time: string;
  entrada_obs: string | null;
  liberado_time: string | null;
  liberado_obs: string | null;
  saida_time: string | null;
  saida_obs: string | null;
  status: string;
}


/** Ângulos de foto usados na entrada e saída (nenhum comparativo/validação de avaria). */
export const TRANSP_ANGLES: PhotoAngle[] = [
  { key: "frente", label: "Frente", required: false, source: "device" },
  { key: "traseira", label: "Traseira", required: false, source: "device" },
  { key: "lateral_esquerda", label: "Lateral Esquerda", required: false, source: "device" },
  { key: "lateral_direita", label: "Lateral Direita", required: false, source: "device" },
  { key: "carga", label: "Carga / Documento", required: false, source: "device" },
];

export const TIPOS_VEICULO_TRANSP = [
  "Carro",
  "Van",
  "VUC",
  "Truck",
  "Carreta",
  "Bitrem",
  "Moto",
  "Outro",
];

export const maskWhatsapp = (v: string) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const maskCpf = (v: string) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export const validarCpf = (v: string) => {
  const d = (v || "").replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const calc = (factor: number) => {
    let total = 0;
    for (let i = 0; i < factor - 1; i++) total += parseInt(d[i], 10) * (factor - i);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calc(10);
  if (d1 !== parseInt(d[9], 10)) return false;
  const d2 = calc(11);
  return d2 === parseInt(d[10], 10);
};

export const normalizePlaca = (v: string) =>
  (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);

export const maskPlaca = (v: string) => {
  const raw = normalizePlaca(v);
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}`;
};

/** Transportadoras cadastradas no CRM (empresas com tipo_cliente = transportadora). */
export async function listarTransportadoras(): Promise<TranspEmpresa[]> {
  const { data } = await supabase
    .from("empresas")
    .select("id, nome, nome_fantasia")
    .eq("tipo_cliente", "transportadora")
    .order("nome_fantasia");
  return (data ?? []) as TranspEmpresa[];
}

export const nomeTransportadora = (e?: TranspEmpresa | null) =>
  e ? (e.nome_fantasia || e.nome || "—") : "—";

/** Valor sentinela usado quando a movimentação é avulsa (sem transportadora cadastrada). */
export const SEM_TRANSPORTADORA = "avulsa";

/** Converte o valor do formulário em um id real (ou null quando avulsa). */
export const idTransportadora = (v?: string | null) =>
  !v || v === SEM_TRANSPORTADORA ? null : v;

/** Cria rapidamente uma transportadora no CRM (empresas com tipo_cliente = transportadora). */
export async function criarTransportadora(nome: string): Promise<TranspEmpresa> {
  const nomeUp = (nome || "").trim().toUpperCase();
  if (!nomeUp) throw new Error("Informe o nome da transportadora");

  const { getEstabelecimentoId } = await import("@/lib/estabelecimento");
  const estId = await getEstabelecimentoId();

  const { data, error } = await supabase
    .from("empresas")
    .insert({
      nome: nomeUp,
      nome_fantasia: nomeUp,
      tipo_cliente: "transportadora",
      ativo: true,
      ...(estId ? { estabelecimento_id: estId } : {}),
    } as any)
    .select("id, nome, nome_fantasia")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar transportadora");
  return data as TranspEmpresa;
}

/** Setores internos avisados quando um veículo chega para descarregar/carregar. */
export async function listarSetores(): Promise<TranspSetor[]> {
  const { data } = await supabase
    .from("transp_setores")
    .select("id, nome, whatsapp, observacoes, ativo")
    .eq("ativo", true)
    .order("nome");
  return (data ?? []) as TranspSetor[];
}

export async function criarSetor(nome: string, whatsapp: string): Promise<TranspSetor> {
  const nomeUp = (nome || "").trim().toUpperCase();
  if (!nomeUp) throw new Error("Informe o nome do setor");
  const { getEstabelecimentoId } = await import("@/lib/estabelecimento");
  const estId = await getEstabelecimentoId();
  if (!estId) throw new Error("Estabelecimento não encontrado");

  const { data, error } = await supabase
    .from("transp_setores")
    .insert({
      estabelecimento_id: estId,
      nome: nomeUp,
      whatsapp: (whatsapp || "").replace(/\D/g, "") || null,
      ativo: true,
    } as any)
    .select("id, nome, whatsapp, observacoes, ativo")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar setor");
  return data as TranspSetor;
}

/** Rótulos da operação: entrega = descarregamento, coleta = carregamento. */
export const OPERACOES = [
  { value: "entrega", label: "Entrega (descarregamento)", desc: "O veículo traz mercadoria com NF-e" },
  { value: "coleta", label: "Coleta (carregamento)", desc: "O veículo vem retirar mercadoria" },
] as const;

export const labelOperacao = (v?: string | null) =>
  v === "coleta" ? "Coleta (carregamento)" : "Entrega (descarregamento)";

/** Link do WhatsApp para avisar o setor sobre a chegada do veículo. */
export function linkAvisoSetor(setor: TranspSetor, texto: string) {
  const fone = (setor.whatsapp || "").replace(/\D/g, "");
  const num = fone.length <= 11 ? `55${fone}` : fone;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}
