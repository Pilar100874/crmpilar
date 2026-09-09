import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Activity } from "lucide-react";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";

interface Ponto { hora: string; valor: number }

export default function BlocoGrafico({ bloco }: { bloco: Bloco }) {
  const [serie, setSerie] = useState<Ponto[]>([]);
  const timer = useRef<number | null>(null);
  const cfg = (bloco.config ?? {}) as { intervalo_seg?: number; transparente?: boolean };
  const intervalo = Math.max(10, Number(cfg.intervalo_seg ?? 30)) * 1000;

  useEffect(() => {
    let ativo = true;
    const ler = async () => {
      if (!bloco.device_id) return;
      const r = await comandoAutomacao(bloco.device_id, "status", bloco.canal);
      if (!ativo || !r.ok) return;
      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setSerie((s) => [...s, { hora, valor: r.ligado ? 1 : 0 }].slice(-30));
    };
    ler();
    timer.current = window.setInterval(ler, intervalo);
    return () => {
      ativo = false;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [bloco.device_id, bloco.canal, intervalo]);

  return (
    <div className={`h-full rounded-2xl p-3 flex flex-col ${cfg.transparente ? "border border-transparent bg-transparent" : "border border-border bg-card"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Activity className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold truncate">{bloco.nome}</p>
      </div>
      <div className="flex-1 min-h-0">
        {serie.length < 2 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Coletando leituras...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`g-${bloco.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 1]} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v ? "Ligado" : "Desligado", "Estado"]}
              />
              <Area
                type="stepAfter"
                dataKey="valor"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill={`url(#g-${bloco.id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
