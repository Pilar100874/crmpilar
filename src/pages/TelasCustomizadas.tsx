import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface TelaCustomizada {
  id: string;
  estabelecimento_id: string;
  parent_id: string | null;
  nome: string;
  tipo: "grupo" | "atalho";
  rota: string | null;
  icone: string | null;
  cor: string | null;
  ordem: number;
}

// Rotas mais usadas do sistema - o usuário também pode digitar uma rota livre.
export const ROTAS_SUGERIDAS: { label: string; value: string; grupo: string }[] = [
  // Controle de Veículos
  { label: "Registrar Entrada / Saída de Veículos", value: "/controle-veiculos/movements", grupo: "Controle de Veículos" },
  { label: "Cadastro de Veículos", value: "/controle-veiculos/vehicles", grupo: "Controle de Veículos" },
  { label: "Câmeras dos Veículos", value: "/controle-veiculos/cameras", grupo: "Controle de Veículos" },
  { label: "Defeitos de Veículos", value: "/controle-veiculos/defects", grupo: "Controle de Veículos" },
  { label: "Histórico do Veículo", value: "/controle-veiculos/history", grupo: "Controle de Veículos" },
  { label: "Manutenção de Veículos", value: "/controle-veiculos/maintenance", grupo: "Controle de Veículos" },
  // Câmeras / TV
  { label: "TV Câmeras (Mosaico)", value: "/tv-cameras", grupo: "Câmeras / TV" },
  { label: "Câmeras - Dashboard", value: "/cameras", grupo: "Câmeras / TV" },
  { label: "TV Vendas", value: "/tv-vendas", grupo: "Câmeras / TV" },
  { label: "TV Veículos", value: "/tv-veiculos", grupo: "Câmeras / TV" },
  // Visitantes
  { label: "Controle de Visitantes - Dashboard", value: "/controle-visitantes", grupo: "Visitantes" },
  { label: "Visitantes Presentes", value: "/controle-visitantes/presentes", grupo: "Visitantes" },
  { label: "Cadastro de Visitantes", value: "/controle-visitantes/visitantes", grupo: "Visitantes" },
  { label: "Contatos", value: "/controle-visitantes/contatos", grupo: "Visitantes" },
  // Chats / Vendas
  { label: "Painel de Chats", value: "/atendimento", grupo: "Atendimento & Vendas" },
  { label: "Orçamento", value: "/orcamento", grupo: "Atendimento & Vendas" },
  { label: "Funil de Leads", value: "/clientes", grupo: "Atendimento & Vendas" },
  // Ponto
  { label: "Ponto - Registro", value: "/ponto/registro", grupo: "Ponto" },
  { label: "Ponto - Espelho", value: "/ponto/espelho", grupo: "Ponto" },
];

export default function TelasCustomizadas() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TelaCustomizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentParent, setCurrentParent] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<TelaCustomizada[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TelaCustomizada | null>(null);
  const [form, setForm] = useState({
    nome: "",
    tipo: "grupo" as "grupo" | "atalho",
    rota: "",
    rotaLivre: false,
  });

  const [confirmDel, setConfirmDel] = useState<TelaCustomizada | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;
      const { data, error } = await supabase
        .from("telas_customizadas")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setItems((data || []) as TelaCustomizada[]);
    } catch (e: any) {
      toast.error("Erro ao carregar telas: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleItems = useMemo(
    () => items.filter((i) => (i.parent_id ?? null) === currentParent),
    [items, currentParent]
  );

  const enterGroup = (item: TelaCustomizada) => {
    setBreadcrumb((prev) => [...prev, item]);
    setCurrentParent(item.id);
  };

  const goBack = () => {
    const nb = breadcrumb.slice(0, -1);
    setBreadcrumb(nb);
    setCurrentParent(nb.length ? nb[nb.length - 1].id : null);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: "", tipo: "grupo", rota: "", rotaLivre: false });
    setDialogOpen(true);
  };

  const openEdit = (item: TelaCustomizada) => {
    setEditing(item);
    const isPreset = ROTAS_SUGERIDAS.some((r) => r.value === item.rota);
    setForm({
      nome: item.nome,
      tipo: item.tipo,
      rota: item.rota || "",
      rotaLivre: !isPreset && !!item.rota,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    if (form.tipo === "atalho" && !form.rota.trim()) {
      toast.error("Selecione ou informe uma rota");
      return;
    }
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) throw new Error("Estabelecimento não encontrado");

      const payload = {
        estabelecimento_id: estabId,
        parent_id: currentParent,
        nome: form.nome.trim(),
        tipo: form.tipo,
        rota: form.tipo === "atalho" ? form.rota.trim() : null,
        ordem: visibleItems.length,
      };

      if (editing) {
        const { error } = await supabase
          .from("telas_customizadas")
          .update({
            nome: payload.nome,
            tipo: payload.tipo,
            rota: payload.rota,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { error } = await supabase
          .from("telas_customizadas")
          .insert(payload);
        if (error) throw error;
        toast.success("Criado");
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  const remove = async () => {
    if (!confirmDel) return;
    try {
      const { error } = await supabase
        .from("telas_customizadas")
        .delete()
        .eq("id", confirmDel.id);
      if (error) throw error;
      toast.success("Removido");
      setConfirmDel(null);
      await load();
    } catch (e: any) {
      toast.error("Erro ao remover: " + e.message);
    }
  };

  const rotasAgrupadas = useMemo(() => {
    const map: Record<string, typeof ROTAS_SUGERIDAS> = {};
    ROTAS_SUGERIDAS.forEach((r) => {
      map[r.grupo] = map[r.grupo] || [];
      map[r.grupo].push(r);
    });
    return map;
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Telas Customizadas</h1>
          <p className="text-sm text-muted-foreground">
            Crie telas com botões de atalho para restringir o que cada usuário
            visualiza (ex: porteiro só vê registrar entrada/saída, câmeras e
            visitantes).
          </p>
        </div>
        <div className="flex gap-2">
          {breadcrumb.length > 0 && (
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
        <button
          className="hover:text-foreground"
          onClick={() => {
            setBreadcrumb([]);
            setCurrentParent(null);
          }}
        >
          Início
        </button>
        {breadcrumb.map((b, i) => (
          <div key={b.id} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            <button
              className="hover:text-foreground"
              onClick={() => {
                const nb = breadcrumb.slice(0, i + 1);
                setBreadcrumb(nb);
                setCurrentParent(b.id);
              }}
            >
              {b.nome}
            </button>
          </div>
        ))}
      </div>

      {/* Preview / list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {currentParent
              ? `Dentro de: ${breadcrumb[breadcrumb.length - 1]?.nome}`
              : "Telas de nível principal"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum item aqui. Clique em <b>Novo</b> para criar.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 flex items-center gap-3 bg-card hover:bg-accent/40 transition"
                >
                  <div className="flex-shrink-0">
                    {item.tipo === "grupo" ? (
                      <FolderOpen className="w-6 h-6 text-primary" />
                    ) : (
                      <LinkIcon className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.tipo === "grupo"
                        ? "Grupo (contém outros botões)"
                        : item.rota}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {item.tipo === "grupo" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => enterGroup(item)}
                        title="Abrir grupo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(item)}
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDel(item)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onde encontrar */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
          <p>
            <b>Como usar:</b> cada tela de nível principal fica disponível em{" "}
            <code>/tela-customizada/&lt;id&gt;</code>. Copie o link e envie para
            o usuário, ou use nas configurações de acesso dele.
          </p>
          {breadcrumb.length === 0 && visibleItems.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {visibleItems.map((i) => (
                <Button
                  key={i.id}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/tela-customizada/${i.id}`)}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir "{i.nome}"
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar item" : "Novo item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do botão *</Label>
              <Input
                value={form.nome}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nome: e.target.value }))
                }
                placeholder="Ex: Portaria"
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tipo: v as "grupo" | "atalho" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grupo">
                    Grupo (contém outros botões dentro)
                  </SelectItem>
                  <SelectItem value="atalho">
                    Atalho (abre uma tela do sistema)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipo === "atalho" && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Tela do sistema *</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        setForm((f) => ({ ...f, rotaLivre: !f.rotaLivre, rota: "" }))
                      }
                    >
                      {form.rotaLivre
                        ? "Escolher da lista"
                        : "Digitar rota manual"}
                    </button>
                  </div>
                  {form.rotaLivre ? (
                    <Input
                      value={form.rota}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rota: e.target.value }))
                      }
                      placeholder="/exemplo/da/rota"
                    />
                  ) : (
                    <Select
                      value={form.rota}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, rota: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tela" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {Object.entries(rotasAgrupadas).map(([grupo, rotas]) => (
                          <div key={grupo}>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                              {grupo}
                            </div>
                            {rotas.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá "{confirmDel?.nome}" e todos os botões dentro dele.
              Ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
