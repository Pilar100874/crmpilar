import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, ExternalLink, TrendingDown, Package, Store, Target, AlertCircle, Database, Globe, FileSpreadsheet } from "lucide-react";
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
  fonte: string;
}

interface FontePesquisa {
  id: string;
  nome_fonte: string;
  tipo: 'api' | 'scraping' | 'arquivo_importado';
  config_json: any;
  ativo: boolean;
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

const tipoIcons = {
  api: Database,
  scraping: Globe,
  arquivo_importado: FileSpreadsheet,
};

const tipoColors = {
  api: "text-blue-500",
  scraping: "text-purple-500",
  arquivo_importado: "text-green-500",
};

export function BuscaManualPrecos() {
  const [termoBusca, setTermoBusca] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [totalResultados, setTotalResultados] = useState(0);
  const [fontesAtivas, setFontesAtivas] = useState<FontePesquisa[]>([]);
  const [fontesSelecionadas, setFontesSelecionadas] = useState<string[]>([]);
  const [loadingFontes, setLoadingFontes] = useState(true);
  const [errosBusca, setErrosBusca] = useState<{ fonte: string; erro: string }[]>([]);

  // Buscar todas as fontes ativas do estabelecimento
  useEffect(() => {
    const fetchFontesAtivas = async () => {
      try {
        setLoadingFontes(true);
        const estabelecimentoId = await getEstabelecimentoId();
        const { data, error } = await supabase
          .from('fontes_pesquisa_precos')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('ativo', true);

        if (error) throw error;

        const fontes = (data || []) as FontePesquisa[];
        setFontesAtivas(fontes);
        
        // Selecionar todas por padrão
        setFontesSelecionadas(fontes.map(f => f.id));
      } catch (err) {
        console.error('[Busca Manual] Erro ao buscar fontes:', err);
        toast.error("Erro ao carregar fontes de pesquisa");
      } finally {
        setLoadingFontes(false);
      }
    };

    fetchFontesAtivas();
  }, []);

  const toggleFonte = (fonteId: string) => {
    setFontesSelecionadas(prev => 
      prev.includes(fonteId) 
        ? prev.filter(id => id !== fonteId)
        : [...prev, fonteId]
    );
  };

  const selecionarTodas = () => {
    setFontesSelecionadas(fontesAtivas.map(f => f.id));
  };

  const deselecionarTodas = () => {
    setFontesSelecionadas([]);
  };

  const buscarPrecos = async () => {
    if (!termoBusca.trim()) {
      toast.error("Digite o nome do produto para buscar");
      return;
    }

    if (fontesSelecionadas.length === 0) {
      toast.error("Selecione pelo menos uma fonte de pesquisa");
      return;
    }

    setIsLoading(true);
    setResultados([]);
    setErrosBusca([]);

    const fontesParaBuscar = fontesAtivas.filter(f => fontesSelecionadas.includes(f.id));
    const todosResultados: ResultadoBusca[] = [];
    const erros: { fonte: string; erro: string }[] = [];

    console.log("[Busca Manual] Iniciando busca em", fontesParaBuscar.length, "fontes");

    // Buscar em paralelo em todas as fontes selecionadas
    const promises = fontesParaBuscar.map(async (fonte) => {
      try {
        console.log(`[Busca Manual] Buscando em ${fonte.nome_fonte}...`);
        const config = fonte.config_json || {};

        // Determinar qual edge function chamar baseado no tipo de API
        if (fonte.tipo === 'api') {
          const tipoApi = config.tipo_api;

          if (tipoApi === 'mercado_livre') {
            const { data, error } = await supabase.functions.invoke('mercadolivre-search', {
              body: { 
                query: termoBusca.trim(), 
                limit: config.limite_resultados || 20,
                site_id: config.site_id || 'MLB',
                client_id: config.client_id,
                client_secret: config.client_secret,
              }
            });

            if (error) throw new Error(error.message);
            if (data.error) throw new Error(data.error);
            if (data._requires_auth) throw new Error("Requer autenticação OAuth");

            const items = data.results || [];
            return items.map((item: any) => ({
              id: `ml-${item.id}`,
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
              fonte: fonte.nome_fonte,
            }));
          }

          if (tipoApi === 'firecrawl') {
            // Firecrawl - busca via web scraping inteligente
            const { data, error } = await supabase.functions.invoke('firecrawl-search', {
              body: { 
                query: termoBusca.trim(),
                api_key: config.api_key,
                sites: config.sites?.split(',').map((s: string) => s.trim()) || ['mercadolivre.com.br'],
                limit: config.limite_resultados || 20,
              }
            });

            if (error) throw new Error(error.message);
            if (data.error) throw new Error(data.error);

            const items = data.results || [];
            return items.map((item: any, index: number) => ({
              id: `fc-${index}-${Date.now()}`,
              title: item.title || item.name,
              price: item.price,
              original_price: item.original_price,
              permalink: item.url || item.link,
              thumbnail: item.image || item.thumbnail || '',
              condition: 'N/A',
              seller_nickname: item.seller || item.site,
              free_shipping: false,
              available_quantity: 0,
              score: calcularSimilaridade(termoBusca, item.title || item.name || ''),
              fonte: fonte.nome_fonte,
            }));
          }

          if (tipoApi === 'google_custom_search') {
            // Google Custom Search
            const { data, error } = await supabase.functions.invoke('google-search', {
              body: { 
                query: termoBusca.trim(),
                api_key: config.api_key,
                cx: config.cx,
                sites: config.sites?.split(',').map((s: string) => s.trim()),
                limit: config.limite_resultados || 10,
              }
            });

            if (error) throw new Error(error.message);
            if (data.error) throw new Error(data.error);

            const items = data.results || [];
            return items.map((item: any, index: number) => ({
              id: `gcs-${index}-${Date.now()}`,
              title: item.title,
              price: item.price || 0,
              permalink: item.link,
              thumbnail: item.image || '',
              condition: 'N/A',
              seller_nickname: item.displayLink,
              free_shipping: false,
              available_quantity: 0,
              score: calcularSimilaridade(termoBusca, item.title || ''),
              fonte: fonte.nome_fonte,
            }));
          }

          // Outros tipos de API não implementados ainda
          throw new Error(`Tipo de API "${tipoApi}" não suportado para busca manual`);
        }

        if (fonte.tipo === 'scraping') {
          // Busca via scraping
          const { data, error } = await supabase.functions.invoke('scraping-search', {
            body: { 
              query: termoBusca.trim(),
              url_busca: config.url_busca,
              seletores: config.seletores,
              regex_preco: config.regex_preco,
              limite: config.limite_resultados || 20,
            }
          });

          if (error) throw new Error(error.message);
          if (data.error) throw new Error(data.error);

          const items = data.results || [];
          return items.map((item: any, index: number) => ({
            id: `scrap-${index}-${Date.now()}`,
            title: item.nome || item.title,
            price: item.preco_numerico || item.price,
            permalink: item.link || item.url,
            thumbnail: item.imagem || '',
            condition: 'N/A',
            seller_nickname: fonte.nome_fonte,
            free_shipping: false,
            available_quantity: 0,
            score: calcularSimilaridade(termoBusca, item.nome || item.title || ''),
            fonte: fonte.nome_fonte,
          }));
        }

        return [];
      } catch (err: any) {
        console.error(`[Busca Manual] Erro em ${fonte.nome_fonte}:`, err);
        erros.push({ fonte: fonte.nome_fonte, erro: err.message });
        return [];
      }
    });

    try {
      const resultadosPorFonte = await Promise.all(promises);
      resultadosPorFonte.forEach(items => {
        todosResultados.push(...items);
      });

      // Ordena por preço e pega os 10 menores
      todosResultados.sort((a, b) => a.price - b.price);
      const topResults = todosResultados.filter(r => r.price > 0).slice(0, 10);

      setResultados(topResults);
      setTotalResultados(todosResultados.length);
      setErrosBusca(erros);

      if (topResults.length === 0 && erros.length === 0) {
        toast.info("Nenhum resultado encontrado para esta busca");
      } else if (topResults.length > 0) {
        toast.success(`Encontrados ${todosResultados.length} produtos. Exibindo os 10 menores preços.`);
      }

      if (erros.length > 0) {
        toast.warning(`${erros.length} fonte(s) com erro`);
      }

    } catch (error: any) {
      console.error("[Busca Manual] Erro geral:", error);
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
            Busque preços nas fontes selecionadas abaixo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleção de Fontes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Fontes de Pesquisa</Label>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selecionarTodas}
                  className="text-xs h-7"
                >
                  Todas
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={deselecionarTodas}
                  className="text-xs h-7"
                >
                  Nenhuma
                </Button>
              </div>
            </div>

            {loadingFontes ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando fontes...
              </div>
            ) : fontesAtivas.length === 0 ? (
              <Alert className="border-orange-500/50 bg-orange-500/10">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-sm">
                  Nenhuma fonte de pesquisa ativa. Configure e ative fontes na aba "Fontes".
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {fontesAtivas.map((fonte) => {
                  const Icon = tipoIcons[fonte.tipo] || Database;
                  const colorClass = tipoColors[fonte.tipo] || "text-muted-foreground";
                  const isSelected = fontesSelecionadas.includes(fonte.id);

                  return (
                    <label
                      key={fonte.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'}
                      `}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFonte(fonte.id)}
                      />
                      <Icon className={`h-4 w-4 ${colorClass}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fonte.nome_fonte}</p>
                        <p className="text-xs text-muted-foreground capitalize">{fonte.tipo.replace('_', ' ')}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Campo de Busca */}
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
              disabled={isLoading || fontesAtivas.length === 0 || fontesSelecionadas.length === 0}
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

          {fontesSelecionadas.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {fontesSelecionadas.length} fonte(s) selecionada(s)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Erros de busca */}
      {errosBusca.length > 0 && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-sm">
            <strong>Erros em algumas fontes:</strong>
            <ul className="mt-1 list-disc list-inside">
              {errosBusca.map((e, i) => (
                <li key={i} className="text-xs">
                  <strong>{e.fonte}:</strong> {e.erro}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-green-500" />
              Top 10 Menores Preços
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
                    {item.thumbnail && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={item.thumbnail} 
                          alt={item.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium line-clamp-2 text-sm">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {item.fonte}
                        </Badge>
                        {item.condition !== 'N/A' && (
                          <Badge variant="outline" className="text-xs">
                            {item.condition}
                          </Badge>
                        )}
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
                    {item.permalink && (
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
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {!isLoading && resultados.length === 0 && errosBusca.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Busque por um produto</p>
              <p className="text-sm">
                Selecione as fontes acima, digite o nome do produto e clique em "Buscar"
              </p>
              {fontesAtivas.length === 0 && (
                <p className="text-xs mt-4 text-orange-500">
                  💡 Configure e ative fontes de pesquisa na aba "Fontes" para começar
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
