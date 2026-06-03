import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Clock, Users, Flame, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdvancedHeatmapView } from "@/components/heatmap/AdvancedHeatmapView";
import { HeatmapConfigDialog } from "@/components/heatmap/HeatmapConfigDialog";


type Period = "1" | "7" | "30";

interface UsageRow {
  route: string;
  page_title: string | null;
  duration_ms: number;
  idle_ms: number;
  usuario_id: string;
  created_at: string;
}

const fmtMin = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
};

export default function MapaCalorSistema() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("7");
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [usuarios, setUsuarios] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - Number(period) * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("usage_events" as any)
        .select("route,page_title,duration_ms,idle_ms,usuario_id,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!mounted) return;
      if (error) {
        toast.error("Erro ao carregar dados de uso");
      } else {
        setRows((data as any) || []);
      }
      const userIds = Array.from(new Set(((data as any) || []).map((r: any) => r.usuario_id)));
      if (userIds.length > 0) {
        const { data: us } = await supabase
          .from("usuarios")
          .select("id, nome")
          .in("id", userIds as string[]);
        const map: Record<string, string> = {};
        (us || []).forEach((u: any) => (map[u.id] = u.nome));
        setUsuarios(map);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [period]);

  const routeStats = useMemo(() => {
    const agg = new Map<string, { route: string; title: string; total: number; visits: number; idle: number }>();
    rows.forEach((r) => {
      const cur = agg.get(r.route) || { route: r.route, title: r.page_title || r.route, total: 0, visits: 0, idle: 0 };
      cur.total += r.duration_ms;
      cur.idle += r.idle_ms;
      cur.visits += 1;
      agg.set(r.route, cur);
    });
    return Array.from(agg.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  const userStats = useMemo(() => {
    const agg = new Map<string, { usuario_id: string; total: number; idle: number; visits: number; last: string }>();
    rows.forEach((r) => {
      const cur = agg.get(r.usuario_id) || { usuario_id: r.usuario_id, total: 0, idle: 0, visits: 0, last: r.created_at };
      cur.total += r.duration_ms;
      cur.idle += r.idle_ms;
      cur.visits += 1;
      if (r.created_at > cur.last) cur.last = r.created_at;
      agg.set(r.usuario_id, cur);
    });
    return Array.from(agg.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  const totalAtivo = rows.reduce((s, r) => s + (r.duration_ms - r.idle_ms), 0);
  const totalIdle = rows.reduce((s, r) => s + r.idle_ms, 0);
  const usuariosAtivos = new Set(rows.map((r) => r.usuario_id)).size;

  const heatmap = useMemo(() => {
    // 24h x topo 8 rotas
    const top = routeStats.slice(0, 8).map((r) => r.route);
    const grid: Record<string, number[]> = {};
    top.forEach((r) => (grid[r] = new Array(24).fill(0)));
    rows.forEach((r) => {
      if (!top.includes(r.route)) return;
      const h = new Date(r.created_at).getHours();
      grid[r.route][h] += r.duration_ms;
    });
    const max = Math.max(1, ...Object.values(grid).flat());
    return { top, grid, max };
  }, [routeStats, rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" /> Mapa de Calor do Sistema
          </h1>
          <p className="text-muted-foreground text-sm">
            Telas mais usadas, tempo de uso por usuário e tempo ocioso.
          </p>
        </div>
      </div>

      <Tabs defaultValue="advanced">
        <TabsList>
          <TabsTrigger value="advanced">🔥 Heatmap Avançado</TabsTrigger>
          <TabsTrigger value="usage">Uso por Tela</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="mt-4">
          <AdvancedHeatmapView
            scope="sistema"
            title="Análise Comportamental — Sistema Interno"
            description="Cliques, movimento, scroll, frustração e segmentação por dispositivo/navegador."
          />
        </TabsContent>

        <TabsContent value="usage" className="mt-4 space-y-4">

      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="1">Hoje</TabsTrigger>
          <TabsTrigger value="7">7 dias</TabsTrigger>
          <TabsTrigger value="30">30 dias</TabsTrigger>
        </TabsList>
        <TabsContent value={period} />
      </Tabs>


      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" /> <CardTitle className="text-sm">Usuários ativos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{usuariosAtivos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" /> <CardTitle className="text-sm">Tempo ativo</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{fmtMin(totalAtivo)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" /> <CardTitle className="text-sm">Tempo ocioso</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{fmtMin(totalIdle)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapa de Calor por Hora</CardTitle>
          <CardDescription>Intensidade de uso (top 8 telas × 24h)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-1 sticky left-0 bg-background">Tela</th>
                {Array.from({ length: 24 }).map((_, h) => (
                  <th key={h} className="px-1 py-1 text-center">{h}h</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.top.map((r) => (
                <tr key={r}>
                  <td className="px-2 py-1 sticky left-0 bg-background truncate max-w-[200px]">{r}</td>
                  {heatmap.grid[r].map((v, h) => {
                    const ratio = v / heatmap.max;
                    const op = Math.min(1, 0.05 + ratio * 0.95);
                    return (
                      <td
                        key={h}
                        className="p-1 text-center"
                        title={`${fmtMin(v)} às ${h}h`}
                        style={{ backgroundColor: `hsl(15 90% 55% / ${op})` }}
                      >
                        {v > 0 ? "·" : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de Telas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
          {loading && <p className="text-muted-foreground text-sm">Carregando…</p>}
          {!loading && routeStats.length === 0 && (
            <p className="text-muted-foreground text-sm">Sem dados no período.</p>
          )}
          {routeStats.map((r) => (
            <div key={r.route} className="flex items-center justify-between border-b pb-1 text-sm">
              <div className="truncate">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">{r.route} · {r.visits} acessos</div>
              </div>
              <div className="text-right">
                <div className="font-mono">{fmtMin(r.total)}</div>
                <div className="text-xs text-muted-foreground">ocioso: {fmtMin(r.idle)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tempo por Usuário</CardTitle>
              <CardDescription>Ativo × ocioso e última atividade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {userStats.map((u) => {
                const ativo = u.total - u.idle;
                const lastMin = Math.floor((Date.now() - new Date(u.last).getTime()) / 60000);
                const idleAlert = lastMin > 15;
                return (
                  <div key={u.usuario_id} className="flex items-center justify-between border-b pb-1 text-sm">
                    <div className="truncate">
                      <div className="font-medium truncate">{usuarios[u.usuario_id] || u.usuario_id.slice(0, 8)}</div>
                      <div className={`text-xs ${idleAlert ? "text-destructive" : "text-muted-foreground"}`}>
                        sem interação há {lastMin}min
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{fmtMin(ativo)} ativo</div>
                      <div className="text-xs text-amber-500">{fmtMin(u.idle)} ocioso</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

