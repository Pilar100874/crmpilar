import { useEffect, useState } from "react";
import { Plus, Trash2, MapPin, Wifi, ShieldCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import GeofenceMapPicker, { GeofenceMapPickerValue } from "@/components/ponto/GeofenceMapPicker";

interface Geofence {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  raio_metros: number;
  ativo: boolean;
}
interface Rede {
  id: string;
  tipo: "ip" | "cidr" | "ssid";
  valor: string;
  descricao: string | null;
  ativo: boolean;
}

export default function PontoAntifraudeConfig() {
  const { empresaId } = usePontoEmpresa();
  const [ativo, setAtivo] = useState<boolean>(true);
  const [exigirGeoApp, setExigirGeoApp] = useState<boolean>(true);
  const [geos, setGeos] = useState<Geofence[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  
  const [novaRede, setNovaRede] = useState<{ tipo: "ip" | "cidr" | "ssid"; valor: string; descricao: string }>({
    tipo: "ip", valor: "", descricao: "",
  });
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<Geofence | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formMap, setFormMap] = useState<GeofenceMapPickerValue>({
    lat: -23.55052,
    lng: -46.633308,
    raio: 150,
  });

  const abrirNovo = () => {
    setEditing(null);
    setFormNome("");
    setFormMap({ lat: -23.55052, lng: -46.633308, raio: 150 });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setFormMap((s) => ({ ...s, lat: p.coords.latitude, lng: p.coords.longitude })),
        () => {}
      );
    }
    setDlgOpen(true);
  };

  const abrirEdicao = (g: Geofence) => {
    setEditing(g);
    setFormNome(g.nome);
    setFormMap({ lat: Number(g.lat), lng: Number(g.lng), raio: g.raio_metros });
    setDlgOpen(true);
  };

  const salvarGeo = async () => {
    if (!empresaId || !formNome.trim()) {
      toast.error("Informe o nome da área");
      return;
    }
    const payload = {
      empresa_id: empresaId,
      nome: formNome.trim(),
      lat: formMap.lat,
      lng: formMap.lng,
      raio_metros: Math.round(formMap.raio),
    };
    const q = editing
      ? (supabase as any).from("ponto_geofences").update(payload).eq("id", editing.id)
      : (supabase as any).from("ponto_geofences").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(editing ? "Área atualizada" : "Área criada");
    setDlgOpen(false);
    loadAll();
  };

  const loadAll = async () => {
    if (!empresaId) return;
    const sb = supabase as any;
    const [{ data: g }, { data: r }, { data: emp }] = await Promise.all([
      sb.from("ponto_geofences").select("*").eq("empresa_id", empresaId).order("nome"),
      sb.from("ponto_redes_autorizadas").select("*").eq("empresa_id", empresaId).order("tipo"),
      sb.from("ponto_empresas").select("antifraude_ativo, geofence_obrigatorio_app").eq("id", empresaId).maybeSingle(),
    ]);
    setGeos((g || []) as Geofence[]);
    setRedes((r || []) as Rede[]);
    setAtivo(emp?.antifraude_ativo ?? true);
    setExigirGeoApp(emp?.geofence_obrigatorio_app !== false);
  };


  useEffect(() => { loadAll(); }, [empresaId]);

  const delGeo = async (id: string) => {
    await (supabase as any).from("ponto_geofences").delete().eq("id", id);
    loadAll();
  };


  const addRede = async () => {
    if (!empresaId || !novaRede.valor) return;
    const { error } = await (supabase as any).from("ponto_redes_autorizadas").insert({
      empresa_id: empresaId, ...novaRede,
    });
    if (error) toast.error(error.message);
    else { toast.success("Rede adicionada"); setNovaRede({ tipo: "ip", valor: "", descricao: "" }); loadAll(); }
  };

  const delRede = async (id: string) => {
    await (supabase as any).from("ponto_redes_autorizadas").delete().eq("id", id);
    loadAll();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Configurações Antifraude</h1>
        <p className="text-sm text-muted-foreground">
          Geofences (cercas virtuais) e redes autorizadas para validar marcações
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Validação antifraude
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">
              {ativo ? "Ativada" : "Desativada"}
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando desativada, as marcações de ponto são aceitas sem exigir selfie, GPS, QR Code ou rede autorizada.
            </p>
          </div>
          <Switch
            checked={ativo}
            onCheckedChange={async (v) => {
              if (!empresaId) return;
              setAtivo(v);
              const { error } = await (supabase as any)
                .from("ponto_empresas")
                .update({ antifraude_ativo: v })
                .eq("id", empresaId);
              if (error) {
                toast.error(error.message);
                setAtivo(!v);
              } else {
                toast.success(v ? "Antifraude ativada" : "Antifraude desativada");
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Exigir área de GPS no app
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">
              {exigirGeoApp ? "Bloqueio ativo" : "Bloqueio desativado"}
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando ativo, só é possível bater ponto pelo app/web se o funcionário estiver dentro de uma das geofences cadastradas (matriz, filiais, obras). Marcações via catraca/relógio não são afetadas.
            </p>
          </div>
          <Switch
            checked={exigirGeoApp}
            onCheckedChange={async (v) => {
              if (!empresaId) return;
              setExigirGeoApp(v);
              const { error } = await (supabase as any)
                .from("ponto_empresas")
                .update({ geofence_obrigatorio_app: v })
                .eq("id", empresaId);
              if (error) {
                toast.error(error.message);
                setExigirGeoApp(!v);
              } else {
                toast.success(v ? "Bloqueio por área ativado" : "Bloqueio por área desativado");
              }
            }}
          />
        </CardContent>
      </Card>



      <Tabs defaultValue="geo">
        <TabsList>
          <TabsTrigger value="geo"><MapPin className="mr-2 h-4 w-4" />Geofences</TabsTrigger>
          <TabsTrigger value="redes"><Wifi className="mr-2 h-4 w-4" />Redes</TabsTrigger>
        </TabsList>


        <TabsContent value="geo" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Áreas permitidas (Geofences)</CardTitle>
              <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
                <DialogTrigger asChild>
                  <Button onClick={abrirNovo}>
                    <Plus className="mr-2 h-4 w-4" /> Nova área
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editing ? "Editar área permitida" : "Nova área permitida"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={formNome}
                        onChange={(e) => setFormNome(e.target.value)}
                        placeholder="Ex.: Matriz, Filial SP, Obra Alphaville"
                      />
                    </div>
                    <GeofenceMapPicker value={formMap} onChange={setFormMap} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDlgOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={salvarGeo}>
                      {editing ? "Salvar alterações" : "Criar área"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {geos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma área cadastrada. Clique em "Nova área" para definir o local no mapa.
                </p>
              ) : (
                <div className="space-y-2">
                  {geos.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="font-medium">{g.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {Number(g.lat).toFixed(5)}, {Number(g.lng).toFixed(5)} · raio {g.raio_metros}m
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrirEdicao(g)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => delGeo(g.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redes" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Nova rede autorizada</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><Label>Tipo</Label>
                <Select value={novaRede.tipo} onValueChange={(v: any) => setNovaRede({ ...novaRede, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ip">IP fixo</SelectItem>
                    <SelectItem value="cidr">Faixa CIDR</SelectItem>
                    <SelectItem value="ssid">SSID Wi-Fi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor</Label>
                <Input value={novaRede.valor} onChange={(e) => setNovaRede({ ...novaRede, valor: e.target.value })} placeholder="200.100.0.1" /></div>
              <div className="sm:col-span-2"><Label>Descrição</Label>
                <Input value={novaRede.descricao} onChange={(e) => setNovaRede({ ...novaRede, descricao: e.target.value })} placeholder="Wi-Fi matriz" /></div>
              <div className="sm:col-span-4">
                <Button onClick={addRede}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cadastradas</CardTitle></CardHeader>
            <CardContent>
              {redes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma rede cadastrada (modo flexível: qualquer rede aceita com peso reduzido)</p>
              ) : (
                <div className="space-y-2">
                  {redes.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium font-mono text-sm">{r.tipo.toUpperCase()} · {r.valor}</div>
                        {r.descricao && <div className="text-xs text-muted-foreground">{r.descricao}</div>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => delRede(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
