import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HeatmapCanvas } from "./HeatmapCanvas";
import { MousePointerClick, Move, ChevronsDown, AlertTriangle, Users, Smartphone, Monitor, Tablet, Filter, Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { captureAndUploadScreenshot, fetchScreenshot } from "@/lib/heatmapScreenshot";
import { toast } from "sonner";

type Scope = "sistema" | "ecommerce";
type Period = "1" | "7" | "30";
type DeviceFilter = "all" | "desktop" | "tablet" | "mobile";

interface EventRow {
  route: string;
  event_type: string;
  x: number | null;
  y: number | null;
  vw: number | null;
  vh: number | null;
  scroll_depth: number | null;
  element_selector: string | null;
  element_text: string | null;
  device: string | null;
  browser: string | null;
  session_id: string;
  is_new_visitor: boolean | null;
  created_at: string;
}

export function AdvancedHeatmapView({ scope, title, description, estabelecimentoId }: { scope: Scope; title: string; description: string; estabelecimentoId?: string | null }) {
  const [period, setPeriod] = useState<Period>("7");
  const [device, setDevice] = useState<DeviceFilter>("all");
  const [visitorFilter, setVisitorFilter] = useState<"all" | "new" | "returning">("all");
  const [browserFilter, setBrowserFilter] = useState<string>("all");
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Period comparison
  const [comparePrev, setComparePrev] = useState(false);
  const [prevRows, setPrevRows] = useState<EventRow[]>([]);
  // Screenshot background
  const [showBg, setShowBg] = useState(true);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgVw, setBgVw] = useState<number | null>(null);
  const [bgVh, setBgVh] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const days = Number(period);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const q = supabase
        .from("interaction_events" as any)
        .select("route,event_type,x,y,vw,vh,scroll_depth,element_selector,element_text,device,browser,session_id,is_new_visitor,created_at")
        .eq("scope", scope)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      const { data, error } = await q;
      if (!mounted) return;
      if (!error) setRows((data as any) || []);

      if (comparePrev) {
        const prevSince = new Date(Date.now() - 2 * days * 86400000).toISOString();
        const prevUntil = since;
        const { data: pd } = await supabase
          .from("interaction_events" as any)
          .select("route,event_type,x,y,vw,vh,scroll_depth,element_selector,element_text,device,browser,session_id,is_new_visitor,created_at")
          .eq("scope", scope)
          .gte("created_at", prevSince)
          .lt("created_at", prevUntil)
          .limit(10000);
        setPrevRows((pd as any) || []);
      } else {
        setPrevRows([]);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [scope, period, comparePrev]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (device !== "all" && r.device !== device) return false;
      if (visitorFilter === "new" && !r.is_new_visitor) return false;
      if (visitorFilter === "returning" && r.is_new_visitor) return false;
      if (browserFilter !== "all" && r.browser !== browserFilter) return false;
      return true;
    });
  }, [rows, device, visitorFilter, browserFilter]);

  const browsers = useMemo(() => Array.from(new Set(rows.map((r) => r.browser).filter(Boolean))) as string[], [rows]);

  const routeStats = useMemo(() => {
    const m = new Map<string, { route: string; clicks: number; sessions: Set<string>; rage: number; dead: number; quickBack: number; avgScroll: number; scrollCount: number }>();
    filtered.forEach((r) => {
      const cur = m.get(r.route) || { route: r.route, clicks: 0, sessions: new Set(), rage: 0, dead: 0, quickBack: 0, avgScroll: 0, scrollCount: 0 };
      cur.sessions.add(r.session_id);
      if (r.event_type === "click") cur.clicks += 1;
      if (r.event_type === "rage_click") cur.rage += 1;
      if (r.event_type === "dead_click") cur.dead += 1;
      if (r.event_type === "quick_back") cur.quickBack += 1;
      if (r.event_type === "scroll" && r.scroll_depth) {
        cur.avgScroll += r.scroll_depth;
        cur.scrollCount += 1;
      }
      m.set(r.route, cur);
    });
    return Array.from(m.values())
      .map((s) => ({ ...s, sessionsCount: s.sessions.size, avgScroll: s.scrollCount ? Math.round(s.avgScroll / s.scrollCount) : 0 }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [filtered]);

  useEffect(() => {
    if (!selectedRoute && routeStats[0]) setSelectedRoute(routeStats[0].route);
  }, [routeStats, selectedRoute]);

  const routeEvents = useMemo(() => filtered.filter((r) => r.route === selectedRoute), [filtered, selectedRoute]);
  const clickPoints = useMemo(() => routeEvents.filter((r) => r.event_type === "click" && r.x != null && r.y != null).map((r) => ({ x: r.x!, y: r.y! })), [routeEvents]);
  const movePoints = useMemo(() => routeEvents.filter((r) => r.event_type === "move" && r.x != null && r.y != null).map((r) => ({ x: r.x!, y: r.y! })), [routeEvents]);
  const ragePoints = useMemo(() => routeEvents.filter((r) => r.event_type === "rage_click" && r.x != null && r.y != null).map((r) => ({ x: r.x!, y: r.y! })), [routeEvents]);
  const deadPoints = useMemo(() => routeEvents.filter((r) => r.event_type === "dead_click" && r.x != null && r.y != null).map((r) => ({ x: r.x!, y: r.y! })), [routeEvents]);

  const totals = useMemo(() => {
    const clicks = filtered.filter((r) => r.event_type === "click").length;
    const rage = filtered.filter((r) => r.event_type === "rage_click").length;
    const dead = filtered.filter((r) => r.event_type === "dead_click").length;
    const quickBack = filtered.filter((r) => r.event_type === "quick_back").length;
    const sessions = new Set(filtered.map((r) => r.session_id)).size;
    const newVisitors = new Set(filtered.filter((r) => r.is_new_visitor).map((r) => r.session_id)).size;
    return { clicks, rage, dead, quickBack, sessions, newVisitors };
  }, [filtered]);

  const prevTotals = useMemo(() => {
    if (!comparePrev) return null;
    const clicks = prevRows.filter((r) => r.event_type === "click").length;
    const rage = prevRows.filter((r) => r.event_type === "rage_click").length;
    const sessions = new Set(prevRows.map((r) => r.session_id)).size;
    return { clicks, rage, sessions };
  }, [comparePrev, prevRows]);

  const topElements = useMemo(() => {
    const m = new Map<string, { selector: string; text: string; count: number; rage: number; dead: number }>();
    filtered.forEach((r) => {
      if (!r.element_selector) return;
      const cur = m.get(r.element_selector) || { selector: r.element_selector, text: r.element_text || "", count: 0, rage: 0, dead: 0 };
      if (r.event_type === "click") cur.count += 1;
      if (r.event_type === "rage_click") cur.rage += 1;
      if (r.event_type === "dead_click") cur.dead += 1;
      m.set(r.element_selector, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 30);
  }, [filtered]);

  const deviceBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const d = r.device || "unknown";
      m.set(d, (m.get(d) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const CANVAS_W = 900;
  const CANVAS_H = 600;
  // Normalize points to canvas size (using viewport averages)
  const avgVw = useMemo(() => {
    const vs = routeEvents.map((r) => r.vw).filter((v) => v && v > 0) as number[];
    return vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : 1440;
  }, [routeEvents]);
  const avgVh = useMemo(() => {
    const vs = routeEvents.map((r) => r.vh).filter((v) => v && v > 0) as number[];
    return vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : 900;
  }, [routeEvents]);
  const scale = (pts: { x: number; y: number }[]) =>
    pts.map((p) => ({ x: (p.x / avgVw) * CANVAS_W, y: Math.min((p.y / avgVh) * CANVAS_H, CANVAS_H) }));

  const pctDelta = (cur: number, prev: number) => {
    if (!prev) return null;
    return Math.round(((cur - prev) / prev) * 100);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Filtros:</span></div>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={device} onValueChange={(v) => setDevice(v as DeviceFilter)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos dispositivos</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
          <Select value={visitorFilter} onValueChange={(v) => setVisitorFilter(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos visitantes</SelectItem>
              <SelectItem value="new">Novos</SelectItem>
              <SelectItem value="returning">Recorrentes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={browserFilter} onValueChange={setBrowserFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos navegadores</SelectItem>
              {browsers.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
            <input type="checkbox" checked={comparePrev} onChange={(e) => setComparePrev(e.target.checked)} />
            Comparar com período anterior
          </label>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Sessões", value: totals.sessions, icon: Users, color: "text-blue-500", delta: prevTotals ? pctDelta(totals.sessions, prevTotals.sessions) : null },
          { label: "Cliques", value: totals.clicks, icon: MousePointerClick, color: "text-green-500", delta: prevTotals ? pctDelta(totals.clicks, prevTotals.clicks) : null },
          { label: "Rage clicks", value: totals.rage, icon: AlertTriangle, color: "text-red-500", delta: prevTotals ? pctDelta(totals.rage, prevTotals.rage) : null },
          { label: "Dead clicks", value: totals.dead, icon: AlertTriangle, color: "text-amber-500", delta: null },
          { label: "Quick backs", value: totals.quickBack, icon: ChevronsDown, color: "text-purple-500", delta: null },
          { label: "Novos visitantes", value: totals.newVisitors, icon: Users, color: "text-indigo-500", delta: null },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="pt-4">
                <div className={`flex items-center gap-2 text-xs text-muted-foreground`}>
                  <Icon className={`h-3.5 w-3.5 ${k.color}`} /> {k.label}
                </div>
                <div className="text-2xl font-bold">{k.value.toLocaleString("pt-BR")}</div>
                {k.delta != null && (
                  <div className={`text-xs ${k.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta)}% vs período anterior
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="clicks">Cliques</TabsTrigger>
          <TabsTrigger value="moves">Movimento</TabsTrigger>
          <TabsTrigger value="scroll">Scroll</TabsTrigger>
          <TabsTrigger value="frustration">Frustração</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentação</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de telas</CardTitle>
              <CardDescription>Ordenado por cliques no período</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Rota</th>
                    <th className="text-right py-2 px-2">Sessões</th>
                    <th className="text-right py-2 px-2">Cliques</th>
                    <th className="text-right py-2 px-2">Scroll médio</th>
                    <th className="text-right py-2 px-2">Rage</th>
                    <th className="text-right py-2 px-2">Dead</th>
                    <th className="text-right py-2 px-2">Quick back</th>
                  </tr>
                </thead>
                <tbody>
                  {routeStats.slice(0, 30).map((r) => (
                    <tr key={r.route} className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => setSelectedRoute(r.route)}>
                      <td className="py-1.5 px-2 font-mono text-xs truncate max-w-[300px]">{r.route}</td>
                      <td className="text-right px-2">{r.sessionsCount}</td>
                      <td className="text-right px-2">{r.clicks}</td>
                      <td className="text-right px-2">{r.avgScroll}%</td>
                      <td className="text-right px-2 text-red-500">{r.rage || ""}</td>
                      <td className="text-right px-2 text-amber-500">{r.dead || ""}</td>
                      <td className="text-right px-2 text-purple-500">{r.quickBack || ""}</td>
                    </tr>
                  ))}
                  {routeStats.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground py-6">{loading ? "Carregando..." : "Sem dados no período"}</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clicks heatmap */}
        <TabsContent value="clicks" className="space-y-4 mt-4">
          <RouteSelector routes={routeStats.map((r) => r.route)} value={selectedRoute} onChange={setSelectedRoute} />
          <Card>
            <CardHeader>
              <CardTitle>Mapa de cliques — {selectedRoute || "selecione uma rota"}</CardTitle>
              <CardDescription>{clickPoints.length} cliques mapeados (viewport médio {avgVw}×{avgVh})</CardDescription>
            </CardHeader>
            <CardContent>
              <HeatmapPanel width={CANVAS_W} height={CANVAS_H} points={scale(clickPoints)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Top elementos clicados</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="text-left px-2 py-1">Elemento</th><th className="text-left px-2 py-1">Texto</th><th className="text-right px-2 py-1">Cliques</th><th className="text-right px-2 py-1">Rage</th><th className="text-right px-2 py-1">Dead</th></tr>
                </thead>
                <tbody>
                  {topElements.map((e, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1 font-mono text-xs">{e.selector}</td>
                      <td className="px-2 py-1 truncate max-w-[300px]">{e.text}</td>
                      <td className="text-right px-2">{e.count}</td>
                      <td className="text-right px-2 text-red-500">{e.rage || ""}</td>
                      <td className="text-right px-2 text-amber-500">{e.dead || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moves */}
        <TabsContent value="moves" className="space-y-4 mt-4">
          <RouteSelector routes={routeStats.map((r) => r.route)} value={selectedRoute} onChange={setSelectedRoute} />
          <Card>
            <CardHeader>
              <CardTitle>Movimento do mouse — {selectedRoute || "selecione"}</CardTitle>
              <CardDescription>{movePoints.length} amostras (1 a cada 250ms)</CardDescription>
            </CardHeader>
            <CardContent>
              <HeatmapPanel width={CANVAS_W} height={CANVAS_H} points={scale(movePoints)} radius={40} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scroll */}
        <TabsContent value="scroll" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profundidade de scroll por rota</CardTitle>
              <CardDescription>Percentual médio que os usuários rolam em cada tela</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {routeStats.filter((r) => r.avgScroll > 0).map((r) => (
                <div key={r.route} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-mono text-xs truncate max-w-[60%]">{r.route}</span>
                    <span className="font-medium">{r.avgScroll}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500" style={{ width: `${r.avgScroll}%` }} />
                  </div>
                </div>
              ))}
              {routeStats.filter((r) => r.avgScroll > 0).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados de scroll ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frustration */}
        <TabsContent value="frustration" className="space-y-4 mt-4">
          <RouteSelector routes={routeStats.map((r) => r.route)} value={selectedRoute} onChange={setSelectedRoute} />
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-red-500">Rage Clicks</CardTitle><CardDescription>Cliques repetidos rapidamente no mesmo elemento (sinal de frustração)</CardDescription></CardHeader>
              <CardContent>
                <HeatmapPanel width={CANVAS_W / 2} height={CANVAS_H / 2} points={scale(ragePoints).map((p) => ({ x: p.x / 2, y: p.y / 2 }))} radius={20} maxOpacity={0.85} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-amber-500">Dead Clicks</CardTitle><CardDescription>Cliques sem nenhuma reação na interface</CardDescription></CardHeader>
              <CardContent>
                <HeatmapPanel width={CANVAS_W / 2} height={CANVAS_H / 2} points={scale(deadPoints).map((p) => ({ x: p.x / 2, y: p.y / 2 }))} radius={20} maxOpacity={0.85} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Elementos problemáticos</CardTitle><CardDescription>Top elementos com rage + dead clicks</CardDescription></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="text-left px-2 py-1">Elemento</th><th className="text-left px-2 py-1">Texto</th><th className="text-right px-2 py-1">Rage</th><th className="text-right px-2 py-1">Dead</th></tr>
                </thead>
                <tbody>
                  {topElements.filter((e) => e.rage + e.dead > 0).slice(0, 20).map((e, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1 font-mono text-xs">{e.selector}</td>
                      <td className="px-2 py-1 truncate max-w-[300px]">{e.text}</td>
                      <td className="text-right px-2 text-red-500">{e.rage || ""}</td>
                      <td className="text-right px-2 text-amber-500">{e.dead || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segmentation */}
        <TabsContent value="segmentation" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Por dispositivo</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {deviceBreakdown.map(([d, n]) => {
                  const total = deviceBreakdown.reduce((s, [, v]) => s + v, 0);
                  const pct = Math.round((n / total) * 100);
                  const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
                  return (
                    <div key={d} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2 capitalize"><Icon className="h-3.5 w-3.5" /> {d}</span>
                        <span><Badge variant="secondary">{pct}%</Badge> <span className="text-muted-foreground text-xs">{n.toLocaleString("pt-BR")}</span></span>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Por navegador</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {browsers.map((b) => {
                  const n = rows.filter((r) => r.browser === b).length;
                  const total = rows.length || 1;
                  const pct = Math.round((n / total) * 100);
                  return (
                    <div key={b} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{b}</span>
                        <span><Badge variant="secondary">{pct}%</Badge> <span className="text-muted-foreground text-xs">{n.toLocaleString("pt-BR")}</span></span>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Novos × Recorrentes</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const newS = new Set(rows.filter((r) => r.is_new_visitor).map((r) => r.session_id)).size;
                  const retS = new Set(rows.filter((r) => !r.is_new_visitor).map((r) => r.session_id)).size;
                  const total = newS + retS || 1;
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm"><span>Novos</span><span className="font-medium">{newS} ({Math.round((newS / total) * 100)}%)</span></div>
                      <div className="h-3 bg-muted rounded overflow-hidden flex">
                        <div className="bg-indigo-500" style={{ width: `${(newS / total) * 100}%` }} />
                        <div className="bg-emerald-500" style={{ width: `${(retS / total) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-sm"><span>Recorrentes</span><span className="font-medium">{retS} ({Math.round((retS / total) * 100)}%)</span></div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RouteSelector({ routes, value, onChange }: { routes: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-[500px]"><SelectValue placeholder="Selecione uma rota" /></SelectTrigger>
      <SelectContent>{routes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function HeatmapPanel({ width, height, points, radius, maxOpacity }: { width: number; height: number; points: { x: number; y: number }[]; radius?: number; maxOpacity?: number }) {
  return (
    <div className="relative bg-gradient-to-br from-muted/30 to-muted/10 rounded border" style={{ width: "100%", maxWidth: width, aspectRatio: `${width}/${height}` }}>
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 opacity-10 pointer-events-none">
        {Array.from({ length: 96 }).map((_, i) => <div key={i} className="border border-foreground/20" />)}
      </div>
      <HeatmapCanvas points={points} width={width} height={height} radius={radius} maxOpacity={maxOpacity} className="rounded" />
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Sem dados ainda. Aguardando interações...</div>
      )}
    </div>
  );
}
