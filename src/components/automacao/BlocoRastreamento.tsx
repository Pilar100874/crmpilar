import { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LazyLogisticaMap } from "@/components/logistica/LazyLogisticaMap";
import { VeiculoComStatus } from "@/types/logistica";
import { Bloco } from "@/lib/automacao/api";

interface Cfg {
  unidade_id?: string | null;
  intervalo_seg?: number;
  mostrar_lista?: boolean;
}

/** Mostra no painel a posição dos veículos rastreados (todos ou de uma unidade). */
export default function BlocoRastreamento({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as Cfg;
  const unidadeId = cfg.unidade_id || null;
  const intervalo = Math.max(10, Number(cfg.intervalo_seg ?? 30));
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    let q = supabase.from("veiculos").select("*").eq("ativo", true).order("placa");
    if (unidadeId) q = q.eq("unidade_id", unidadeId);
    const { data: lista } = await q;
    const ids = (lista ?? []).map((v: any) => v.id);
    let posicoes: any[] = [];
    if (ids.length) {
      const { data } = await supabase
        .from("veiculo_posicoes")
        .select("*")
        .in("veiculo_id", ids)
        .order("data_hora", { ascending: false })
        .limit(1000);
      posicoes = data ?? [];
    }
    const ultima = new Map<string, any>();
    for (const p of posicoes) if (!ultima.has(p.veiculo_id)) ultima.set(p.veiculo_id, p);

    const agora = Date.now();
    const resultado = (lista ?? []).map((v: any) => {
      const pos = ultima.get(v.id);
      let status: "movendo" | "parado" | "offline" = "offline";
      if (pos) {
        const minutos = (agora - new Date(pos.data_hora).getTime()) / 60000;
        if (minutos <= 30) status = (pos.velocidade ?? 0) > 5 ? "movendo" : "parado";
      }
      return { ...v, status, ultima_posicao: pos, ultima_atualizacao: pos?.data_hora } as VeiculoComStatus;
    });
    setVeiculos(resultado);
    setCarregando(false);
  }, [unidadeId]);

  useEffect(() => {
    setCarregando(true);
    carregar();
    const t = setInterval(carregar, intervalo * 1000);
    return () => clearInterval(t);
  }, [carregar, intervalo]);

  const comPosicao = veiculos.filter((v) => v.ultima_posicao);
  const movendo = veiculos.filter((v) => v.status === "movendo").length;

  return (
    <div className="h-full rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{bloco.nome}</span>
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {carregando ? "carregando..." : `${veiculos.length} veículos · ${movendo} em movimento`}
        </span>
      </div>
      <div className="relative flex-1 min-h-0">
        {carregando ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : comPosicao.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
            Nenhum veículo com posição recebida.
          </div>
        ) : (
          <LazyLogisticaMap veiculos={comPosicao} className="h-full w-full" fitBounds compactIcons />
        )}
      </div>
    </div>
  );
}
