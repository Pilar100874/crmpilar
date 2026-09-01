import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Pencil, Trash2, DoorOpen, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { comandoControlId, usePortariaPerfil } from "@/lib/portaria/api";
import PortariaColetores from "@/components/portaria/PortariaColetores";
import InterfoneConfigCard from "@/components/portaria/InterfoneConfigCard";
import InterfoneAppDownloadCard from "@/components/portaria/InterfoneAppDownloadCard";
import PortariaPermissoes from "@/pages/portaria/PortariaPermissoes";


type Ponto = {
  id: string;
  nome: string;
  tipo: string;
  device_id: string | null;
  acao: string | null;
  confirmar_abertura: boolean | null;
  ordem: number | null;
  ativo: boolean | null;
};

const VAZIO: Partial<Ponto> = { nome: "", tipo: "portao", confirmar_abertura: true, ordem: 0, ativo: true };

export default function PortariaConfiguracoes() {
  const { toast } = useToast();
  const { isSuperAdmin } = usePortariaPerfil();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [devices, setDevices] = useState<{ id: string; nome: string; tipo: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<Partial<Ponto>>(VAZIO);
  const [excluir, setExcluir] = useState<Ponto | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from("port_access_points").select("*").order("ordem"),
      supabase.from("port_devices").select("id, nome, tipo").order("nome"),
    ]);
    setPontos((p ?? []) as Ponto[]);
    setDevices(d ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarPonto = async () => {
    if (!form.nome?.trim() || !form.device_id) {
      toast({ title: "Informe o nome e o dispositivo do acesso.", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = {
      nome: form.nome.trim().toUpperCase(),
      tipo: form.tipo || "portao",
      device_id: form.device_id,
      acao: form.acao || null,
      confirmar_abertura: form.confirmar_abertura ?? true,
      ordem: Number(form.ordem ?? 0),
      ativo: form.ativo ?? true,
    };
    const { error } = form.id
      ? await supabase.from("port_access_points").update(payload).eq("id", form.id)
      : await supabase.from("port_access_points").insert(payload);
    setSalvando(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    setAberto(false);
    toast({ title: "Ponto de acesso salvo." });
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("port_access_points").delete().eq("id", excluir.id);
    toast({
      title: error ? "Não foi possível excluir" : "Ponto de acesso excluído",
      description: error?.message,
      variant: error ? "destructive" : undefined,
    });
    setExcluir(null);
    carregar();
  };

  const sincronizarTodos = async () => {
    const idface = devices.find((d) => d.tipo === "idface");
    if (!idface) { toast({ title: "Nenhum iDFace cadastrado.", variant: "destructive" }); return; }
    setSincronizando(true);
    const r = await comandoControlId({ acao: "sync_todos", device_id: idface.id });
    setSincronizando(false);
    toast({ title: r.ok ? "Sincronização concluída" : "Falha na sincronização", description: r.mensagem, variant: r.ok ? undefined : "destructive" });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Pontos de acesso, permissões de perfil e sincronização facial.</p>
      </div>

      <Tabs defaultValue="interfone">
        <TabsList>
          <TabsTrigger value="interfone">Interfone</TabsTrigger>
          <TabsTrigger value="acessos">Pontos de acesso</TabsTrigger>
          <TabsTrigger value="perfis">Perfis e permissões</TabsTrigger>
          <TabsTrigger value="facial">Facial / iDFace</TabsTrigger>
          <TabsTrigger value="coletores">Coletores (rede local)</TabsTrigger>
        </TabsList>

        <TabsContent value="interfone" className="space-y-4 pt-4">
          <InterfoneConfigCard />
          <InterfoneAppDownloadCard />
        </TabsContent>



        <TabsContent value="acessos" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setForm(VAZIO); setAberto(true); }}><Plus className="h-4 w-4 mr-2" />Novo ponto de acesso</Button>
          </div>
          {carregando ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pontos.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum ponto de acesso cadastrado.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {pontos.map((p) => (
                <div key={p.id} className="rounded-xl border bg-card p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate flex items-center gap-2"><DoorOpen className="h-4 w-4 text-primary" />{p.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {devices.find((d) => d.id === p.device_id)?.nome ?? "Sem dispositivo"} · {p.tipo}
                      {p.acao ? ` · ação ${p.acao}` : ""}
                    </p>
                    <div className="flex gap-1.5 mt-2">
                      <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                      {p.confirmar_abertura && <Badge variant="outline" className="text-[10px]">Pede confirmação</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setForm(p); setAberto(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setExcluir(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coletores" className="space-y-4 pt-4">
          <PortariaColetores />
        </TabsContent>

        <TabsContent value="perfis" className="space-y-4 pt-4">
          {isSuperAdmin ? (
            <PortariaPermissoes />
          ) : (
            <p className="text-sm text-muted-foreground">Somente o super administrador pode alterar perfis.</p>
          )}
        </TabsContent>


        <TabsContent value="facial" className="space-y-4 pt-4">
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm">
              O reconhecimento facial é executado pelo equipamento Control iD iDFace Max. O sistema apenas
              sincroniza cadastros, horários e permissões — as credenciais ficam somente no backend.
            </p>
            <Button onClick={sincronizarTodos} disabled={sincronizando}>
              {sincronizando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar todas as pessoas com o iDFace
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Editar ponto de acesso" : "Novo ponto de acesso"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="PORTÃO PRINCIPAL" /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo ?? "portao"} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="portao">Portão</SelectItem>
                  <SelectItem value="porta">Porta / fechadura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dispositivo *</Label>
              <Select value={form.device_id ?? ""} onValueChange={(v) => setForm({ ...form, device_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canal / número da porta</Label>
              <Input value={form.acao ?? ""} onChange={(e) => setForm({ ...form, acao: e.target.value })} placeholder="0 (Shelly) ou 1 (iDFace)" />
            </div>
            <div><Label>Ordem</Label><Input type="number" value={form.ordem ?? 0} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} /></div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-sm">Confirmar antes de abrir</Label>
              <Switch checked={form.confirmar_abertura ?? true} onCheckedChange={(v) => setForm({ ...form, confirmar_abertura: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-sm">Ativo</Label>
              <Switch checked={form.ativo ?? true} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={salvarPonto} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
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
