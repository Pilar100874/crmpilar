import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { Users } from "lucide-react";

// fix default marker icon
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41], iconAnchor: [12, 41],
});

type Reg = {
  id: string;
  funcionario_id: string;
  tipo: string;
  registrado_em: string;
  latitude: number | null;
  longitude: number | null;
  score_confianca: number | null;
  ponto_funcionarios: { nome: string } | null;
};

export default function PontoMapaEquipes() {
  const { empresaId } = usePontoEmpresa();
  const [regs, setRegs] = useState<Reg[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    const load = async () => {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("ponto_registros")
        .select("id, funcionario_id, tipo, registrado_em, latitude, longitude, score_confianca, ponto_funcionarios!inner(nome, empresa_id)")
        .eq("ponto_funcionarios.empresa_id", empresaId)
        .gte("registrado_em", hoje.toISOString())
        .not("latitude", "is", null)
        .order("registrado_em", { ascending: false })
        .limit(200);
      setRegs((data as any) || []);

      const { data: g } = await supabase
        .from("ponto_geofences")
        .select("*").eq("empresa_id", empresaId);
      setGeofences(g || []);
    };
    load();
    const ch = supabase.channel("mapa-equipes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ponto_registros" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [empresaId]);

  // Última posição por funcionário
  const ultimos = useMemo(() => {
    const map = new Map<string, Reg>();
    for (const r of regs) {
      if (!map.has(r.funcionario_id) && r.latitude && r.longitude) map.set(r.funcionario_id, r);
    }
    return [...map.values()];
  }, [regs]);

  const center: [number, number] = ultimos[0]?.latitude
    ? [ultimos[0].latitude, ultimos[0].longitude!]
    : [-23.55, -46.63];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Mapa de equipes
          </h1>
          <p className="text-muted-foreground text-sm">Última marcação de hoje por funcionário.</p>
        </div>
        <Badge variant="secondary">{ultimos.length} no mapa</Badge>
      </div>

      <Card className="overflow-hidden" style={{ height: 600 }}>
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
          />
          {geofences.map((g) => (
            g.latitude && g.longitude && (
              <Circle key={g.id} center={[g.latitude, g.longitude]} radius={g.raio_metros || 100}
                pathOptions={{ color: "hsl(var(--primary))", fillOpacity: 0.1 }}>
                <Popup>{g.nome}</Popup>
              </Circle>
            )
          ))}
          {ultimos.map((r) => (
            <Marker key={r.id} position={[r.latitude!, r.longitude!]} icon={icon}>
              <Popup>
                <div className="space-y-1">
                  <div className="font-medium">{r.ponto_funcionarios?.nome}</div>
                  <div className="text-xs">{r.tipo} · {new Date(r.registrado_em).toLocaleTimeString("pt-BR")}</div>
                  {r.score_confianca !== null && (
                    <div className="text-xs">Confiança: {r.score_confianca}%</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Card>
    </div>
  );
}
