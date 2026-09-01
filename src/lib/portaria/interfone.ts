import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Configuração do Interfone por unidade (flag ativo, câmeras extras, áudio). */
export interface InterfoneConfig {
  id?: string;
  unidade_id: string | null;
  ativo: boolean;
  auto_popup: boolean;
  som: boolean;
  device_id: string | null;
  cameras_extras: string[];
  sip_uri: string | null;
}

export const CONFIG_PADRAO: InterfoneConfig = {
  unidade_id: null,
  ativo: true,
  auto_popup: true,
  som: true,
  device_id: null,
  cameras_extras: [],
  sip_uri: null,
};

export interface ToqueCampainha {
  id: string;
  unidade_id: string | null;
  device_id: string | null;
  origem: string;
  status: string;
  created_at: string;
}

/** Carrega (e cria quando necessário) a configuração do interfone da unidade. */
export function useInterfoneConfig(unidadeId: string | null) {
  const [config, setConfig] = useState<InterfoneConfig | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    let q = supabase.from("port_interfone_config").select("*").limit(1);
    q = unidadeId ? q.eq("unidade_id", unidadeId) : q.is("unidade_id", null);
    const { data } = await q.maybeSingle();
    const row = data as Record<string, unknown> | null;
    setConfig(
      row
        ? {
            id: row.id as string,
            unidade_id: (row.unidade_id as string) ?? null,
            ativo: row.ativo !== false,
            auto_popup: row.auto_popup !== false,
            som: row.som !== false,
            device_id: (row.device_id as string) ?? null,
            cameras_extras: ((row.cameras_extras as string[]) ?? []).filter(Boolean),
            sip_uri: (row.sip_uri as string) ?? null,
          }
        : { ...CONFIG_PADRAO, unidade_id: unidadeId },
    );
    setCarregando(false);
  }, [unidadeId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Mantém a flag sincronizada entre abas/telas
  useEffect(() => {
    const canal = supabase
      .channel(`interfone-config-${unidadeId ?? "global"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "port_interfone_config" }, () => {
        void carregar();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregar, unidadeId]);

  const salvar = useCallback(
    async (mudancas: Partial<InterfoneConfig>) => {
      const atual = config ?? { ...CONFIG_PADRAO, unidade_id: unidadeId };
      const payload = {
        unidade_id: unidadeId,
        ativo: mudancas.ativo ?? atual.ativo,
        auto_popup: mudancas.auto_popup ?? atual.auto_popup,
        som: mudancas.som ?? atual.som,
        device_id: mudancas.device_id !== undefined ? mudancas.device_id : atual.device_id,
        cameras_extras: mudancas.cameras_extras ?? atual.cameras_extras,
        sip_uri: mudancas.sip_uri !== undefined ? mudancas.sip_uri : atual.sip_uri,
      };
      setConfig({ ...atual, ...payload });
      const { error } = atual.id
        ? await supabase.from("port_interfone_config").update(payload).eq("id", atual.id)
        : await supabase.from("port_interfone_config").insert(payload);
      if (error) return { ok: false, mensagem: error.message };
      await carregar();
      return { ok: true, mensagem: "Configuração do interfone salva." };
    },
    [carregar, config, unidadeId],
  );

  return { config, carregando, salvar, recarregar: carregar };
}

/**
 * Escuta os toques de campainha da unidade em tempo real.
 * Só dispara quando o interfone está ativo e o popup automático ligado.
 */
export function useCampainha(
  unidadeId: string | null,
  ativo: boolean,
  onToque: (toque: ToqueCampainha) => void,
) {
  const cb = useRef(onToque);
  cb.current = onToque;

  useEffect(() => {
    if (!ativo) return;
    const canal = supabase
      .channel(`interfone-campainha-${unidadeId ?? "global"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "port_campainha_eventos" },
        (payload) => {
          const toque = payload.new as ToqueCampainha;
          if (unidadeId && toque.unidade_id && toque.unidade_id !== unidadeId) return;
          // Ignora toques antigos (reconexão de canal)
          if (Date.now() - new Date(toque.created_at).getTime() > 60_000) return;
          cb.current(toque);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [ativo, unidadeId]);
}

/** Registra um toque de campainha (usado no teste manual e por botões físicos). */
export async function registrarToque(unidadeId: string | null, deviceId: string | null, origem = "manual") {
  const { error } = await supabase
    .from("port_campainha_eventos")
    .insert({ unidade_id: unidadeId, device_id: deviceId, origem });
  return { ok: !error, mensagem: error?.message ?? "Campainha registrada." };
}

/** Marca o toque como atendido pelo porteiro. */
export async function atenderToque(id: string, observacao?: string) {
  const { data } = await supabase.auth.getUser();
  await supabase
    .from("port_campainha_eventos")
    .update({
      status: "atendido",
      atendido_em: new Date().toISOString(),
      atendido_por: data.user?.id ?? null,
      observacao: observacao ?? null,
    })
    .eq("id", id);
}

/** Bip de alerta sem depender de arquivo de áudio. */
export function tocarAlerta() {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tocar = (inicio: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + inicio + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.5);
    };
    tocar(0);
    tocar(0.6);
    setTimeout(() => void ctx.close().catch(() => undefined), 2000);
  } catch {
    /* áudio indisponível */
  }
}
