import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Settings, CalendarIcon, ShoppingCart, Truck, Image, CreditCard, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { WorkflowCard, WorkflowCardGrid } from "@/components/ui/workflow-card";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface EcommerceRule {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  ativo: boolean;
  prioridade: number;
  flow_data: any;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_TABS = [
  { value: "todas", label: "Todas", icon: Settings },
  { value: "desconto", label: "Descontos", icon: Percent },
  { value: "frete", label: "Frete", icon: Truck },
  { value: "propaganda", label: "Propaganda", icon: Image },
  { value: "pagamento", label: "Pagamento", icon: CreditCard },
];

export default function EcommerceRulesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rules, setRules] = useState<EcommerceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<EcommerceRule | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("todas");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");


  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const estId = await getEstabelecimentoId();
      if (!estId) return;
      const { data, error } = await supabase
        .from("ecommerce_rules")
        .select("*")
        .eq("estabelecimento_id", estId)
        .order("prioridade", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      toast.error("Erro ao carregar regras");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("ecommerce_rules").update({ ativo: !current }).eq("id", id);
    if (!error) { loadRules(); toast.success(`Regra ${!current ? 'ativada' : 'desativada'}`); }
  };

  const handleDuplicate = async (rule: EcommerceRule) => {
    const estId = await getEstabelecimentoId();
    if (!estId) return;
    await supabase.from("ecommerce_rules").insert({
      estabelecimento_id: estId,
      nome: `${rule.nome} (cópia)`,
      descricao: rule.descricao,
      categoria: rule.categoria,
      ativo: false,
      prioridade: rule.prioridade,
      flow_data: rule.flow_data,
    });
    loadRules();
    toast.success("Regra duplicada!");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("ecommerce_rules").delete().eq("id", deleteId);
    setDeleteId(null);
    loadRules();
    toast.success("Regra excluída!");
  };

  const handleRename = async () => {
    if (!selectedRule) return;
    setIsRenaming(true);
    await supabase.from("ecommerce_rules").update({ nome: renameName.trim(), descricao: renameDescription.trim() || null }).eq("id", selectedRule.id);
    setRenameDialogOpen(false);
    setSelectedRule(null);
    loadRules();
    setIsRenaming(false);
    toast.success("Regra renomeada!");
  };

  const handleUpdateStartDate = async (id: string, date: Date | null) => {
    await supabase.from("ecommerce_rules").update({ starts_at: date?.toISOString() || null }).eq("id", id);
    loadRules();
  };

  const handleUpdateExpiration = async (id: string, date: Date | null) => {
    await supabase.from("ecommerce_rules").update({ expires_at: date?.toISOString() || null }).eq("id", id);
    loadRules();
  };

  const filteredRules = activeTab === "todas" ? rules : rules.filter(r => r.categoria === activeTab);

  const getCategoryBadge = (cat: string) => {
    const map: Record<string, { label: string; className: string }> = {
      desconto: { label: "Desconto", className: "bg-emerald-100 text-emerald-700" },
      frete: { label: "Frete", className: "bg-cyan-100 text-cyan-700" },
      propaganda: { label: "Propaganda", className: "bg-amber-100 text-amber-700" },
      pagamento: { label: "Pagamento", className: "bg-red-100 text-red-700" },
    };
    const info = map[cat] || { label: cat, className: "bg-muted text-muted-foreground" };
    return <Badge variant="secondary" className={info.className}>{info.label}</Badge>;
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            Regras do E-commerce
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie descontos, promoções, frete, banners e regras de pagamento
          </p>
        </div>
        <Button onClick={() => { setCreateName(""); setCreateDialogOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>

      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4 border-b">
          <TabsList className="h-auto flex-wrap">
            {CATEGORY_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {tab.value === "todas" ? rules.length : rules.filter(r => r.categoria === tab.value).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredRules.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto opacity-30 mb-3" />
              <p className="text-lg font-medium">Nenhuma regra encontrada</p>
              <p className="text-sm mt-1">Clique em "Nova Regra" para começar</p>
            </div>
          ) : (
            <WorkflowCardGrid className="p-6">
              {filteredRules.map((rule) => {
                const flowData = rule.flow_data as any;
                const numBlocos = flowData?.nodes?.length || 0;
                return (
                  <WorkflowCard
                    key={rule.id}
                    id={rule.id}
                    title={rule.nome}
                    description={rule.descricao}
                    isActive={rule.ativo}
                    blocksCount={numBlocos}
                    priority={rule.prioridade}
                    createdAt={rule.created_at}
                    expiresAt={rule.expires_at}
                    menuOpen={openMenuId === rule.id}
                    onMenuOpenChange={(open) => setOpenMenuId(open ? rule.id : null)}
                    onEdit={() => { setOpenMenuId(null); navigate(`/ecommerce-rules-editor?id=${rule.id}`, { state: { from: location.pathname } }); }}
                    onRename={() => { setOpenMenuId(null); setSelectedRule(rule); setRenameName(rule.nome); setRenameDescription(rule.descricao || ""); setRenameDialogOpen(true); }}
                    onDuplicate={() => { setOpenMenuId(null); handleDuplicate(rule); }}
                    onToggleActive={() => { setOpenMenuId(null); handleToggleActive(rule.id, rule.ativo); }}
                    onDelete={() => { setOpenMenuId(null); setDeleteId(rule.id); }}
                    onOpenEditor={() => navigate(`/ecommerce-rules-editor?id=${rule.id}`, { state: { from: location.pathname } })}
                    customContent={
                      <div className="space-y-2">
                        {getCategoryBadge(rule.categoria)}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground">Início:</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1 text-xs px-2", !rule.starts_at && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-1 h-3 w-3 shrink-0" />
                                  {rule.starts_at ? format(new Date(rule.starts_at), "dd/MM/yy") : "Imediato"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 z-50" align="start">
                                <Calendar
                                  mode="single"
                                  selected={rule.starts_at ? new Date(rule.starts_at) : undefined}
                                  onSelect={(date) => handleUpdateStartDate(rule.id, date || null)}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                                {rule.starts_at && (
                                  <div className="p-3 border-t">
                                    <Button variant="ghost" size="sm" onClick={() => handleUpdateStartDate(rule.id, null)} className="w-full text-xs">
                                      Remover data início
                                    </Button>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Fim:</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1 text-xs px-2", !rule.expires_at && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-1 h-3 w-3 shrink-0" />
                                  {rule.expires_at ? format(new Date(rule.expires_at), "dd/MM/yy") : "Sem fim"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 z-50" align="start">
                                <Calendar
                                  mode="single"
                                  selected={rule.expires_at ? new Date(rule.expires_at) : undefined}
                                  onSelect={(date) => handleUpdateExpiration(rule.id, date || null)}
                                  initialFocus
                                  disabled={(date) => date < new Date()}
                                  className={cn("p-3 pointer-events-auto")}
                                />
                                {rule.expires_at && (
                                  <div className="p-3 border-t">
                                    <Button variant="ghost" size="sm" onClick={() => handleUpdateExpiration(rule.id, null)} className="w-full text-xs">
                                      Remover vencimento
                                    </Button>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </WorkflowCardGrid>
          )}
        </div>
      </Tabs>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Regra"
        description="Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita."
      />

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Regra</DialogTitle>
            <DialogDescription>Altere o nome e descrição da regra.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={renameName} onChange={e => setRenameName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={renameDescription} onChange={e => setRenameDescription(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={isRenaming}>Cancelar</Button>
            <Button onClick={handleRename} disabled={isRenaming || !renameName.trim()}>{isRenaming ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkflowCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Nova Regra"
        description="Dê um nome e uma descrição para sua nova regra antes de começar."
        nameLabel="Nome da regra"
        namePlaceholder="Ex: Desconto Black Friday"
        descriptionPlaceholder="Descreva o objetivo desta regra (opcional)"
        onConfirm={({ name, description }) => {
          setCreateDialogOpen(false);
          navigate("/ecommerce-rules-editor", {
            state: { from: location.pathname, initialName: name, initialDescription: description },
          });
        }}
      />

    </div>
  );
}

