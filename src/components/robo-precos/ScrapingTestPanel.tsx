import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScrapingTestPanelProps {
  urlBusca: string;
  seletores: {
    container_produto: string;
    nome: string;
    preco: string;
    link: string;
  };
  regexPreco: string;
}

interface ProdutoTestado {
  nome: string;
  preco: string;
  preco_numerico?: number;
  link?: string;
}

interface ResultadoTeste {
  sucesso: boolean;
  produtos_encontrados: number;
  produtos: ProdutoTestado[];
  erros: {
    container: string | null;
    nome: string | null;
    preco: string | null;
    link: string | null;
  };
  sugestoes: string[];
}

export function ScrapingTestPanel({ urlBusca, seletores, regexPreco }: ScrapingTestPanelProps) {
  const [termoTeste, setTermoTeste] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTeste | null>(null);
  const [urlTestada, setUrlTestada] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const handleTest = async () => {
    if (!termoTeste.trim()) {
      toast.error("Digite um termo para testar");
      return;
    }

    if (!urlBusca) {
      toast.error("Configure a URL de busca primeiro");
      return;
    }

    if (!seletores.container_produto || !seletores.nome || !seletores.preco) {
      toast.error("Configure os seletores obrigatórios primeiro");
      return;
    }

    setIsTesting(true);
    setResultado(null);
    setErro(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-scraping-config', {
        body: {
          url_busca: urlBusca,
          termo_teste: termoTeste,
          seletores,
          regex_preco: regexPreco
        }
      });

      if (error) throw error;

      if (data?.success) {
        setResultado(data.resultado);
        setUrlTestada(data.url_testada);
        
        if (data.resultado?.sucesso && data.resultado?.produtos_encontrados > 0) {
          toast.success(`${data.resultado.produtos_encontrados} produtos encontrados!`);
        } else {
          toast.warning("Nenhum produto encontrado. Verifique os seletores.");
        }
      } else {
        setErro(data?.error || "Erro ao testar configuração");
        toast.error(data?.error || "Erro no teste");
      }
    } catch (err) {
      console.error('Erro no teste:', err);
      setErro("Erro ao conectar com o serviço de teste");
      toast.error("Erro ao testar configuração");
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (erro: string | null) => {
    if (erro) return <XCircle className="h-4 w-4 text-red-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-green-500/5 border-green-500/20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
          <Play className="h-4 w-4" />
        </div>
        <h4 className="font-semibold">Testar Configuração</h4>
        <Badge variant="outline" className="bg-green-500/20 text-green-400 ml-auto">
          Recomendado
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Teste a configuração antes de salvar para garantir que os seletores estão corretos.
      </p>

      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="sr-only">Termo de teste</Label>
          <Input
            value={termoTeste}
            onChange={(e) => setTermoTeste(e.target.value)}
            placeholder="Digite um produto para testar (ex: celular, notebook)"
            onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          />
        </div>
        <Button
          type="button"
          onClick={handleTest}
          disabled={isTesting || !termoTeste.trim()}
          className="gap-2"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Testar
            </>
          )}
        </Button>
      </div>

      {erro && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-xs">
            ❌ {erro}
          </AlertDescription>
        </Alert>
      )}

      {resultado && (
        <div className="space-y-3">
          {/* Status dos seletores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className={`${!resultado.erros?.container ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <CardContent className="p-2 flex items-center gap-2">
                {getStatusIcon(resultado.erros?.container)}
                <span className="text-xs">Container</span>
              </CardContent>
            </Card>
            <Card className={`${!resultado.erros?.nome ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <CardContent className="p-2 flex items-center gap-2">
                {getStatusIcon(resultado.erros?.nome)}
                <span className="text-xs">Nome</span>
              </CardContent>
            </Card>
            <Card className={`${!resultado.erros?.preco ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <CardContent className="p-2 flex items-center gap-2">
                {getStatusIcon(resultado.erros?.preco)}
                <span className="text-xs">Preço</span>
              </CardContent>
            </Card>
            <Card className={`${!resultado.erros?.link ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
              <CardContent className="p-2 flex items-center gap-2">
                {resultado.erros?.link ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : getStatusIcon(null)}
                <span className="text-xs">Link</span>
              </CardContent>
            </Card>
          </div>

          {/* Resumo */}
          <Alert className={resultado.sucesso && resultado.produtos_encontrados > 0 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-yellow-500/10 border-yellow-500/20'
          }>
            {resultado.sucesso && resultado.produtos_encontrados > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <AlertDescription className="text-xs">
              {resultado.sucesso && resultado.produtos_encontrados > 0 
                ? `✅ Configuração OK! ${resultado.produtos_encontrados} produtos encontrados.`
                : '⚠️ Nenhum produto encontrado. Verifique os seletores.'
              }
            </AlertDescription>
          </Alert>

          {/* Produtos encontrados */}
          {resultado.produtos && resultado.produtos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Produtos encontrados (prévia):</Label>
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-2">
                  {resultado.produtos.map((produto, idx) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded text-xs">
                      <div className="font-medium truncate">{produto.nome || '(sem nome)'}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-green-500 font-bold">
                          {produto.preco_numerico 
                            ? `R$ ${produto.preco_numerico.toFixed(2)}` 
                            : produto.preco || '(sem preço)'
                          }
                        </span>
                        {produto.link && (
                          <a 
                            href={produto.link.startsWith('http') ? produto.link : `https://${new URL(urlTestada).hostname}${produto.link}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Sugestões */}
          {resultado.sugestoes && resultado.sugestoes.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sugestões:</Label>
              <ul className="list-disc list-inside text-xs text-muted-foreground">
                {resultado.sugestoes.map((sugestao, idx) => (
                  <li key={idx}>{sugestao}</li>
                ))}
              </ul>
            </div>
          )}

          {/* URL testada */}
          {urlTestada && (
            <div className="text-xs text-muted-foreground">
              URL testada: <a href={urlTestada} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">{urlTestada}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
