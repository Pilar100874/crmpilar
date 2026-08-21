import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusPingDot } from "@/components/StatusPingDot";

type Props = {
  veiculoLogisticaId?: string | null;
  className?: string;
  dotOnly?: boolean;
};

export function CVRastreamentoDot({ veiculoLogisticaId, className, dotOnly = false }: Props) {
  const [ultimoAcesso, setUltimoAcesso] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!veiculoLogisticaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetch = async () => {
      const { data } = await supabase
        .from("dispositivos_rastreamento")
        .select("ultimo_acesso, status")
        .eq("veiculo_id", veiculoLogisticaId)
        .in("status", ["aprovado", "pendente"])
        .order("ultimo_acesso", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      setUltimoAcesso(data?.ultimo_acesso ?? null);
      setStatus(data?.status ?? null);
      setLoading(false);
    };
    fetch();
    const ch = supabase
      .channel(`rastreamento-${veiculoLogisticaId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dispositivos_rastreamento",
          filter: `veiculo_id=eq.${veiculoLogisticaId}`,
        },
        (payload) => {
          setUltimoAcesso((payload.new as any).ultimo_acesso ?? null);
          setStatus((payload.new as any).status ?? null);
        },
      )
      .subscribe();
    return () => {
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
      at={ultimoAcesso}
      status={status === "bloqueado" ? "offline" : status ?? undefined}
      label="Rastreamento"
      onlineMin={5}
      warnMin={15}
      dotOnly={dotOnly}
      className={className}
    />
  );
}
