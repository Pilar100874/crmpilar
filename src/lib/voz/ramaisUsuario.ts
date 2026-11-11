import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface RamaisUsuario {
  usuario_id: string;
  estabelecimento_id: string;
  virtual_ativo: boolean;
  ramal_virtual: string | null;
  senha_virtual: string | null;
  agente_virtual_id: string | null;
  ligacoes_ativo: boolean;
  ramal_ligacoes: string | null;
  senha_ligacoes: string | null;
  ajuda_ativa: boolean;
  escuta_geral?: boolean;
}

/** Ligação em massa por IA só fica liberada com "fazer ligações" ligado e ramal preenchido. */
export function podeLigarComIa(r: Pick<RamaisUsuario, "ligacoes_ativo" | "ramal_ligacoes"> | null | undefined): boolean {
  return !!r?.ligacoes_ativo && !!String(r.ramal_ligacoes ?? "").trim();
}

/** Escuta geral: só com a permissão ligada e um ramal próprio para ouvir. */
export function podeEscutarRamais(r: Pick<RamaisUsuario, "ligacoes_ativo" | "ramal_ligacoes" | "escuta_geral"> | null | undefined): boolean {
  return !!r?.escuta_geral && podeLigarComIa(r);
}

/** Ramal ocupado: em chamada pelo sistema ou aparecendo em algum canal ativo da central. */
export function ramalOcupado(
  ramal: string,
  emChamadaSistema: boolean,
  chamadas: { origem?: string; destino?: string; canal?: string }[],
): boolean {
  const r = String(ramal || "").trim();
  if (!r) return false;
  if (emChamadaSistema) return true;
  const re = new RegExp(`(^|\\D)${r}(\\D|$)`);
  return chamadas.some((c) => [c.origem, c.destino, c.canal].some((v) => v && re.test(String(v))));
}

export async function usuarioAtualId(): Promise<string | null> {
  const { data } = await supabase.rpc("get_current_usuario_id" as any);
  return (data as string) ?? null;
}

export async function carregarRamaisUsuario(usuarioId: string): Promise<RamaisUsuario | null> {
  const { data } = await db.from("voz_ramais_usuario").select("*").eq("usuario_id", usuarioId).maybeSingle();
  return data ?? null;
}

export async function meusRamaisIa(): Promise<RamaisUsuario | null> {
  const id = await usuarioAtualId();
  return id ? carregarRamaisUsuario(id) : null;
}

/** Consulta a central e a presença do sistema para saber se o ramal está livre. */
export async function consultarRamalOcupado(ramal: string): Promise<boolean | null> {
  try {
    const desde = new Date(Date.now() - 90_000).toISOString();
    const [pres, ucm] = await Promise.all([
      db.from("sip_presenca").select("em_chamada").eq("ramal", ramal).gte("ultimo_ping", desde),
      supabase.functions.invoke("ucm-status", { body: {} }),
    ]);
    const emChamada = (pres.data ?? []).some((p: any) => p.em_chamada);
    const resp = ucm.data as { ok?: boolean; chamadas?: any[] } | null;
    if (!resp?.ok && !emChamada) return null;
    return ramalOcupado(ramal, emChamada, resp?.chamadas ?? []);
  } catch {
    return null;
  }
}
