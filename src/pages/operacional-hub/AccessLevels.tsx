import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEstablishment } from "@/hooks/useEstablishment";

// All available menus in the system
const ALL_MENUS = [
  { path: "/", label: "Painel / Minhas Tarefas" },
  { path: "/absences", label: "Ausências" },
  { path: "/irregularities", label: "Irregularidades" },
  { path: "/conditions", label: "Condições Operacionais" },
  { path: "/productivity", label: "Produtividade" },
  { path: "/schedule-simulation", label: "Simulação de Jornada" },
  { path: "/planned-vs-actual", label: "Previsto x Real" },
  { path: "/idle-time", label: "Ociosidade" },
  { path: "/templates", label: "Templates de Tarefa" },
  { path: "/approvals", label: "Aprovações" },
  { path: "/users", label: "Usuários" },
  { path: "/sectors", label: "Setores" },
  { path: "/functions", label: "Funções" },
  { path: "/shifts", label: "Turnos" },
  { path: "/materials", label: "Materiais" },
  { path: "/tools", label: "Ferramentas" },
  { path: "/frequencies", label: "Frequências" },
  { path: "/incidents", label: "Incidentes" },
  { path: "/alerts", label: "Alertas" },
  { path: "/history", label: "Histórico" },
  { path: "/tv", label: "Modo TV" },
  { path: "/tv-tasks", label: "TV Tarefas" },
  { path: "/settings", label: "Configurações" },
  { path: "/access-levels", label: "Níveis de Acesso" },
];

const ROLE_LABELS: Record<string, string> = {
  worker: "Colaborador",
  manager: "Gestor",
  admin: "Administrador",
  super_admin: "Super Admin",
};

interface AccessLevel {
  id: string;
  name: string;
  base_role: string;
  allowed_menus: string[];
  is_system: boolean;
  establishment_id: string | null;
}

export default function AccessLevels() {
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);
  const [name, setName] = useState("");
  const [baseRole, setBaseRole] = useState("worker");
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { establishmentId } = useEstablishment();

  useEffect(() => {
    fetchAccessLevels();
  }, [establishmentId]);

  const fetchAccessLevels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("access_levels")
      .select("*")
      .order("name");

    if (data) setAccessLevels(data as any);
    if (error) console.error(error);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingLevel(null);
    setName("");
    setBaseRole("worker");
    setSelectedMenus(["/"]);
    setDialogOpen(true);
  };

  const openEdit = (level: AccessLevel) => {
    setEditingLevel(level);
    setName(level.name);
    setBaseRole(level.base_role);
    setSelectedMenus(level.allowed_menus || []);
    setDialogOpen(true);
  };

  const toggleMenu = (path: string) => {
    setSelectedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const selectAll = () => setSelectedMenus(ALL_MENUS.map((m) => m.path));
  const deselectAll = () => setSelectedMenus(["/"]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (selectedMenus.length === 0) {
      toast({ title: "Selecione ao menos um menu", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingLevel) {
        const { error } = await supabase
          .from("access_levels")
          .update({
            name: name.trim(),
            base_role: baseRole as any,
            allowed_menus: selectedMenus,
          })
          .eq("id", editingLevel.id);
        if (error) throw error;
        toast({ title: "Nível atualizado!" });
      } else {
        const { error } = await supabase
          .from("access_levels")
          .insert({
            name: name.trim(),
            base_role: baseRole as any,
            allowed_menus: selectedMenus,
            establishment_id: establishmentId,
          });
        if (error) throw error;
        toast({ title: "Nível criado!" });
      }
      setDialogOpen(false);
      fetchAccessLevels();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (level: AccessLevel) => {
    if (level.is_system) {
      toast({ title: "Níveis do sistema não podem ser excluídos", variant: "destructive" });
      return;
    }
    if (!confirm(`Excluir o nível "${level.name}"?`)) return;

    const { error } = await supabase.from("access_levels").delete().eq("id", level.id);
    if (error) {
      toast({ title: "Erro ao excluir. Verifique se há usuários vinculados.", variant: "destructive" });
    } else {
      toast({ title: "Nível excluído!" });
      fetchAccessLevels();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Níveis de Acesso</h1>
            <p className="text-sm text-muted-foreground">
              Defina perfis de acesso e controle quais menus cada nível pode visualizar
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Nível
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accessLevels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg text-foreground">Nenhum nível cadastrado</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Crie níveis de acesso para controlar a visibilidade dos menus
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro nível
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessLevels.map((level) => (
              <Card key={level.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      {level.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(level)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!level.is_system && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(level)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="secondary">{ROLE_LABELS[level.base_role] || level.base_role}</Badge>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {level.allowed_menus?.length || 0} menus habilitados
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(level.allowed_menus || []).slice(0, 6).map((path) => {
                        const menu = ALL_MENUS.find((m) => m.path === path);
                        return (
                          <Badge key={path} variant="outline" className="text-[10px]">
                            {menu?.label || path}
                          </Badge>
                        );
                      })}
                      {(level.allowed_menus?.length || 0) > 6 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{level.allowed_menus.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLevel ? "Editar Nível de Acesso" : "Novo Nível de Acesso"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome do Nível *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Supervisor, Coordenador" />
            </div>

            <div className="space-y-2">
              <Label>Perfil Base (para permissões de dados) *</Label>
              <Select value={baseRole} onValueChange={setBaseRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Colaborador</SelectItem>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define o nível de permissão de dados (leitura/escrita). Os menus controlam apenas a visibilidade.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Menus Permitidos *</Label>
                <div className="flex gap-2">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAll}>
                    Todos
                  </Button>
                  <span className="text-muted-foreground text-xs">|</span>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={deselectAll}>
                    Nenhum
                  </Button>
                </div>
              </div>
              <div className="border border-border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                {ALL_MENUS.map((menu) => (
                  <label key={menu.path} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedMenus.includes(menu.path)}
                      onCheckedChange={() => toggleMenu(menu.path)}
                    />
                    <span className="text-sm">{menu.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{menu.path}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedMenus.length} de {ALL_MENUS.length} menus selecionados
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
