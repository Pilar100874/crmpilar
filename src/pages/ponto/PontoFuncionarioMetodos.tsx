import { useEffect, useMemo, useState } from "react";
import { Search, Save, MapPin, Smartphone, Monitor, Fingerprint, QrCode, Wifi, WifiOff, Camera, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FilteredCheckboxList } from "@/components/common/FilteredCheckboxList";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

interface Func { id: string; nome: string; matricula: string | null; }
interface Geo { id: string; nome: string; raio_metros: number; }
interface Metodos {
  permite_app: boolean; permite_web: boolean; permite_kiosk: boolean;
  permite_catraca: boolean; permite_qr: boolean; permite_offline: boolean;
  exige_face: boolean; exige_gps: boolean; exige_rede_autorizada: boolean;
  observacao: string;
}

const DEFAULT_METODOS: Metodos = {
  permite_app: true, permite_web: true, permite_kiosk: true,
  permite_catraca: true, permite_qr: true, permite_offline: false,
  exige_face: false, exige_gps: true, exige_rede_autorizada: false,
  observacao: "",
};

export default function PontoFuncionarioMetodos() {
  const { empresaId } = usePontoEmpresa();
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [geos, setGeos] = useState<Geo[]>([]);
  const [busca, setBusca] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [metodos, setMetodos] = useState<Metodos>(DEFAULT_METODOS);
  const [geoSel, setGeoSel] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const sb = supabase as any;
      const [f, g] = await Promise.all([
        sb.from("ponto_funcionarios").select("id, nome, matricula").eq("empresa_id", empresaId).order("nome"),
        sb.from("ponto_geofences").select("id, nome, raio_metros").eq("empresa_id", empresaId).eq("ativo", true).order("nome"),
      ]);
      setFuncs(f.data || []);
      setGeos(g.data || []);
    })();
  }, [empresaId]);

  useEffect(() => {
    if (!selId) return;
    (async () => {
      const sb = supabase as any;
      const [m, fg] = await Promise.all([
        sb.from("ponto_funcionario_metodos").select("*").eq("funcionario_id", selId).maybeSingle(),
        sb.from("ponto_funcionario_geofences").select("geofence_id").eq("funcionario_id", selId),
      ]);
      setMetodos(m.data ? { ...DEFAULT_METODOS, ...m.data } : DEFAULT_METODOS);
      setGeoSel(new Set((fg.data || []).map((r: any) => r.geofence_id)));
    })();
  }, [selId]);

  const funcFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return funcs;
    return funcs.filter((f) => f.nome.toLowerCase().includes(q) || (f.matricula || "").toLowerCase().includes(q));
  }, [busca, funcs]);

  const toggleGeo = (id: string) => {
    setGeoSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const salvar = async () => {
    if (!selId) return;
    setSaving(true);
    try {
      const sb = supabase as any;
      const { error: e1 } = await sb.from("ponto_funcionario_metodos").upsert({
        funcionario_id: selId, ...metodos,
      });
      if (e1) throw e1;
      await sb.from("ponto_funcionario_geofences").delete().eq("funcionario_id", selId);
      const rows = Array.from(geoSel).map((geofence_id) => ({ funcionario_id: selId, geofence_id }));
      if (rows.length) {
        const { error: e2 } = await sb.from("ponto_funcionario_geofences").insert(rows);
        if (e2) throw e2;
      }
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const funcSel = funcs.find((f) => f.id === selId);

  const toggles: Array<{ key: keyof Metodos; label: string; desc: string; icon: any }> = [
    { key: "permite_app", label: "App Mobile", desc: "Bater ponto pelo aplicativo/PWA", icon: Smartphone },
    { key: "permite_web", label: "Web (navegador)", desc: "Marcar via portal do funcionário", icon: Monitor },
    { key: "permite_kiosk", label: "Kiosk / Totem", desc: "Estação compartilhada com login", icon: Monitor },
    { key: "permite_catraca", label: "Catraca / Relógio", desc: "Equipamentos biométricos", icon: Fingerprint },
    { key: "permite_qr", label: "QR Code dinâmico", desc: "Ler QR gerado pelo totem", icon: QrCode },
    { key: "permite_offline", label: "Modo offline", desc: "Permitir marcação sem conexão", icon: WifiOff },
  ];
  const exigencias: Array<{ key: keyof Metodos; label: string; desc: string; icon: any }> = [
    { key: "exige_gps", label: "Exigir GPS dentro da área", desc: "Só valida se estiver em uma das áreas abaixo", icon: MapPin },
    { key: "exige_face", label: "Exigir reconhecimento facial", desc: "Selfie precisa bater com foto de referência", icon: Camera },
    { key: "exige_rede_autorizada", label: "Exigir rede autorizada", desc: "Só marca em IP/Wi-Fi cadastrado", icon: Wifi },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold">Métodos de Marcação por Funcionário</h1>
          <p className="text-sm text-muted-foreground">Defina como cada funcionário pode bater ponto e em quais endereços (múltiplas áreas permitidas).</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar funcionário..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-2 max-h-[70vh] overflow-y-auto space-y-1">
            {funcFiltrados.map((f) => (
              <button key={f.id} onClick={() => setSelId(f.id)}
                className={`w-full text-left rounded-md px-3 py-2 hover:bg-accent transition ${selId === f.id ? "bg-accent" : ""}`}>
                <div className="font-medium truncate">{f.nome}</div>
                {f.matricula && <div className="text-xs text-muted-foreground">Mat. {f.matricula}</div>}
              </button>
            ))}
            {funcFiltrados.length === 0 && <p className="text-sm text-muted-foreground p-3">Nenhum funcionário encontrado.</p>}
          </CardContent>
        </Card>

        {!funcSel ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">Selecione um funcionário à esquerda para configurar os métodos permitidos.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">{funcSel.nome}</CardTitle>
                <Button onClick={salvar} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar"}</Button>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Formas de marcação permitidas</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {toggles.map((t) => {
                  const Icon = t.icon;
                  const val = metodos[t.key] as boolean;
                  return (
                    <div key={t.key} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.desc}</div>
                        </div>
                      </div>
                      <Switch checked={val} onCheckedChange={(v) => setMetodos((m) => ({ ...m, [t.key]: v }))} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Exigências de segurança</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-3">
                {exigencias.map((t) => {
                  const Icon = t.icon;
                  const val = metodos[t.key] as boolean;
                  return (
                    <div key={t.key} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.desc}</div>
                        </div>
                      </div>
                      <Switch checked={val} onCheckedChange={(v) => setMetodos((m) => ({ ...m, [t.key]: v }))} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Endereços permitidos (áreas GPS)
                  <Badge variant="secondary">{geoSel.size} de {geos.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Marque uma ou mais áreas onde o funcionário pode bater ponto. Se nenhuma for marcada, valem todas as áreas ativas da empresa.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <FilteredCheckboxList
                  idPrefix="geo"
                  items={geos.map((g) => ({ id: g.id, label: g.nome, extra: `Raio ${g.raio_metros}m` }))}
                  selected={Array.from(geoSel)}
                  onToggle={(id) => toggleGeo(id)}
                  emptyText="Nenhuma área cadastrada. Configure em Antifraude → Áreas permitidas."
                  searchPlaceholder="Buscar área..."
                  maxHeightClass="max-h-[260px]"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Observações internas</CardTitle></CardHeader>
              <CardContent>
                <Label className="text-xs text-muted-foreground">Anotações do RH (não são exibidas ao funcionário)</Label>
                <Textarea value={metodos.observacao} onChange={(e) => setMetodos((m) => ({ ...m, observacao: e.target.value }))} rows={3} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
