import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Loader2, Pencil, Trash2, ScanFace, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { DIAS_SEMANA, comandoControlId, maskTelefone, usePortariaPerfil } from "@/lib/portaria/api";

type Pessoa = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  documento: string | null;
  unidade: string | null;
  tipo: string | null;
  ativo: boolean | null;
  valido_de: string | null;
  valido_ate: string | null;
  dias_semana: number[] | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  permitir_remoto: boolean | null;
  permitir_facial: boolean | null;
  face_status: string | null;
  sync_erro: string | null;
  observacoes: string | null;
};

const VAZIA: Partial<Pessoa> = {
  nome: "", email: "", telefone: "", documento: "", unidade: "", tipo: "morador",
  ativo: true, permitir_remoto: true, permitir_facial: true, dias_semana: [],
};

const FACE_BADGE: Record<string, { label: string; cor: string }> = {
  cadastrada: { label: "Face cadastrada", cor: "bg-emerald-500/15 text-emerald-600" },
  pendente: { label: "Face pendente", cor: "bg-amber-500/15 text-amber-600" },
  erro: { label: "Erro de sincronização", cor: "bg-destructive/15 text-destructive" },
};

export default function PortariaPessoas() {
  const { toast } = useToast();
  const { isGestor } = usePortariaPerfil();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [acessos, setAcessos] = useState<{ id: string; nome: string }[]>([]);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [dispositivoFacial, setDispositivoFacial] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<Partial<Pessoa>>(VAZIA);
  const [excluir, setExcluir] = useState<Pessoa | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [{ data: p }, { data: a }, { data: d }] = await Promise.all([
      supabase.from("port_people").select("*").order("nome"),
      supabase.from("port_access_points").select("id, nome").eq("ativo", true).order("ordem"),
      supabase.from("port_devices").select("id").eq("tipo", "idface").eq("habilitado", true).limit(1),
    ]);
    setPessoas((p ?? []) as Pessoa[]);
    setAcessos(a ?? []);
    setDispositivoFacial(d?.[0]?.id ?? null);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setForm(VAZIA); setPermissoes([]); setAberto(true); };

  const abrirEdicao = async (p: Pessoa) => {
    setForm(p);
    const { data } = await supabase
      .from("port_person_permissions")
      .select("access_point_id")
      .eq("person_id", p.id);
    setPermissoes((data ?? []).map((x) => x.access_point_id).filter(Boolean) as string[]);
    setAberto(true);
  };

  const salvar = async () => {
    if (!form.nome?.trim()) {
      toast({ title: "Informe o nome completo.", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = {
      nome: form.nome.trim().toUpperCase(),
      email: form.email?.trim() || null,
      telefone: form.telefone || null,
      documento: form.documento?.toUpperCase() || null,
      unidade: form.unidade?.toUpperCase() || null,
      tipo: form.tipo || "morador",
      ativo: form.ativo ?? true,
      valido_de: form.valido_de || null,
      valido_ate: form.valido_ate || null,
      dias_semana: form.dias_semana ?? [],
      hora_inicio: form.hora_inicio || null,
      hora_fim: form.hora_fim || null,
      permitir_remoto: form.permitir_remoto ?? true,
      permitir_facial: form.permitir_facial ?? true,
      observacoes: form.observacoes || null,
    };

    let id = form.id;
    if (id) {
      const { error } = await supabase.from("port_people").update(payload).eq("id", id);
      if (error) { setSalvando(false); toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    } else {
      const { data, error } = await supabase.from("port_people").insert(payload).select("id").single();
      if (error) { setSalvando(false); toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
      id = data.id;
    }

    await supabase.from("port_person_permissions").delete().eq("person_id", id!);
    if (permissoes.length) {
      await supabase.from("port_person_permissions").insert(
        permissoes.map((ap) => ({ person_id: id!, access_point_id: ap })),
      );
    }

    setSalvando(false);
    setAberto(false);
    toast({ title: "Pessoa salva com sucesso." });
    carregar();
  };

  const sincronizar = async (p: Pessoa) => {
    if (!dispositivoFacial) {
      toast({ title: "Nenhum iDFace habilitado", description: "Cadastre o dispositivo em Dispositivos.", variant: "destructive" });
      return;
    }
    toast({ title: "Sincronizando com o iDFace..." });
    const r = await comandoControlId({ acao: "sync_pessoa", device_id: dispositivoFacial, person_id: p.id });
    toast({ title: r.ok ? "Sincronizado" : "Falha na sincronização", description: r.mensagem, variant: r.ok ? undefined : "destructive" });
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    if (dispositivoFacial) {
      await comandoControlId({ acao: "remover_pessoa", device_id: dispositivoFacial, person_id: excluir.id });
    }
    const { error } = await supabase.from("port_people").delete().eq("id", excluir.id);
    toast({
      title: error ? "Não foi possível excluir" : "Pessoa excluída",
      description: error?.message,
      variant: error ? "destructive" : undefined,
    });
    setExcluir(null);
    carregar();
  };

  const filtradas = pessoas.filter((p) => {
    const texto = `${p.nome} ${p.email ?? ""} ${p.documento ?? ""} ${p.unidade ?? ""}`.toLowerCase();
    if (busca && !texto.includes(busca.toLowerCase())) return false;
    if (filtroStatus === "ativos" && !p.ativo) return false;
    if (filtroStatus === "inativos" && p.ativo) return false;
    if (filtroStatus === "face_pendente" && p.face_status === "cadastrada") return false;
    return true;
  });

  const toggleDia = (dia: number) => {
    const atuais = form.dias_semana ?? [];
    setForm({ ...form, dias_semana: atuais.includes(dia) ? atuais.filter((d) => d !== dia) : [...atuais, dia] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold">Pessoas</h2>
          <p className="text-sm text-muted-foreground">Moradores e colaboradores com acesso liberado.</p>
        </div>
        {isGestor && (
          <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Nova pessoa</Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, e-mail, documento ou unidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativos">Somente ativos</SelectItem>
            <SelectItem value="inativos">Somente inativos</SelectItem>
            <SelectItem value="face_pendente">Face pendente/erro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma pessoa encontrada.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtradas.map((p) => {
            const face = FACE_BADGE[p.face_status ?? "pendente"] ?? FACE_BADGE.pendente;
            return (
              <div key={p.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[p.unidade, p.email, p.telefone].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${face.cor}`}>{face.label}</span>
                      {p.permitir_remoto && <Badge variant="outline" className="text-[10px]">Abertura remota</Badge>}
                    </div>
                    {p.sync_erro && <p className="text-[11px] text-destructive mt-1">{p.sync_erro}</p>}
                  </div>
                  {isGestor && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => sincronizar(p)} title="Sincronizar com iDFace">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(p)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setExcluir(p)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar pessoa" : "Nova pessoa"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Nome completo *</Label>
              <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })} /></div>
            <div><Label>Documento</Label><Input value={form.documento ?? ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
            <div><Label>Unidade / setor</Label><Input value={form.unidade ?? ""} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo ?? "morador"} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="morador">Morador</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="prestador">Prestador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-sm">Ativo</Label>
              <Switch checked={form.ativo ?? true} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
            <div><Label>Válido de</Label><Input type="date" value={form.valido_de ?? ""} onChange={(e) => setForm({ ...form, valido_de: e.target.value })} /></div>
            <div><Label>Válido até</Label><Input type="date" value={form.valido_ate ?? ""} onChange={(e) => setForm({ ...form, valido_ate: e.target.value })} /></div>
            <div><Label>Horário inicial</Label><Input type="time" value={form.hora_inicio?.slice(0, 5) ?? ""} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></div>
            <div><Label>Horário final</Label><Input type="time" value={form.hora_fim?.slice(0, 5) ?? ""} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} /></div>

            <div className="sm:col-span-2">
              <Label>Dias da semana permitidos</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DIAS_SEMANA.map((d) => {
                  const ativo = (form.dias_semana ?? []).includes(d.valor);
                  return (
                    <button
                      key={d.valor}
                      type="button"
                      onClick={() => toggleDia(d.valor)}
                      className={`px-3 py-1.5 rounded-md border text-xs ${ativo ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}
                    >{d.label}</button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Nenhum selecionado = todos os dias.</p>
            </div>

            <div className="sm:col-span-2">
              <Label>Acessos permitidos</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {acessos.map((a) => {
                  const ativo = permissoes.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setPermissoes(ativo ? permissoes.filter((x) => x !== a.id) : [...permissoes, a.id])}
                      className={`px-3 py-1.5 rounded-md border text-xs ${ativo ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}
                    >{a.nome}</button>
                  );
                })}
                {acessos.length === 0 && <p className="text-xs text-muted-foreground">Cadastre pontos de acesso em Configurações.</p>}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-sm">Permitir abertura remota</Label>
              <Switch checked={form.permitir_remoto ?? true} onCheckedChange={(v) => setForm({ ...form, permitir_remoto: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-sm flex items-center gap-1"><ScanFace className="h-4 w-4" />Permitir acesso facial</Label>
              <Switch checked={form.permitir_facial ?? true} onCheckedChange={(v) => setForm({ ...form, permitir_facial: v })} />
            </div>

            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
        description="A pessoa será removida da portaria e do iDFace, e perderá o acesso imediatamente."
      />
    </div>
  );
}
