import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, XCircle, RefreshCw, ExternalLink, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Providers = { lovable: boolean; openai: boolean; anthropic: boolean };

const CARDS: Array<{
  key: keyof Providers;
  nome: string;
  descricao: string;
  chave: string;
  onde: string;
  url: string;
  gratis?: boolean;
}> = [
  {
    key: 'lovable',
    nome: 'Lovable AI (Gemini)',
    descricao: 'Provisionado automaticamente pelo Lovable. Não precisa de chave, consome créditos do workspace. Sem busca web nativa — usa o conhecimento do modelo.',
    chave: 'LOVABLE_API_KEY',
    onde: 'Auto-provisionado',
    url: '',
    gratis: true,
  },
  {
    key: 'openai',
    nome: 'OpenAI (GPT-4o + Web Search)',
    descricao: 'Busca em tempo real na web (web_search_preview). Cobrado por uso na conta OpenAI. Ideal para dados recentes/verificáveis.',
    chave: 'OPENAI_API_KEY',
    onde: 'platform.openai.com/api-keys',
    url: 'https://platform.openai.com/api-keys',
  },
  {
    key: 'anthropic',
    nome: 'Anthropic (Claude 3.5 Sonnet + Web Search)',
    descricao: 'Busca web nativa do Claude. Cobrado por uso na conta Anthropic. Boa qualidade de extração e raciocínio.',
    chave: 'ANTHROPIC_API_KEY',
    onde: 'console.anthropic.com/settings/keys',
    url: 'https://console.anthropic.com/settings/keys',
  },
];

export default function ConfigIAProspec() {
  const [status, setStatus] = useState<Providers | null>(null);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wizard-prospeccao', { body: { modo: 'status' } });
      if (error) throw error;
      setStatus((data as any).providers);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao carregar status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configurar IAs de Prospecção</h1>
            <p className="text-sm text-muted-foreground">Ative os provedores que quiser usar no Wizard de Prospecção.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar status
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Para adicionar/atualizar uma chave, peça no chat: <strong>"Lovable, adicione a chave OPENAI_API_KEY"</strong> (ou ANTHROPIC_API_KEY). Um formulário seguro será aberto para você colar o valor — a chave nunca fica exposta no código.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3">
        {CARDS.map((c) => {
          const ativo = status?.[c.key] ?? false;
          return (
            <Card key={c.key}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {c.nome}
                      {c.gratis && <Badge variant="secondary">Sem chave extra</Badge>}
                    </CardTitle>
                    <CardDescription className="mt-1">{c.descricao}</CardDescription>
                  </div>
                  <Badge variant={ativo ? 'default' : 'outline'} className={ativo ? 'bg-green-600 hover:bg-green-600' : ''}>
                    {ativo ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Não configurado</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <code className="px-2 py-0.5 rounded bg-muted text-xs">{c.chave}</code>
                  <span>·</span>
                  <span>Onde obter: {c.onde}</span>
                  {c.url && (
                    <Button variant="link" size="sm" asChild className="h-auto p-0">
                      <a href={c.url} target="_blank" rel="noreferrer">
                        Abrir <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Como o Wizard escolhe o provedor</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>No Wizard, o campo <strong>"Provedor"</strong> só mostra os que estão ativos aqui. Se nenhum estiver ativo, ou se você escolher "Gerar prompt", ele devolve o prompt para colar manualmente no Claude Code / ChatGPT / Cursor.</p>
        </CardContent>
      </Card>
    </div>
  );
}
