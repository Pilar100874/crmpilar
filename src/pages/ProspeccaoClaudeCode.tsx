import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Copy, ExternalLink, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MCP_URL = 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mcp';

const exemplos = [
  {
    titulo: 'Empresas com WhatsApp e e-mail de um segmento em SP',
    prompt:
      'Liste em formato de tabela as empresas do segmento "Indústria" no estado SP que tenham WhatsApp e e-mail cadastrados. Colunas: Nome, CNPJ, Cidade, UF, E-mail, WhatsApp.',
  },
  {
    titulo: 'Clientes de uma cidade específica',
    prompt:
      'Traga as empresas cadastradas em Campinas/SP e monte uma tabela com Nome, WhatsApp e E-mail.',
  },
  {
    titulo: 'Descobrir segmentos disponíveis',
    prompt: 'Quais segmentos de empresa estão cadastrados no meu Pilar?',
  },
  {
    titulo: 'Produtos por marca',
    prompt: 'Liste os 20 produtos da marca "X" com preço de tabela e estoque em formato de tabela.',
  },
  {
    titulo: 'Exportar CSV de prospecção',
    prompt:
      'Gere um CSV com todas as empresas do segmento "Varejo" no RJ e MG que tenham WhatsApp, colunas: Nome Fantasia; CNPJ; Cidade; UF; WhatsApp; E-mail.',
  },
];

const copy = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copiado!');
};

export default function ProspeccaoClaudeCode() {
  return (
    <div className="space-y-4">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Use o <strong>Claude Code</strong>, <strong>Claude Desktop</strong>, <strong>ChatGPT</strong> ou <strong>Cursor</strong> para
          conversar com o seu CRM Pilar em linguagem natural — pedir listas de empresas por UF, cidade,
          segmento, com WhatsApp/e-mail e receber a resposta em tabela ou CSV.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4" />
            1. Conectar o Claude Code ao Pilar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>No Claude Code, rode o comando abaixo (ele registra o servidor MCP do Pilar):</p>
          <div className="flex items-center gap-2 bg-muted p-3 rounded font-mono text-xs">
            <code className="flex-1 break-all">claude mcp add --transport http pilar {MCP_URL}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copy(`claude mcp add --transport http pilar ${MCP_URL}`)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-muted-foreground">
            Na primeira chamada, o Claude abre uma janela pedindo para você fazer login no Pilar e
            aprovar o acesso. Depois disso, ele passa a agir como você (respeita permissões e RLS).
          </p>
          <p>
            Para ChatGPT / Cursor / Claude Desktop, basta apontar a URL do servidor MCP:
          </p>
          <div className="flex items-center gap-2 bg-muted p-3 rounded font-mono text-xs">
            <code className="flex-1 break-all">{MCP_URL}</code>
            <Button size="sm" variant="ghost" onClick={() => copy(MCP_URL)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Ferramentas disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <Badge variant="secondary">list_empresas</Badge>{' '}
            <span className="text-muted-foreground">
              busca empresas com filtros de UF, cidade, segmento, com/sem e-mail, com/sem WhatsApp.
            </span>
          </div>
          <div>
            <Badge variant="secondary">list_segmentos</Badge>{' '}
            <span className="text-muted-foreground">lista os segmentos cadastrados.</span>
          </div>
          <div>
            <Badge variant="secondary">list_produtos</Badge>{' '}
            <span className="text-muted-foreground">consulta o catálogo (nome, código, marca, estoque, preço).</span>
          </div>
          <div>
            <Badge variant="secondary">whoami</Badge>{' '}
            <span className="text-muted-foreground">confirma o usuário conectado.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Exemplos de perguntas para prospecção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {exemplos.map((ex, i) => (
            <div key={i} className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium">{ex.titulo}</p>
                <Button size="sm" variant="ghost" onClick={() => copy(ex.prompt)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground italic">"{ex.prompt}"</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Dicas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>• Peça sempre em <strong>formato de tabela</strong> ou <strong>CSV</strong> — o assistente formata pra você.</p>
          <p>• Combine filtros: <em>"empresas do segmento X em SP e RJ com WhatsApp"</em>.</p>
          <p>• O limite padrão é 50 registros por consulta (máx 500). Peça explicitamente se precisar mais.</p>
          <p>• Todas as consultas respeitam suas permissões — o assistente só vê o que você já vê no Pilar.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <a href="https://docs.claude.com/en/docs/claude-code/mcp" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3 w-3 mr-1" /> Documentação Claude Code MCP
          </Button>
        </a>
      </div>
    </div>
  );
}
