import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Kit, Tool, KitTool, Loan } from "@/lib/supabase";
import { BoxesIcon, Plus, Edit, Trash2, Wrench, Ban, CheckCircle, RotateCcw, Search, AlertTriangle } from "lucide-react";

export default function KitsPage() {
  const { isAdmin, isAlmoxarifado } = useAuth();
  const { toast } = useToast();
  const [kits, setKits] = useState<Kit[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [kitTools, setKitTools] = useState<KitTool[]>([]);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [toolIssues, setToolIssues] = useState<Record<string, { type: string; description?: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [toolSearchTerm, setToolSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [kitToDelete, setKitToDelete] = useState<Kit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedTools: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kitsRes, toolsRes, kitToolsRes, loansRes, issuesRes] = await Promise.all([
        supabase.from("kits").select("*").order("name"),
        supabase.from("tools").select("*").order("name"),
        supabase.from("kit_tools").select("*"),
        supabase.from("loans").select("*").eq("status", "ativo"),
        supabase.from("return_issues").select("tool_id, issue_type, description").eq("status", "pendente"),
      ]);

      setKits((kitsRes.data as Kit[]) || []);
      setTools((toolsRes.data as Tool[]) || []);
      setKitTools((kitToolsRes.data as KitTool[]) || []);
      setActiveLoans((loansRes.data as Loan[]) || []);
      
      // Mapear ferramentas com ocorrências
      const issuesMap: Record<string, { type: string; description?: string }> = {};
      (issuesRes.data || []).forEach((issue: any) => {
        issuesMap[issue.tool_id] = { 
          type: issue.issue_type, 
          description: issue.description 
        };
      });
      setToolIssues(issuesMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a kit is currently loaned (any of its tools)
  const isKitLoaned = (kitId: string) => {
    const toolIds = kitTools.filter((kt) => kt.kit_id === kitId).map((kt) => kt.tool_id);
    return activeLoans.some((loan) => toolIds.includes(loan.tool_id));
  };

  // Check if a kit has any tool with pending issue (manutencao/danificada/perdida)
  const getKitIssues = (kitId: string) => {
    const toolIds = kitTools.filter((kt) => kt.kit_id === kitId).map((kt) => kt.tool_id);
    const issues: { toolName: string; type: string }[] = [];
    toolIds.forEach((toolId) => {
      if (toolIssues[toolId]) {
        const tool = tools.find((t) => t.id === toolId);
        issues.push({
          toolName: tool?.name || "Ferramenta",
          type: toolIssues[toolId].type,
        });
      }
    });
    return issues;
  };

  const issueTypeLabels: Record<string, string> = {
    manutencao: "em manutenção",
    danificada: "danificada",
    perdida: "perdida",
  };

  const handleOpenDialog = (kit?: Kit) => {
    setToolSearchTerm(""); // Reset tool search
    if (kit) {
      setEditingKit(kit);
      const kitToolIds = kitTools.filter((kt) => kt.kit_id === kit.id).map((kt) => kt.tool_id);
      setFormData({
        name: kit.name,
        description: kit.description || "",
        selectedTools: kitToolIds,
      });
    } else {
      setEditingKit(null);
      setFormData({ name: "", description: "", selectedTools: [] });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }

    try {
      let kitId: string;

      if (editingKit) {
        const { error } = await supabase
          .from("kits")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("id", editingKit.id);
        if (error) throw error;
        kitId = editingKit.id;

        // Remove existing kit_tools
        await supabase.from("kit_tools").delete().eq("kit_id", kitId);
      } else {
        const { data, error } = await supabase
          .from("kits")
          .insert({
            name: formData.name,
            description: formData.description || null,
          })
          .select()
          .single();
        if (error) throw error;
        kitId = data.id;
      }

      // Add selected tools to kit
      if (formData.selectedTools.length > 0) {
        const kitToolsData = formData.selectedTools.map((toolId) => ({
          kit_id: kitId,
          tool_id: toolId,
        }));
        const { error } = await supabase.from("kit_tools").insert(kitToolsData);
        if (error) throw error;
      }

      toast({ title: editingKit ? "Kit atualizado!" : "Kit cadastrado!" });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleDeleteClick = async (kit: Kit) => {
    // Check if any tool in the kit is currently loaned
    if (isKitLoaned(kit.id)) {
      toast({
        variant: "destructive",
        title: "Não é possível excluir",
        description: "Este kit possui ferramentas emprestadas. Aguarde a devolução.",
      });
      return;
    }

    setKitToDelete(kit);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!kitToDelete) return;

    setIsDeleting(true);
    try {
      // Delete kit_tools first to free up the tools
      await supabase.from("kit_tools").delete().eq("kit_id", kitToDelete.id);
      // Then delete the kit
      const { error } = await supabase
        .from("kits")
        .delete()
        .eq("id", kitToDelete.id);
      if (error) throw error;
      toast({ title: "Kit excluído! As ferramentas foram liberadas." });
      setDeleteDialogOpen(false);
      setKitToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactivateKit = async (kit: Kit) => {
    try {
      const { error } = await supabase
        .from("kits")
        .update({ is_active: true })
        .eq("id", kit.id);
      if (error) throw error;
      toast({ title: "Kit reativado com sucesso!" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const toggleTool = (toolId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTools: prev.selectedTools.includes(toolId)
        ? prev.selectedTools.filter((id) => id !== toolId)
        : [...prev.selectedTools, toolId],
    }));
  };

  const getKitTools = (kitId: string) => {
    const toolIds = kitTools.filter((kt) => kt.kit_id === kitId).map((kt) => kt.tool_id);
    return tools.filter((t) => toolIds.includes(t.id));
  };

  const canManage = isAdmin || isAlmoxarifado;

  // Filtrar kits
  const activeKits = kits.filter((k) => (k as any).is_active !== false);
  const inactiveKits = kits.filter((k) => (k as any).is_active === false);
  const filteredKits = (showInactive ? inactiveKits : activeKits).filter((kit) =>
    kit.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalInactive = inactiveKits.length;

  if (!canManage) {
    return (
      <MainLayout>
        <EmptyState
          icon={BoxesIcon}
          title="Acesso Restrito"
          description="Apenas administradores e almoxarifados podem gerenciar kits"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Kits de Ferramentas"
        description="Gerencie conjuntos de ferramentas que são emprestados juntos"
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Kit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingKit ? "Editar Kit" : "Novo Kit"}</DialogTitle>
                <DialogDescription>
                  Configure o kit e selecione as ferramentas
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Kit *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Kit de Solda"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do kit..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ferramentas do Kit</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar ferramenta..."
                      value={toolSearchTerm}
                      onChange={(e) => setToolSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {(() => {
                      // Filtrar ferramentas disponíveis para kits:
                      // 1. Não pode ter requires_kit = true (marcadas como "Não faz parte de kit")
                      // 2. Não pode já estar em outro kit (exceto o kit sendo editado)
                      // 3. Deve estar ativa
                      const toolsInOtherKits = kitTools
                        .filter((kt) => editingKit ? kt.kit_id !== editingKit.id : true)
                        .map((kt) => kt.tool_id);
                      
                      const availableTools = tools.filter((tool) => {
                        // Excluir ferramentas inativas
                        if ((tool as any).is_active === false) return false;
                        // Excluir ferramentas marcadas como "Não faz parte de kit"
                        if (tool.requires_kit) return false;
                        // Excluir ferramentas já em outro kit
                        if (toolsInOtherKits.includes(tool.id)) return false;
                        // Incluir ferramentas que já estão no kit sendo editado
                        if (editingKit && formData.selectedTools.includes(tool.id)) return true;
                        return true;
                      });

                      // Aplicar filtro de busca por nome
                      const filteredTools = availableTools.filter((tool) =>
                        tool.name.toLowerCase().includes(toolSearchTerm.toLowerCase())
                      );

                      if (availableTools.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma ferramenta disponível para adicionar ao kit
                          </p>
                        );
                      }

                      if (filteredTools.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma ferramenta encontrada com "{toolSearchTerm}"
                          </p>
                        );
                      }

                      return filteredTools.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                        >
                          <Checkbox
                            id={`tool-${tool.id}`}
                            checked={formData.selectedTools.includes(tool.id)}
                            onCheckedChange={() => toggleTool(tool.id)}
                          />
                          <Label
                            htmlFor={`tool-${tool.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {tool.name}
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {tool.type}
                          </Badge>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingKit ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar kits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && totalInactive > 0 && (
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className="gap-2"
          >
            <Ban className="h-4 w-4" />
            {showInactive ? "Ver ativos" : `Desativados (${totalInactive})`}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredKits.length === 0 ? (
        <EmptyState
          icon={BoxesIcon}
          title={showInactive ? "Nenhum kit desativado" : "Nenhum kit encontrado"}
          description={showInactive ? "Não há kits desativados no momento" : "Crie kits para agrupar ferramentas que devem ser emprestadas juntas"}
          action={
            !showInactive && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Kit
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredKits.map((kit) => {
              const kitToolsList = getKitTools(kit.id);
              const isInactive = (kit as any).is_active === false;
              const loaned = isKitLoaned(kit.id);
              const kitIssues = getKitIssues(kit.id);
              const hasIssues = kitIssues.length > 0;
              return (
                <div
                  key={kit.id}
                  className={`rounded-lg border p-4 ${
                    isInactive
                      ? "border-muted bg-muted/30 opacity-75"
                      : hasIssues
                      ? "border-orange-500/50 bg-orange-500/10"
                      : loaned
                      ? "border-amber-500/50 bg-amber-500/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{kit.name}</p>
                        {isInactive && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Ban className="h-3 w-3" />
                            Desativado
                          </Badge>
                        )}
                        {hasIssues && (
                          <Badge variant="outline" className="gap-1 text-xs border-orange-500 text-orange-600 bg-orange-500/10">
                            <AlertTriangle className="h-3 w-3" />
                            Indisponível
                          </Badge>
                        )}
                      </div>
                      {hasIssues && (
                        <div className="mt-2 p-2 rounded-md bg-orange-500/10 border border-orange-500/20">
                          <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Itens com ocorrência:
                          </p>
                          <ul className="mt-1 text-xs text-orange-600">
                            {kitIssues.map((issue, idx) => (
                              <li key={idx}>• {issue.toolName} ({issueTypeLabels[issue.type] || issue.type})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {kit.description && !hasIssues && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {kit.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {kitToolsList.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Nenhuma ferramenta</span>
                        ) : (
                          <>
                            {kitToolsList.slice(0, 2).map((tool) => (
                              <Badge key={tool.id} variant="secondary" className="gap-1 text-xs">
                                <Wrench className="h-3 w-3" />
                                {tool.name}
                              </Badge>
                            ))}
                            {kitToolsList.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{kitToolsList.length - 2}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isInactive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivateKit(kit)}
                          className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reativar
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(kit)}
                            disabled={loaned}
                            title={loaned ? "Kit emprestado" : "Editar"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(kit)}
                              disabled={loaned}
                              title={loaned ? "Kit emprestado - não é possível excluir" : "Excluir"}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ferramentas</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKits.map((kit) => {
                  const kitToolsList = getKitTools(kit.id);
                  const isInactive = (kit as any).is_active === false;
                  const loaned = isKitLoaned(kit.id);
                  const kitIssues = getKitIssues(kit.id);
                  const hasIssues = kitIssues.length > 0;
                  return (
                    <TableRow
                      key={kit.id}
                      className={
                        isInactive
                          ? "bg-muted/30 opacity-75"
                          : hasIssues
                          ? "bg-orange-500/10"
                          : loaned
                          ? "bg-amber-500/10"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {kit.name}
                          {isInactive && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Ban className="h-3 w-3" />
                              Desativado
                            </Badge>
                          )}
                          {hasIssues && (
                            <Badge variant="outline" className="gap-1 text-xs border-orange-500 text-orange-600 bg-orange-500/10">
                              <AlertTriangle className="h-3 w-3" />
                              Indisponível
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {kitToolsList.length === 0 ? (
                            <span className="text-muted-foreground">Nenhuma</span>
                          ) : (
                            kitToolsList.slice(0, 3).map((tool) => (
                              <Badge key={tool.id} variant="secondary" className="gap-1">
                                <Wrench className="h-3 w-3" />
                                {tool.name}
                              </Badge>
                            ))
                          )}
                          {kitToolsList.length > 3 && (
                            <Badge variant="outline">+{kitToolsList.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {hasIssues ? (
                          <div className="text-xs text-orange-600">
                            <p className="font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Itens com ocorrência:
                            </p>
                            <ul className="mt-1">
                              {kitIssues.map((issue, idx) => (
                                <li key={idx}>• {issue.toolName} ({issueTypeLabels[issue.type] || issue.type})</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <span className="truncate">{kit.description || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {isInactive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivateKit(kit)}
                              className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reativar
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(kit)}
                                disabled={loaned}
                                title={loaned ? "Kit emprestado" : "Editar"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(kit)}
                                  disabled={loaned}
                                  title={loaned ? "Kit emprestado - não é possível excluir" : "Excluir"}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir kit?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente o kit{" "}
              <strong>{kitToDelete?.name}</strong>.
              <br />
              <br />
              As ferramentas deste kit serão liberadas e poderão ser utilizadas em outro kit.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
