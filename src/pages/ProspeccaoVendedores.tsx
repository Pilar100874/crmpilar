import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, ArrowRight, Bot, CheckCircle2, Copy, Download, ExternalLink, HelpCircle, RefreshCw, Search,
  Sparkles, Terminal, Trash2, UserSearch, Wand2,
} from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { validateEmail } from '@/lib/validators';
import { maskWhatsApp, removeMask } from '@/lib/masks';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

const MCP_URL = 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mcp';

const copy = (t: string) => {
  navigator.clipboard.writeText(t);
  toast.success('Copiado!');
};

const normEmail = (v?: string | null) => {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  return validateEmail(s) ? s : null;
};
const normWhats = (v?: string | null) => {
  if (!v) return null;
  let d = removeMask(v);
  if (!d) return null;
  if (!d.startsWith('55')) d = '55' + d;
  d = d.substring(0, 13);
  return d.length >= 12 ? maskWhatsApp(d) : null;
};
const normSite = (v?: string | null) => {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  return s.startsWith('http') ? s : `https://${s.replace(/^\/+/, '')}`;
};

const buildPrompt = (seg: string, produto: string, regiao: string, qtd: string) => `Você é um agente de inteligência comercial especializado em prospecção B2B de REPRESENTANTES / VENDEDORES.

Sua tarefa é pesquisar, validar, organizar e entregar uma base de representantes comerciais ativos para o segmento informado.

Informações do projeto
Segmento ou mercado: ${seg || '[INFORME O SEGMENTO]'}
Produto ou serviço a oferecer: ${produto || '[DESCREVA O PRODUTO OU SERVIÇO]'}
Região de atuação: ${regiao || '[INFORME CIDADE, ESTADO, REGIÃO OU TODO O BRASIL]'}
Quantidade desejada: ${qtd || '[INFORME A QUANTIDADE]'}

Incluir apenas: representantes comerciais autônomos, escritórios de representação, representantes multimarcas, agentes comerciais B2B.
Excluir: lojas, distribuidores, atacadistas, fabricantes, marketplaces, vendedores internos, empresas apenas B2C.

Colete por representante: nome, empresa de representação, cidade, UF, região atendida, telefone, whatsapp, e-mail, site, LinkedIn, Instagram profissional, segmentos atendidos, marcas representadas, tipo de cliente atendido, evidência recente de atuação, fontes.

Classifique cada um com score 0–100 e prioridade (alta / media / baixa) considerando compatibilidade com segmento/produto/região, marcas na carteira e chance de aceitar nova representação.

Como salvar no Pilar (MCP)
Use OBRIGATORIAMENTE a ferramenta MCP \`salvar_empresas_prospectadas\` do servidor Pilar para cada lote de representantes encontrados. Para cada item, envie:
- nome → nome do representante ou da empresa de representação
- nome_fantasia → nome comercial usado
- email, telefone, whatsapp, site, cidade, estado (UF)
- descricao → "Representante comercial · Marcas: <marcas> · Segmentos: <segmentos> · Clientes: <tipo> · Evidência: <resumo>"
- redes_sociais → { "linkedin": "...", "instagram": "..." }
- fontes → [URLs]
- score (0-100), score_motivo, prioridade
- segmento_nome → segmento informado
- observacoes_internas → observações comerciais
- **origem → "vendedor"**  (OBRIGATÓRIO — isto é o que faz aparecer na listagem de Prospecção de Vendedores)

Regras: não invente dados; mantenha a fonte de cada informação; remova duplicidades; qualidade acima de quantidade; ordene do maior para o menor potencial.

Servidor MCP do Pilar: ${MCP_URL}

Ao terminar, apresente um resumo: total encontrado, validados, distribuição por região, top 10 e limitações.`;

const mcpConfigJson = `{
  "mcpServers": {
    "pilar": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

interface ProspRow {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  site: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  endereco: string | null;
  segmento_nome: string | null;
  descricao: string | null;
  redes_sociais: any;
  fontes: any;
  origem: string | null;
  status: string;
  empresa_id: string | null;
  importado_em: string | null;
  created_at: string;
  contato_nome?: string | null;
  contato_cargo?: string | null;
  score?: number | null;
  prioridade?: string | null;
  observacoes_internas?: string | null;
}

export default function ProspeccaoVendedores() {
  const [metodo, setMetodo] = useState<'wizard' | 'mcp' | null>(null);
  const [rows, setRows] = useState<ProspRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  // ----- Prompt builder state -----
  const [segmento, setSegmento] = useState('');
  const [produto, setProduto] = useState('');
  const [regiao, setRegiao] = useState('');
  const [qtd, setQtd] = useState('30');
  const prompt = useMemo(() => buildPrompt(segmento, produto, regiao, qtd), [segmento, produto, regiao, qtd]);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prospeccao_empresas')
      .select('*')
      .eq('origem', 'vendedor')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar: ' + error.message);
    else setRows((data ?? []) as ProspRow[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const filtradas = rows.filter((r) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      r.nome?.toLowerCase().includes(q) ||
      r.nome_fantasia?.toLowerCase().includes(q) ||
      r.cidade?.toLowerCase().includes(q) ||
      r.estado?.toLowerCase().includes(q) ||
      r.segmento_nome?.toLowerCase().includes(q)
    );
  });

  const toggle = (id: string) => {
    const n = new Set(selecionadas);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelecionadas(n);
  };
  const toggleAll = () => {
    if (selecionadas.size === filtradas.length) setSelecionadas(new Set());
    else setSelecionadas(new Set(filtradas.map((r) => r.id)));
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from('prospeccao_empresas').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir: ' + error.message);
    toast.success('Excluído');
    setRows((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  const importarSelecionadas = async () => {
    if (selecionadas.size === 0) return toast.info('Selecione ao menos um representante');
    const estabId = await getEstabelecimentoId();
    if (!estabId) return toast.error('Estabelecimento não encontrado');
    setImportando(true);
    let ok = 0, fail = 0;
    const erros: string[] = [];

    for (const id of selecionadas) {
      const r = rows.find((x) => x.id === id);
      if (!r || r.empresa_id) continue;

      const email = normEmail(r.email);
      const whatsapp = normWhats(r.whatsapp || r.telefone);
      const telefone = normWhats(r.telefone) || whatsapp;
      const site = normSite(r.site);
      const nome = r.nome?.trim() || '';
      if (!nome) { fail++; erros.push('(sem nome)'); continue; }

      const { data: emp, error } = await supabase
        .from('empresas')
        .insert({
          estabelecimento_id: estabId,
          nome,
          nome_fantasia: r.nome_fantasia?.trim() || null,
          email,
          telefone,
          whatsapp,
          whatsapps_vinculados: whatsapp ? [whatsapp] : [],
          endereco: r.endereco?.trim() || null,
          bairro: r.bairro?.trim() || null,
          cidade: r.cidade?.trim() || null,
          estado: r.estado?.trim()?.toUpperCase()?.substring(0, 2) || null,
          site,
          score_prospect: r.score ?? null,
          prioridade: r.prioridade ?? null,
          status_comercial: 'prospect',
          origem_prospeccao: r.origem || 'vendedor',
          tipo_cliente: 'vendedor',
          custom_fields: {
            descricao: r.descricao,
            redes_sociais: r.redes_sociais,
            fontes: r.fontes,
            segmento_nome: r.segmento_nome,
            contato_nome: r.contato_nome,
            contato_cargo: r.contato_cargo,
            observacoes_internas: r.observacoes_internas,
          },
        } as any)
        .select('id')
        .single();
      if (error || !emp) { fail++; erros.push(`${nome}: ${error?.message || 'erro'}`); continue; }

      // Segmento prospect (find-or-create com is_prospect=true)
      const segNome = (r.segmento_nome || '').trim();
      if (segNome) {
        try {
          let segId: string | null = null;
          const { data: existente } = await supabase
            .from('segmentos')
            .select('id, is_prospect')
            .eq('estabelecimento_id', estabId)
            .ilike('nome', segNome)
            .maybeSingle();
          if (existente?.id) {
            segId = existente.id;
            if (!(existente as any).is_prospect) {
              await supabase.from('segmentos').update({ is_prospect: true } as any).eq('id', segId);
            }
          } else {
            const { data: novo } = await supabase
              .from('segmentos')
              .insert({ nome: segNome, estabelecimento_id: estabId, is_prospect: true } as any)
              .select('id').single();
            segId = novo?.id ?? null;
          }
          if (segId) {
            await supabase.from('empresa_vinculos').insert({
              vendedor_id: emp.id,
              segmento_id: segId,
              estabelecimento_id: estabId,
            } as any);
          }
        } catch (e) { console.warn('Falha vínculo segmento prospect', e); }
      }

      await supabase
        .from('prospeccao_empresas')
        .update({ empresa_id: emp.id, status: 'importado', importado_em: new Date().toISOString() })
        .eq('id', r.id);
      ok++;
    }

    setImportando(false);
    setSelecionadas(new Set());
    if (ok > 0) toast.success(`${ok} importado(s) como vendedor prospect`);
    if (fail > 0) toast.error(`${fail} com erro: ${erros.slice(0, 3).join(' | ')}`);
    carregar();
  };

  return (
    <div className="p-4 space-y-4">
      {metodo === null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserSearch className="h-5 w-5 text-primary" />
              Prospecção de Representantes / Vendedores
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Escolha o método. Os resultados aparecem na listagem abaixo (origem = vendedor) e podem ser importados como <b>vendedor prospect</b>.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setMetodo('wizard')}
              className="text-left p-5 border-2 border-primary/30 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-6 w-6 text-primary" />
                <span className="font-semibold text-base">Usar o Wizard (mais fácil)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Preencha passos guiados e a IA busca representantes e insere direto na listagem.
              </p>
            </button>
            <button
              onClick={() => setMetodo('mcp')}
              className="text-left p-5 border-2 border-primary/30 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-6 w-6 text-primary" />
                <span className="font-semibold text-base">Usar Claude / ChatGPT / Cursor</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Copie um prompt pronto e peça ao seu assistente conectado ao Pilar via MCP.
              </p>
            </button>
          </CardContent>
        </Card>
      )}

      {metodo !== null && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMetodo(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Trocar método
          </Button>
          <Badge variant="outline" className="gap-1">
            {metodo === 'wizard' ? <><Wand2 className="h-3 w-3" /> Modo Wizard</> : <><Terminal className="h-3 w-3" /> Modo Claude / ChatGPT / Cursor</>}
          </Badge>
        </div>
      )}

      {metodo === 'wizard' && (
        <VendedorWizard
          segmento={segmento} setSegmento={setSegmento}
          produto={produto} setProduto={setProduto}
          regiao={regiao} setRegiao={setRegiao}
          qtd={qtd} setQtd={setQtd}
          prompt={prompt}
          onSaltarParaLista={carregar}
        />
      )}

      {metodo === 'mcp' && (
        <>
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Manual do Modo Claude / ChatGPT / Cursor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-primary" /> Modo Direto (MCP) — Vendedores
                  </DialogTitle>
                  <DialogDescription>
                    Conecte seu assistente ao Pilar via MCP e peça a prospecção de representantes.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Conecte seu assistente ao servidor MCP do Pilar (veja o card <em>Como conectar</em> abaixo).</li>
                    <li>Login compartilhado: <code>pilar@pilar.com.br</code> / <code>Ceotto2468</code>.</li>
                    <li>Preencha os campos do <b>gerador de prompt</b> e clique em <b>Copiar prompt</b>.</li>
                    <li>Cole no chat do Claude / ChatGPT / Cursor. A IA vai pesquisar e chamar <code>salvar_empresas_prospectadas</code> com <b>origem = "vendedor"</b>.</li>
                    <li>Volte aqui, clique em <b>Atualizar</b>, revise e clique em <b>Importar selecionados</b> — vira <b>vendedor prospect</b> no cadastro.</li>
                  </ol>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="h-4 w-4 text-primary" />
                Gerador de prompt para representantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Segmento / mercado</Label>
                  <Input value={segmento} onChange={(e) => setSegmento(e.target.value)} placeholder="Ex.: Materiais de construção, autopeças, food service…" />
                </div>
                <div>
                  <Label>Produto / serviço a oferecer</Label>
                  <Input value={produto} onChange={(e) => setProduto(e.target.value)} placeholder="Ex.: Linha de tintas industriais para revenda" />
                </div>
                <div>
                  <Label>Região</Label>
                  <Input value={regiao} onChange={(e) => setRegiao(e.target.value)} placeholder="Ex.: SP e MG, Sul, Nacional…" />
                </div>
                <div>
                  <Label>Quantidade desejada</Label>
                  <Input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2"><Terminal className="h-4 w-4" /> Prompt pronto</Label>
                  <Button size="sm" onClick={() => copy(prompt)}>
                    <Copy className="h-4 w-4 mr-1" /> Copiar prompt
                  </Button>
                </div>
                <Textarea value={prompt} readOnly className="min-h-[320px] font-mono text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4 text-primary" />
                Como conectar seu assistente ao Pilar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 bg-muted p-3 rounded font-mono text-xs">
                <code className="flex-1 break-all">{MCP_URL}</code>
                <Button size="sm" variant="ghost" onClick={() => copy(MCP_URL)}><Copy className="h-3 w-3" /></Button>
              </div>

              <div className="border rounded-lg p-3 bg-muted/20">
                <div className="font-medium mb-2">🖥️ Claude Code</div>
                <div className="flex items-center gap-2 bg-background p-2 rounded font-mono text-xs mb-1">
                  <code className="flex-1 break-all">claude mcp add --transport http pilar {MCP_URL}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(`claude mcp add --transport http pilar ${MCP_URL}`)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-muted/20">
                <div className="font-medium mb-2">💬 ChatGPT / Claude Desktop</div>
                <p className="text-muted-foreground">Settings → Connectors → Add connector. URL: cole a URL acima. Auth: OAuth. Faça login com <code>pilar@pilar.com.br</code>.</p>
              </div>

              <div className="border rounded-lg p-3 bg-muted/20">
                <div className="font-medium mb-2">✏️ Cursor — <code>~/.cursor/mcp.json</code></div>
                <div className="flex items-start gap-2 bg-background p-2 rounded font-mono text-xs">
                  <pre className="flex-1 whitespace-pre-wrap break-all">{mcpConfigJson}</pre>
                  <Button size="sm" variant="ghost" onClick={() => copy(mcpConfigJson)}><Copy className="h-3 w-3" /></Button>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>🔐 Login compartilhado:</strong> <code>pilar@pilar.com.br</code> / <code>Ceotto2468</code>. Assim toda a equipe enxerga as prospecções.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Representantes prospectados
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Registros trazidos com <code>origem = "vendedor"</code>. Revise e importe para o cadastro de vendedores.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={importarSelecionadas} disabled={importando || selecionadas.size === 0}>
              <Download className="h-4 w-4 mr-2" />
              Importar selecionados ({selecionadas.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, cidade, UF, segmento…" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={filtradas.length > 0 && selecionadas.size === filtradas.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Prior.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      Nenhum representante prospectado ainda. Use o Wizard ou o modo Claude/ChatGPT/Cursor acima.
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox checked={selecionadas.has(r.id)} onCheckedChange={() => toggle(r.id)} disabled={!!r.empresa_id} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.nome}</div>
                      {r.nome_fantasia && <div className="text-xs text-muted-foreground">{r.nome_fantasia}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{[r.cidade, r.estado].filter(Boolean).join(' / ') || '-'}</TableCell>
                    <TableCell className="text-sm">{r.whatsapp || '-'}</TableCell>
                    <TableCell className="text-sm">{r.telefone || '-'}</TableCell>
                    <TableCell className="text-sm">{r.email || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {r.site ? (
                        <a href={r.site.startsWith('http') ? r.site : `https://${r.site}`} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                          Abrir <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{r.segmento_nome || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {r.score != null ? (
                        <Badge variant={r.score >= 70 ? 'default' : 'secondary'}>{r.score}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{r.prioridade || '-'}</TableCell>
                    <TableCell>
                      {r.empresa_id ? <Badge variant="default">Importado</Badge> : <Badge variant="secondary">Novo</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        onConfirm={() => confirmDelete && excluir(confirmDelete)}
        title="Excluir prospecção"
        description="Tem certeza que deseja excluir este representante da prospecção?"
      />
    </div>
  );
}
