import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { AlertTriangle, MapPin, User, Clock, Filter, Navigation } from "lucide-react";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const suspeitoIcon = L.divIcon({
  className: "custom-suspeito-icon",
  html: `<div style="width:26px;height:26px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">!</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

type Reg = {
  id: string;
  funcionario_id: string;
  tipo: string;
  data_hora: string;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_precisao: number | null;
  geofence_ok: boolean | null;
  origem: string | null;
  score_confianca: number | null;
  score_fraude: number | null;
  fatores_validacao: any;
  ponto_funcionarios: { nome: string } | null;
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const t = (x: number) => (x * Math.PI) / 180;
  const dLat = t(lat2 - lat1);
  const dLon = t(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function PontoForaGeofence() {
  const { empresaId } = usePontoEmpresa();
  const [regs, setRegs] = useState<Reg[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const inicio = new Date(dataInicio + "T00:00:00").toISOString();
    const fim = new Date(dataFim + "T23:59:59").toISOString();

    const { data } = await supabase
      .from("ponto_registros")
      .select(
        "id, funcionario_id, tipo, data_hora, gps_lat, gps_lon, gps_precisao, geofence_ok, origem, score_confianca, score_fraude, fatores_validacao, ponto_funcionarios!inner(nome, empresa_id)"
      )
      .eq("ponto_funcionarios.empresa_id", empresaId)
      .eq("geofence_ok", false)
      .not("gps_lat", "is", null)
      .not("gps_lon", "is", null)
      .gte("data_hora", inicio)
      .lte("data_hora", fim)
      .order("data_hora", { ascending: false })
      .limit(500);
    setRegs((data as any) || []);

    const { data: g } = await supabase
      .from("ponto_geofences")
      .select("*")
      .eq("empresa_id", empresaId);
    setGeofences(g || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [empresaId, dataInicio, dataFim]);

  const stats = useMemo(() => {
    const funcs = new Set(regs.map((r) => r.funcionario_id));
    return { total: regs.length, funcionarios: funcs.size };
  }, [regs]);

  const distanciaMaisProxima = (r: Reg) => {
    if (!r.gps_lat || !r.gps_lon || geofences.length === 0) return null;
    let min = Infinity;
    let nome = "";
    for (const g of geofences) {
      if (!g.latitude || !g.longitude) continue;
      const d = haversine(r.gps_lat, r.gps_lon, g.latitude, g.longitude);
      const fora = Math.max(0, d - (g.raio_metros || 100));
      if (fora < min) {
        min = fora;
        nome = g.nome;
      }
    }
    return isFinite(min) ? { metros: Math.round(min), nome } : null;
  };

  const center: [number, number] = regs[0]?.gps_lat
    ? [regs[0].gps_lat, regs[0].gps_lon!]
    : geofences[0]?.latitude
      ? [geofences[0].latitude, geofences[0].longitude]
      : [-23.55, -46.63];

  const selected = regs.find((r) => r.id === selectedId) || null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Pontos fora da área permitida
          </h1>
          <p className="text-muted-foreground text-sm">
            Marcações registradas fora do raio de geofence — possível fraude ou trabalho remoto não autorizado.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="text-sm">
            {stats.total} marcações
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {stats.funcionarios} funcionários
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-3">
          <Filter className="h-4 w-4 text-muted-foreground mb-2" />
          <div>
            <Label className="text-xs">Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? "Carregando..." : "Atualizar"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden" style={{ height: 600 }}>
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
            />
            {geofences.map(
              (g) =>
                g.latitude &&
                g.longitude && (
                  <Circle
                    key={g.id}
                    center={[g.latitude, g.longitude]}
                    radius={g.raio_metros || 100}
                    pathOptions={{
                      color: "hsl(var(--primary))",
                      fillColor: "hsl(var(--primary))",
                      fillOpacity: 0.08,
                    }}
                  >
                    <Popup>
                      <strong>{g.nome}</strong>
                      <br />
                      Raio: {g.raio_metros || 100}m
                    </Popup>
                  </Circle>
                )
            )}
            {regs.map((r) => (
              <Marker
                key={r.id}
                position={[r.gps_lat!, r.gps_lon!]}
                icon={suspeitoIcon}
                eventHandlers={{ click: () => setSelectedId(r.id) }}
              >
                <Popup>
                  <div className="space-y-1 min-w-[180px]">
                    <div className="font-semibold flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {r.ponto_funcionarios?.nome || "—"}
                    </div>
                    <div className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(r.data_hora).toLocaleString("pt-BR")}
                    </div>
                    <div className="text-xs">
                      Tipo: <strong>{r.tipo}</strong> · Origem: {r.origem || "—"}
                    </div>
                    {(() => {
                      const d = distanciaMaisProxima(r);
                      return d ? (
                        <div className="text-xs text-red-600">
                          {d.metros}m fora de "{d.nome}"
                        </div>
                      ) : null;
                    })()}
                  </div>
                </Popup>
              </Marker>
            ))}
            {selected &&
              (() => {
                let closest: any = null;
                let minD = Infinity;
                for (const g of geofences) {
                  if (!g.latitude || !g.longitude) continue;
                  const d = haversine(selected.gps_lat!, selected.gps_lon!, g.latitude, g.longitude);
                  if (d < minD) {
                    minD = d;
                    closest = g;
                  }
                }
                if (!closest) return null;
                return (
                  <Polyline
                    positions={[
                      [selected.gps_lat!, selected.gps_lon!],
                      [closest.latitude, closest.longitude],
                    ]}
                    pathOptions={{ color: "#ef4444", weight: 2, dashArray: "6 6" }}
                  />
                );
              })()}
          </MapContainer>
        </Card>

        <Card className="overflow-hidden" style={{ height: 600 }}>
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-3 border-b bg-muted/40">
              <h3 className="font-semibold text-sm">Ocorrências ({regs.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {loading ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : regs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Nenhuma marcação fora do raio no período. 🎉
                </div>
              ) : (
                regs.map((r) => {
                  const d = distanciaMaisProxima(r);
                  const isSel = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left p-3 hover:bg-muted/50 transition ${
                        isSel ? "bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate flex items-center gap-1">
                            <User className="h-3 w-3 flex-shrink-0" />
                            {r.ponto_funcionarios?.nome || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(r.data_hora).toLocaleString("pt-BR")}
                          </div>
                          <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {r.tipo}
                            </Badge>
                            {r.origem && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {r.origem}
                              </Badge>
                            )}
                          </div>
                          {d && (
                            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {d.metros}m fora de "{d.nome}"
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {r.gps_lat?.toFixed(5)}, {r.gps_lon?.toFixed(5)}
                            {r.gps_precisao ? ` · ±${Math.round(r.gps_precisao)}m` : ""}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
