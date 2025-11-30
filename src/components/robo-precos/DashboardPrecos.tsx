import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, Play, Search, TrendingDown, TrendingUp, Minus, 
  ExternalLink, Loader2, RefreshCw, AlertTriangle 
} from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ResumoPreco {
  produto_id: string;
  nome_produto: string;
  sku: string;
  ean: string;
  preco_atual: number;
  menor_preco: number | null;
  fonte_id: string | null;
  nome_fonte: string | null;
  diferenca_absoluta: number | null;
  diferenca_percentual: number | null;
  data_coleta: string | null;
  url_anuncio: string | null;
}

export function DashboardPrecos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFonte, setFilterFonte] = useState("all");
  const [filterDiferenca, setFilterDiferenca] = useState("all");

  const { data: fontes } = useQuery({
    queryKey: ['fontes_dashboard'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('fontes_pesquisa_precos')
        .select('id, nome_fonte')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: resumo, isLoading, refetch } = useQuery({
    queryKey: ['resumo_precos'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      
      // Buscar produtos com mapeamentos
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, codigo, ean_13, preco_tabela')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true);
      
      if (produtosError) throw produtosError;

      // Para cada produto, buscar o menor preço mais recente
      const resumoData: ResumoPreco[] = [];
      
      for (const produto of produtos || []) {
        const { data: historico } = await supabase
          .from('historico_precos_concorrentes')
          .select('*, fonte:fontes_pesquisa_precos(nome_fonte)')
          .eq('produto_id', produto.id)
          .order('data_coleta', { ascending: false })
          .order('preco_encontrado', { ascending: true })
          .limit(1);

        const menorPreco = historico?.[0];
        const precoAtual = Number(produto.preco_tabela) || 0;
        const precoConcorrente = menorPreco ? Number(menorPreco.preco_encontrado) : null;
        
        let diferencaAbsoluta: number | null = null;
        let diferencaPercentual: number | null = null;
        
        if (precoConcorrente !== null && precoAtual > 0) {
          diferencaAbsoluta = precoConcorrente - precoAtual;
          diferencaPercentual = ((precoConcorrente - precoAtual) / precoAtual) * 100;
        }

        resumoData.push({
          produto_id: produto.id,
          nome_produto: produto.nome,
          sku: produto.codigo || "",
          ean: produto.ean_13 || "",
          preco_atual: precoAtual,
          menor_preco: precoConcorrente,
          fonte_id: menorPreco?.fonte_id || null,
          nome_fonte: (menorPreco?.fonte as any)?.nome_fonte || null,
          diferenca_absoluta: diferencaAbsoluta,
          diferenca_percentual: diferencaPercentual,
          data_coleta: menorPreco?.data_coleta || null,
          url_anuncio: menorPreco?.url_anuncio || null
        });
      }

      return resumoData;
    }
  });

  const runMonitorMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('monitor-precos-run');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumo_precos'] });
      toast.success(`Monitoramento concluído: ${data?.registros_inseridos || 0} preços coletados`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao executar monitoramento");
    }
  });

  const filteredResumo = resumo?.filter(item => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!item.nome_produto.toLowerCase().includes(term) &&
          !item.sku.toLowerCase().includes(term) &&
          !item.ean.toLowerCase().includes(term)) {
        return false;
      }
    }
    
    if (filterFonte !== "all" && item.fonte_id !== filterFonte) {
      return false;
    }
    
    if (filterDiferenca === "cheaper" && (item.diferenca_percentual === null || item.diferenca_percentual >= 0)) {
      return false;
    }
    if (filterDiferenca === "more_expensive" && (item.diferenca_percentual === null || item.diferenca_percentual < 0)) {
      return false;
    }
    
    return true;
  });

  const stats = {
    total: resumo?.length || 0,
    comPreco: resumo?.filter(r => r.menor_preco !== null).length || 0,
    maisBarato: resumo?.filter(r => r.diferenca_percentual !== null && r.diferenca_percentual < -5).length || 0,
    maisCaro: resumo?.filter(r => r.diferenca_percentual !== null && r.diferenca_percentual > 5).length || 0
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Produtos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.comPreco}</div>
            <p className="text-xs text-muted-foreground">Com Preço Coletado</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{stats.maisBarato}</div>
            <p className="text-xs text-muted-foreground">Concorrência +5% Barata</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.maisCaro}</div>
            <p className="text-xs text-muted-foreground">Concorrência +5% Cara</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Dashboard de Preços
            </CardTitle>
            <CardDescription>
              Comparativo de preços com a concorrência
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button 
              onClick={() => runMonitorMutation.mutate()}
              disabled={runMonitorMutation.isPending}
            >
              {runMonitorMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Executar Robô
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto, SKU ou EAN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Select value={filterFonte} onValueChange={setFilterFonte}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  {fontes?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fonte}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={filterDiferenca} onValueChange={setFilterDiferenca}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar diferença" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="cheaper">Concorrência mais barata</SelectItem>
                  <SelectItem value="more_expensive">Concorrência mais cara</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResumo?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum resultado encontrado.</p>
              <p className="text-sm">Execute o robô de preços para coletar dados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Meu Preço</TableHead>
                  <TableHead className="text-right">Menor Preço</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead>Última Coleta</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResumo?.map((item) => {
                  const isCheaper = item.diferenca_percentual !== null && item.diferenca_percentual < -5;
                  const isMoreExpensive = item.diferenca_percentual !== null && item.diferenca_percentual > 5;
                  
                  return (
                    <TableRow key={item.produto_id} className={cn(
                      isCheaper && "bg-red-500/5"
                    )}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.nome_produto}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.sku || "-"} | EAN: {item.ean || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {item.preco_atual.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.menor_preco !== null ? (
                          <span className={cn(
                            "font-medium",
                            isCheaper && "text-red-500",
                            isMoreExpensive && "text-green-500"
                          )}>
                            R$ {item.menor_preco.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.nome_fonte || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.diferenca_percentual !== null ? (
                          <div className="flex items-center justify-end gap-1">
                            {isCheaper ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : isMoreExpensive ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Badge variant={isCheaper ? "destructive" : isMoreExpensive ? "default" : "secondary"}>
                              {item.diferenca_percentual > 0 ? "+" : ""}{item.diferenca_percentual.toFixed(1)}%
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.data_coleta ? (
                          format(new Date(item.data_coleta), "dd/MM/yyyy", { locale: ptBR })
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {item.url_anuncio && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => window.open(item.url_anuncio!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
