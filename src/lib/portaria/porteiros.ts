import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export interface Porteiro {
  id: string;
  estabelecimento_id: string;
  user_id: string | null;
  nome: string;
  documento: string | null;
  telefone: string | null;
  turno: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export async function listarPorteiros(apenasAtivos = true): Promise<Porteiro[]> {
  const estabelecimentoId = await getEstabelecimentoId();
  if (!estabelecimentoId) return [];
  let q = supabase
    .from("porteiros")
    .select("*")
    .eq("estabelecimento_id", estabelecimentoId)
    .order("nome");
  if (apenasAtivos) q = q.eq("ativo", true);
  const { data } = await q;
  return (data ?? []) as Porteiro[];
}

export interface ContextoPorteiro {
  /** Porteiro vinculado ao usuário logado (se houver). */
  porteiroLogado: Porteiro | null;
  /** Lista de porteiros ativos do estabelecimento. */
  porteiros: Porteiro[];
  /** True quando o usuário logado é um porteiro cadastrado (nome fixo). */
  fixo: boolean;
  carregando: boolean;
  recarregar: () => void;
}

/**
 * Contexto do porteiro para as telas da Portaria.
 * - Se o usuário logado estiver vinculado a um porteiro, o nome é fixado.
 * - Caso contrário, o usuário escolhe um dos porteiros cadastrados.
 */
export function usePorteiroContexto(): ContextoPorteiro {
  const [porteiroLogado, setPorteiroLogado] = useState<Porteiro | null>(null);
  const [porteiros, setPorteiros] = useState<Porteiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      const lista = await listarPorteiros(true);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!ativo) return;
      setPorteiros(lista);
      setPorteiroLogado(uid ? lista.find((p) => p.user_id === uid) ?? null : null);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [tick]);

  return {
    porteiroLogado,
    porteiros,
    fixo: !!porteiroLogado,
    carregando,
    recarregar: () => setTick((t) => t + 1),
  };
}

/* ------------------------------------------------------------------ */
/* Porteiro em serviço (usado por todas as telas do grupo Portaria)     */
/* ------------------------------------------------------------------ */

const CHAVE_SERVICO = "porteiroServicoId";
const EVENTO_SERVICO = "porteiro-servico-alterado";

export function setPorteiroServico(id: string | null) {
  if (id) localStorage.setItem(CHAVE_SERVICO, id);
  else localStorage.removeItem(CHAVE_SERVICO);
  window.dispatchEvent(new Event(EVENTO_SERVICO));
}

export function getPorteiroServicoId(): string | null {
  return localStorage.getItem(CHAVE_SERVICO);
}

export interface RegistroPorteiro {
  porteiro_id: string | null;
  porteiro_nome: string | null;
}

/**
 * Identifica o porteiro que está executando o registro atual:
 * 1. Porteiro vinculado ao usuário logado (fixo).
 * 2. Porteiro escolhido na barra "Porteiro em serviço".
 */
export async function getRegistroPorteiro(): Promise<RegistroPorteiro> {
  const lista = await listarPorteiros(true);
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id ?? null;
  const logado = uid ? lista.find((p) => p.user_id === uid) : undefined;
  const escolhido = logado ?? lista.find((p) => p.id === getPorteiroServicoId());
  return { porteiro_id: escolhido?.id ?? null, porteiro_nome: escolhido?.nome ?? null };
}

/** Reage a mudanças na escolha do porteiro em serviço. */
export function usePorteiroServico() {
  const ctx = usePorteiroContexto();
  const [servicoId, setServicoId] = useState<string | null>(getPorteiroServicoId());

  useEffect(() => {
    const h = () => setServicoId(getPorteiroServicoId());
    window.addEventListener(EVENTO_SERVICO, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVENTO_SERVICO, h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const atual = ctx.porteiroLogado ?? ctx.porteiros.find((p) => p.id === servicoId) ?? null;
  return { ...ctx, porteiroAtual: atual, definir: setPorteiroServico };
}
