import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, ExternalLink, TrendingDown, Package, Store, Target, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

interface ResultadoBusca {
  id: string;
  title: string;
  price: number;
  original_price?: number;
  permalink: string;
  thumbnail: string;
  condition: string;
  seller_nickname?: string;
  free_shipping: boolean;
  available_quantity: number;
  score: number;
}

interface FonteConfig {
  tipo_api?: string;
  client_id?: string;
  client_secret?: string;
  site_id?: string;
  limite_resultados?: number;
}

// Helpers de similaridade (mesmo algoritmo do backend)
function normalizarTexto(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularSimilaridade(a: string, b: string): number {
  const tokensA = new Set(normalizarTexto(a).split(' ').filter(t => t.length > 1));
  const tokensB = new Set(normalizarTexto(b).split(' ').filter(t => t.length > 1));
  
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  
  const intersecao = new Set([...tokensA].filter(x => tokensB.has(x)));
  const uniao = new Set([...tokensA, ...tokensB]);
  
  return intersecao.size / uniao.size;
}

export function BuscaManualPrecos() {
  const [termoBusca, setTermoBusca] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [totalResultados, setTotalResultados] = useState(0);
  const [fonteConfig, setFonteConfig] = useState<FonteConfig | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  // Buscar configuração da fonte Mercado Livre
  useEffect(() => {
    const fetchFonteConfig = async () => {
      try {
        const estabelecimentoId = await getEstabelecimentoId();
        const { data } = await supabase
          .from('fontes_pesquisa_precos')
          .select('config_json')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('tipo', 'api')
          .eq('ativo', true)
          .limit(1);

        if (data && data.length > 0) {
          const config = data[0].config_json as FonteConfig;
          if (config?.tipo_api === 'mercado_livre') {
            setFonteConfig(config);
          }
        }
      } catch (err) {
        console.error('[Busca Manual] Erro ao buscar config:', err);
      }
    };

    fetchFonteConfig();
  }, []);

  const buscarPrecos = async () => {
    if (!termoBusca.trim()) {
      toast.error("Digite o nome do produto para buscar");
      return;
    }

    setIsLoading(true);
    setResultados([]);
    setAuthRequired(false);

    try {
      console.log("[Busca Manual] Buscando via edge function:", termoBusca);
      console.log("[Busca Manual] Config:", fonteConfig);
      
      const { data, error } = await supabase.functions.invoke('mercadolivre-search', {
        body: { 
          query: termoBusca.trim(), 
          limit: fonteConfig?.limite_resultados || 20,
          site_id: fonteConfig?.site_id || 'MLB',
          client_id: fonteConfig?.client_id,
          client_secret: fonteConfig?.client_secret,
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar preços');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Verificar se requer autenticação
      if (data._requires_auth) {
        setAuthRequired(true);
        toast.warning(data._message || "API requer autenticação OAuth");
        setResultados([]);
        setTotalResultados(0);
        return;
      }

      const items = data.results || [];
      setTotalResultados(data.paging?.total || 0);

      // Calcula score de similaridade para cada item
      const itemsComScore = items.map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        original_price: item.original_price,
        permalink: item.permalink,
        thumbnail: item.thumbnail,
        condition: item.condition === 'new' ? 'Novo' : 'Usado',
        seller_nickname: item.seller?.nickname,
        free_shipping: item.shipping?.free_shipping || false,
        available_quantity: item.available_quantity || 0,
        score: calcularSimilaridade(termoBusca, item.title),
      }));

      // Ordena por preço e pega os 5 menores
      itemsComScore.sort((a: any, b: any) => a.price - b.price);
      const top5 = itemsComScore.slice(0, 5);

      setResultados(top5);

      if (top5.length === 0) {
        toast.info("Nenhum resultado encontrado para esta busca");
      } else {
        toast.success(`Encontrados ${data.paging?.total || top5.length} produtos. Exibindo os 5 menores preços.`);
      }

    } catch (error: any) {
      console.error("[Busca Manual] Erro:", error);
      toast.error(`Erro ao buscar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatarPreco = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const calcularDesconto = (original: number, atual: number) => {
    if (!original || original <= atual) return null;
    const desconto = ((original - atual) / original) * 100;
    return Math.round(desconto);
  };

  return (
    <div className="space-y-6">
      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Busca Manual de Preços
          </CardTitle>
          <CardDescription>
            Digite o nome do produto para buscar os menores preços no Mercado Livre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="termo" className="sr-only">Produto</Label>
              <Input
                id="termo"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Ex: iPhone 15, Notebook Dell, Fone de Ouvido Bluetooth..."
                onKeyDown={(e) => e.key === 'Enter' && buscarPrecos()}
                className="text-lg h-12"
              />
            </div>
            <Button 
              onClick={buscarPrecos} 
              disabled={isLoading}
              size="lg"
              className="gap-2 px-8"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de autenticação necessária */}
      {authRequired && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-sm">
            <strong>Autenticação OAuth necessária.</strong> A API do Mercado Livre requer credenciais para funcionar.
            Configure seu <strong>Client ID</strong> e <strong>Client Secret</strong> na aba "Fontes de Pesquisa".
          </AlertDescription>
        </Alert>
      )}

      {/* Status da configuração */}
      {fonteConfig?.client_id && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Target className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-sm">
            <strong>OAuth configurado</strong> - Usando credenciais do Mercado Livre ({fonteConfig.site_id || 'MLB'})
          </AlertDescription>
        </Alert>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-green-500" />
              Top 5 Menores Preços
            </CardTitle>
            <CardDescription>
              {totalResultados.toLocaleString('pt-BR')} produtos encontrados para "{termoBusca}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resultados.map((item, index) => {
                const desconto = calcularDesconto(item.original_price || 0, item.price);
                
                return (
                  <div 
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {/* Ranking */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-600/20 text-orange-600' :
                        'bg-muted text-muted-foreground'}
                    `}>
                      {index + 1}º
                    </div>

                    {/* Imagem */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img 
                        src={item.thumbnail} 
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium line-clamp-2 text-sm">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {item.condition}
                        </Badge>
                        {item.free_shipping && (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                            Frete Grátis
                          </Badge>
                        )}
                        {item.seller_nickname && (
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {item.seller_nickname}
                          </span>
                        )}
                      </div>
                      {/* Score de Similaridade */}
                      <div className="flex items-center gap-2 mt-2">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Match:</span>
                        <div className="w-20">
                          <Progress value={item.score * 100} className="h-1.5" />
                        </div>
                        <span className={`text-xs font-medium ${
                          item.score >= 0.6 ? 'text-green-500' : 
                          item.score >= 0.3 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {(item.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Preço */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-primary">
                        {formatarPreco(item.price)}
                      </div>
                      {desconto && (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-muted-foreground line-through">
                            {formatarPreco(item.original_price!)}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            -{desconto}%
                          </Badge>
                        </div>
                      )}
                      {item.available_quantity > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {item.available_quantity} disponíveis
                        </span>
                      )}
                    </div>

                    {/* Link */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                      className="flex-shrink-0 gap-2"
                    >
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Ver
                      </a>
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Tabela alternativa para mobile */}
            <div className="mt-6 hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{index + 1}º</TableCell>
                      <TableCell className="max-w-xs truncate">{item.title}</TableCell>
                      <TableCell>{item.seller_nickname || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatarPreco(item.price)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {!isLoading && resultados.length === 0 && !authRequired && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Busque por um produto</p>
              <p className="text-sm">
                Digite o nome do produto acima e clique em "Buscar" para ver os menores preços
              </p>
              {!fonteConfig?.client_id && (
                <p className="text-xs mt-4 text-orange-500">
                  💡 Configure suas credenciais OAuth na aba "Fontes de Pesquisa" para acesso completo à API
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
