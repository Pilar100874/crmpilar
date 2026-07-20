import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { RefreshCw, Trash2, Download, ExternalLink, Search, Bot, Copy, Terminal, Sparkles, HelpCircle, Wand2 } from 'lucide-react';
import WizardProspeccao from './WizardProspeccao';

import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { validateCNPJ, validateEmail } from '@/lib/validators';
import { maskCNPJ, maskCEP, maskWhatsApp, removeMask } from '@/lib/masks';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

// ===== Helpers de normalização/enriquecimento =====
const UF_VALIDAS = new Set(['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']);

const normEmail = (v?: string | null): string | null => {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  return validateEmail(s) ? s : null;
};

const normUF = (v?: string | null): string | null => {
  if (!v) return null;
  const s = v.trim().toUpperCase().substring(0, 2);
  return UF_VALIDAS.has(s) ? s : null;
};

const normCNPJ = (v?: string | null): string | null => {
  if (!v) return null;
  const d = removeMask(v);
  if (d.length !== 14 || !validateCNPJ(d)) return null;
  return maskCNPJ(d);
};

const normCEP = (v?: string | null): string | null => {
  if (!v) return null;
  const d = removeMask(v).substring(0, 8);
  return d.length === 8 ? maskCEP(d) : null;
};

const normWhats = (v?: string | null): string | null => {
  if (!v) return null;
  let d = removeMask(v);
  if (!d) return null;
  if (!d.startsWith('55')) d = '55' + d;
  d = d.substring(0, 13);
  return d.length >= 12 ? maskWhatsApp(d) : null;
};

const normSite = (v?: string | null): string | null => {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  return s.startsWith('http') ? s : `https://${s.replace(/^\/+/, '')}`;
};

// Enriquecer via BrasilAPI (CNPJ → Receita)
const fetchCNPJ = async (cnpjDigits: string): Promise<any | null> => {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
};

// Enriquecer via ViaCEP
const fetchCEP = async (cepDigits: string): Promise<any | null> => {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
    if (!r.ok) return null;
    const d = await r.json();
    return d?.erro ? null : d;
  } catch { return null; }
};


const MCP_URL = 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mcp';

const copy = (t: string) => {
  navigator.clipboard.writeText(t);
  toast.success('Copiado!');
};

const exemplosPrompt = [
  {
    titulo: '10 indústrias de embalagem em SP com WhatsApp',
    prompt:
      'Pesquise na web 10 indústrias de embalagem plástica no estado de SP que tenham WhatsApp e site. Para cada uma, colete: nome, nome fantasia, CNPJ (se disponível), WhatsApp, e-mail, site, cidade, UF, e uma breve descrição. Depois adicione todas na Prospecção do Pilar usando salvar_empresas_prospectadas.',
  },
  {
    titulo: '20 restaurantes em Curitiba',
    prompt:
      'Pesquise 20 restaurantes bem avaliados em Curitiba/PR com WhatsApp e Instagram. Adicione na Prospecção do Pilar (salvar_empresas_prospectadas) com nome, whatsapp, endereço, cidade, UF, redes_sociais.instagram e descrição.',
  },
  {
    titulo: 'Concorrentes de um segmento',
    prompt:
      'Encontre 15 concorrentes brasileiros da empresa "X" (segmento: SaaS de gestão). Use salvar_empresas_prospectadas com nome, site, e-mail comercial, cidade, UF, descrição e linkedin em redes_sociais.',
  },
];

const mcpConfigJson = `{
  "mcpServers": {
    "pilar": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

interface ProspeccaoRow {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  site: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  cep: string | null;
  endereco: string | null;
  cnae_principal: string | null;
  cnae_descricao: string | null;
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
  contato_email?: string | null;
  contato_telefone?: string | null;
  porte?: string | null;
  faturamento_estimado?: string | null;
  funcionarios_estimado?: string | null;
  data_fundacao?: string | null;
  situacao_cadastral?: string | null;
  score?: number | null;
  score_motivo?: string | null;
  produtos_interesse?: any;
  prioridade?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tags?: any;
  observacoes_internas?: string | null;
}

export default function ProspeccaoEmpresas() {
  const [rows, setRows] = useState<ProspeccaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prospeccao_empresas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar: ' + error.message);
    else setRows((data ?? []) as ProspeccaoRow[]);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = rows.filter((r) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      r.nome?.toLowerCase().includes(q) ||
      r.nome_fantasia?.toLowerCase().includes(q) ||
      r.cnpj?.toLowerCase().includes(q) ||
      r.cidade?.toLowerCase().includes(q) ||
      r.estado?.toLowerCase().includes(q) ||
      r.segmento_nome?.toLowerCase().includes(q)
    );
  });

  const toggle = (id: string) => {
    const n = new Set(selecionadas);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelecionadas(n);
  };

  const toggleAll = () => {
    if (selecionadas.size === filtradas.length) setSelecionadas(new Set());
    else setSelecionadas(new Set(filtradas.map((r) => r.id)));
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from('prospeccao_empresas').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir: ' + error.message);
    toast.success('Excluída');
    setRows((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  const importarSelecionadas = async () => {
    if (selecionadas.size === 0) return toast.info('Selecione ao menos uma empresa');
    const estabId = await getEstabelecimentoId();
    if (!estabId) return toast.error('Estabelecimento não encontrado para o usuário atual');
    setImportando(true);
    let ok = 0, fail = 0, enriquecidos = 0;
    const errosDetalhe: string[] = [];

    for (const id of selecionadas) {
      const r = rows.find((x) => x.id === id);
      if (!r || r.empresa_id) continue;

      // ===== 1) Normalização básica =====
      let cnpj = normCNPJ(r.cnpj);
      let cep = normCEP(r.cep);
      let uf = normUF(r.estado);
      const email = normEmail(r.email);
      const whatsapp = normWhats(r.whatsapp || r.telefone);
      let telefone = normWhats(r.telefone);
      const site = normSite(r.site);

      let nome = r.nome?.trim() || '';
      let nome_fantasia = r.nome_fantasia?.trim() || null;
      let endereco = r.endereco?.trim() || null;
      let bairro = r.bairro?.trim() || null;
      let cidade = r.cidade?.trim() || null;
      let cnae_principal = r.cnae_principal?.trim() || null;
      let cnae_descricao = r.cnae_descricao?.trim() || null;

      // ===== 2) Enriquecer via CNPJ (Receita/BrasilAPI) =====
      if (cnpj) {
        const dig = removeMask(cnpj);
        const receita = await fetchCNPJ(dig);
        if (receita) {
          enriquecidos++;
          nome = nome || receita.razao_social || receita.nome_fantasia || '';
          nome_fantasia = nome_fantasia || receita.nome_fantasia || null;
          if (!endereco) {
            const tipo = receita.descricao_tipo_de_logradouro || '';
            const log = receita.logradouro || '';
            const num = receita.numero ? `, ${receita.numero}` : '';
            const comp = receita.complemento ? ` - ${receita.complemento}` : '';
            endereco = `${tipo} ${log}${num}${comp}`.trim() || null;
          }
          bairro = bairro || receita.bairro || null;
          cidade = cidade || receita.municipio || null;
          uf = uf || normUF(receita.uf);
          cep = cep || normCEP(receita.cep);
          cnae_principal = cnae_principal || (receita.cnae_fiscal ? String(receita.cnae_fiscal) : null);
          cnae_descricao = cnae_descricao || receita.cnae_fiscal_descricao || null;
          // Enriquecer telefone a partir da Receita se ainda não temos
          if (!telefone) {
            const telReceita = normWhats(receita.ddd_telefone_1 || receita.ddd_telefone_2 || '');
            if (telReceita) telefone = telReceita;
          }
        }
      }

      // Fallback: se ainda não temos telefone, usar o whatsapp
      if (!telefone) telefone = whatsapp;

      // ===== 3) Enriquecer via CEP (ViaCEP) se ainda faltar endereço/cidade/UF =====
      if (cep && (!endereco || !cidade || !uf || !bairro)) {
        const via = await fetchCEP(removeMask(cep));
        if (via) {
          enriquecidos++;
          endereco = endereco || via.logradouro || null;
          bairro = bairro || via.bairro || null;
          cidade = cidade || via.localidade || null;
          uf = uf || normUF(via.uf);
        }
      }

      // ===== 4) Validações mínimas =====
      if (!nome) {
        fail++;
        errosDetalhe.push(`${r.nome || '(sem nome)'}: nome obrigatório`);
        continue;
      }

      const { data: emp, error } = await supabase
        .from('empresas')
        .insert({
          estabelecimento_id: estabId,
          nome,
          nome_fantasia,
          cnpj,
          email,
          telefone,
          whatsapp,
          whatsapps_vinculados: whatsapp ? [whatsapp] : [],
          endereco,
          bairro,
          cidade,
          estado: uf,
          cep,
          cnae_principal,
          cnae_descricao,
          site,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          porte: r.porte ?? null,
          faturamento_estimado: r.faturamento_estimado ?? null,
          funcionarios_estimado: r.funcionarios_estimado ?? null,
          data_fundacao: r.data_fundacao ?? null,
          situacao_cadastral: r.situacao_cadastral ?? null,
          score_prospect: r.score ?? null,
          score_motivo: r.score_motivo ?? null,
          produtos_interesse: r.produtos_interesse ?? [],
          prioridade: r.prioridade ?? null,
          status_comercial: 'prospect',
          origem_prospeccao: r.origem || 'claude-code',
          tipo_cliente: 'B2B',
          custom_fields: {
            descricao: r.descricao,
            redes_sociais: r.redes_sociais,
            fontes: r.fontes,
            segmento_nome: r.segmento_nome,
            contato_nome: r.contato_nome,
            contato_cargo: r.contato_cargo,
            contato_email: r.contato_email,
            contato_telefone: r.contato_telefone,
            tags: r.tags,
            observacoes_internas: r.observacoes_internas,
          },
        } as any)
        .select('id')
        .single();
      if (error || !emp) {
        fail++;
        errosDetalhe.push(`${nome}: ${error?.message || 'erro'}`);
        continue;
      }

      // Vincular segmento de prospect (find-or-create com is_prospect=true)
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
              .select('id')
              .single();
            segId = novo?.id ?? null;
          }
          if (segId) {
            await supabase
              .from('empresa_vinculos')
              .insert({
                empresa_id: emp.id,
                segmento_id: segId,
                estabelecimento_id: estabId,
              } as any);
          }
        } catch (e) {
          console.warn('Falha ao vincular segmento prospect', e);
        }
      }

      // Criar contato (prospect) vinculado à empresa, se veio decisor
      if (r.contato_nome) {
        try {
          const telContato = normWhats(r.contato_telefone) || normWhats(r.contato_telefone) || (r.contato_telefone ?? null);
          await supabase.from('customers').insert({
            estabelecimento_id: estabId,
            empresa_id: emp.id,
            nome: r.contato_nome,
            telefone: telContato,
            email: normEmail(r.contato_email),
            tipo_operador: false, // false = prospect
            custom_fields: {
              position: r.contato_cargo || null,
              origem: r.origem || 'claude-code',
            },
          } as any);
        } catch (e) {
          console.warn('Falha ao criar contato prospect', e);
        }
      }

      await supabase
        .from('prospeccao_empresas')
        .update({ empresa_id: emp.id, status: 'importado', importado_em: new Date().toISOString() })
        .eq('id', r.id);
      ok++;
    }

    setImportando(false);
    setSelecionadas(new Set());
    if (ok > 0) toast.success(`${ok} importadas como prospect${enriquecidos ? ` · ${enriquecidos} enriquecimentos (Receita/CEP)` : ''}`);
    if (fail > 0) toast.error(`${fail} com erro: ${errosDetalhe.slice(0, 3).join(' | ')}${errosDetalhe.length > 3 ? '…' : ''}`);
    carregar();
  };


  return (
    <div className="p-4 space-y-4">
      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4 text-primary" />
                Como usar — pesquisar na internet e trazer para o Pilar
                <Badge variant="outline" className="ml-auto">clique para expandir/recolher</Badge>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  Esta tela recebe empresas que o <strong>Claude Code</strong>, <strong>Claude Desktop</strong>, <strong>ChatGPT</strong> ou <strong>Cursor</strong>{' '}
                  pesquisou na internet e enviou ao Pilar via MCP. Aqui você <strong>revisa</strong>, <strong>seleciona</strong> e <strong>importa</strong> as empresas para o cadastro definitivo.
                </AlertDescription>
              </Alert>

              <div>
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> 1. Conectar o assistente ao Pilar (uma vez só)
                </div>
                <p className="text-muted-foreground mb-3">
                  A URL do servidor MCP do Pilar é sempre a mesma. Copie e use no seu assistente favorito:
                </p>
                <div className="flex items-center gap-2 bg-muted p-3 rounded font-mono text-xs mb-4">
                  <code className="flex-1 break-all">{MCP_URL}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(MCP_URL)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Claude Code */}
                <div className="border rounded-lg p-3 mb-3 bg-muted/20">
                  <div className="font-medium mb-2">🖥️ Claude Code (terminal)</div>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground mb-2">
                    <li>Abra o terminal em qualquer pasta.</li>
                    <li>Rode o comando abaixo:</li>
                  </ol>
                  <div className="flex items-center gap-2 bg-background p-2 rounded font-mono text-xs mb-2">
                    <code className="flex-1 break-all">claude mcp add --transport http pilar {MCP_URL}</code>
                    <Button size="sm" variant="ghost" onClick={() => copy(`claude mcp add --transport http pilar ${MCP_URL}`)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <ol start={3} className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground">
                    <li>Rode <code className="bg-background px-1 rounded">claude</code> e digite <code className="bg-background px-1 rounded">/mcp</code> — deve aparecer <strong>pilar</strong> como "connected".</li>
                    <li>Na primeira chamada de ferramenta, abrirá o navegador para você <strong>fazer login no Pilar e autorizar</strong>.</li>
                  </ol>
                </div>

                {/* ChatGPT */}
                <div className="border rounded-lg p-3 mb-3 bg-muted/20">
                  <div className="font-medium mb-2">💬 ChatGPT (Plus / Pro / Business)</div>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground">
                    <li>Abra <strong>chatgpt.com</strong> → <strong>Settings</strong> → <strong>Connectors</strong> (ou "Conectores").</li>
                    <li>Clique <strong>Add connector</strong> / <strong>New connector</strong>.</li>
                    <li>Nome: <code className="bg-background px-1 rounded">Pilar</code></li>
                    <li>MCP Server URL: cole a URL acima.</li>
                    <li>Authentication: <strong>OAuth</strong> (o ChatGPT descobre sozinho).</li>
                    <li>Clique <strong>Create</strong> → faça login no Pilar → <strong>Autorizar</strong>.</li>
                    <li>Em qualquer chat, clique no ícone <strong>+</strong> e selecione o conector <strong>Pilar</strong> para ativá-lo.</li>
                  </ol>
                </div>

                {/* Claude Desktop */}
                <div className="border rounded-lg p-3 mb-3 bg-muted/20">
                  <div className="font-medium mb-2">🤖 Claude Desktop (Mac / Windows)</div>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground">
                    <li>Abra o Claude Desktop → <strong>Settings</strong> → <strong>Connectors</strong>.</li>
                    <li>Clique <strong>Add custom connector</strong>.</li>
                    <li>Name: <code className="bg-background px-1 rounded">Pilar</code></li>
                    <li>URL: cole a URL acima.</li>
                    <li>Clique <strong>Add</strong> → faça login no Pilar → <strong>Autorizar</strong>.</li>
                    <li>Nas conversas, verifique se o conector <strong>Pilar</strong> aparece ativo (ícone de plug).</li>
                  </ol>
                </div>

                {/* Cursor */}
                <div className="border rounded-lg p-3 mb-3 bg-muted/20">
                  <div className="font-medium mb-2">✏️ Cursor</div>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground mb-2">
                    <li>Cursor → <strong>Settings</strong> (⌘ + ,) → <strong>MCP</strong> → <strong>Add new MCP server</strong>.</li>
                    <li>Escolha <strong>Edit config</strong> e cole o JSON abaixo em <code className="bg-background px-1 rounded">~/.cursor/mcp.json</code>:</li>
                  </ol>
                  <div className="flex items-start gap-2 bg-background p-2 rounded font-mono text-xs mb-2">
                    <pre className="flex-1 whitespace-pre-wrap break-all">{mcpConfigJson}</pre>
                    <Button size="sm" variant="ghost" onClick={() => copy(mcpConfigJson)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <ol start={3} className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground">
                    <li>Salve, volte no Cursor — o servidor <strong>pilar</strong> aparece na lista com bolinha verde.</li>
                    <li>Na primeira chamada, autorize via OAuth no navegador.</li>
                  </ol>
                </div>

                <Alert className="mt-2 border-primary/40">
                  <AlertDescription className="text-xs space-y-2">
                    <div>
                      <strong>🔐 Login compartilhado (recomendado para MCP):</strong> na primeira execução de qualquer ferramenta,
                      abrirá uma janela de login. Use SEMPRE a conta compartilhada abaixo (não use seu login pessoal) — assim
                      todas as prospecções entram no mesmo pote e qualquer pessoa da equipe enxerga:
                    </div>
                    <div className="bg-muted/60 p-2 rounded font-mono text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">E-mail:</span>
                        <code className="flex-1">pilar@pilar.com.br</code>
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copy('pilar@pilar.com.br')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">Senha:</span>
                        <code className="flex-1">Ceotto2468</code>
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copy('Ceotto2468')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      Depois de autorizado, o assistente age como esse usuário respeitando o RLS. Se preferir prospecções
                      privadas por pessoa, cada um pode usar o próprio login — mas aí só quem prospectou verá os dados aqui.
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              <div>
                <div className="font-semibold mb-2">2. Peça a pesquisa em linguagem natural</div>
                <p className="text-muted-foreground mb-2">
                  Deixe claro <strong>o que pesquisar</strong>, <strong>onde</strong> (cidade/UF/segmento) e <strong>quais campos coletar</strong>.
                  O assistente usa automaticamente a ferramenta{' '}
                  <code className="bg-muted px-1 rounded">salvar_empresa_prospectada</code> (uma empresa) ou{' '}
                  <code className="bg-muted px-1 rounded">salvar_empresas_prospectadas</code> (várias de uma vez).
                </p>
                <div className="space-y-2">
                  {exemplosPrompt.map((ex, i) => (
                    <div key={i} className="border rounded p-3 bg-muted/30">
                      <div className="font-medium text-xs uppercase text-muted-foreground mb-1">{ex.titulo}</div>
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm italic">"{ex.prompt}"</p>
                        <Button size="sm" variant="ghost" onClick={() => copy(ex.prompt)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              <div>
                <div className="font-semibold mb-2">3. Campos que o assistente pode preencher</div>
                <p className="text-muted-foreground mb-2">
                  Peça explicitamente para o assistente coletar o máximo desses campos ao pesquisar:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                  {[
                    'nome', 'nome_fantasia', 'cnpj', 'email', 'telefone', 'whatsapp',
                    'site', 'endereco', 'bairro', 'cidade', 'estado (UF)', 'cep',
                    'cnae_principal', 'cnae_descricao', 'segmento_nome', 'descricao',
                    'redes_sociais.instagram', 'redes_sociais.facebook',
                    'redes_sociais.linkedin', 'redes_sociais.youtube', 'redes_sociais.tiktok',
                    'fontes (URLs)',
                  ].map((c) => (
                    <Badge key={c} variant="secondary" className="justify-start font-mono">{c}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold mb-2">4. Revisar e importar</div>
                <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
                  <li>Clique em <strong>Atualizar</strong> para carregar o que o assistente enviou.</li>
                  <li>Marque as linhas que quiser importar (ou o checkbox do cabeçalho para todas).</li>
                  <li>Clique em <strong>Importar selecionadas</strong> — as empresas viram cadastro em <strong>Listas → Empresas</strong>.</li>
                  <li>O que já foi importado aparece com o selo <Badge variant="default" className="ml-1">Importado</Badge> e não pode ser importado de novo.</li>
                </ol>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Dica:</strong> se o assistente disser "não tenho ferramenta para isso", confirme que ele está conectado ao servidor MCP{' '}
                  <code className="bg-muted px-1 rounded">pilar</code> e que fez o login. Você só vê aqui as prospecções feitas <strong>com o seu usuário</strong>.
                </AlertDescription>
              </Alert>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Prospecção Via Cloud Code / Cursor ou ChatGPT
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Empresas trazidas via Claude Code / ChatGPT (MCP). Revise e importe para o cadastro definitivo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={importarSelecionadas}
              disabled={importando || selecionadas.size === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Importar selecionadas ({selecionadas.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ, cidade, UF, segmento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtradas.length > 0 && selecionadas.size === filtradas.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Porte</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Prior.</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtradas.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                      Nenhuma prospecção ainda. Peça ao Claude Code / ChatGPT para pesquisar empresas na web e trazer para cá.
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selecionadas.has(r.id)}
                        onCheckedChange={() => toggle(r.id)}
                        disabled={!!r.empresa_id}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.nome}</div>
                      {r.nome_fantasia && (
                        <div className="text-xs text-muted-foreground">{r.nome_fantasia}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.cnpj || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {[r.cidade, r.estado].filter(Boolean).join(' / ') || '-'}
                    </TableCell>
                    <TableCell className="text-sm">{r.whatsapp || '-'}</TableCell>
                    <TableCell className="text-sm">{r.telefone || '-'}</TableCell>
                    <TableCell className="text-sm">{r.email || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {r.site ? (
                        <a
                          href={r.site.startsWith('http') ? r.site : `https://${r.site}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          Abrir <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.segmento_nome || '-'}</TableCell>
                    <TableCell className="text-sm">{(r as any).porte || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {(r as any).score != null ? (
                        <Badge variant={((r as any).score >= 70) ? 'default' : 'secondary'}>{(r as any).score}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{(r as any).prioridade || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {(r as any).contato_nome ? (
                        <div>
                          <div className="font-medium">{(r as any).contato_nome}</div>
                          {(r as any).contato_cargo && (
                            <div className="text-xs text-muted-foreground">{(r as any).contato_cargo}</div>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {r.empresa_id ? (
                        <Badge variant="default">Importado</Badge>
                      ) : (
                        <Badge variant="secondary">Novo</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(r.id)}
                      >
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
        description="Tem certeza que deseja excluir esta empresa da prospecção?"
      />
    </div>
  );
}
