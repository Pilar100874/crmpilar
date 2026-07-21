import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as LucideIcons from "lucide-react";

type Execucao = {
  id: string;
  mensagem_renderizada: string;
  estilo: any;
  duracao_segundos: number;
  expira_em: string;
  created_at: string;
};

interface Props {
  deviceId: string | null | undefined;
}

/**
 * Barra de notificação para as telas remotas.
 * Escuta a fila de execuções de workflows (tv_workflow_execucoes) via Realtime
 * e exibe as mensagens conforme a duração configurada.
 */
export default function TvNotificationBar({ deviceId }: Props) {
  const [fila, setFila] = useState<Execucao[]>([]);

  // Carrega execuções pendentes ao montar e escuta inserts em tempo real
  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;

    const carregar = async () => {
      const { data } = await supabase
        .from("tv_workflow_execucoes")
        .select("id,mensagem_renderizada,estilo,duracao_segundos,expira_em,created_at")
        .eq("device_id", deviceId)
        .gt("expira_em", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(20);
      if (!cancelled && data) setFila(data as any);
    };
    carregar();

    const channel = supabase
      .channel(`tv_wf_exec_${deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tv_workflow_execucoes",
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          setFila((f) => [...f, payload.new as any]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  // Remove itens expirados a cada segundo
  useEffect(() => {
    const t = setInterval(() => {
      const agora = Date.now();
      setFila((f) => f.filter((e) => new Date(e.expira_em).getTime() > agora));
    }, 500);
    return () => clearInterval(t);
  }, []);

  if (!deviceId || fila.length === 0) return null;

  const atual = fila[0];
  const estilo = atual.estilo || {};
  const posicao = estilo.posicao === "top" ? "top" : "bottom";
  const bg = estilo.bg || "#0f172a";
  const fg = estilo.fg || "#ffffff";
  const IconeCmp = estilo.icone && (LucideIcons as any)[estilo.icone];

  return (
    <div
      className={`fixed left-0 right-0 z-[9999] px-6 py-4 shadow-2xl animate-in ${
        posicao === "top" ? "top-0 slide-in-from-top" : "bottom-0 slide-in-from-bottom"
      }`}
      style={{ background: bg, color: fg }}
    >
      <div className="flex items-center gap-4 max-w-full">
        {IconeCmp && <IconeCmp className="w-8 h-8 flex-shrink-0" />}
        <div className="text-2xl md:text-3xl font-bold tracking-tight flex-1 truncate">
          {atual.mensagem_renderizada}
        </div>
        {fila.length > 1 && (
          <div className="text-sm opacity-70 flex-shrink-0">+{fila.length - 1}</div>
        )}
      </div>
    </div>
  );
}
