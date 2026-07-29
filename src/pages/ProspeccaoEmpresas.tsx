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
import { RefreshCw, Trash2, Download, ExternalLink, Search, Bot, Copy, Terminal, Sparkles, HelpCircle, Wand2, ChevronDown as ArrowDown, ArrowLeft, FileText, Eraser } from 'lucide-react';
import { gerarPdfProspeccao } from '@/lib/prospeccaoPdf';
import WizardProspeccao from './WizardProspeccao';

import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { validateCNPJ, validateEmail } from '@/lib/validators';
import { maskCNPJ, maskCEP, maskWhatsApp, removeMask } from '@/lib/masks';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { buscarCNPJ } from '@/lib/cadastros/cnpjService';
import { buscarCEP } from '@/lib/cadastros/cepService';

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

// Consultas CNPJ/CEP são feitas pelo serviço unificado (cache + cancelamento):
// `buscarCNPJ` e `buscarCEP` de `@/lib/cadastros/*`. Não replique fetches aqui.




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

type CampoOrigem = 'prospect' | 'receita' | 'cep';
interface PreviewImportItem {
  rowId: string;
  nomeOriginal: string;
  payload: Record<string, any>;
  origens: Record<string, CampoOrigem>;
  enriquecido: boolean;
  aviso?: string;
}

export default function ProspeccaoEmpresas() {
  const [rows, setRows] = useState<ProspeccaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [importando, setImportando] = useState(false);
  const [preparandoPreview, setPreparandoPreview] = useState(false);
  const [previewImport, setPreviewImport] = useState<PreviewImportItem[] | null>(null);
  const [metodo, setMetodo] = useState<'wizard' | 'mcp' | null>(null);

  const limparTudo = async () => {
    const ids = filtradas.map((r) => r.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from('prospeccao_empresas').delete().in('id', ids);
    if (error) return toast.error('Erro ao limpar: ' + error.message);
    toast.success(`${ids.length} registro(s) excluído(s)`);
    setSelecionadas(new Set());
    setConfirmClearAll(false);
    carregar();
  };

  const exportarPdf = () => {
    const alvo = selecionadas.size > 0 ? filtradas.filter((r) => selecionadas.has(r.id)) : filtradas;
    if (alvo.length === 0) return toast.info('Nenhum registro para exportar');
    gerarPdfProspeccao(
      'Prospecção de Empresas',
      [
        { header: 'Nome', key: 'nome' },
        { header: 'CNPJ', key: 'cnpj' },
        { header: 'Cidade', key: 'cidade' },
        { header: 'UF', key: 'estado' },
        { header: 'WhatsApp', key: 'whatsapp' },
        { header: 'Telefone', key: 'telefone' },
        { header: 'E-mail', key: 'email' },
        { header: 'Site', key: 'site' },
        { header: 'Segmento', key: 'segmento_nome' },
        { header: 'Origem', key: 'origem' },
        { header: 'Status', key: 'status' },
      ],
      alvo,
      `prospeccao-empresas-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  };

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

  // Etapa 1: monta o preview enriquecido via Receita + CEP (sem gravar nada)
  const prepararImportacao = async () => {
    if (selecionadas.size === 0) return toast.info('Selecione ao menos uma empresa');
    setPreparandoPreview(true);
    const previews: PreviewImportItem[] = [];

    for (const id of selecionadas) {
      const r = rows.find((x) => x.id === id);
      if (!r || r.empresa_id) continue;

      const origens: Record<string, CampoOrigem> = {};
      const set = (k: string, v: any, origem: CampoOrigem) => {
        if (v === undefined || v === null || v === '') return;
        if (origens[k]) return; // primeiro que preencheu vence
        origens[k] = origem;
      };

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

      set('nome', nome, 'prospect');
      set('nome_fantasia', nome_fantasia, 'prospect');
      set('cnpj', cnpj, 'prospect');
      set('email', email, 'prospect');
      set('telefone', telefone, 'prospect');
      set('whatsapp', whatsapp, 'prospect');
      set('site', site, 'prospect');
      set('endereco', endereco, 'prospect');
      set('bairro', bairro, 'prospect');
      set('cidade', cidade, 'prospect');
      set('estado', uf, 'prospect');
      set('cep', cep, 'prospect');
      set('cnae_principal', cnae_principal, 'prospect');
      set('cnae_descricao', cnae_descricao, 'prospect');

      let enriquecido = false;
      let porte = r.porte ?? null;
      let situacao_cadastral = r.situacao_cadastral ?? null;
      let data_fundacao = r.data_fundacao ?? null;

      if (cnpj) {
        const receita = await buscarCNPJ(removeMask(cnpj));
        if (receita) {
          enriquecido = true;
          if (!nome && (receita.razaoSocial || receita.nomeFantasia)) {
            nome = receita.razaoSocial || receita.nomeFantasia || '';
            set('nome', nome, 'receita');
          }
          if (!nome_fantasia && receita.nomeFantasia) {
            nome_fantasia = receita.nomeFantasia;
            set('nome_fantasia', nome_fantasia, 'receita');
          }
          if (!endereco) {
            const num = receita.numero ? `, ${receita.numero}` : '';
            const comp = receita.complemento ? ` - ${receita.complemento}` : '';
            const e = `${receita.logradouro || ''}${num}${comp}`.trim();
            if (e) { endereco = e; set('endereco', endereco, 'receita'); }
          }
          if (!bairro && receita.bairro) { bairro = receita.bairro; set('bairro', bairro, 'receita'); }
          if (!cidade && receita.cidade) { cidade = receita.cidade; set('cidade', cidade, 'receita'); }
          if (!uf && receita.uf) { uf = normUF(receita.uf); set('estado', uf, 'receita'); }
          if (!cep && receita.cep) { cep = normCEP(receita.cep); set('cep', cep, 'receita'); }
          if (!cnae_principal && receita.cnaePrincipal?.codigo) {
            cnae_principal = receita.cnaePrincipal.codigo;
            set('cnae_principal', cnae_principal, 'receita');
          }
          if (!cnae_descricao && receita.cnaePrincipal?.descricao) {
            cnae_descricao = receita.cnaePrincipal.descricao;
            set('cnae_descricao', cnae_descricao, 'receita');
          }
          if (!telefone && receita.telefone) {
            const t = normWhats(receita.telefone);
            if (t) { telefone = t; set('telefone', telefone, 'receita'); }
          }
          if (!porte && (receita as any).porte) { porte = (receita as any).porte; set('porte', porte, 'receita'); }
          if (!situacao_cadastral && (receita as any).situacaoCadastral) {
            situacao_cadastral = (receita as any).situacaoCadastral;
            set('situacao_cadastral', situacao_cadastral, 'receita');
          }
          if (!data_fundacao && (receita as any).dataAbertura) {
            data_fundacao = (receita as any).dataAbertura;
            set('data_fundacao', data_fundacao, 'receita');
          }
        }
      }
      if (!telefone) telefone = whatsapp;

      if (cep && (!endereco || !cidade || !uf || !bairro)) {
        const via = await buscarCEP(removeMask(cep));
        if (via) {
          enriquecido = true;
          if (!endereco && via.logradouro) { endereco = via.logradouro; set('endereco', endereco, 'cep'); }
          if (!bairro && via.bairro) { bairro = via.bairro; set('bairro', bairro, 'cep'); }
          if (!cidade && via.cidade) { cidade = via.cidade; set('cidade', cidade, 'cep'); }
          if (!uf && via.uf) { uf = normUF(via.uf); set('estado', uf, 'cep'); }
        }
      }

      const payload = {
        rowRef: r,
        nome, nome_fantasia, cnpj, email, telefone, whatsapp, site,
        endereco, bairro, cidade, estado: uf, cep,
        cnae_principal, cnae_descricao,
        porte, situacao_cadastral, data_fundacao,
      };

      previews.push({
        rowId: r.id,
        nomeOriginal: r.nome || '(sem nome)',
        payload,
        origens,
        enriquecido,
        aviso: !nome ? 'Nome vazio — será ignorada na gravação' : undefined,
      });
    }

    setPreparandoPreview(false);
    if (previews.length === 0) return toast.info('Nada a importar (todas já foram importadas).');
    setPreviewImport(previews);
  };

  // Etapa 2: efetivamente grava usando o payload já revisado
  const confirmarImportacao = async () => {
    if (!previewImport) return;
    const estabId = await getEstabelecimentoId();
    if (!estabId) return toast.error('Estabelecimento não encontrado para o usuário atual');
    setImportando(true);
    let ok = 0, fail = 0;
    const errosDetalhe: string[] = [];

    for (const prev of previewImport) {
      const p = prev.payload as any;
      const r = p.rowRef as ProspeccaoRow;
      if (!p.nome) { fail++; errosDetalhe.push(`${prev.nomeOriginal}: nome obrigatório`); continue; }

      const { data: emp, error } = await supabase
        .from('empresas')
        .insert({
          estabelecimento_id: estabId,
          nome: p.nome,
          nome_fantasia: p.nome_fantasia,
          cnpj: p.cnpj,
          email: p.email,
          telefone: p.telefone,
          whatsapp: p.whatsapp,
          whatsapps_vinculados: p.whatsapp ? [p.whatsapp] : [],
          endereco: p.endereco,
          bairro: p.bairro,
          cidade: p.cidade,
          estado: p.estado,
          cep: p.cep,
          cnae_principal: p.cnae_principal,
          cnae_descricao: p.cnae_descricao,
          site: p.site,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          porte: p.porte,
          faturamento_estimado: r.faturamento_estimado ?? null,
          funcionarios_estimado: r.funcionarios_estimado ?? null,
          data_fundacao: p.data_fundacao,
          situacao_cadastral: p.situacao_cadastral,
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
      if (error || !emp) { fail++; errosDetalhe.push(`${p.nome}: ${error?.message || 'erro'}`); continue; }

      // Segmento prospect (find-or-create) — mantém comportamento anterior
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
            await supabase.from('empresa_vinculos').insert({
              empresa_id: emp.id, segmento_id: segId, estabelecimento_id: estabId,
            } as any);
          }
        } catch (e) { console.warn('Falha ao vincular segmento prospect', e); }
      }

      if (r.contato_nome) {
        try {
          const telContato = normWhats(r.contato_telefone) || (r.contato_telefone ?? null);
          await supabase.from('customers').insert({
            estabelecimento_id: estabId,
            empresa_id: emp.id,
            nome: r.contato_nome,
            telefone: telContato,
            email: normEmail(r.contato_email),
            tipo_operador: false,
            custom_fields: { position: r.contato_cargo || null, origem: r.origem || 'claude-code' },
          } as any);
        } catch (e) { console.warn('Falha ao criar contato prospect', e); }
      }

      await supabase
        .from('prospeccao_empresas')
        .update({ empresa_id: emp.id, status: 'importado', importado_em: new Date().toISOString() })
        .eq('id', r.id);
      ok++;
    }

    setImportando(false);
    setPreviewImport(null);
    setSelecionadas(new Set());
    if (ok > 0) toast.success(`${ok} importada(s) como prospect`);
    if (fail > 0) toast.error(`${fail} com erro: ${errosDetalhe.slice(0, 3).join(' | ')}${errosDetalhe.length > 3 ? '…' : ''}`);
    carregar();
  };



  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Seletor de método — mostra chooser antes de qualquer UI de prospecção */}
      {metodo === null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Como você quer prospectar?
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Escolha um dos dois métodos. Você pode alternar depois clicando em "Trocar método".
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setMetodo('wizard')}
              className="text-left p-5 border-2 border-primary/30 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-6 w-6 text-primary" />
                <span className="font-semibold text-base">Usar o Wizard (mais fácil)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Preencha 5 passos guiados e a IA busca e insere os prospects direto na listagem — sem sair do Pilar.
              </p>
            </button>
            <button
              onClick={() => setMetodo('mcp')}
              className="text-left p-5 border-2 border-primary/30 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-6 w-6 text-primary" />
                <span className="font-semibold text-base">Usar Claude / ChatGPT / Cursor</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Conecte seu assistente externo ao Pilar via MCP e peça em linguagem natural — ele salva os prospects aqui.
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
        <>
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Manual do Modo Wizard
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" /> Modo Wizard — passo a passo
                  </DialogTitle>
                  <DialogDescription>
                    Um assistente guiado que faz toda a prospecção por você, sem sair do Pilar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p>Ideal para quem quer resultados rápidos sem precisar aprender a usar Claude, ChatGPT ou Cursor.</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li><strong>Segmento:</strong> escolha o tipo de empresa (ex.: restaurantes, farmácias).</li>
                    <li><strong>Região:</strong> defina cidade/estado ou raio de atuação.</li>
                    <li><strong>Porte:</strong> selecione o tamanho da empresa desejada.</li>
                    <li><strong>Palavras-chave:</strong> refine com termos específicos do seu nicho.</li>
                    <li><strong>Execução:</strong> escolha o provedor de IA e clique em executar.
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li><em>Modo Auto</em>: a IA busca e importa direto (requer chave em "Configurar IAs de Prospecção").</li>
                        <li><em>Modo Prompt</em>: gera um texto pronto para colar no Claude/ChatGPT/Cursor — já com instrução MCP para inserir direto no sistema.</li>
                      </ul>
                    </li>
                    <li>Os resultados aparecem automaticamente na <strong>listagem abaixo</strong> para você revisar e importar.</li>
                  </ol>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card id="secao-wizard">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="h-4 w-4 text-primary" />
                Wizard de Prospecção — preencher critérios e trazer prospects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WizardProspeccao embedded onCompleted={carregar} />
            </CardContent>
          </Card>
        </>
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
                    <Terminal className="h-5 w-5 text-primary" /> Modo Direto (MCP)
                  </DialogTitle>
                  <DialogDescription>
                    Conecte seu assistente de IA preferido ao Pilar via MCP e prospecte diretamente por lá.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p>Ideal para quem já usa Claude, ChatGPT ou Cursor e quer controle total sobre a busca.</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li><strong>Conecte o assistente ao Pilar</strong> (uma vez só) — veja o card de conexão abaixo com passo a passo para cada ferramenta.</li>
                    <li>Use as credenciais fixas: <code className="bg-muted px-1 rounded">pilar@pilar.com.br</code> / <code className="bg-muted px-1 rounded">Ceotto2468</code>.</li>
                    <li>No seu assistente, peça: <em>"pesquise empresas de [segmento] em [cidade] e salve no Pilar"</em>.</li>
                    <li>A IA pesquisa na internet, extrai os dados e envia via MCP (<code className="bg-muted px-1 rounded">salvar_empresas_prospectadas</code>).</li>
                    <li>Os resultados aparecem na <strong>listagem abaixo</strong> — revise, selecione e importe.</li>
                  </ol>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card id="secao-mcp">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4 text-primary" />
                Como conectar seu assistente ao Pilar
              </CardTitle>
            </CardHeader>
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
          </Card>
        </>
      )}


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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportarPdf} disabled={filtradas.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar PDF {selecionadas.size > 0 ? `(${selecionadas.size})` : ''}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClearAll(true)}
              disabled={filtradas.length === 0}
              className="text-destructive hover:text-destructive"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Limpar tudo
            </Button>
            <Button
              size="sm"
              onClick={prepararImportacao}
              disabled={preparandoPreview || importando || selecionadas.size === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {preparandoPreview ? 'Consultando Receita/CEP…' : `Revisar e importar (${selecionadas.size})`}
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
      <DeleteConfirmDialog
        open={confirmClearAll}
        onOpenChange={setConfirmClearAll}
        onConfirm={limparTudo}
        title="Limpar toda a lista"
        description={`Excluir ${filtradas.length} registro(s) da prospecção? Esta ação não pode ser desfeita.`}
      />

      <Dialog open={!!previewImport} onOpenChange={(o) => !o && !importando && setPreviewImport(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Confirmar dados enriquecidos
            </DialogTitle>
            <DialogDescription>
              Revise os dados abaixo antes de gravar no cadastro. Campos com selo{' '}
              <Badge variant="secondary" className="mx-1">Receita</Badge> vieram da Receita Federal e{' '}
              <Badge variant="secondary" className="mx-1">CEP</Badge> vieram do ViaCEP; os demais são do próprio prospect.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto space-y-3 pr-1">
            {(previewImport || []).map((prev) => {
              const p = prev.payload;
              const origemBadge = (campo: string) => {
                const o = prev.origens[campo];
                if (!o || o === 'prospect') return null;
                return <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{o === 'receita' ? 'Receita' : 'CEP'}</Badge>;
              };
              const linha = (label: string, campo: string, valor: any) => (
                <div className="text-xs">
                  <span className="text-muted-foreground">{label}:</span>{' '}
                  <span className="font-medium">{valor || <span className="text-muted-foreground italic">—</span>}</span>
                  {origemBadge(campo)}
                </div>
              );
              return (
                <div key={prev.rowId} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{p.nome || prev.nomeOriginal}</div>
                    {prev.enriquecido && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Sparkles className="h-3 w-3" /> Enriquecido
                      </Badge>
                    )}
                  </div>
                  {prev.aviso && (
                    <Alert className="mb-2 py-2">
                      <AlertDescription className="text-xs">{prev.aviso}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                    {linha('Razão social', 'nome', p.nome)}
                    {linha('Nome fantasia', 'nome_fantasia', p.nome_fantasia)}
                    {linha('CNPJ', 'cnpj', p.cnpj)}
                    {linha('Situação', 'situacao_cadastral', p.situacao_cadastral)}
                    {linha('Porte', 'porte', p.porte)}
                    {linha('Abertura', 'data_fundacao', p.data_fundacao)}
                    {linha('E-mail', 'email', p.email)}
                    {linha('Telefone', 'telefone', p.telefone)}
                    {linha('WhatsApp', 'whatsapp', p.whatsapp)}
                    {linha('Site', 'site', p.site)}
                    {linha('CEP', 'cep', p.cep)}
                    {linha('Endereço', 'endereco', p.endereco)}
                    {linha('Bairro', 'bairro', p.bairro)}
                    {linha('Cidade', 'cidade', p.cidade)}
                    {linha('UF', 'estado', p.estado)}
                    {linha('CNAE', 'cnae_principal', p.cnae_principal ? `${p.cnae_principal}${p.cnae_descricao ? ' · ' + p.cnae_descricao : ''}` : null)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setPreviewImport(null)} disabled={importando}>
              Cancelar
            </Button>
            <Button onClick={confirmarImportacao} disabled={importando}>
              <Download className="h-4 w-4 mr-2" />
              {importando ? 'Gravando…' : `Confirmar e importar (${(previewImport || []).length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
