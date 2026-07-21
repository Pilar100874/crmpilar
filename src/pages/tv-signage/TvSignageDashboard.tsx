import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tv, Wifi, WifiOff, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TvSignageDashboard() {
  const [stats, setStats] = useState({ online: 0, offline: 0, erro: 0, total: 0, pendentes: 0 });
  const [eventos, setEventos] = useState<any[]>([]);
  const [heartbeats, setHeartbeats] = useState<any[]>([]);

  const carregar = async () => {
    const [{ data: devices }, { count: pendentes }, { data: evs }, { data: hbs }] = await Promise.all([
      supabase.from("tv_devices").select("status"),
      supabase.from("tv_commands").select("*", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("tv_events").select("*").order("created_at", { ascending: false }).limit(15),
      supabase.from("tv_heartbeats").select("created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    const all = (devices || []) as any[];
    setStats({
      online: all.filter((d) => d.status === "online").length,
      offline: all.filter((d) => d.status === "offline").length,
      erro: all.filter((d) => d.status === "erro").length,
      total: all.length,
      pendentes: pendentes || 0,
    });
    setEventos(evs || []);
    // Agrupa heartbeats por hora
    const buckets: Record<string, number> = {};
    (hbs || []).forEach((h: any) => {
      const d = new Date(h.created_at);
      const key = `${d.getHours()}h`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    setHeartbeats(Object.entries(buckets).map(([hora, qtd]) => ({ hora, qtd })).reverse());
  };

  useEffect(() => {
    carregar();
    const ch = supabase.channel("tv-signage-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "tv_devices" }, carregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "tv_events" }, carregar)
      .subscribe();
    const iv = setInterval(carregar, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, []);

  const cards = [
    { label: "Online", value: stats.online, icon: Wifi, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Offline", value: stats.offline, icon: WifiOff, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "Com Erro", value: stats.erro, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Total", value: stats.total, icon: Tv, color: "text-primary", bg: "bg-primary/10" },
    { label: "Comandos Pendentes", value: stats.pendentes, icon: RefreshCw, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</span>
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </div>
            <div className="text-3xl font-semibold text-foreground">{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium">Heartbeats recebidos</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={heartbeats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hora" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="qtd" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium mb-4">Últimos eventos</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {eventos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum evento ainda.</p>}
            {eventos.map((e) => (
              <div key={e.id} className="text-xs border-l-2 border-primary/40 pl-2 py-1">
                <div className="text-foreground">{e.mensagem || e.tipo || "Evento"}</div>
                <div className="text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
