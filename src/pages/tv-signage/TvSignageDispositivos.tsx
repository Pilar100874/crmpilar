import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmTrigger } from "@/components/tv-signage/DeleteConfirmTrigger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RefreshCw, QrCode, Lock, Unlock, Terminal, Pencil, Trash2, KeyRound, Wifi, WifiOff, AlertTriangle, PlayCircle, Monitor, MapPin, Layers, Clock, Tv, Activity } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { enviarComando, gerarCodigo, gerarToken, getEstabelecimentoId, sha256Hex } from "@/services/tvSignage/tvSignageService";
import { TV_COMMAND_LABELS, type TvCommandTipo } from "@/types/tvSignage";

export default function TvSignageDispositivos() {
  const [devices, setDevices] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [grupoFiltro, setGrupoFiltro] = useState<string>("todos");
  const [edit, setEdit] = useState<any | null>(null);
  const [pairing, setPairing] = useState<{ codigo: string; token: string } | null>(null);
  const [comandoDialog, setComandoDialog] = useState<{ deviceId: string; open: boolean }>({ deviceId: "", open: false });

  const carregar = async () => {
    const [{ data: d }, { data: g }, { data: dsh }, { data: pls }] = await Promise.all([
      supabase.from("tv_devices").select("*, grupo:tv_groups(nome), dashboard:tv_dashboards(nome), playlist:tv_playlists(nome)").order("created_at", { ascending: false }),
      supabase.from("tv_groups").select("id, nome"),
      supabase.from("tv_dashboards").select("id, nome"),
      supabase.from("tv_playlists").select("id, nome"),
    ]);
    setDevices(d || []); setGrupos(g || []); setDashboards(dsh || []); setPlaylists(pls || []);
  };

  useEffect(() => {
    carregar();
    const ch = supabase.channel("tv-devices-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "tv_devices" }, carregar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtrados = devices.filter((d) => {
    const matchBusca = !busca || `${d.nome} ${d.codigo} ${d.local || ""}`.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = statusFiltro === "todos" || d.status === statusFiltro;
    const matchGrupo = grupoFiltro === "todos" || d.grupo_id === grupoFiltro;
    return matchBusca && matchStatus && matchGrupo;
  });

  const salvar = async (dados: any) => {
    const estId = await getEstabelecimentoId();
    if (!estId) return toast.error("Estabelecimento não encontrado");

    if (dados.id) {
      const { error } = await supabase.from("tv_devices").update({
        nome: dados.nome, local: dados.local, grupo_id: dados.grupo_id || null,
        dashboard_atual_id: dados.dashboard_atual_id || null, playlist_id: dados.playlist_id || null,
        tema: dados.tema, idioma: dados.idioma, versao_min_requerida: dados.versao_min_requerida,
        observacoes: dados.observacoes,
      }).eq("id", dados.id);
      if (error) return toast.error(error.message);
      toast.success("Dispositivo atualizado");
      setEdit(null); carregar();
    } else {
      const codigo = gerarCodigo();
      const token = gerarToken();
      const token_hash = await sha256Hex(token);
      const { error } = await supabase.from("tv_devices").insert({
        estabelecimento_id: estId, codigo, token_hash,
        nome: dados.nome, local: dados.local, grupo_id: dados.grupo_id || null,
        dashboard_atual_id: dados.dashboard_atual_id || null, playlist_id: dados.playlist_id || null,
        tema: dados.tema, idioma: dados.idioma, versao_min_requerida: dados.versao_min_requerida,
        observacoes: dados.observacoes,
      } as any);
      if (error) return toast.error(error.message);
      toast.success("Dispositivo cadastrado");
      setEdit(null);
      setPairing({ codigo, token });
      carregar();
    }
  };

  const reemitirToken = async (device: any) => {
    const token = gerarToken();
    const token_hash = await sha256Hex(token);
    const { error } = await supabase.from("tv_devices").update({ token_hash }).eq("id", device.id);
    if (error) return toast.error(error.message);
    setPairing({ codigo: device.codigo, token });
    toast.success("Novo token gerado");
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from("tv_devices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dispositivo excluído");
    carregar();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { icon: any; cls: string; label: string; dot: string }> = {
      online: { icon: Wifi, cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", label: "Online", dot: "bg-emerald-500 shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" },
      offline: { icon: WifiOff, cls: "bg-muted text-muted-foreground border-border", label: "Offline", dot: "bg-muted-foreground/50" },
      erro: { icon: AlertTriangle, cls: "bg-red-500/10 text-red-500 border-red-500/30", label: "Erro", dot: "bg-red-500 animate-pulse" },
      bloqueado: { icon: Lock, cls: "bg-orange-500/10 text-orange-500 border-orange-500/30", label: "Bloqueado", dot: "bg-orange-500" },
    };
    const it = map[s] || map.offline;
    return (
      <Badge variant="outline" className={`${it.cls} gap-1.5 font-medium`}>
        <span className={`w-1.5 h-1.5 rounded-full ${it.dot}`} />
        <it.icon className="w-3 h-3" />
        {it.label}
      </Badge>
    );
  };

  const stats = {
    total: devices.length,
    online: devices.filter((d) => d.status === "online").length,
    offline: devices.filter((d) => d.status === "offline").length,
    problemas: devices.filter((d) => d.status === "erro" || d.status === "bloqueado").length,
  };

  const StatCard = ({ icon: Icon, label, value, tone }: any) => (
    <Card className={`p-4 border-l-4 ${tone} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );

  const DeviceActions = ({ d, compact = false }: { d: any; compact?: boolean }) => (
    <div className={`flex gap-1 ${compact ? "flex-wrap" : "justify-end"}`}>
      <Button variant="ghost" size="icon" title="Simular" onClick={() => window.open(`/tv-signage/simular/${d.id}`, "_blank")}><PlayCircle className="w-4 h-4 text-primary" /></Button>
      <Button variant="ghost" size="icon" title="Enviar comando" onClick={() => setComandoDialog({ deviceId: d.id, open: true })}><Terminal className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" title={d.bloqueado ? "Desbloquear" : "Bloquear"} onClick={async () => {
        await supabase.from("tv_devices").update({ bloqueado: !d.bloqueado, status: !d.bloqueado ? "bloqueado" : "offline" }).eq("id", d.id);
        await enviarComando(d.id, d.bloqueado ? "desbloquear" : "bloquear");
        carregar();
      }}>{d.bloqueado ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}</Button>
      <Button variant="ghost" size="icon" title="Reemitir token" onClick={() => reemitirToken(d)}><KeyRound className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" title="Ver QR Code" onClick={() => setPairing({ codigo: d.codigo, token: "(reemita para ver o token)" })}><QrCode className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" title="Editar" onClick={() => setEdit(d)}><Pencil className="w-4 h-4" /></Button>
      <DeleteConfirmTrigger
        onConfirm={() => excluir(d.id)}
        title="Excluir dispositivo?"
        description={`Remove "${d.nome}" e todo o histórico. Ação não pode ser desfeita.`}
        trigger={<Button variant="ghost" size="icon" title="Excluir"><Trash2 className="w-4 h-4 text-red-500" /></Button>}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header Gradient */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/90 via-primary to-primary/70 text-primary-foreground p-5 md:p-6">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Dispositivos</h1>
              <p className="text-sm text-primary-foreground/80">Gerencie suas telas remotas em tempo real</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={carregar} className="bg-white/15 hover:bg-white/25 text-primary-foreground border-0 backdrop-blur-sm">
              <RefreshCw className="w-4 h-4 mr-1.5" />Atualizar
            </Button>
            <Button size="sm" onClick={() => setEdit({})} className="bg-white text-primary hover:bg-white/90 font-semibold">
              <Plus className="w-4 h-4 mr-1.5" />Novo dispositivo
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Monitor} label="Total" value={stats.total} tone="border-l-primary" />
        <StatCard icon={Wifi} label="Online" value={stats.online} tone="border-l-emerald-500" />
        <StatCard icon={WifiOff} label="Offline" value={stats.offline} tone="border-l-muted-foreground" />
        <StatCard icon={AlertTriangle} label="Problemas" value={stats.problemas} tone="border-l-red-500" />
      </div>

      {/* Filtros */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row gap-2 md:gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, código, local..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="erro">Com erro</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Mobile / Tablet: Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
        {filtrados.length === 0 && (
          <Card className="col-span-full p-10 text-center border-dashed">
            <Tv className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">Nenhum dispositivo encontrado</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setEdit({})}><Plus className="w-4 h-4 mr-1" />Cadastrar primeiro</Button>
          </Card>
        )}
        {filtrados.map((d) => (
          <Card key={d.id} className="p-4 hover:shadow-lg hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{d.nome}</h3>
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{d.codigo}</code>
              </div>
              {statusBadge(d.status)}
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
              {d.local && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{d.local}</span></div>}
              {d.grupo?.nome && <div className="flex items-center gap-1.5"><Layers className="w-3 h-3 shrink-0" /><span className="truncate">{d.grupo.nome}</span></div>}
              <div className="flex items-center gap-1.5"><PlayCircle className="w-3 h-3 shrink-0 text-primary" /><span className="truncate">{d.playlist?.nome ? `▶ ${d.playlist.nome}` : d.dashboard?.nome || "Sem conteúdo"}</span></div>
              <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 shrink-0" /><span>{d.ultima_comunicacao ? formatDistanceToNow(new Date(d.ultima_comunicacao), { addSuffix: true, locale: ptBR }) : "Nunca conectou"}</span></div>
              {d.versao_app && <div className="flex items-center gap-1.5"><Activity className="w-3 h-3 shrink-0" /><span>v{d.versao_app}</span></div>}
            </div>
            <div className="pt-2 border-t">
              <DeviceActions d={d} compact />
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop: Tabela */}
      <Card className="overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Última comunicação</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  <Tv className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  Nenhum dispositivo encontrado
                </TableCell></TableRow>
              )}
              {filtrados.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{d.nome}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{d.codigo}</code></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.local || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.grupo?.nome || "—"}</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell className="text-sm">{d.playlist?.nome ? `▶ ${d.playlist.nome}` : d.dashboard?.nome || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.ultima_comunicacao ? formatDistanceToNow(new Date(d.ultima_comunicacao), { addSuffix: true, locale: ptBR }) : "Nunca"}
                  </TableCell>
                  <TableCell className="text-xs">{d.versao_app || "—"}</TableCell>
                  <TableCell className="text-right">
                    <DeviceActions d={d} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>


      {/* Editor */}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar dispositivo" : "Novo dispositivo"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Nome</Label><Input value={edit.nome || ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div><Label>Local</Label><Input value={edit.local || ""} onChange={(e) => setEdit({ ...edit, local: e.target.value })} /></div>
              <div><Label>Grupo</Label>
                <Select value={edit.grupo_id || "none"} onValueChange={(v) => setEdit({ ...edit, grupo_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem grupo</SelectItem>{grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                <p className="text-xs text-muted-foreground">Escolha <b>um</b>: Dashboard fixo <b>ou</b> Playlist (nunca os dois).</p>
                <div><Label>Dashboard fixo</Label>
                  <Select value={edit.dashboard_atual_id || "none"} onValueChange={(v) => setEdit({ ...edit, dashboard_atual_id: v === "none" ? null : v, playlist_id: null })}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Nenhum</SelectItem>{dashboards.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Playlist (rotação)</Label>
                  <Select value={edit.playlist_id || "none"} onValueChange={(v) => setEdit({ ...edit, playlist_id: v === "none" ? null : v, dashboard_atual_id: null })}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Tema</Label>
                <Select value={edit.tema || "dark"} onValueChange={(v) => setEdit({ ...edit, tema: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="dark">Escuro</SelectItem><SelectItem value="light">Claro</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label>Observações</Label><Textarea value={edit.observacoes || ""} onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!edit?.nome?.trim()) return toast.error("Informe o nome");
              if (!edit?.dashboard_atual_id && !edit?.playlist_id) return toast.error("Selecione um Dashboard fixo OU uma Playlist");
              salvar(edit);
            }} disabled={!edit?.nome?.trim() || (!edit?.dashboard_atual_id && !edit?.playlist_id)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pareamento */}
      <Dialog open={!!pairing} onOpenChange={(o) => !o && setPairing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pareamento do dispositivo</DialogTitle></DialogHeader>
          {pairing && (() => {
            const pairUrl = `${window.location.origin}/tv-pair?codigo=${encodeURIComponent(pairing.codigo)}&token=${encodeURIComponent(pairing.token)}&api=${encodeURIComponent(window.location.origin)}`;
            const appPayload = JSON.stringify({ codigo: pairing.codigo, token: pairing.token, api_url: window.location.origin });
            return (
              <Tabs defaultValue="universal" className="space-y-4">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="universal">📱 Tablet/Celular</TabsTrigger>
                  <TabsTrigger value="app">📺 App já instalado</TabsTrigger>
                </TabsList>
                <TabsContent value="universal" className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Aponte a câmera do tablet/celular para este QR. Ele abrirá uma página com o link do APK e o pareamento automático.
                  </p>
                  <div className="flex justify-center bg-white p-4 rounded-lg">
                    <QRCodeCanvas value={pairUrl} size={220} />
                  </div>
                  <div className="text-xs text-muted-foreground break-all bg-muted/40 p-2 rounded">{pairUrl}</div>
                </TabsContent>
                <TabsContent value="app" className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Use este QR dentro do app <b>Pilar TV Signage</b> já instalado (botão <b>📷 Ler QR Code</b>).
                  </p>
                  <div className="flex justify-center bg-white p-4 rounded-lg">
                    <QRCodeCanvas value={appPayload} size={220} />
                  </div>
                </TabsContent>
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">Código: </span><code className="bg-muted px-2 py-0.5 rounded">{pairing.codigo}</code></div>
                  <div><span className="text-muted-foreground">Token: </span><code className="bg-muted px-2 py-0.5 rounded text-xs break-all">{pairing.token}</code></div>
                  <p className="text-xs text-orange-500 mt-2">⚠️ Este token só é exibido uma vez. Guarde ou fotografe o QR agora. Se perder, reemita.</p>
                </div>
              </Tabs>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Enviar comando */}
      <Dialog open={comandoDialog.open} onOpenChange={(o) => setComandoDialog({ ...comandoDialog, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar comando</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TV_COMMAND_LABELS) as TvCommandTipo[]).map((tipo) => (
              <Button key={tipo} variant="outline" onClick={async () => {
                await enviarComando(comandoDialog.deviceId, tipo);
                toast.success(`Comando "${TV_COMMAND_LABELS[tipo]}" enfileirado`);
                setComandoDialog({ deviceId: "", open: false });
              }}>{TV_COMMAND_LABELS[tipo]}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
