import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { maskTelefone } from "@/lib/portaria/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ShieldCheck, Search, UserCheck } from "lucide-react";
import type { Porteiro } from "@/lib/portaria/porteiros";

interface UsuarioSistema { id: string; nome: string; email: string; auth_user_id: string | null }

const TURNOS = ["Manhã", "Tarde", "Noite", "Madrugada", "Escala 12x36"];

const vazio: Partial<Porteiro> = { nome: "", documento: "", telefone: "", turno: "", observacoes: "", ativo: true, user_id: null };

export default function PorteirosCRUD() {
  const { toast } = useToast();
  const [porteiros, setPorteiros] = useState<Porteiro[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [editing, setEditing] = useState<Partial<Porteiro> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<Porteiro | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const estabelecimentoId = await getEstabelecimentoId();
    if (!estabelecimentoId) {
      setCarregando(false);
      return;
    }
    const [{ data: ps }, { data: us }] = await Promise.all([
      supabase.from("porteiros").select("*").eq("estabelecimento_id", estabelecimentoId).order("nome"),
      supabase.from("usuarios").select("id, nome, email, auth_user_id").eq("estabelecimento_id", estabelecimentoId).order("nome"),
    ]);
    setPorteiros((ps ?? []) as Porteiro[]);
    setUsuarios((us ?? []) as UsuarioSistema[]);
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!editing?.nome?.trim()) {
      toast({ title: "Informe o nome do porteiro", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const estabelecimentoId = await getEstabelecimentoId();
    if (!estabelecimentoId) {
      toast({ title: "Estabelecimento não encontrado", variant: "destructive" });
      setSalvando(false);
      return;
    }
    const payload = {
      estabelecimento_id: estabelecimentoId,
      nome: editing.nome.trim().toUpperCase(),
      documento: editing.documento?.trim() || null,
      telefone: editing.telefone?.trim() || null,
      turno: editing.turno || null,
      observacoes: editing.observacoes?.trim() || null,
      ativo: editing.ativo ?? true,
      user_id: editing.user_id || null,
    };
    const { error } = editing.id
      ? await supabase.from("porteiros").update(payload).eq("id", editing.id)
      : await supabase.from("porteiros").insert(payload);
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Porteiro salvo" });
    setEditing(null);
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("porteiros").delete().eq("id", excluir.id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else toast({ title: "Porteiro excluído" });
    setExcluir(null);
    carregar();
  };

  const filtrados = porteiros.filter((p) =>
    [p.nome, p.documento, p.telefone, p.turno].filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase()),
  );

  const nomeUsuario = (userId: string | null) =>
    usuarios.find((u) => u.auth_user_id === userId)?.nome ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Cadastro de Porteiros
          </h1>
          <p className="text-sm text-muted-foreground">
            Porteiros vinculados a um usuário têm o nome preenchido automaticamente nos registros da Portaria.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...vazio })}>
          <Plus className="h-4 w-4 mr-1" /> Novo porteiro
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar porteiro..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum porteiro cadastrado.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[p.turno, p.documento, p.telefone].filter(Boolean).join(" · ") || "Sem dados adicionais"}
                    </div>
                  </div>
                  <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                {p.user_id && (
                  <div className="text-xs flex items-center gap-1 text-primary">
                    <UserCheck className="h-3.5 w-3.5" /> {nomeUsuario(p.user_id) || "Usuário vinculado"}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(p)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setExcluir(p)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar porteiro" : "Novo porteiro"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome *</Label>
                <Input value={editing.nome || ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Documento</Label>
                <Input value={editing.documento || ""} onChange={(e) => setEditing({ ...editing, documento: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={editing.telefone || ""} onChange={(e) => setEditing({ ...editing, telefone: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Turno</Label>
                <Select value={editing.turno || ""} onValueChange={(v) => setEditing({ ...editing, turno: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Usuário do sistema</Label>
                <Select
                  value={editing.user_id || "none"}
                  onValueChange={(v) => setEditing({ ...editing, user_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {usuarios.filter((u) => u.auth_user_id).map((u) => (
                      <SelectItem key={u.id} value={u.auth_user_id as string}>{u.nome} · {u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={editing.observacoes || ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <Label className="mb-0">Porteiro ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
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
