import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, Loader2, Megaphone, Play, Pause, MoreVertical,
  TrendingUp, TrendingDown, DollarSign, Eye, Target, MousePointerClick,
  Facebook, Music2, ShoppingBag, Package, Filter, RefreshCw, Star
} from "lucide-react";
import { useAdsFavorites } from "@/hooks/useAdsFavorites";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const platformIcons: Record<string, any> = {
  google_ads: Search,
  meta_ads: Facebook,
  tiktok_ads: Music2,
  mercadolivre_ads: ShoppingBag,
  amazon_ads: Package,
};

const platformColors: Record<string, string> = {
  google_ads: "#4285F4",
  meta_ads: "#1877F2",
  tiktok_ads: "#000000",
  mercadolivre_ads: "#FFE600",
  amazon_ads: "#FF9900",
};

export default function AdsCampaigns() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { isFav, toggle } = useAdsFavorites();
  const [onlyFavs, setOnlyFavs] = useState(false);

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const { data: platforms } = useQuery({
    queryKey: ["ad_platforms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_platforms").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: insights, isLoading } = useQuery({
    queryKey: ["ad_campaigns", estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from("ad_insights")
        .select("*, plataforma:ad_platforms(*), conta:ad_accounts(*)")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  // Agrupar por campanha
  const campaigns = insights?.reduce((acc: any[], item) => {
    const key = `${item.campanha}-${item.plataforma_id}`;
    const existing = acc.find(c => c.key === key);
    
    if (existing) {
      existing.gastos += Number(item.gastos || 0);
      existing.receita += Number(item.receita || 0);
      existing.cliques += item.cliques || 0;
      existing.impressoes += item.impressoes || 0;
      existing.conversoes += item.conversoes || 0;
      existing.lastUpdate = item.data > existing.lastUpdate ? item.data : existing.lastUpdate;
    } else {
      acc.push({
        key,
        campanha: item.campanha || "Sem nome",
        conjunto: item.conjunto,
        anuncio: item.anuncio,
        plataforma: item.plataforma,
        conta: item.conta,
        gastos: Number(item.gastos || 0),
        receita: Number(item.receita || 0),
        cliques: item.cliques || 0,
        impressoes: item.impressoes || 0,
        conversoes: item.conversoes || 0,
        lastUpdate: item.data,
        status: 'active', // Mock status
      });
    }
    return acc;
  }, []) || [];

  // Filtrar campanhas
  const filteredCampaigns = campaigns
    .filter(c => {
      const matchesSearch = c.campanha.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = filterPlatform === "all" || c.plataforma?.id === filterPlatform;
      const matchesStatus = filterStatus === "all" || c.status === filterStatus;
      const matchesFav = !onlyFavs || isFav(c.key);
      return matchesSearch && matchesPlatform && matchesStatus && matchesFav;
    })
    .sort((a, b) => (isFav(b.key) ? 1 : 0) - (isFav(a.key) ? 1 : 0));


  // Estatísticas
  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    paused: campaigns.filter(c => c.status === 'paused').length,
    totalSpend: campaigns.reduce((acc, c) => acc + c.gastos, 0),
    totalRevenue: campaigns.reduce((acc, c) => acc + c.receita, 0),
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Campanhas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas campanhas em todas as plataformas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["ad_campaigns"] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Play className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Ativas</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Pause className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Pausadas</span>
              </div>
              <p className="text-2xl font-bold text-yellow-500">{stats.paused}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Gastos</span>
              </div>
              <p className="text-xl font-bold">R$ {stats.totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Receita</span>
              </div>
              <p className="text-xl font-bold">R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas plataformas</SelectItem>
                  {platforms?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="paused">Pausadas</SelectItem>
                  <SelectItem value="archived">Arquivadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lista de Campanhas</CardTitle>
            <CardDescription>{filteredCampaigns.length} campanhas encontradas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <button onClick={() => setOnlyFavs(v => !v)} title={onlyFavs ? "Mostrar todas" : "Apenas favoritas"}>
                          <Star className={`h-4 w-4 ${onlyFavs ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`} />
                        </button>
                      </TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Gastos</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">Conversões</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => {
                      const Icon = platformIcons[campaign.plataforma?.nome] || Search;
                      const roas = campaign.gastos > 0 ? campaign.receita / campaign.gastos : 0;
                      
                      return (
                        <TableRow key={campaign.key}>
                          <TableCell>
                            <button onClick={() => toggle(campaign.key)} title={isFav(campaign.key) ? "Remover favorito" : "Favoritar"}>
                              <Star className={`h-4 w-4 ${isFav(campaign.key) ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`} />
                            </button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{campaign.campanha}</p>
                              {campaign.conta && (
                                <p className="text-xs text-muted-foreground">{campaign.conta.nome_conta}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" style={{ color: platformColors[campaign.plataforma?.nome] }} />
                              <span className="text-sm">{campaign.plataforma?.nome_display}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            R$ {campaign.gastos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-green-500">
                            R$ {campaign.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={roas >= 1 ? "default" : "destructive"}>
                              {roas.toFixed(2)}x
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{campaign.cliques.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{campaign.conversoes.toLocaleString("pt-BR")}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  {campaign.status === 'active' ? (
                                    <>
                                      <Pause className="h-4 w-4 mr-2" />
                                      Pausar
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 mr-2" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Ajustar orçamento
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredCampaigns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">Nenhuma campanha encontrada</p>
                          <p className="text-sm">Configure suas contas de anúncios para ver as campanhas</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
