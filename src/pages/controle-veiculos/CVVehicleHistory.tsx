import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { History, LogIn, LogOut, Image as ImageIcon, Calendar, Car } from "lucide-react";
import { CVPageHeader } from "./CVPageHeader";

interface VehicleOpt { id: string; name: string; plate: string; }
interface Movement {
  id: string;
  exit_time: string | null;
  entry_time: string | null;
  status: string;
  driver_id: string | null;
  exit_km: number | null;
  entry_km: number | null;
}
interface Photo {
  id: string;
  movement_id: string;
  angle_key: string;
  angle_label: string;
  stage: string;
  photo_url: string;
  created_at: string;
  signedUrl?: string;
}

export default function CVVehicleHistory() {
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [drivers, setDrivers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: v }, { data: d }] = await Promise.all([
        supabase.from("cv_vehicles").select("id,name,plate").eq("active", true).order("name"),
        supabase.from("cv_drivers").select("id,name"),
      ]);
      setVehicles((v ?? []) as VehicleOpt[]);
      const map: Record<string, string> = {};
      (d ?? []).forEach((x: any) => (map[x.id] = x.name));
      setDrivers(map);
    })();
  }, []);

  useEffect(() => {
    if (!vehicleId) { setMovements([]); setPhotos([]); return; }
    (async () => {
      setLoading(true);
      const { data: movs } = await supabase
        .from("cv_vehicle_movements")
        .select("id,exit_time,entry_time,status,driver_id,exit_km,entry_km")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(100);
      const ids = (movs ?? []).map((m: any) => m.id);
      setMovements((movs ?? []) as Movement[]);
      if (!ids.length) { setPhotos([]); setLoading(false); return; }
      const { data: ph } = await supabase
        .from("cv_movement_photos")
        .select("id,movement_id,angle_key,angle_label,stage,photo_url,created_at")
        .in("movement_id", ids)
        .order("created_at", { ascending: true });
      const list = (ph ?? []) as Photo[];
      // gera signed urls em paralelo
      const withUrls = await Promise.all(
        list.map(async (p) => {
          const { data } = await supabase.storage.from("cv-vehicle-photos").createSignedUrl(p.photo_url, 3600);
          return { ...p, signedUrl: data?.signedUrl };
        })
      );
      setPhotos(withUrls);
      setLoading(false);
    })();
  }, [vehicleId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Photo[]>();
    photos.forEach((p) => {
      const arr = map.get(p.movement_id) ?? [];
      arr.push(p);
      map.set(p.movement_id, arr);
    });
    return map;
  }, [photos]);

  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={History}
        title="Histórico de Imagens do Veículo"
        subtitle="Consulte todas as fotos de vistoria já registradas por veículo"
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs text-muted-foreground">Veículo</label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate} — {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedVehicle && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Car className="h-4 w-4" />
              <span><strong>{movements.length}</strong> movimentação(ões) · <strong>{photos.length}</strong> foto(s)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && <p className="text-center text-muted-foreground py-8">Carregando histórico...</p>}

      {!loading && vehicleId && movements.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma movimentação encontrada para este veículo.</p>
      )}

      <div className="space-y-4">
        {movements.map((m) => {
          const ph = grouped.get(m.id) ?? [];
          const entryPhotos = ph.filter((p) => p.stage === "entry");
          const exitPhotos = ph.filter((p) => p.stage === "exit");
          return (
            <Card key={m.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Movimentação de {fmt(m.exit_time)}</span>
                  <Badge variant={m.status === "in" ? "secondary" : "default"}>
                    {m.status === "in" ? "Retornado" : "Em rota"}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    Motorista: {m.driver_id ? drivers[m.driver_id] ?? "—" : "—"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <PhotoBlock
                    title="Saída"
                    icon={<LogOut className="h-4 w-4 text-warning" />}
                    when={fmt(m.exit_time)}
                    km={m.exit_km}
                    photos={exitPhotos}
                    onOpen={setPreview}
                  />
                  <PhotoBlock
                    title="Entrada"
                    icon={<LogIn className="h-4 w-4 text-success" />}
                    when={fmt(m.entry_time)}
                    km={m.entry_km}
                    photos={entryPhotos}
                    onOpen={setPreview}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl p-2">
          {preview && <img src={preview} alt="Foto" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoBlock({
  title, icon, when, km, photos, onOpen,
}: {
  title: string;
  icon: React.ReactNode;
  when: string;
  km: number | null;
  photos: Photo[];
  onOpen: (url: string) => void;
}) {
  return (
    <div className="border rounded-lg p-3 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-medium text-sm">{icon} {title}</div>
        <div className="text-xs text-muted-foreground">{when}{km != null ? ` · ${km} km` : ""}</div>
      </div>
      {photos.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center flex items-center justify-center gap-2">
          <ImageIcon className="h-4 w-4" /> Sem fotos registradas
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => p.signedUrl && onOpen(p.signedUrl)}
              className="group relative aspect-square overflow-hidden rounded border bg-background hover:ring-2 hover:ring-primary transition"
              title={p.angle_label}
            >
              {p.signedUrl ? (
                <img src={p.signedUrl} alt={p.angle_label} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">...</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                {p.angle_label}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
