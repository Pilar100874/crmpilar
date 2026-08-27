import { useEffect, useState, useCallback } from "react";
import { Loader2, Filter, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Evento = {
  id: string;
  tipo: string;
  resultado: string | null;
  origem: string | null;
  mensagem: string | null;
  created_at: string;
  device_id: string | null;
  access_point_id: string | null;
  person_id: string | null;
  auth_user_id: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  abertura_remota: "Abertura remota",
  abertura_facial: "Reconhecimento facial",
  abertura_operador: "Abertura pelo operador",
  teste_dispositivo: "Teste de dispositivo",
};

export default function PortariaHistorico() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [devices, setDevices] = useState<Record<string, string>>({});
  const [pontos, setPontos] = useState<Record<string, string>>({});
  const [pessoas, setPessoas] = useState<Record<string, string>>({});
  const [operadores, setOperadores] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState({ de: "", ate: "", tipo: "todos", resultado: "todos", device: "todos" });

  const carregar = useCallback(async () => {
    setCarregando(true);
    let query = supabase
      .from("port_access_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (filtros.de) query = query.gte("created_at", new Date(`${filtros.de}T00:00:00`).toISOString());
    if (filtros.ate) query = query.lte("created_at", new Date(`${filtros.ate}T23:59:59`).toISOString());
    if (filtros.tipo !== "todos") query = query.eq("tipo", filtros.tipo);
    if (filtros.resultado !== "todos") query = query.eq("resultado", filtros.resultado);
    if (filtros.device !== "todos") query = query.eq("device_id", filtros.device);

    const [{ data }, { data: d }, { data: p }, { data: pe }, { data: us }] = await Promise.all([
      query,
      supabase.from("port_devices").select("id, nome"),
      supabase.from("port_access_points").select("id, nome"),
      supabase.from("port_people").select("id, nome"),
      supabase.from("usuarios").select("auth_user_id, nome"),
    ]);

    setEventos((data ?? []) as Evento[]);
    setDevices(Object.fromEntries((d ?? []).map((x) => [x.id, x.nome])));
    setPontos(Object.fromEntries((p ?? []).map((x) => [x.id, x.nome])));
    setPessoas(Object.fromEntries((pe ?? []).map((x) => [x.id, x.nome])));
    setOperadores(Object.fromEntries(((us ?? []) as any[]).filter((u) => u.auth_user_id).map((u) => [u.auth_user_id, u.nome])));
    setCarregando(false);
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const icone = (r: string | null) =>
    r === "sucesso" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      : r === "negado" ? <ShieldAlert className="h-4 w-4 text-amber-500" />
      : <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Histórico de acessos</h2>
        <p className="text-sm text-muted-foreground">Registro completo e imutável de todos os eventos da portaria.</p>
      </div>

      <div className="rounded-lg border p-3 grid grid-cols-2 lg:grid-cols-5 gap-3 bg-muted/30">
        <div><Label className="text-xs">De</Label><Input type="date" value={filtros.de} onChange={(e) => setFiltros({ ...filtros, de: e.target.value })} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={filtros.ate} onChange={(e) => setFiltros({ ...filtros, ate: e.target.value })} /></div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={filtros.tipo} onValueChange={(v) => setFiltros({ ...filtros, tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Resultado</Label>
          <Select value={filtros.resultado} onValueChange={(v) => setFiltros({ ...filtros, resultado: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sucesso">Sucesso</SelectItem>
              <SelectItem value="negado">Negado</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Dispositivo</Label>
          <Select value={filtros.device} onValueChange={(v) => setFiltros({ ...filtros, device: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(devices).map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 lg:col-span-5 flex justify-end">
          <Button variant="outline" size="sm" onClick={carregar}><Filter className="h-4 w-4 mr-2" />Aplicar filtros</Button>
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : eventos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum evento no período.</div>
      ) : (
        <>
          {/* Cards no celular */}
          <div className="space-y-2 lg:hidden">
            {eventos.map((e) => (
              <div key={e.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  {icone(e.resultado)}
                  <span className="font-medium text-sm">{TIPO_LABEL[e.tipo] ?? e.tipo}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{e.origem ?? "-"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(e.created_at).toLocaleString("pt-BR")} · {pontos[e.access_point_id ?? ""] ?? devices[e.device_id ?? ""] ?? "-"}
                </p>
                {e.person_id && <p className="text-xs">{pessoas[e.person_id]}</p>}
                {e.auth_user_id && operadores[e.auth_user_id] && (
                  <p className="text-xs text-muted-foreground mt-1">Porteiro: {operadores[e.auth_user_id]}</p>
                )}
                {e.mensagem && <p className="text-xs text-destructive mt-1">{e.mensagem}</p>}
              </div>
            ))}
          </div>

          {/* Tabela no desktop */}
          <div className="hidden lg:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Data/Hora</th>
                  <th className="px-3 py-2 font-medium">Evento</th>
                  <th className="px-3 py-2 font-medium">Acesso</th>
                  <th className="px-3 py-2 font-medium">Dispositivo</th>
                  <th className="px-3 py-2 font-medium">Pessoa</th>
                  <th className="px-3 py-2 font-medium">Porteiro</th>
                  <th className="px-3 py-2 font-medium">Origem</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2">{TIPO_LABEL[e.tipo] ?? e.tipo}</td>
                    <td className="px-3 py-2">{pontos[e.access_point_id ?? ""] ?? "-"}</td>
                    <td className="px-3 py-2">{devices[e.device_id ?? ""] ?? "-"}</td>
                    <td className="px-3 py-2">{pessoas[e.person_id ?? ""] ?? "-"}</td>
                    <td className="px-3 py-2">{operadores[e.auth_user_id ?? ""] ?? "-"}</td>
                    <td className="px-3 py-2">{e.origem ?? "-"}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">{icone(e.resultado)}<span className="capitalize">{e.resultado ?? "-"}</span></span>
                      {e.mensagem && <span className="block text-[11px] text-muted-foreground">{e.mensagem}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
