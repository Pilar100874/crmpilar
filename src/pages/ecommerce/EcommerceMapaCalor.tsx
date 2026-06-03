import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Flame, ShoppingCart, Eye, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Period = "1" | "7" | "30";

const fmtMin = (ms: number) => {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EcommerceMapaCalor() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("7");
  const [events, setEvents] = useState<any[]>([]);
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - Number(period) * 24 * 3600 * 1000).toISOString();
      const [{ data: ev }, { data: ca }] = await Promise.all([
        supabase
          .from("ecom_usage_events" as any)
          .select("route,page_title,duration_ms,event_type,product_id,session_id,created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("ecom_active_carts" as any)
          .select("*")
          .order("last_activity_at", { ascending: false })
          .limit(200),
      ]);
      if (!mounted) return;
      setEvents((ev as any) || []);
      setCarts((ca as any) || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [period]);

  const routeStats = useMemo(() => {
    const agg = new Map<string, { route: string; title: string; total: number; visits: number; sessions: Set<string> }>();
    events.forEach((r: any) => {
      const cur =
        agg.get(r.route) ||
        { route: r.route, title: r.page_title || r.route, total: 0, visits: 0, sessions: new Set<string>() };
      cur.total += r.duration_ms || 0;
      cur.visits += 1;
      cur.sessions.add(r.session_id);
      agg.set(r.route, cur);
    });
    return Array.from(agg.values()).sort((a, b) => b.total - a.total);
  }, [events]);

  const activeCarts = carts.filter((c) => c.status === "active" && c.item_count > 0);
  const abandonedCarts = activeCarts.filter(
    (c) => Date.now() - new Date(c.last_activity_at).getTime() > 30 * 60 * 1000
  );
  const visitorsActive = new Set(events.map((e) => e.session_id)).size;
  const avgDuration = events.length
    ? events.reduce((s: number, e: any) => s + (e.duration_ms || 0), 0) / events.length
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" /> Mapa de Calor do E-commerce
          </h1>
          <p className="text-muted-foreground text-sm">
            Uso da loja pelos visitantes, telas mais visitadas e carrinhos abandonados.
          </p>
        </div>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="1">Hoje</TabsTrigger>
          <TabsTrigger value="7">7 dias</TabsTrigger>
          <TabsTrigger value="30">30 dias</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" /> <CardTitle className="text-sm">Sessões</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{visitorsActive}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Timer className="h-4 w-4 text-emerald-500" /> <CardTitle className="text-sm">Tempo médio/página</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{fmtMin(avgDuration)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-violet-500" /> <CardTitle className="text-sm">Carrinhos ativos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{activeCarts.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-destructive" /> <CardTitle className="text-sm">Abandonados &gt;30m</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{abandonedCarts.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Páginas mais quentes da loja</CardTitle>
          <CardDescription>Tempo total e sessões únicas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
          {loading && <p className="text-muted-foreground text-sm">Carregando…</p>}
          {!loading && routeStats.length === 0 && (
            <p className="text-muted-foreground text-sm">Sem dados no período.</p>
          )}
          {routeStats.map((r) => {
            const max = routeStats[0]?.total || 1;
            const ratio = r.total / max;
            return (
              <div key={r.route} className="border rounded p-2">
                <div className="flex justify-between text-sm">
                  <div className="truncate">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.route} · {r.visits} visualizações · {r.sessions.size} sessões
                    </div>
                  </div>
                  <div className="font-mono text-sm">{fmtMin(r.total)}</div>
                </div>
                <div className="h-1.5 mt-1 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${ratio * 100}%`, backgroundColor: "hsl(15 90% 55%)" }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Carrinhos abandonados</CardTitle>
          <CardDescription>Sem atividade há mais de 30 minutos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
          {abandonedCarts.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum carrinho abandonado no momento. 🎉</p>
          )}
          {abandonedCarts.map((c) => {
            const mins = Math.floor((Date.now() - new Date(c.last_activity_at).getTime()) / 60000);
            return (
              <div key={c.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">
                      {c.customer_email || c.customer_phone || `Sessão ${String(c.session_id).slice(0, 10)}…`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.item_count} itens · há {mins}min
                    </div>
                  </div>
                  <div className="font-mono font-bold">{brl(Number(c.total) || 0)}</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
