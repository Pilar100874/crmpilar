import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Package, Search, Plus, Truck, CheckCircle2, Clock, 
  PackageCheck, Send, Eye, Settings, Copy, ExternalLink,
  MessageSquare, Mail, ChevronRight, CircleDot
} from "lucide-react";

const DEFAULT_STATUSES = [
  { nome: "recebido", label: "Pedido Recebido", cor: "#3b82f6", icone: "Package", ordem: 0, mensagem_whatsapp: "Olá {nome}! Seu pedido #{numero} foi recebido com sucesso. Acompanhe pelo link: {link}" },
  { nome: "confirmado", label: "Confirmado", cor: "#8b5cf6", icone: "CheckCircle2", ordem: 1, mensagem_whatsapp: "Olá {nome}! Seu pedido #{numero} foi confirmado e está sendo processado." },
  { nome: "em_separacao", label: "Em Separação", cor: "#f59e0b", icone: "PackageCheck", ordem: 2, mensagem_whatsapp: "Olá {nome}! Seu pedido #{numero} está sendo separado no nosso estoque." },
  { nome: "faturado", label: "Faturado", cor: "#10b981", icone: "Clock", ordem: 3, mensagem_whatsapp: "Olá {nome}! Seu pedido #{numero} foi faturado!" },
  { nome: "enviado", label: "Enviado", cor: "#06b6d4", icone: "Truck", ordem: 4, mensagem_whatsapp: "Olá {nome}! Seu pedido #{numero} saiu para entrega! 🚚" },
  { nome: "entregue", label: "Entregue", cor: "#22c55e", icone: "CheckCircle2", ordem: 5, mensagem_whatsapp: "Olá {nome}! Seu pedido #{numero} foi entregue! Obrigado pela preferência! 😊" },
];

const iconMap: Record<string, any> = {
  Package, Truck, CheckCircle2, Clock, PackageCheck, Send, CircleDot
};

export default function PedidoTracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [newStatusForPedido, setNewStatusForPedido] = useState("");
  const [statusObservacao, setStatusObservacao] = useState("");
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // New pedido form
  const [newPedido, setNewPedido] = useState({
    numero_pedido: "",
    nome_cliente: "",
    telefone_cliente: "",
    email_cliente: "",
    notificar_whatsapp: true,
    notificar_email: false,
    observacao: "",
  });

  // Get estabelecimento
  const { data: estabId } = useQuery({
    queryKey: ["estabelecimento-id-tracking"],
    queryFn: async () => {
      const id = await getEstabelecimentoId();
      setEstabelecimentoId(id);
      return id;
    },
  });

  // Status config
  const { data: statusConfig } = useQuery({
    queryKey: ["pedido-status-config", estabId],
    queryFn: async () => {
      if (!estabId) return [];
      const { data, error } = await supabase
        .from("pedido_tracking_status_config")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data;
    },
    enabled: !!estabId,
  });

  // Pedidos
  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos-tracking", estabId, filterStatus],
    queryFn: async () => {
      if (!estabId) return [];
      let query = supabase
        .from("pedido_tracking")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") {
        query = query.eq("status_atual", filterStatus);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!estabId,
  });

  // Historico do pedido selecionado
  const { data: historico } = useQuery({
    queryKey: ["pedido-historico", selectedPedido?.id],
    queryFn: async () => {
      if (!selectedPedido?.id) return [];
      const { data, error } = await supabase
        .from("pedido_tracking_historico")
        .select("*, criado_por_usuario:usuarios!pedido_tracking_historico_criado_por_fkey(nome)")
        .eq("pedido_tracking_id", selectedPedido.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPedido?.id,
  });

  // Init default statuses
  const initStatuses = useMutation({
    mutationFn: async () => {
      if (!estabId) return;
      for (const s of DEFAULT_STATUSES) {
        await supabase.from("pedido_tracking_status_config").insert({
          estabelecimento_id: estabId,
          ...s,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedido-status-config"] });
      toast.success("Status padrão criados!");
    },
  });

  // Create pedido
  const createPedido = useMutation({
    mutationFn: async () => {
      if (!estabId) return;
      const { data, error } = await supabase
        .from("pedido_tracking")
        .insert({
          estabelecimento_id: estabId,
          ...newPedido,
        })
        .select()
        .single();
      if (error) throw error;
      // Create initial historico
      await supabase.from("pedido_tracking_historico").insert({
        pedido_tracking_id: data.id,
        status: "recebido",
        descricao: "Pedido criado no sistema",
      });
      // Send WhatsApp notification
      if (newPedido.notificar_whatsapp && newPedido.telefone_cliente) {
        try {
          await supabase.functions.invoke("notify-pedido-status", {
            body: {
              pedidoId: data.id,
              status: "recebido",
              canal: "whatsapp",
            },
          });
        } catch (e) { console.error("WhatsApp notification failed", e); }
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos-tracking"] });
      setShowNewDialog(false);
      setNewPedido({ numero_pedido: "", nome_cliente: "", telefone_cliente: "", email_cliente: "", notificar_whatsapp: true, notificar_email: false, observacao: "" });
      toast.success("Pedido criado com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async () => {
      if (!selectedPedido || !newStatusForPedido) return;
      // Update current status
      await supabase
        .from("pedido_tracking")
        .update({ status_atual: newStatusForPedido })
        .eq("id", selectedPedido.id);
      // Add history entry
      const statusLabel = statusConfig?.find(s => s.nome === newStatusForPedido)?.label || newStatusForPedido;
      await supabase.from("pedido_tracking_historico").insert({
        pedido_tracking_id: selectedPedido.id,
        status: newStatusForPedido,
        descricao: `Status atualizado para: ${statusLabel}`,
        observacao: statusObservacao || null,
      });
      // Notify
      if (selectedPedido.notificar_whatsapp && selectedPedido.telefone_cliente) {
        try {
          await supabase.functions.invoke("notify-pedido-status", {
            body: {
              pedidoId: selectedPedido.id,
              status: newStatusForPedido,
              canal: "whatsapp",
            },
          });
        } catch (e) { console.error("WhatsApp notification failed", e); }
      }
      if (selectedPedido.notificar_email && selectedPedido.email_cliente) {
        try {
          await supabase.functions.invoke("notify-pedido-status", {
            body: {
              pedidoId: selectedPedido.id,
              status: newStatusForPedido,
              canal: "email",
            },
          });
        } catch (e) { console.error("Email notification failed", e); }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["pedido-historico"] });
      setNewStatusForPedido("");
      setStatusObservacao("");
      toast.success("Status atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getStatusInfo = (nome: string) => {
    return statusConfig?.find(s => s.nome === nome) || { label: nome, cor: "#6b7280", icone: "Package" };
  };

  const getTrackingUrl = (token: string) => {
    return `${window.location.origin}/rastreio/${token}`;
  };

  const copyTrackingLink = (token: string) => {
    navigator.clipboard.writeText(getTrackingUrl(token));
    toast.success("Link copiado!");
  };

  const filteredPedidos = pedidos?.filter(p =>
    p.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.telefone_cliente || "").includes(searchTerm)
  );

  const activeStatuses = statusConfig && statusConfig.length > 0 ? statusConfig : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Rastreamento de Pedidos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e notifique seus clientes sobre o status dos pedidos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Status
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {activeStatuses.map((s) => {
          const count = pedidos?.filter(p => p.status_atual === s.nome).length || 0;
          return (
            <Card
              key={s.nome}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus(filterStatus === s.nome ? "all" : s.nome)}
            >
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: s.cor + "20", color: s.cor }}>
                  {(() => { const Icon = iconMap[s.icone || "Package"] || Package; return <Icon className="h-4 w-4" />; })()}
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Init default statuses if empty */}
      {activeStatuses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum status configurado</h3>
            <p className="text-muted-foreground mb-4">Configure os status de rastreamento dos seus pedidos.</p>
            <Button onClick={() => initStatuses.mutate()}>
              Criar Status Padrão
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {filterStatus !== "all" && (
          <Button variant="outline" onClick={() => setFilterStatus("all")}>
            Limpar Filtro
          </Button>
        )}
      </div>

      {/* Pedidos List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-muted-foreground p-8">Carregando...</p>
          ) : filteredPedidos?.length === 0 ? (
            <p className="text-center text-muted-foreground p-8">Nenhum pedido encontrado</p>
          ) : (
            filteredPedidos?.map((pedido) => {
              const statusInfo = getStatusInfo(pedido.status_atual);
              const isSelected = selectedPedido?.id === pedido.id;
              return (
                <Card
                  key={pedido.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedPedido(pedido)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: statusInfo.cor + "20", color: statusInfo.cor }}>
                          {(() => { const Icon = iconMap[statusInfo.icone || "Package"] || Package; return <Icon className="h-5 w-5" />; })()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">#{pedido.numero_pedido}</span>
                            <Badge variant="outline" style={{ borderColor: statusInfo.cor, color: statusInfo.cor }}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{pedido.nome_cliente}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {pedido.notificar_whatsapp && <MessageSquare className="h-3 w-3 text-green-500" />}
                            {pedido.notificar_email && <Mail className="h-3 w-3 text-blue-500" />}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(pedido.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); copyTrackingLink(pedido.token_rastreamento); }}
                          title="Copiar link de rastreamento"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); window.open(getTrackingUrl(pedido.token_rastreamento), "_blank"); }}
                          title="Abrir página de rastreamento"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Right: Timeline Detail */}
        <div>
          {selectedPedido ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pedido #{selectedPedido.numero_pedido}</span>
                  <Badge variant="outline">{selectedPedido.nome_cliente}</Badge>
                </CardTitle>
                {selectedPedido.telefone_cliente && (
                  <p className="text-sm text-muted-foreground">📱 {selectedPedido.telefone_cliente}</p>
                )}
                {selectedPedido.email_cliente && (
                  <p className="text-sm text-muted-foreground">📧 {selectedPedido.email_cliente}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timeline Visual */}
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold mb-3">Linha do Tempo</h4>
                  <div className="relative">
                    {activeStatuses.map((status, index) => {
                      const historyEntry = historico?.find(h => h.status === status.nome);
                      const isCompleted = !!historyEntry;
                      const isCurrent = selectedPedido.status_atual === status.nome;
                      const Icon = iconMap[status.icone || "Package"] || Package;

                      return (
                        <div key={status.nome} className="flex items-start gap-3 relative">
                          {/* Line connector */}
                          {index < activeStatuses.length - 1 && (
                            <div
                              className="absolute left-[19px] top-[40px] w-0.5 h-[calc(100%-8px)]"
                              style={{ backgroundColor: isCompleted ? status.cor : "#e5e7eb" }}
                            />
                          )}
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              isCurrent ? "ring-4 ring-offset-2 scale-110" : ""
                            }`}
                            style={{
                              backgroundColor: isCompleted || isCurrent ? status.cor : "#f3f4f6",
                              color: isCompleted || isCurrent ? "#fff" : "#9ca3af",
                              ringColor: isCurrent ? status.cor + "40" : undefined,
                            }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="pb-6 flex-1">
                            <p className={`font-medium ${isCompleted || isCurrent ? "" : "text-muted-foreground"}`}>
                              {status.label}
                            </p>
                            {historyEntry && (
                              <>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(historyEntry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                {historyEntry.observacao && (
                                  <p className="text-xs text-muted-foreground/80 mt-1 italic">
                                    {historyEntry.observacao}
                                  </p>
                                )}
                                <div className="flex gap-1 mt-1">
                                  {historyEntry.notificado_whatsapp && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                      <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                                    </Badge>
                                  )}
                                  {historyEntry.notificado_email && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                      <Mail className="h-3 w-3 mr-1" /> E-mail
                                    </Badge>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Update status */}
                {selectedPedido.status_atual !== "entregue" && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <h4 className="text-sm font-semibold">Atualizar Status</h4>
                    <Select value={newStatusForPedido} onValueChange={setNewStatusForPedido}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o próximo status" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeStatuses
                          .filter(s => {
                            const currentOrder = activeStatuses.find(st => st.nome === selectedPedido.status_atual)?.ordem || 0;
                            return s.ordem > currentOrder;
                          })
                          .map(s => (
                            <SelectItem key={s.nome} value={s.nome}>{s.label}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Observação (opcional)..."
                      value={statusObservacao}
                      onChange={(e) => setStatusObservacao(e.target.value)}
                      rows={2}
                    />
                    <Button
                      onClick={() => updateStatus.mutate()}
                      disabled={!newStatusForPedido || updateStatus.isPending}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Atualizar e Notificar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed h-full flex items-center justify-center">
              <CardContent className="text-center p-8">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Selecione um pedido para ver a timeline</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Pedido Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Pedido para Rastreamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Número do Pedido *</Label>
              <Input value={newPedido.numero_pedido} onChange={(e) => setNewPedido(p => ({ ...p, numero_pedido: e.target.value }))} placeholder="Ex: 12345" />
            </div>
            <div>
              <Label>Nome do Cliente *</Label>
              <Input value={newPedido.nome_cliente} onChange={(e) => setNewPedido(p => ({ ...p, nome_cliente: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Telefone (WhatsApp)</Label>
              <Input value={newPedido.telefone_cliente} onChange={(e) => setNewPedido(p => ({ ...p, telefone_cliente: e.target.value }))} placeholder="5511999999999" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={newPedido.email_cliente} onChange={(e) => setNewPedido(p => ({ ...p, email_cliente: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Notificar por WhatsApp</Label>
              <Switch checked={newPedido.notificar_whatsapp} onCheckedChange={(v) => setNewPedido(p => ({ ...p, notificar_whatsapp: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Notificar por E-mail</Label>
              <Switch checked={newPedido.notificar_email} onCheckedChange={(v) => setNewPedido(p => ({ ...p, notificar_email: v }))} />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={newPedido.observacao} onChange={(e) => setNewPedido(p => ({ ...p, observacao: e.target.value }))} rows={2} />
            </div>
            <Button
              onClick={() => createPedido.mutate()}
              disabled={!newPedido.numero_pedido || !newPedido.nome_cliente || createPedido.isPending}
              className="w-full"
            >
              Criar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Status de Rastreamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {activeStatuses.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground mb-4">Nenhum status configurado.</p>
                <Button onClick={() => initStatuses.mutate()}>Criar Status Padrão</Button>
              </div>
            ) : (
              activeStatuses.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: s.cor + "20", color: s.cor }}>
                      {(() => { const Icon = iconMap[s.icone || "Package"] || Package; return <Icon className="h-4 w-4" />; })()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">Ordem: {s.ordem} | ID: {s.nome}</p>
                      {s.mensagem_whatsapp && (
                        <p className="text-xs text-green-600 mt-1">📱 {s.mensagem_whatsapp}</p>
                      )}
                    </div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.cor }} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
