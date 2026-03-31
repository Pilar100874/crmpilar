import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  ShoppingCart, Search, Package, Store, Calendar, DollarSign,
  Eye, Loader2, Filter, X, LayoutGrid, List, Printer, Tag,
  ChevronRight, Truck, Settings, Globe, FileText, ShoppingBag,
  GripVertical, CheckCircle2, Clock, PackageCheck, Send, MapPin
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PedidoEtiquetaDialog } from "@/components/pedidos/PedidoEtiquetaDialog";
import { EtiquetaConfigDialog } from "@/components/pedidos/EtiquetaConfigDialog";

const statusFulfillment: Record<string, { label: string; icon: any; color: string }> = {
  aguardando: { label: "Aguardando", icon: Clock, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  separando: { label: "Separando", icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  embalando: { label: "Embalando", icon: PackageCheck, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  pronto: { label: "Pronto p/ Despacho", icon: CheckCircle2, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  despachado: { label: "Despachado", icon: Send, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const origemConfig: Record<string, { label: string; icon: any; color: string }> = {
  ecommerce: { label: "E-commerce", icon: ShoppingBag, color: "text-blue-400" },
  orcamento: { label: "Orçamento", icon: FileText, color: "text-green-400" },
  marketplace: { label: "Marketplace", icon: Store, color: "text-orange-400" },
  manual: { label: "Manual", icon: Globe, color: "text-gray-400" },
};

const periodPresets = [
  { label: "Hoje", getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "7 dias", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "30 dias", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Este mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
];

const fulfillmentOrder = ["aguardando", "separando", "embalando", "pronto", "despachado"];

export default function PedidosRecebidos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrigem, setFilterOrigem] = useState<string>("all");
  const [filterFulfillment, setFilterFulfillment] = useState<string>("all");
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [selectedPreset, setSelectedPreset] = useState("");
  const [showEtiqueta, setShowEtiqueta] = useState(false);
  const [showEtiquetaConfig, setShowEtiquetaConfig] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<string[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem("estabelecimentoId");
    if (cached) {
      setEstabelecimentoId(cached);
    } else {
      supabase.from("estabelecimentos").select("id").limit(1).single().then(({ data }) => {
        if (data?.id) {
          setEstabelecimentoId(data.id);
          localStorage.setItem("estabelecimentoId", data.id);
        }
      });
    }
  }, []);

  // Sync pedidos from all sources
  const { refetch: syncPedidos } = useQuery({
    queryKey: ["sync_pedidos_recebidos", estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return null;

      // Get existing origem_ids to avoid duplicates
      const { data: existing } = await supabase
        .from("pedidos_recebidos")
        .select("origem, origem_id")
        .eq("estabelecimento_id", estabelecimentoId);

      const existingKeys = new Set((existing || []).map(e => `${e.origem}:${e.origem_id}`));

      // 1. Sync ecommerce
      const { data: ecomPedidos } = await supabase
        .from("pedidos_ecommerce")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId);

      const ecomToInsert = (ecomPedidos || [])
        .filter(p => !existingKeys.has(`ecommerce:${p.id}`))
        .map(p => ({
          estabelecimento_id: estabelecimentoId,
          origem: "ecommerce",
          origem_id: p.id,
          numero_pedido: p.numero_pedido,
          nome_cliente: p.nome_cliente,
          telefone_cliente: p.telefone_cliente,
          email_cliente: p.email_cliente,
          documento_cliente: p.cpf_cliente || p.cnpj_cliente,
          valor_total: p.valor_total,
          valor_frete: p.frete,
          valor_desconto: p.desconto,
          forma_pagamento: p.tipo_pagamento_nome,
          endereco_rua: p.endereco_rua,
          endereco_numero: p.endereco_numero,
          endereco_complemento: p.endereco_complemento,
          endereco_bairro: p.endereco_bairro,
          endereco_cidade: p.endereco_cidade,
          endereco_estado: p.endereco_estado,
          endereco_cep: p.endereco_cep,
          observacoes: p.observacoes,
          data_pedido: p.created_at,
          status: p.status === "pendente" ? "novo" : p.status,
        }));

      // 2. Sync orçamentos finalizados
      const { data: orcamentos } = await supabase
        .from("orcamentos")
        .select("*, cliente:customers(nome, telefone, email)")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("status", "finalizado");

      const orcToInsert = (orcamentos || [])
        .filter(o => !existingKeys.has(`orcamento:${o.id}`))
        .map(o => ({
          estabelecimento_id: estabelecimentoId,
          origem: "orcamento",
          origem_id: o.id,
          numero_pedido: `ORC-${o.id.slice(0, 8)}`,
          nome_cliente: (o.cliente as any)?.nome || "Cliente",
          telefone_cliente: (o.cliente as any)?.telefone,
          email_cliente: (o.cliente as any)?.email,
          valor_total: o.valor_total || 0,
          valor_desconto: o.valor_desconto || 0,
          data_pedido: o.updated_at || o.created_at,
          status: "confirmado",
        }));

      // 3. Sync marketplace
      const { data: mkpPedidos } = await supabase
        .from("pedidos_marketplace")
        .select("*, marketplace:marketplaces(nome_display)")
        .eq("estabelecimento_id", estabelecimentoId);

      const mkpToInsert = (mkpPedidos || [])
        .filter(p => !existingKeys.has(`marketplace:${p.id}`))
        .map(p => {
          const endereco = p.endereco_entrega as any;
          return {
            estabelecimento_id: estabelecimentoId,
            origem: "marketplace",
            origem_id: p.id,
            origem_detalhes: (p.marketplace as any)?.nome_display,
            numero_pedido: p.id_pedido_marketplace,
            nome_cliente: p.nome_cliente || "Cliente",
            valor_total: p.valor_total || 0,
            endereco_rua: endereco?.rua || endereco?.logradouro,
            endereco_cidade: endereco?.cidade,
            endereco_estado: endereco?.estado || endereco?.uf,
            endereco_cep: endereco?.cep,
            data_pedido: p.data_pedido,
            status: p.status || "novo",
          };
        });

      const allToInsert = [...ecomToInsert, ...orcToInsert, ...mkpToInsert];
      if (allToInsert.length > 0) {
        await supabase.from("pedidos_recebidos").insert(allToInsert);
      }

      return allToInsert.length;
    },
    enabled: !!estabelecimentoId,
    staleTime: 30000,
  });

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos_recebidos", estabelecimentoId, filterOrigem, filterFulfillment, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      let query = supabase
        .from("pedidos_recebidos")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("data_pedido", { ascending: false });

      if (filterOrigem !== "all") query = query.eq("origem", filterOrigem);
      if (filterFulfillment !== "all") query = query.eq("status_fulfillment", filterFulfillment);
      if (dateRange.from) query = query.gte("data_pedido", dateRange.from.toISOString());
      if (dateRange.to) query = query.lte("data_pedido", dateRange.to.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const updateFulfillment = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status_fulfillment: status };
      if (status === "separando") updateData.data_separacao = new Date().toISOString();
      if (status === "embalando") updateData.data_embalagem = new Date().toISOString();
      if (status === "despachado") updateData.data_despacho = new Date().toISOString();

      const { error } = await supabase.from("pedidos_recebidos").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos_recebidos"] });
      toast.success("Status atualizado!");
    },
  });

  const filteredPedidos = useMemo(() => {
    if (!pedidos) return [];
    if (!searchTerm) return pedidos;
    const term = searchTerm.toLowerCase();
    return pedidos.filter(
      p =>
        p.numero_pedido?.toLowerCase().includes(term) ||
        p.nome_cliente?.toLowerCase().includes(term) ||
        p.email_cliente?.toLowerCase().includes(term)
    );
  }, [pedidos, searchTerm]);

  const kanbanColumns = useMemo(() => {
    return fulfillmentOrder.map(status => ({
      status,
      ...statusFulfillment[status],
      pedidos: filteredPedidos.filter(p => p.status_fulfillment === status),
    }));
  }, [filteredPedidos]);

  const totalPedidos = pedidos?.length || 0;
  const totalValor = pedidos?.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0) || 0;
  const aguardando = pedidos?.filter(p => p.status_fulfillment === "aguardando").length || 0;
  const prontos = pedidos?.filter(p => p.status_fulfillment === "pronto").length || 0;

  const toggleSelectForPrint = (id: string) => {
    setSelectedForPrint(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getNextStatus = (current: string) => {
    const idx = fulfillmentOrder.indexOf(current);
    return idx < fulfillmentOrder.length - 1 ? fulfillmentOrder[idx + 1] : null;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Pedidos Recebidos por todos canais de venda
            </h1>
            <p className="text-muted-foreground mt-1">
              Todos os pedidos unificados — e-commerce, orçamentos e marketplaces
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEtiquetaConfig(true)}>
              <Settings className="h-4 w-4 mr-2" /> Config. Etiquetas
            </Button>
            {selectedForPrint.length > 0 && (
              <Button size="sm" onClick={() => setShowEtiqueta(true)}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir ({selectedForPrint.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/logistica")}
            >
              <Truck className="h-4 w-4 mr-2" /> Logística
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{totalPedidos}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-xs text-muted-foreground">Aguardando</p>
                <p className="text-xl font-bold">{aguardando}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-xs text-muted-foreground">Prontos</p>
                <p className="text-xl font-bold">{prontos}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters + View Toggle */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              {periodPresets.map(p => (
                <Button key={p.label} variant={selectedPreset === p.label ? "default" : "outline"} size="sm"
                  onClick={() => { setDateRange(p.getValue()); setSelectedPreset(p.label); }}>
                  {p.label}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-1" /> Personalizado</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="range" selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={r => { setDateRange({ from: r?.from, to: r?.to }); setSelectedPreset(""); }} locale={ptBR} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
              {(dateRange.from || dateRange.to) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateRange({ from: undefined, to: undefined }); setSelectedPreset(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Separator />
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar pedido, cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  {Object.entries(origemConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterFulfillment} onValueChange={setFilterFulfillment}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(statusFulfillment).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
                  <List className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("kanban")}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : viewMode === "list" ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedForPrint.length === filteredPedidos.length && filteredPedidos.length > 0}
                        onCheckedChange={c => setSelectedForPrint(c ? filteredPedidos.map(p => p.id) : [])}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map(pedido => {
                    const orig = origemConfig[pedido.origem] || origemConfig.manual;
                    const OrigIcon = orig.icon;
                    const ful = statusFulfillment[pedido.status_fulfillment] || statusFulfillment.aguardando;
                    const nextStatus = getNextStatus(pedido.status_fulfillment);

                    return (
                      <TableRow key={pedido.id}>
                        <TableCell>
                          <Checkbox checked={selectedForPrint.includes(pedido.id)}
                            onCheckedChange={() => toggleSelectForPrint(pedido.id)} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(pedido.data_pedido), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <OrigIcon className={`h-4 w-4 ${orig.color}`} />
                            <span className="text-xs">{orig.label}</span>
                            {pedido.origem_detalhes && <span className="text-[10px] text-muted-foreground">({pedido.origem_detalhes})</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{pedido.numero_pedido}</TableCell>
                        <TableCell className="text-sm">{pedido.nome_cliente}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          R$ {Number(pedido.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${ful.color}`}>{ful.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedPedido(pedido)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {nextStatus && (
                              <Button size="sm" variant="ghost"
                                onClick={() => updateFulfillment.mutate({ id: pedido.id, status: nextStatus })}
                                title={`Avançar para ${statusFulfillment[nextStatus].label}`}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedForPrint([pedido.id]); setShowEtiqueta(true); }}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPedidos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Nenhum pedido encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          /* Kanban View */
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {kanbanColumns.map(col => {
              const Icon = col.icon;
              return (
                <div key={col.status} className="space-y-3">
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${col.color}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{col.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{col.pedidos.length}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {col.pedidos.map(pedido => {
                      const orig = origemConfig[pedido.origem] || origemConfig.manual;
                      const OrigIcon = orig.icon;
                      const nextStatus = getNextStatus(pedido.status_fulfillment);

                      return (
                        <Card key={pedido.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs">{pedido.numero_pedido}</span>
                              <OrigIcon className={`h-3.5 w-3.5 ${orig.color}`} />
                            </div>
                            <p className="text-sm font-medium truncate">{pedido.nome_cliente}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                R$ {Number(pedido.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(pedido.data_pedido), "dd/MM")}
                              </span>
                            </div>
                            {pedido.endereco_cidade && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {pedido.endereco_cidade}/{pedido.endereco_estado}
                              </div>
                            )}
                            <div className="flex gap-1 pt-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedPedido(pedido)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                onClick={() => { setSelectedForPrint([pedido.id]); setShowEtiqueta(true); }}>
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              {nextStatus && (
                                <Button size="sm" variant="outline" className="h-7 text-xs ml-auto px-2"
                                  onClick={() => updateFulfillment.mutate({ id: pedido.id, status: nextStatus })}>
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  {statusFulfillment[nextStatus].label.split(" ")[0]}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail Sheet */}
        <Sheet open={!!selectedPedido} onOpenChange={o => !o && setSelectedPedido(null)}>
          <SheetContent className="w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pedido {selectedPedido?.numero_pedido}
              </SheetTitle>
            </SheetHeader>
            {selectedPedido && (
              <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                <div className="space-y-6 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Origem</Label>
                      <p className="text-sm font-medium">{origemConfig[selectedPedido.origem]?.label} {selectedPedido.origem_detalhes && `(${selectedPedido.origem_detalhes})`}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Data</Label>
                      <p className="text-sm">{format(new Date(selectedPedido.data_pedido), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Cliente</Label>
                      <p className="text-sm font-medium">{selectedPedido.nome_cliente}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor Total</Label>
                      <p className="text-sm font-bold">R$ {Number(selectedPedido.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Fulfillment Status */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Status Fulfillment</Label>
                    <div className="flex gap-1">
                      {fulfillmentOrder.map(s => {
                        const cfg = statusFulfillment[s];
                        const isActive = s === selectedPedido.status_fulfillment;
                        const idx = fulfillmentOrder.indexOf(s);
                        const currentIdx = fulfillmentOrder.indexOf(selectedPedido.status_fulfillment);
                        const isPast = idx < currentIdx;
                        return (
                          <Button key={s} size="sm" variant={isActive ? "default" : isPast ? "secondary" : "outline"}
                            className="text-xs flex-1"
                            onClick={() => updateFulfillment.mutate({ id: selectedPedido.id, status: s })}>
                            {cfg.label.split(" ")[0]}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Contact */}
                  {(selectedPedido.telefone_cliente || selectedPedido.email_cliente) && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Contato</Label>
                      {selectedPedido.telefone_cliente && <p className="text-sm">{selectedPedido.telefone_cliente}</p>}
                      {selectedPedido.email_cliente && <p className="text-sm">{selectedPedido.email_cliente}</p>}
                    </div>
                  )}

                  {/* Address */}
                  {selectedPedido.endereco_rua && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Endereço de Entrega</Label>
                      <p className="text-sm">
                        {selectedPedido.endereco_rua}, {selectedPedido.endereco_numero}
                        {selectedPedido.endereco_complemento && ` - ${selectedPedido.endereco_complemento}`}
                      </p>
                      <p className="text-sm">
                        {selectedPedido.endereco_bairro} - {selectedPedido.endereco_cidade}/{selectedPedido.endereco_estado}
                      </p>
                      <p className="text-sm">CEP: {selectedPedido.endereco_cep}</p>
                    </div>
                  )}

                  {/* Logistics */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Logística / Despacho</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px]">Transportadora</Label>
                        <Input
                          value={selectedPedido.transportadora || ""}
                          onChange={e => setSelectedPedido({ ...selectedPedido, transportadora: e.target.value })}
                          placeholder="Nome da transportadora"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Código de Rastreio</Label>
                        <Input
                          value={selectedPedido.codigo_rastreio || ""}
                          onChange={e => setSelectedPedido({ ...selectedPedido, codigo_rastreio: e.target.value })}
                          placeholder="Código"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Volumes</Label>
                        <Input
                          type="number"
                          value={selectedPedido.volumes || 1}
                          onChange={e => setSelectedPedido({ ...selectedPedido, volumes: parseInt(e.target.value) })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Peso (kg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedPedido.peso_total || ""}
                          onChange={e => setSelectedPedido({ ...selectedPedido, peso_total: parseFloat(e.target.value) })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button size="sm" className="mt-3 w-full" variant="outline"
                      onClick={async () => {
                        const { error } = await supabase.from("pedidos_recebidos").update({
                          transportadora: selectedPedido.transportadora,
                          codigo_rastreio: selectedPedido.codigo_rastreio,
                          volumes: selectedPedido.volumes,
                          peso_total: selectedPedido.peso_total,
                        }).eq("id", selectedPedido.id);
                        if (error) toast.error("Erro ao salvar");
                        else {
                          toast.success("Dados de logística salvos!");
                          queryClient.invalidateQueries({ queryKey: ["pedidos_recebidos"] });
                        }
                      }}>
                      Salvar Dados de Logística
                    </Button>
                  </div>

                  {/* Vincular à rota */}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/logistica/roteirizacao")}>
                    <Truck className="h-4 w-4 mr-2" /> Vincular à Rota de Entrega
                  </Button>

                  {selectedPedido.observacoes && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Observações</Label>
                      <p className="text-sm bg-muted/50 p-3 rounded">{selectedPedido.observacoes}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>

        {/* Etiqueta Print Dialog */}
        {showEtiqueta && (
          <PedidoEtiquetaDialog
            open={showEtiqueta}
            onOpenChange={setShowEtiqueta}
            pedidoIds={selectedForPrint}
            estabelecimentoId={estabelecimentoId!}
          />
        )}

        {/* Etiqueta Config Dialog */}
        {showEtiquetaConfig && (
          <EtiquetaConfigDialog
            open={showEtiquetaConfig}
            onOpenChange={setShowEtiquetaConfig}
            estabelecimentoId={estabelecimentoId!}
          />
        )}
      </div>
    </div>
  );
}
