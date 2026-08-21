import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusPingDot } from "@/components/StatusPingDot";

type Props = {
  veiculoLogisticaId?: string | null;
  className?: string;
  dotOnly?: boolean;
};

export function CVRastreamentoDot({ veiculoLogisticaId, className, dotOnly = false }: Props) {
  const [ultimoContato, setUltimoContato] = useState<string | null>(null);

  useEffect(() => {
    if (!veiculoLogisticaId) return;

    let cancelled = false;

    const carregar = async () => {
      // Fonte principal: mesma usada no monitoramento da Logística
      const { data: pos } = await supabase
        .from("veiculo_posicoes")
        .select("data_hora")
        .eq("veiculo_id", veiculoLogisticaId)
        .order("data_hora", { ascending: false })
        .limit(1)
        .maybeSingle();

      let at: string | null = (pos as any)?.data_hora ?? null;

      // Fallback: dispositivo Android de rastreamento
      if (!at) {
        const { data: disp } = await supabase
          .from("dispositivos_rastreamento")
          .select("ultimo_acesso")
          .eq("veiculo_id", veiculoLogisticaId)
          .in("status", ["aprovado", "pendente"])
          .order("ultimo_acesso", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        at = (disp as any)?.ultimo_acesso ?? null;
      }

      if (!cancelled) setUltimoContato(at);
    };

    carregar();

    const ch = supabase
      .channel(`rastreamento-pos-${veiculoLogisticaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "veiculo_posicoes",
          filter: `veiculo_id=eq.${veiculoLogisticaId}`,
        },
        (payload) => setUltimoContato((payload.new as any)?.data_hora ?? null),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [veiculoLogisticaId]);

  if (!veiculoLogisticaId) {
    return (
      <StatusPingDot
        at={null}
        status="offline"
        label="Rastreamento"
        dotOnly={dotOnly}
        className={className}
      />
    );
  }

  return (
    <StatusPingDot
      at={ultimoContato}
      label="Rastreamento"
      onlineMin={30}
      warnMin={120}
      dotOnly={dotOnly}
      className={className}
    />
  );
}
