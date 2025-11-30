import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Play, Pause, Trash2, Edit, Zap, Target, DollarSign, 
  TrendingDown, AlertTriangle, Bell, Loader2, Settings, Eye
} from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Tipos de nós disponíveis
const nodeTypes = {
  trigger: {
    label: "Gatilho",
    icon: Zap,
    color: "#f97316",
    options: [
      { value: "roas_baixo", label: "ROAS abaixo de X" },
      { value: "gasto_alto", label: "Gasto acima de X" },
      { value: "cpc_alto", label: "CPC acima de X" },
      { value: "sem_conversoes", label: "Sem conversões em X horas" },
      { value: "ctr_baixo", label: "CTR abaixo de X%" },
    ],
  },
  condition: {
    label: "Condição",
    icon: Target,
    color: "#8b5cf6",
    options: [
      { value: "plataforma", label: "Se plataforma for" },
      { value: "campanha", label: "Se campanha conter" },
      { value: "horario", label: "Se horário for" },
    ],
  },
  action: {
    label: "Ação",
    icon: Play,
    color: "#22c55e",
    options: [
      { value: "pausar_campanha", label: "Pausar campanha" },
      { value: "reduzir_orcamento", label: "Reduzir orçamento em X%" },
      { value: "aumentar_orcamento", label: "Aumentar orçamento em X%" },
      { value: "notificar", label: "Enviar notificação" },
      { value: "webhook", label: "Chamar webhook" },
    ],
  },
};

const CustomNode = ({ data }: { data: any }) => {
  const config = nodeTypes[data.type as keyof typeof nodeTypes];
  const Icon = config?.icon || Zap;
  
  return (
    <div
      className="px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px]"
      style={{ 
        borderColor: config?.color || "#666",
        backgroundColor: `${config?.color}15`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color: config?.color }} />
        <span className="text-xs font-medium text-muted-foreground">{config?.label}</span>
      </div>
      <p className="text-sm font-medium">{data.label}</p>
      {data.value && (
        <p className="text-xs text-muted-foreground mt-1">Valor: {data.value}</p>
      )}
    </div>
  );
};

const nodeTypesConfig = {
  trigger: CustomNode,
  condition: CustomNode,
  action: CustomNode,
};

export default function AdsAutomation() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newAutomation, setNewAutomation] = useState({ nome: "", descricao: "" });
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const { data: automations, isLoading } = useQuery({
    queryKey: ["ads_automacoes", estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from("ads_automacoes")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const createAutomationMutation = useMutation({
    mutationFn: async () => {
      if (!estabelecimentoId) throw new Error("Estabelecimento não encontrado");
      
      const { data, error } = await supabase
        .from("ads_automacoes")
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: newAutomation.nome,
          descricao: newAutomation.descricao,
          flow_data: { nodes: [], edges: [] },
          ativo: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] });
      setShowCreateDialog(false);
      setNewAutomation({ nome: "", descricao: "" });
      setSelectedAutomation(data);
      setIsEditing(true);
      toast.success("Automação criada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar automação: " + error.message);
    },
  });

  const updateAutomationMutation = useMutation({
    mutationFn: async (data: { id: string; flow_data?: any; ativo?: boolean }) => {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (data.flow_data !== undefined) updateData.flow_data = data.flow_data;
      if (data.ativo !== undefined) updateData.ativo = data.ativo;
      
      const { error } = await supabase
        .from("ads_automacoes")
        .update(updateData)
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] });
      toast.success("Automação atualizada");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads_automacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] });
      setSelectedAutomation(null);
      setIsEditing(false);
      toast.success("Automação removida");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const loadAutomation = (automation: any) => {
    setSelectedAutomation(automation);
    const flowData = automation.flow_data || { nodes: [], edges: [] };
    setNodes(flowData.nodes || []);
    setEdges(flowData.edges || []);
    setIsEditing(true);
  };

  const saveFlow = () => {
    if (!selectedAutomation) return;
    
    updateAutomationMutation.mutate({
      id: selectedAutomation.id,
      flow_data: { nodes, edges },
    });
  };

  const addNode = (type: string, option: string, label: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
      data: { type, option, label, value: "" },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="min-h-screen bg-background">
      {!isEditing ? (
        <div className="p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Automações de Anúncios
                </h1>
                <p className="text-muted-foreground mt-1">
                  Crie regras automáticas para gerenciar seus anúncios
                </p>
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Automação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Automação</DialogTitle>
                    <DialogDescription>Crie uma nova regra de automação</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        placeholder="Ex: Pausar campanhas com ROAS baixo"
                        value={newAutomation.nome}
                        onChange={(e) => setNewAutomation(prev => ({ ...prev, nome: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        placeholder="Descreva o que esta automação faz..."
                        value={newAutomation.descricao}
                        onChange={(e) => setNewAutomation(prev => ({ ...prev, descricao: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
                    <Button
                      onClick={() => createAutomationMutation.mutate()}
                      disabled={!newAutomation.nome || createAutomationMutation.isPending}
                    >
                      {createAutomationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Criar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Lista de automações */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {automations?.map(automation => (
                  <Card key={automation.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{automation.nome}</CardTitle>
                        <Switch
                          checked={automation.ativo}
                          onCheckedChange={(checked) => {
                            updateAutomationMutation.mutate({ id: automation.id, ativo: checked });
                          }}
                        />
                      </div>
                      <CardDescription className="text-xs line-clamp-2">
                        {automation.descricao || "Sem descrição"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={automation.ativo ? "default" : "secondary"}>
                          {automation.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {(automation.flow_data as any)?.nodes?.length || 0} blocos
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => loadAutomation(automation)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja remover esta automação?")) {
                              deleteAutomationMutation.mutate(automation.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {automations?.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Nenhuma automação criada</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Crie regras para automatizar a gestão dos seus anúncios
                      </p>
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Automação
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-screen flex flex-col">
          {/* Editor Header */}
          <div className="border-b p-4 flex items-center justify-between bg-background">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => { setIsEditing(false); setSelectedAutomation(null); }}>
                ← Voltar
              </Button>
              <div>
                <h2 className="font-semibold">{selectedAutomation?.nome}</h2>
                <p className="text-xs text-muted-foreground">{selectedAutomation?.descricao}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={saveFlow}>
                Salvar
              </Button>
              <Switch
                checked={selectedAutomation?.ativo}
                onCheckedChange={(checked) => {
                  updateAutomationMutation.mutate({ id: selectedAutomation.id, ativo: checked });
                  setSelectedAutomation((prev: any) => ({ ...prev, ativo: checked }));
                }}
              />
              <span className="text-sm">{selectedAutomation?.ativo ? "Ativo" : "Inativo"}</span>
            </div>
          </div>

          {/* Flow Editor */}
          <div className="flex-1 flex">
            {/* Sidebar com blocos */}
            <div className="w-64 border-r p-4 bg-muted/30">
              <h3 className="font-medium mb-4">Blocos Disponíveis</h3>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-4">
                  {Object.entries(nodeTypes).map(([type, config]) => (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <config.icon className="h-4 w-4" style={{ color: config.color }} />
                        <span className="text-sm font-medium">{config.label}</span>
                      </div>
                      <div className="space-y-1 ml-6">
                        {config.options.map(option => (
                          <Button
                            key={option.value}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-8"
                            onClick={() => addNode(type, option.value, option.label)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Canvas */}
            <div className="flex-1">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypesConfig}
                fitView
              >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
                <Panel position="top-right" className="bg-background/80 p-2 rounded-lg border">
                  <p className="text-xs text-muted-foreground">
                    Arraste para conectar os blocos
                  </p>
                </Panel>
              </ReactFlow>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
