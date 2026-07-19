import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Copy, ExternalLink, Terminal, Plus, Trash2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

const MCP_URL = 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mcp';

const SUGESTOES_TABELAS = [
  'empresas', 'produtos', 'orcamentos', 'orcamento_itens', 'pedidos_ecommerce', 'pedidos_recebidos',
  'customers', 'funil_deals', 'funil_stages', 'segmentos', 'produto_categorias', 'produto_grupos',
  'condicoes_pagamento', 'tabelas_preco', 'estabelecimentos', 'atendentes', 'filas_atendimento',
  'conversations', 'messages', 'contas_marketplace', 'marketplace_produtos', 'cupons_desconto',
  'ncm_codigos', 'cnaes', 'municipios_coordenadas', 'campaigns', 'campaign_send_logs',
];

const exemplos = [
  {
    titulo: 'Listar tabelas liberadas',
    prompt: 'Quais tabelas do Pilar eu tenho liberadas para consulta? Use listar_tabelas_disponiveis.',
  },
  {
    titulo: 'Consultar uma tabela liberada',
    prompt:
      'Use consultar_tabela na tabela "empresas" ordenando por nome. Traga os 50 primeiros em formato de tabela.',
  },
  {
    titulo: 'Empresas com WhatsApp em SP',
    prompt:
      'Liste em formato de tabela as empresas do segmento "Indústria" no estado SP que tenham WhatsApp e e-mail cadastrados.',
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

interface TabelaExposta {
  id: string;
  tabela: string;
  descricao: string | null;
  created_at: string;
}

export default function ProspeccaoClaudeCode() {
  const [tabelas, setTabelas] = useState<TabelaExposta[]>([]);
  const [novaTabela, setNovaTabela] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [toDelete, setToDelete] = useState<TabelaExposta | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mcp_tabelas_expostas')
      .select('*')
      .order('tabela');
    if (error) toast.error(error.message);
    else setTabelas((data as TabelaExposta[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const adicionar = async (tabela?: string) => {
    const nome = (tabela ?? novaTabela).trim().toLowerCase();
    if (!nome) { toast.error('Informe o nome da tabela'); return; }
    if (!/^[a-z_][a-z0-9_]*$/.test(nome)) {
      toast.error('Nome inválido. Use apenas letras minúsculas, números e _');
      return;
    }
    if (tabelas.some((t) => t.tabela === nome)) {
      toast.info('Tabela já está liberada');
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('mcp_tabelas_expostas').insert({
      tabela: nome,
      descricao: novaDesc.trim() || null,
      created_by: userData.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Tabela "${nome}" liberada`);
    setNovaTabela(''); setNovaDesc('');
    carregar();
  };

  const remover = async (t: TabelaExposta) => {
    const { error } = await supabase.from('mcp_tabelas_expostas').delete().eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Tabela removida');
    carregar();
  };

  const sugestoesRestantes = SUGESTOES_TABELAS.filter(
    (s) => !tabelas.some((t) => t.tabela === s),
  );

  return (
    <div className="space-y-4">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Defina abaixo quais tabelas do sistema ficam disponíveis para consulta via <strong>Claude Code</strong>,{' '}
          <strong>Cursor</strong>, <strong>ChatGPT</strong> ou <strong>Claude Desktop</strong>. Só as tabelas
          liberadas nesta tela poderão ser consultadas pelas ferramentas de IA (respeitando as permissões / RLS
          do usuário conectado).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Tabelas liberadas para consulta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2">
            <Input
              placeholder="Nome da tabela (ex: empresas, produtos)"
              value={novaTabela}
              onChange={(e) => setNovaTabela(e.target.value)}
              list="mcp-tabelas-sugestoes"
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
            />
            <datalist id="mcp-tabelas-sugestoes">
              {sugestoesRestantes.map((s) => <option key={s} value={s} />)}
            </datalist>
            <Input
              placeholder="Descrição opcional (ajuda a IA a entender)"
              value={novaDesc}
              onChange={(e) => setNovaDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
            />
            <Button onClick={() => adicionar()} disabled={loading}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>

          {sugestoesRestantes.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sugestões rápidas:</p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoesRestantes.slice(0, 20).map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => adicionar(s)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border rounded-lg divide-y">
            {tabelas.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">
                Nenhuma tabela liberada ainda. Adicione acima ou use uma das sugestões.
              </p>
            )}
            {tabelas.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="font-mono text-sm">{t.tabela}</p>
                  {t.descricao && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t.descricao}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setToDelete(t)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4" />
            Conectar Claude Code / Cursor / ChatGPT ao Pilar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>No Claude Code, rode o comando abaixo:</p>
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
            Na primeira chamada, o Claude abre uma janela pedindo para você fazer login no Pilar e aprovar o
            acesso. Depois disso, ele passa a agir como você (respeita permissões e RLS).
          </p>
          <p>Para ChatGPT / Cursor / Claude Desktop, aponte para a URL do servidor MCP:</p>
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
          <CardTitle className="text-base">Ferramentas disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <Badge variant="secondary">listar_tabelas_disponiveis</Badge>{' '}
            <span className="text-muted-foreground">mostra ao Claude/ChatGPT quais tabelas foram liberadas nesta tela.</span>
          </div>
          <div>
            <Badge variant="secondary">consultar_tabela</Badge>{' '}
            <span className="text-muted-foreground">consulta qualquer tabela liberada acima (com colunas, ordenação e limite).</span>
          </div>
          <div>
            <Badge variant="secondary">list_empresas</Badge>{' '}
            <span className="text-muted-foreground">busca empresas com filtros de UF, cidade, segmento, com/sem e-mail, com/sem WhatsApp.</span>
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
          <CardTitle className="text-base">Exemplos de perguntas</CardTitle>
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

      <div className="flex justify-end">
        <a href="https://docs.claude.com/en/docs/claude-code/mcp" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3 w-3 mr-1" /> Documentação Claude Code MCP
          </Button>
        </a>
      </div>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => { if (toDelete) { remover(toDelete); setToDelete(null); } }}
        itemName={toDelete?.tabela ?? ''}
        title="Remover tabela liberada"
        description="A IA não poderá mais consultar esta tabela via MCP."
      />
    </div>
  );
}
