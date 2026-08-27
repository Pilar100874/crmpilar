import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

/**
 * O cadastro de porteiros vive no cadastro de usuários:
 * um usuário é porteiro quando está marcado com o flag "Porteiro" (usuarios.is_porteiro).
 * Apenas usuários com esse flag podem registrar movimentações da Portaria.
 */
export interface Porteiro {
  id: string;
  nome: string;
  auth_user_id: string | null;
  estabelecimento_id: string | null;
  ativo: boolean;
}

export async function listarPorteiros(apenasAtivos = true): Promise<Porteiro[]> {
  const estabelecimentoId = await getEstabelecimentoId();
  if (!estabelecimentoId) return [];
  let q = supabase
    .from("usuarios")
    .select("id, nome, auth_user_id, estabelecimento_id, ativo")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("is_porteiro", true)
    .order("nome");
  if (apenasAtivos) q = q.eq("ativo", true);
  const { data } = await q;
  return ((data ?? []) as any[]).map((u) => ({
    id: u.id,
    nome: u.nome,
    auth_user_id: u.auth_user_id ?? null,
    estabelecimento_id: u.estabelecimento_id ?? null,
    ativo: u.ativo !== false,
  }));
}

/** Retorna o porteiro correspondente ao usuário logado, ou null. */
export async function getPorteiroLogado(): Promise<Porteiro | null> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return null;
  const { data: u } = await supabase
    .from("usuarios")
    .select("id, nome, auth_user_id, estabelecimento_id, ativo, is_porteiro")
    .eq("auth_user_id", uid)
    .maybeSingle();
  const row = u as any;
  if (!row || !row.is_porteiro || row.ativo === false) return null;
  return {
    id: row.id,
    nome: row.nome,
    auth_user_id: row.auth_user_id ?? null,
    estabelecimento_id: row.estabelecimento_id ?? null,
    ativo: true,
  };
}

export interface ContextoPorteiro {
  /** Porteiro correspondente ao usuário logado (se ele tiver o flag). */
  porteiroLogado: Porteiro | null;
  /** Lista de porteiros ativos do estabelecimento (apenas informativa). */
  porteiros: Porteiro[];
  /** True quando o usuário logado é porteiro. */
  fixo: boolean;
  carregando: boolean;
  recarregar: () => void;
}

export function usePorteiroContexto(): ContextoPorteiro {
  const [porteiroLogado, setPorteiroLogado] = useState<Porteiro | null>(null);
  const [porteiros, setPorteiros] = useState<Porteiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      const [lista, logado] = await Promise.all([listarPorteiros(true), getPorteiroLogado()]);
      if (!ativo) return;
      setPorteiros(lista);
      setPorteiroLogado(logado);
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

export interface RegistroPorteiro {
  porteiro_id: string | null;
  porteiro_nome: string | null;
}

/**
 * Identifica o porteiro que está executando o registro.
 * Somente o usuário logado com o flag "Porteiro" pode registrar movimentações.
 */
export async function getRegistroPorteiro(): Promise<RegistroPorteiro> {
  const p = await getPorteiroLogado();
  return { porteiro_id: p?.id ?? null, porteiro_nome: p?.nome ?? null };
}

export const MSG_SEM_PERMISSAO_PORTEIRO =
  "Apenas usuários marcados como Porteiro no cadastro de usuários podem registrar movimentações da Portaria.";

/**
 * Garante que o usuário logado é porteiro. Retorna null quando não for
 * (o chamador deve abortar a movimentação).
 */
export async function exigirPorteiro(): Promise<RegistroPorteiro | null> {
  const reg = await getRegistroPorteiro();
  return reg.porteiro_id ? reg : null;
}
