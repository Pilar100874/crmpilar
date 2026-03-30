import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { User, Users, Package, MapPin, Heart, LogOut, ChevronRight, Building2, RotateCcw, Edit, Plus, Trash2, Truck, Search as SearchIcon, Eye, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const formatPrice = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

interface PedidoEcommerce {
  id: string;
  numero_pedido: string;
  status: string;
  nome_cliente: string;
  email_cliente: string | null;
  tipo_cliente: string;
  tipo_pagamento_nome: string | null;
  condicao_pagamento_nome: string | null;
  subtotal: number;
  desconto: number;
  frete: number;
  valor_total: number;
  token_rastreamento: string;
  created_at: string;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  endereco_cep: string | null;
}

interface PedidoItem {
  id: string;
  produto_id: string | null;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  foto_url: string | null;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-warning text-warning-foreground" },
  confirmado: { label: "Confirmado", color: "bg-primary text-primary-foreground" },
  em_separacao: { label: "Em Separação", color: "bg-primary text-primary-foreground" },
  enviado: { label: "Enviado", color: "bg-accent text-accent-foreground" },
  em_transito: { label: "Em Trânsito", color: "bg-primary text-primary-foreground" },
  entregue: { label: "Entregue", color: "bg-success text-success-foreground" },
  cancelado: { label: "Cancelado", color: "bg-destructive text-destructive-foreground" },
};

export default function EcommerceAccount() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "pedidos");
  const [orders, setOrders] = useState<PedidoEcommerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PedidoEcommerce | null>(null);
  const [orderItems, setOrderItems] = useState<PedidoItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [trackingSearch, setTrackingSearch] = useState("");
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Load orders from localStorage tokens
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const stored = JSON.parse(localStorage.getItem("ecommerce_orders") || "[]");
      if (stored.length === 0) { setOrders([]); setLoading(false); return; }

      const orderIds = stored.map((o: any) => o.id);
      const { data, error } = await supabase
        .from("pedidos_ecommerce")
        .select("*")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as PedidoEcommerce[]) || []);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (order: PedidoEcommerce) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from("pedidos_ecommerce_itens")
        .select("*")
        .eq("pedido_id", order.id);
      if (error) throw error;
      setOrderItems((data as PedidoItem[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleRecomprar = async (order: PedidoEcommerce) => {
    try {
      const { data: itens } = await supabase
        .from("pedidos_ecommerce_itens")
        .select("*")
        .eq("pedido_id", order.id);

      if (!itens || itens.length === 0) {
        toast.error("Nenhum item encontrado neste pedido.");
        return;
      }

      for (const item of itens as PedidoItem[]) {
        addItem({
          productId: item.produto_id || item.id,
          name: item.nome_produto,
          type: null,
          gramatura: null,
          quantity: item.quantidade,
          maxStock: 9999,
          image: item.foto_url || undefined,
          price: item.preco_unitario,
        });
      }

      toast.success(`${itens.length} item(ns) adicionado(s) ao carrinho!`);
      navigate("/ecommerce/carrinho");
    } catch (err) {
      toast.error("Erro ao recomprar.");
    }
  };

  const handleTrackingSearch = async () => {
    if (!trackingSearch.trim()) return;
    const search = trackingSearch.trim();

    const { data, error } = await supabase
      .from("pedidos_ecommerce")
      .select("*")
      .or(`numero_pedido.ilike.%${search}%,token_rastreamento.ilike.%${search}%,email_cliente.ilike.%${search}%`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      toast.error("Nenhum pedido encontrado.");
      return;
    }

    setOrders(data as PedidoEcommerce[]);
    // Save these to local too
    const stored = JSON.parse(localStorage.getItem("ecommerce_orders") || "[]");
    for (const o of data) {
      if (!stored.find((s: any) => s.id === o.id)) {
        stored.push({ id: o.id, numero: o.numero_pedido, token: o.token_rastreamento, email: o.email_cliente, date: o.created_at });
      }
    }
    localStorage.setItem("ecommerce_orders", JSON.stringify(stored.slice(0, 50)));
    toast.success(`${data.length} pedido(s) encontrado(s).`);
  };

  const getStatusInfo = (status: string) => statusMap[status] || { label: status, color: "bg-muted text-muted-foreground" };

  const menuItems = [
    { id: "pedidos", icon: Package, label: "Meus Pedidos" },
    { id: "rastreamento", icon: Truck, label: "Rastreamento" },
    { id: "perfil", icon: User, label: "Dados Pessoais" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/ecommerce" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Minha Conta</span>
      </nav>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside>
          <Card>
            <CardContent className="p-5 space-y-1">
              <div className="mb-4 pb-4 border-b">
                <p className="font-semibold text-sm">Minha Conta</p>
                <p className="text-xs text-muted-foreground">{orders.length} pedido(s)</p>
              </div>
              {menuItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === item.id ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground/70"}`}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Orders */}
          {activeTab === "pedidos" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Meus Pedidos</h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center space-y-3">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
                    <Link to="/ecommerce/catalogo">
                      <Button variant="outline" className="rounded-full">Ver Produtos</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                orders.map(order => {
                  const si = getStatusInfo(order.status);
                  return (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="font-bold text-sm">{order.numero_pedido}</p>
                              <Badge className={`${si.color} border-0 text-[10px]`}>{si.label}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{formatDate(order.created_at)} • {order.nome_cliente}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-lg">{formatPrice(order.valor_total)}</p>
                            <Button variant="outline" size="sm" className="rounded-full gap-1 text-xs" onClick={() => handleRecomprar(order)}>
                              <RotateCcw className="h-3.5 w-3.5" /> Recomprar
                            </Button>
                            <Button variant="ghost" size="sm" className="rounded-full text-xs gap-1" onClick={() => openDetails(order)}>
                              <Eye className="h-3.5 w-3.5" /> Detalhes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Rastreamento */}
          {activeTab === "rastreamento" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Rastreamento de Pedidos</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nº do pedido, código de rastreio ou e-mail..."
                      value={trackingSearch}
                      onChange={(e) => setTrackingSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTrackingSearch()}
                      className="flex-1"
                    />
                    <Button className="rounded-full gap-1.5" onClick={handleTrackingSearch}>
                      <SearchIcon className="h-4 w-4" /> Rastrear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : orders.filter(o => o.status !== "entregue" && o.status !== "cancelado").length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Nenhum pedido em andamento.</p>
                  </CardContent>
                </Card>
              ) : (
                orders.filter(o => o.status !== "entregue" && o.status !== "cancelado").map(order => {
                  const si = getStatusInfo(order.status);
                  const steps = ["pendente", "confirmado", "em_separacao", "enviado", "em_transito", "entregue"];
                  const currentStep = steps.indexOf(order.status);
                  return (
                    <Card key={order.id}>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold">{order.numero_pedido}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                          </div>
                          <Badge className={`${si.color} border-0`}>{si.label}</Badge>
                        </div>
                        <div className="space-y-3">
                          {steps.map((s, i) => {
                            const info = getStatusInfo(s);
                            const isCompleted = i <= currentStep;
                            return (
                              <div key={s} className="flex items-start gap-3">
                                <div className={`mt-0.5 h-3 w-3 rounded-full shrink-0 ${isCompleted ? "bg-primary" : "bg-muted"}`} />
                                <p className={`text-sm font-medium ${isCompleted ? "" : "text-muted-foreground"}`}>{info.label}</p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Profile placeholder */}
          {activeTab === "perfil" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Dados Pessoais</h2>
              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <User className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">O gerenciamento de perfil estará disponível em breve.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Pedido {selectedOrder.numero_pedido}
                  <Badge className={`${getStatusInfo(selectedOrder.status).color} border-0 text-xs`}>
                    {getStatusInfo(selectedOrder.status).label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Cliente</p>
                    <p className="text-sm font-medium">{selectedOrder.nome_cliente}</p>
                    {selectedOrder.email_cliente && <p className="text-xs text-muted-foreground">{selectedOrder.email_cliente}</p>}
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Data</p>
                    <p className="text-sm font-medium">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                </div>

                {selectedOrder.endereco_rua && (
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Endereço</p>
                    <p className="text-sm">{selectedOrder.endereco_rua}, {selectedOrder.endereco_numero} {selectedOrder.endereco_complemento && `- ${selectedOrder.endereco_complemento}`}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.endereco_bairro} • {selectedOrder.endereco_cidade}/{selectedOrder.endereco_estado} • {selectedOrder.endereco_cep}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Pagamento</p>
                  <p className="text-sm">{selectedOrder.tipo_pagamento_nome || "---"} {selectedOrder.condicao_pagamento_nome && `• ${selectedOrder.condicao_pagamento_nome}`}</p>
                </div>

                <Separator />

                <div>
                  <p className="font-semibold mb-3">Itens do Pedido</p>
                  {loadingItems ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                          <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                            {item.foto_url ? <img src={item.foto_url} alt="" className="w-full h-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.nome_produto}</p>
                            <p className="text-xs text-muted-foreground">{item.quantidade}x {formatPrice(item.preco_unitario)}</p>
                          </div>
                          <p className="text-sm font-semibold shrink-0">{formatPrice(item.subtotal)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(selectedOrder.subtotal)}</span></div>
                  {selectedOrder.desconto > 0 && <div className="flex justify-between text-success"><span>Desconto</span><span>-{formatPrice(selectedOrder.desconto)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{selectedOrder.frete === 0 ? "Grátis" : formatPrice(selectedOrder.frete)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(selectedOrder.valor_total)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 rounded-full gap-1.5" onClick={() => { handleRecomprar(selectedOrder); setSelectedOrder(null); }}>
                    <ShoppingCart className="h-4 w-4" /> Recomprar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
