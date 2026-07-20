import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Copy, UserSearch, Terminal, Sparkles } from 'lucide-react';

const MCP_URL = 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mcp';

const buildPrompt = (seg: string, produto: string, regiao: string, qtd: string) => `Você é um agente de inteligência comercial especializado em prospecção B2B.

Sua tarefa é pesquisar, validar, organizar e entregar uma base de representantes comerciais ativos para um segmento informado pelo usuário.

Informações do projeto

Segmento ou mercado:
${seg || '[INFORME O SEGMENTO]'}

Produto ou serviço que será oferecido:
${produto || '[DESCREVA O PRODUTO OU SERVIÇO]'}

Região de atuação:
${regiao || '[INFORME CIDADE, ESTADO, REGIÃO OU TODO O BRASIL]'}

Quantidade desejada de contatos:
${qtd || '[INFORME A QUANTIDADE]'}

Objetivo

Encontrar representantes comerciais autônomos, empresas de representação comercial ou representantes multimarcas que já atendam clientes do segmento informado e que possam incluir um novo produto ou serviço em sua carteira.

Os profissionais encontrados devem possuir relacionamento comercial com os mesmos tipos de clientes que comprariam o produto informado.

Incluir somente
- Representantes comerciais autônomos;
- Empresas de representação comercial;
- Representantes multimarcas;
- Agentes comerciais;
- Profissionais de vendas externas;
- Empresas que representam fabricantes;
- Representantes que atuem no mercado B2B;
- Profissionais que possam adicionar novas marcas à sua carteira.

Excluir
- Lojas, distribuidores, atacadistas, fabricantes, importadores, marketplaces;
- Vendedores internos;
- Empresas que vendem somente ao consumidor final;
- Contatos sem evidência de atuação comercial;
- Cadastros duplicados; empresas inativas.

Perfil ideal
Priorize representantes que já vendam produtos complementares, atendam o mesmo público-alvo, tenham carteira ativa, trabalhem com vendas externas, representem mais de uma marca, tenham atuação comprovada na região e canais de contato (telefone, WhatsApp, e-mail, LinkedIn).

Fontes de pesquisa
LinkedIn, Google, Google Maps, Conselhos Regionais dos Representantes Comerciais (CORE), sites de fabricantes, páginas de representantes, associações comerciais, sindicatos, catálogos e listas de expositores de feiras, redes sociais profissionais, Instagram/Facebook comerciais, portais de representação comercial, notícias do setor.

Não invente informações. Quando não encontrar, preencha como "Não localizado".

Informações para coletar (por representante)
Nome do representante; Empresa de representação; Cidade; Estado; Região atendida; Telefone; WhatsApp; E-mail; Site; LinkedIn; Instagram profissional; Segmentos atendidos; Produtos comercializados; Marcas representadas; Tipo de cliente atendido; Evidência de atuação comercial; Data/período da evidência mais recente; Fonte principal; Fonte secundária; Observações comerciais.

Validação
Confirme que é representante comercial; confirme atuação no segmento ou complementar; verifique região; busque evidência recente; compare em pelo menos duas fontes quando possível; não considere só o endereço; não classifique loja/distribuidor como representante; remova duplicados.

Classificação
Nota de potencial 0–10 considerando: compatibilidade com segmento, produto, região, quantidade de marcas, perfil dos clientes, evidência recente, qualidade dos dados, chance de aceitar nova representação. Classifique como Prioridade Alta/Média/Baixa com justificativa curta.

Como salvar no Pilar (MCP)
Use a ferramenta MCP \`salvar_empresas_prospectadas\` do servidor Pilar para inserir cada representante encontrado. Faça o mapeamento:
- nome → nome do representante ou da empresa de representação
- nome_fantasia → nome comercial usado
- email, telefone, whatsapp, site
- cidade, estado
- descricao → "Representante comercial · Marcas: <marcas> · Segmentos: <segmentos> · Clientes: <tipo> · Evidência: <resumo>"
- redes_sociais → { "linkedin": "...", "instagram": "..." }
- fontes → [{ "principal": "...", "secundaria": "..." }]
- score (0-10), score_motivo, prioridade
- origem → "vendedor"
- segmento_nome → segmento informado
- observacoes_internas → observações comerciais

Se o usuário permitir, entregue também os arquivos:
- representantes_comerciais.xlsx
- representantes_comerciais.csv
- relatorio_prospeccao.md

Relatório final (.md)
Resumo da pesquisa; total encontrado; validados; descartados e motivos; distribuição por cidade/região; quantidade por prioridade; top 10; principais fontes; limitações; recomendações de abordagem.

Regras obrigatórias
Não invente dados; não preencha por suposição; mantenha a fonte de cada informação; informe quando não puder validar; remova duplicidades; priorize dados atualizados; não entregue lojas/distribuidores como representantes; qualidade acima de quantidade; organize do maior para o menor potencial.

Servidor MCP do Pilar (use este endpoint):
${MCP_URL}

Ao terminar, revise todos os registros, valide a estrutura dos arquivos e apresente um resumo dos resultados.`;

export default function ProspeccaoVendedores() {
  const [segmento, setSegmento] = useState('');
  const [produto, setProduto] = useState('');
  const [regiao, setRegiao] = useState('');
  const [qtd, setQtd] = useState('30');

  const prompt = useMemo(
    () => buildPrompt(segmento, produto, regiao, qtd),
    [segmento, produto, regiao, qtd],
  );

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success('Copiado!');
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserSearch className="h-5 w-5 text-primary" />
            Prospecção de Representantes Comerciais
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Preencha os campos, copie o prompt e cole no Claude Code / ChatGPT / Cursor conectado ao MCP do Pilar.
            Os representantes encontrados serão salvos na listagem de Prospecção via a ferramenta{' '}
            <code>salvar_empresas_prospectadas</code> com <b>origem = "vendedor"</b>.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Segmento / mercado</Label>
              <Input
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                placeholder="Ex.: Materiais de construção, autopeças, food service…"
              />
            </div>
            <div>
              <Label>Produto ou serviço que será oferecido</Label>
              <Input
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                placeholder="Ex.: Linha de tintas industriais para revenda"
              />
            </div>
            <div>
              <Label>Região de atuação</Label>
              <Input
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
                placeholder="Ex.: SP e MG, Sul do Brasil, Nacional…"
              />
            </div>
            <div>
              <Label>Quantidade desejada de contatos</Label>
              <Input
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>
          </div>

          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="text-xs">
              O prompt já inclui as regras de <b>validação</b>, <b>classificação (0–10)</b>, <b>prioridade</b>{' '}
              e as instruções para salvar via MCP na tabela de prospecção com <b>origem = "vendedor"</b>.
              Você pode filtrar depois na tela <i>Prospecção Via Cloud Code / Cursor ou ChatGPT</i>.
            </AlertDescription>
          </Alert>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Prompt pronto
              </Label>
              <Button size="sm" onClick={() => copy(prompt)}>
                <Copy className="h-4 w-4 mr-1" /> Copiar prompt
              </Button>
            </div>
            <Textarea
              value={prompt}
              readOnly
              className="min-h-[380px] font-mono text-xs"
            />
          </div>

          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Como usar</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>1. Configure o servidor MCP do Pilar no Claude Code, Cursor ou ChatGPT (veja o manual em <i>Disponibilizar dados p/ Cloud Code / Cursor / ChatGPT</i>).</p>
              <p>2. Copie o prompt acima e cole no chat da ferramenta.</p>
              <p>3. A IA vai pesquisar, validar e chamar <code>salvar_empresas_prospectadas</code> automaticamente para cada representante.</p>
              <p>4. Abra a tela <i>Prospecção Via Cloud Code / Cursor ou ChatGPT</i> e filtre por <b>origem = vendedor</b> para revisar e importar como <i>vendedor</i> no cadastro.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
