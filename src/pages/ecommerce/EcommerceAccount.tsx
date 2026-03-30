import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { User, Users, Package, MapPin, Heart, Settings, LogOut, ChevronRight, Building2, FileText, RotateCcw, Shield, Clock, Edit, Plus, Trash2, Truck, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const mockOrders = [
  { id: "PED-2026001", date: "25/03/2026", status: "Entregue", total: "R$ 487,50", items: 8, statusColor: "bg-success" },
  { id: "PED-2026002", date: "20/03/2026", status: "Em trânsito", total: "R$ 1.250,00", items: 15, statusColor: "bg-primary" },
  { id: "PED-2026003", date: "15/03/2026", status: "Processando", total: "R$ 324,00", items: 4, statusColor: "bg-warning" },
];

const mockAddresses = [
  { id: "1", label: "Escritório", rua: "Av. Paulista, 1000", complemento: "Sala 1204", bairro: "Bela Vista", cidade: "São Paulo", estado: "SP", cep: "01310-100", default: true },
  { id: "2", label: "Depósito", rua: "Rua das Indústrias, 500", complemento: "Galpão 3", bairro: "Dist. Industrial", cidade: "Guarulhos", estado: "SP", cep: "07190-000", default: false },
];

const mockWishlist = [
  { id: "w1", name: "Papel Sulfite A4 75g", type: "Papéis", image: "📄" },
  { id: "w2", name: "Caixa Papelão 40x30x20", type: "Embalagens", image: "📦" },
  { id: "w3", name: "Etiqueta BOPP A4", type: "Etiquetas", image: "🏷️" },
];

export default function EcommerceAccount() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "pedidos");

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
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
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">JS</div>
                <div>
                  <p className="font-semibold">João Silva</p>
                  <p className="text-xs text-muted-foreground">joao@empresa.com</p>
                </div>
              </div>
              {[
                { id: "pedidos", icon: Package, label: "Meus Pedidos" },
                { id: "perfil", icon: User, label: "Dados Pessoais" },
                { id: "enderecos", icon: MapPin, label: "Endereços" },
                { id: "favoritos", icon: Heart, label: "Favoritos" },
                { id: "empresa", icon: Building2, label: "Minha Empresa" },
              ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === item.id ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground/70"}`}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
              <Separator className="my-2" />
              <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </CardContent>
          </Card>
        </aside>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Orders */}
          {activeTab === "pedidos" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Meus Pedidos</h2>
              {mockOrders.map(order => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-bold">{order.id}</p>
                          <Badge className={`${order.statusColor} text-primary-foreground border-0 text-[10px]`}>{order.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.date} • {order.items} itens</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg">{order.total}</p>
                        <Button variant="outline" size="sm" className="rounded-full gap-1">
                          <RotateCcw className="h-3.5 w-3.5" /> Recomprar
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-full">Detalhes</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Profile */}
          {activeTab === "perfil" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Dados Pessoais</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Nome completo</Label><Input defaultValue="João Silva" className="mt-1" /></div>
                    <div><Label>CPF</Label><Input defaultValue="123.456.789-00" className="mt-1" disabled /></div>
                    <div><Label>E-mail</Label><Input defaultValue="joao@empresa.com" className="mt-1" /></div>
                    <div><Label>Telefone</Label><Input defaultValue="(11) 99999-9999" className="mt-1" /></div>
                  </div>
                  <Button className="rounded-full">Salvar Alterações</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Addresses */}
          {activeTab === "enderecos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Endereços</h2>
                <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {mockAddresses.map(addr => (
                  <Card key={addr.id} className={addr.default ? "border-primary/30" : ""}>
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{addr.label}</p>
                          {addr.default && <Badge variant="outline" className="text-[10px] border-primary text-primary">Padrão</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{addr.rua} {addr.complemento && `- ${addr.complemento}`}</p>
                      <p className="text-sm text-muted-foreground">{addr.bairro} • {addr.cidade}/{addr.estado} • {addr.cep}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Wishlist */}
          {activeTab === "favoritos" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Favoritos</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {mockWishlist.map(item => (
                  <Card key={item.id} className="group hover:shadow-md transition-all">
                    <CardContent className="p-4 text-center space-y-2">
                      <div className="h-24 bg-muted/30 rounded-xl flex items-center justify-center">
                        <span className="text-4xl">{item.image}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <Button size="sm" className="w-full rounded-full text-xs gap-1">
                        Adicionar ao Carrinho
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Company (B2B) */}
          {activeTab === "empresa" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Minha Empresa</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <Badge className="bg-success text-success-foreground border-0">Conta B2B Aprovada</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Razão Social</Label><Input defaultValue="Gráfica Express Ltda" className="mt-1" disabled /></div>
                    <div><Label>CNPJ</Label><Input defaultValue="12.345.678/0001-00" className="mt-1" disabled /></div>
                    <div><Label>Inscrição Estadual</Label><Input defaultValue="123.456.789.000" className="mt-1" disabled /></div>
                    <div><Label>Condição de Pagamento</Label><Input defaultValue="30/60/90 dias" className="mt-1" disabled /></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Users className="h-4 w-4" /> Usuários da Empresa</h3>
                  <div className="space-y-2">
                    {[
                      { name: "João Silva", role: "Administrador", email: "joao@empresa.com" },
                      { name: "Maria Santos", role: "Comprador", email: "maria@empresa.com" },
                    ].map((u, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {u.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Adicionar Usuário</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
