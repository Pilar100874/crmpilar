import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Pencil, Trash2, Cpu, Zap, Activity, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { STATUS_CORES, salvarCredenciais, testarDispositivo } from "@/lib/portaria/api";

type Dispositivo = {
  id: string;
  nome: string;
  tipo: string;
  funcao: "entrada" | "saida" | null;
  modelo: string | null;
  localizacao: string | null;
  ip: string | null;
  porta: number | null;
  device_id: string | null;
  endpoint: string | null;
  canal_rele: number | null;
  pulso_ms: number | null;
  firmware: string | null;
  habilitado: boolean | null;
  via_coletor: boolean | null;
  status: string | null;
  ultima_comunicacao: string | null;
  config: Record<string, unknown> | null;
};

const VAZIO: Partial<Dispositivo> = {
  nome: "", tipo: "shelly", funcao: "saida", modelo: "", localizacao: "", canal_rele: 0, pulso_ms: 1000, habilitado: true, via_coletor: false,
  config: { geracao: "gen2", protocolo: "http" },
};

export default function PortariaDispositivos() {
  const { toast } = useToast();
  const [lista, setLista] = useState<Dispositivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<Partial<Dispositivo>>(VAZIO);
  const [cred, setCred] = useState({ usuario: "", senha: "", token: "" });
  const [credResumo, setCredResumo] = useState<Record<string, { tem_usuario: boolean; tem_senha: boolean; tem_token: boolean; updated_at: string }>>({});
  const [excluir, setExcluir] = useState<Dispositivo | null>(null);
  const [testando, setTestando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase.from("port_devices").select("*").order("nome");
    setLista((data ?? []) as unknown as Dispositivo[]);
    const { data: resumo } = await (supabase as any).rpc("port_credenciais_resumo");
    const mapa: Record<string, any> = {};
    ((resumo ?? []) as any[]).forEach((r) => { mapa[r.device_id] = r; });
    setCredResumo(mapa);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);


  const abrirNovo = () => { setForm(VAZIO); setCred({ usuario: "", senha: "", token: "" }); setAberto(true); };
  const abrirEdicao = (d: Dispositivo) => { setForm(d); setCred({ usuario: "", senha: "", token: "" }); setAberto(true); };

  const salvar = async () => {
    if (!form.nome?.trim()) { toast({ title: "Informe o nome do dispositivo.", variant: "destructive" }); return; }
    setSalvando(true);
    const payload = {
      nome: form.nome.trim().toUpperCase(),
      tipo: form.tipo || "shelly",
      config: {
        ...((form.config ?? {}) as Record<string, unknown>),
        funcao: form.tipo === "shelly" ? (form.funcao || "saida") : null,
      },
      modelo: form.modelo || null,
      localizacao: form.localizacao?.toUpperCase() || null,
      ip: form.ip || null,
      porta: form.porta ? Number(form.porta) : null,
      device_id: form.device_id || null,
      endpoint: form.endpoint || null,
      canal_rele: form.canal_rele != null ? Number(form.canal_rele) : 0,
      pulso_ms: form.pulso_ms != null ? Number(form.pulso_ms) : 1000,
      firmware: form.firmware || null,
      habilitado: form.habilitado ?? true,
      via_coletor: form.via_coletor ?? false,
      config: (form.config ?? {}) as never,
    };
    let id = form.id;
    if (id) {
      const { error } = await supabase.from("port_devices").update(payload).eq("id", id);
      if (error) { setSalvando(false); toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    } else {
      const { data, error } = await supabase.from("port_devices").insert(payload).select("id").single();
      if (error) { setSalvando(false); toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
      id = data.id;
    }

    if (cred.usuario || cred.senha || cred.token) {
      const r = await salvarCredenciais(id!, {
        usuario: cred.usuario || undefined,
        senha: cred.senha || undefined,
        token: cred.token || undefined,
      });
      if (!r.ok) toast({ title: "Credenciais não salvas", description: r.mensagem, variant: "destructive" });
    }

    setSalvando(false);
    setAberto(false);
    toast({ title: "Dispositivo salvo." });
    carregar();
  };

  const testar = async (d: Dispositivo, acao: "status" | "pulso_teste") => {
    setTestando(d.id + acao);
    const r = await testarDispositivo(d.id, acao);
    setTestando(null);
    toast({ title: r.ok ? "Dispositivo respondeu" : "Falha na comunicação", description: r.mensagem, variant: r.ok ? undefined : "destructive" });
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("port_devices").delete().eq("id", excluir.id);
    toast({
      title: error ? "Não foi possível excluir" : "Dispositivo excluído",
      description: error?.message,
      variant: error ? "destructive" : undefined,
    });
    setExcluir(null);
    carregar();
  };

  const config = (form.config ?? {}) as Record<string, unknown>;
  const setConfig = (k: string, v: unknown) => setForm({ ...form, config: { ...config, [k]: v } });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold">Dispositivos</h2>
          <p className="text-sm text-muted-foreground">Shelly (contato seco), Control iD iDFace Max e outros equipamentos.</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Novo dispositivo</Button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : lista.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum dispositivo cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {lista.map((d) => (
            <div key={d.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" />{d.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[d.tipo === "idface" ? "Control iD iDFace" : d.tipo === "shelly" ? `Shelly ${d.config?.funcao === "entrada" ? "i4 Gen3 (entrada)" : "1 Gen3 (saída)"}` : d.tipo, d.modelo, d.localizacao, d.ip].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`h-2 w-2 rounded-full ${STATUS_CORES[d.status ?? "offline"] ?? "bg-muted-foreground"}`} />
                      <span className="capitalize text-muted-foreground">{d.status ?? "offline"}</span>
                    </span>
                    <Badge variant={d.habilitado ? "default" : "secondary"}>{d.habilitado ? "Habilitado" : "Desabilitado"}</Badge>
                    {d.tipo === "shelly" && (d.config as any)?.funcao && (
                      <Badge variant="outline">
                        {(d.config as any).funcao === "entrada" ? "Entrada · Shelly i4 Gen3" : "Saída · Shelly 1 Gen3"}
                      </Badge>
                    )}
                    {d.via_coletor && <Badge variant="outline">Via Coletor local</Badge>}
                    {d.ultima_comunicacao && (
                      <span className="text-[11px] text-muted-foreground">{new Date(d.ultima_comunicacao).toLocaleString("pt-BR")}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setExcluir(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex-1" disabled={testando === d.id + "status"} onClick={() => testar(d, "status")}>
                  {testando === d.id + "status" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
                  Testar dispositivo
                </Button>
                <Button variant="secondary" size="sm" className="flex-1" disabled={testando === d.id + "pulso_teste"} onClick={() => testar(d, "pulso_teste")}>
                  {testando === d.id + "pulso_teste" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Acionar (pulso)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar dispositivo" : "Novo dispositivo"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo ?? "shelly"} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="shelly">Shelly (contato seco)</SelectItem>
                  <SelectItem value="idface">Control iD iDFace Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Modelo</Label><Input value={form.modelo ?? ""} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
            <div><Label>Localização</Label><Input value={form.localizacao ?? ""} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></div>
            <div><Label>IP local</Label><Input value={form.ip ?? ""} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.0.50" /></div>
            <div><Label>Porta</Label><Input type="number" value={form.porta ?? ""} onChange={(e) => setForm({ ...form, porta: Number(e.target.value) })} /></div>
            {form.tipo === "shelly" && (
              <div className="sm:col-span-2">
                <Label>Função do dispositivo</Label>
                <Select value={(form.funcao as string) ?? "saida"} onValueChange={(v) => setForm({ ...form, funcao: v as "entrada" | "saida" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="saida">Saída — Shelly 1 Gen3 (abre fechadura / portão)</SelectItem>
                    <SelectItem value="entrada">Entrada — Shelly i4 Gen3 (campainha / botão)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Use <strong>Entrada</strong> para o Shelly i4 (detecta o toque na campainha) e <strong>Saída</strong> para o Shelly 1 (aciona a fechadura).
                </p>
              </div>
            )}
            {form.tipo !== "shelly" && (
              <div className="sm:col-span-2">
                <Label>Endpoint / URL (opcional, sobrepõe IP)</Label>
                <Input value={form.endpoint ?? ""} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="http://192.168.0.50" />
              </div>
            )}
            {form.tipo !== "shelly" && (
              <div><Label>Identificador do dispositivo</Label><Input value={form.device_id ?? ""} onChange={(e) => setForm({ ...form, device_id: e.target.value })} /></div>
            )}
            {form.tipo !== "shelly" && (
              <div><Label>Firmware</Label><Input value={form.firmware ?? ""} onChange={(e) => setForm({ ...form, firmware: e.target.value })} /></div>
            )}

            {form.tipo === "shelly" && (
              <>
                <div>
                  <Label>Geração / conexão</Label>
                  <Select value={(config.geracao as string) ?? "gen2"} onValueChange={(v) => setConfig("geracao", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="gen1">Gen1 (local)</SelectItem>
                      <SelectItem value="gen2">Gen2+ RPC (local)</SelectItem>
                      <SelectItem value="cloud">Shelly Cloud</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Canal do relé</Label><Input type="number" value={form.canal_rele ?? 0} onChange={(e) => setForm({ ...form, canal_rele: Number(e.target.value) })} /></div>
                <div><Label>Duração do pulso (ms)</Label><Input type="number" value={form.pulso_ms ?? 1000} onChange={(e) => setForm({ ...form, pulso_ms: Number(e.target.value) })} /></div>
                {config.geracao === "cloud" && (
                  <>
                    <div><Label>Servidor Cloud</Label><Input value={(config.cloud_server as string) ?? ""} onChange={(e) => setConfig("cloud_server", e.target.value)} placeholder="shelly-XX-eu.shelly.cloud" /></div>
                    <div><Label>Device ID Cloud</Label><Input value={(config.cloud_device_id as string) ?? ""} onChange={(e) => setConfig("cloud_device_id", e.target.value)} /></div>
                  </>
                )}
              </>
            )}

            <div className="sm:col-span-2 rounded-md border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm">Acessar pela rede local (Coletor Pilar)</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Ative quando o IP for interno (ex.: 192.168.x.x). O comando é executado pelo Coletor Pilar instalado na rede,
                    sem precisar abrir portas no roteador.
                  </p>
                </div>
                <Switch checked={form.via_coletor ?? false} onCheckedChange={(v) => setForm({ ...form, via_coletor: v })} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
              <Label className="text-sm">Habilitado</Label>
              <Switch checked={form.habilitado ?? true} onCheckedChange={(v) => setForm({ ...form, habilitado: v })} />
            </div>

            {form.tipo !== "shelly" && (
            <div className="sm:col-span-2 rounded-md border p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-medium flex items-center gap-2"><KeyRound className="h-4 w-4" />Credenciais (armazenadas somente no backend)</p>
              <div className={`grid grid-cols-1 gap-3 ${form.tipo === "idface" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <div><Label>Usuário</Label><Input value={cred.usuario} onChange={(e) => setCred({ ...cred, usuario: e.target.value })} autoComplete="off" /></div>
                <div><Label>Senha</Label><Input type="password" value={cred.senha} onChange={(e) => setCred({ ...cred, senha: e.target.value })} autoComplete="new-password" /></div>
                {form.tipo !== "idface" && (
                  <div><Label>Token / auth key</Label><Input type="password" value={cred.token} onChange={(e) => setCred({ ...cred, token: e.target.value })} autoComplete="new-password" /></div>
                )}
              </div>
              {form.id && credResumo[form.id] ? (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Credenciais salvas em {new Date(credResumo[form.id!].updated_at).toLocaleString("pt-BR")} —
                  {credResumo[form.id!].tem_usuario ? " usuário ✓" : " usuário —"}
                  {credResumo[form.id!].tem_senha ? " senha ✓" : " senha —"}
                  {form.tipo === "idface" ? "" : credResumo[form.id!].tem_token ? " token ✓" : " token —"}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Nenhuma credencial salva para este dispositivo.</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Deixe em branco para manter as credenciais atuais. Elas nunca são retornadas para o navegador (por isso os campos aparecem vazios).
                {form.tipo === "idface" ? "" : " No iDFace o Token não é necessário: use apenas usuário e senha do equipamento."}
              </p>

            </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
