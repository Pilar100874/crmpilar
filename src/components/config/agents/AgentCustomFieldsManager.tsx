import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, GripVertical, Edit2, X, Save, Lightbulb, ChevronDown, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomField {
  id?: string;
  agent_id: string;
  estabelecimento_id: string;
  nome: string;
  tipo: string;
  descricao: string;
  obrigatorio: boolean;
  opcoes: string[] | null;
  ordem: number;
  ativo: boolean;
  isNew?: boolean;
}

interface SuggestedField {
  nome: string;
  tipo: string;
  descricao: string;
  obrigatorio: boolean;
  opcoes?: string[];
}

const FIELD_TYPES = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'lista', label: 'Lista (opções)' },
  { value: 'booleano', label: 'Sim/Não' },
  { value: 'data', label: 'Data' },
  { value: 'textarea', label: 'Texto Longo' },
];

// ============ SUGESTÕES POR DOMÍNIO ============
const SUGGESTED_FIELDS: Record<string, { label: string; campos: SuggestedField[] }> = {
  comercial: {
    label: '💼 Comercial',
    campos: [
      { nome: 'Código do Produto', tipo: 'texto', descricao: 'SKU ou código interno', obrigatorio: true },
      { nome: 'Nome do Produto', tipo: 'texto', descricao: 'Nome comercial do produto', obrigatorio: true },
      { nome: 'Categoria', tipo: 'texto', descricao: 'Grupo ou categoria do produto', obrigatorio: false },
      { nome: 'Marca', tipo: 'texto', descricao: 'Fabricante ou marca', obrigatorio: false },
      { nome: 'Unidade de Venda', tipo: 'lista', descricao: 'UN, KG, CX, MT, PC, RS', obrigatorio: true, opcoes: ['UN', 'KG', 'CX', 'MT', 'PC', 'RS', 'FD'] },
      { nome: 'Preço de Venda', tipo: 'numero', descricao: 'Preço unitário de tabela', obrigatorio: true },
      { nome: 'Preço Mínimo', tipo: 'numero', descricao: 'Preço mínimo autorizado', obrigatorio: false },
      { nome: 'Desconto Máximo (%)', tipo: 'numero', descricao: 'Percentual máximo de desconto', obrigatorio: false },
      { nome: 'Quantidade Mínima', tipo: 'numero', descricao: 'Quantidade mínima por pedido', obrigatorio: false },
    ],
  },
  clientes: {
    label: '🧠 Inteligência do Cliente',
    campos: [
      { nome: 'Razão Social', tipo: 'texto', descricao: 'Nome jurídico da empresa', obrigatorio: true },
      { nome: 'Nome Fantasia', tipo: 'texto', descricao: 'Nome comercial', obrigatorio: false },
      { nome: 'CNPJ', tipo: 'texto', descricao: 'CNPJ do cliente', obrigatorio: true },
      { nome: 'Inscrição Estadual', tipo: 'texto', descricao: 'IE do cliente', obrigatorio: false },
      { nome: 'Segmento', tipo: 'lista', descricao: 'Segmento de atuação', obrigatorio: false, opcoes: ['Indústria', 'Comércio', 'Varejo', 'Atacado', 'Serviços'] },
      { nome: 'Porte', tipo: 'lista', descricao: 'Porte da empresa', obrigatorio: false, opcoes: ['MEI', 'ME', 'EPP', 'Médio', 'Grande'] },
      { nome: 'Contato Principal', tipo: 'texto', descricao: 'Nome do contato', obrigatorio: true },
      { nome: 'Telefone', tipo: 'texto', descricao: 'Telefone principal', obrigatorio: true },
      { nome: 'E-mail', tipo: 'texto', descricao: 'E-mail de contato', obrigatorio: true },
      { nome: 'Endereço', tipo: 'texto', descricao: 'Endereço completo', obrigatorio: false },
      { nome: 'Cidade/UF', tipo: 'texto', descricao: 'Cidade e estado', obrigatorio: false },
      { nome: 'Limite de Crédito', tipo: 'numero', descricao: 'Limite de crédito aprovado', obrigatorio: false },
      { nome: 'Classificação', tipo: 'lista', descricao: 'Classificação do cliente', obrigatorio: false, opcoes: ['A', 'B', 'C', 'D'] },
    ],
  },
  cadastro_produtos: {
    label: '📋 Cadastro de Produtos',
    campos: [
      { nome: 'Código', tipo: 'texto', descricao: 'SKU ou código interno', obrigatorio: true },
      { nome: 'Nome', tipo: 'texto', descricao: 'Nome do produto', obrigatorio: true },
      { nome: 'Descrição', tipo: 'textarea', descricao: 'Descrição detalhada', obrigatorio: false },
      { nome: 'Grupo/Categoria', tipo: 'texto', descricao: 'Categoria do produto', obrigatorio: true },
      { nome: 'Marca', tipo: 'texto', descricao: 'Fabricante', obrigatorio: false },
      { nome: 'Unidade', tipo: 'lista', descricao: 'Unidade de medida', obrigatorio: true, opcoes: ['UN', 'KG', 'CX', 'MT', 'PC', 'RS', 'FD', 'BB'] },
      { nome: 'Gramatura (g/m²)', tipo: 'numero', descricao: 'Peso por metro quadrado', obrigatorio: false },
      { nome: 'Largura (cm)', tipo: 'numero', descricao: 'Largura do material', obrigatorio: false },
      { nome: 'Comprimento (cm)', tipo: 'numero', descricao: 'Comprimento do material', obrigatorio: false },
      { nome: 'Altura (cm)', tipo: 'numero', descricao: 'Altura do produto', obrigatorio: false },
      { nome: 'Peso (kg)', tipo: 'numero', descricao: 'Peso unitário', obrigatorio: false },
      { nome: 'Diâmetro', tipo: 'numero', descricao: 'Diâmetro (bobinas/rolos)', obrigatorio: false },
      { nome: 'Cor', tipo: 'texto', descricao: 'Cor do material', obrigatorio: false },
      { nome: 'Material/Composição', tipo: 'texto', descricao: 'Tipo de material', obrigatorio: false },
      { nome: 'Tipo Embalagem', tipo: 'lista', descricao: 'Forma de acondicionamento', obrigatorio: true, opcoes: ['Pallet', 'Pacote', 'Caixa', 'Fardo', 'Bobina', 'Resma', 'Avulso'] },
      { nome: 'Qtd por Embalagem', tipo: 'numero', descricao: 'Unidades por embalagem', obrigatorio: false },
      { nome: 'Qtd por Pallet', tipo: 'numero', descricao: 'Embalagens por pallet', obrigatorio: false },
      { nome: 'NCM', tipo: 'texto', descricao: 'Classificação fiscal', obrigatorio: false },
      { nome: 'EAN/Código de Barras', tipo: 'texto', descricao: 'Código de barras', obrigatorio: false },
    ],
  },
  cadastro_clientes: {
    label: '👥 Cadastro de Clientes',
    campos: [
      { nome: 'Razão Social', tipo: 'texto', descricao: 'Nome jurídico completo', obrigatorio: true },
      { nome: 'Nome Fantasia', tipo: 'texto', descricao: 'Nome comercial', obrigatorio: false },
      { nome: 'CNPJ/CPF', tipo: 'texto', descricao: 'Documento fiscal', obrigatorio: true },
      { nome: 'Inscrição Estadual', tipo: 'texto', descricao: 'IE do cliente', obrigatorio: false },
      { nome: 'Inscrição Municipal', tipo: 'texto', descricao: 'IM do cliente', obrigatorio: false },
      { nome: 'Regime Tributário', tipo: 'lista', descricao: 'Regime fiscal', obrigatorio: false, opcoes: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI'] },
      { nome: 'Segmento', tipo: 'lista', descricao: 'Ramo de atividade', obrigatorio: false, opcoes: ['Indústria', 'Comércio', 'Varejo', 'Atacado', 'Serviços', 'Governo'] },
      { nome: 'Porte', tipo: 'lista', descricao: 'Tamanho da empresa', obrigatorio: false, opcoes: ['MEI', 'ME', 'EPP', 'Médio', 'Grande'] },
      { nome: 'Contato Principal', tipo: 'texto', descricao: 'Nome do responsável', obrigatorio: true },
      { nome: 'Cargo', tipo: 'texto', descricao: 'Cargo do contato', obrigatorio: false },
      { nome: 'Telefone', tipo: 'texto', descricao: 'Telefone principal', obrigatorio: true },
      { nome: 'WhatsApp', tipo: 'texto', descricao: 'Número WhatsApp', obrigatorio: false },
      { nome: 'E-mail', tipo: 'texto', descricao: 'E-mail principal', obrigatorio: true },
      { nome: 'CEP', tipo: 'texto', descricao: 'CEP do endereço', obrigatorio: false },
      { nome: 'Endereço', tipo: 'texto', descricao: 'Logradouro + número', obrigatorio: false },
      { nome: 'Bairro', tipo: 'texto', descricao: 'Bairro', obrigatorio: false },
      { nome: 'Cidade', tipo: 'texto', descricao: 'Cidade', obrigatorio: false },
      { nome: 'UF', tipo: 'lista', descricao: 'Estado', obrigatorio: false, opcoes: ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] },
      { nome: 'Limite de Crédito', tipo: 'numero', descricao: 'Valor máximo de crédito', obrigatorio: false },
      { nome: 'Prazo Médio (dias)', tipo: 'numero', descricao: 'Prazo médio de pagamento', obrigatorio: false },
      { nome: 'Observações', tipo: 'textarea', descricao: 'Notas gerais sobre o cliente', obrigatorio: false },
    ],
  },
  tabela_precos: {
    label: '💰 Tabela de Preços',
    campos: [
      { nome: 'Nome da Tabela', tipo: 'texto', descricao: 'Identificação da tabela de preço', obrigatorio: true },
      { nome: 'Código do Produto', tipo: 'texto', descricao: 'SKU referência', obrigatorio: true },
      { nome: 'Preço Base', tipo: 'numero', descricao: 'Preço de tabela', obrigatorio: true },
      { nome: 'Preço Mínimo', tipo: 'numero', descricao: 'Preço mínimo autorizado', obrigatorio: false },
      { nome: 'Preço Custo', tipo: 'numero', descricao: 'Custo do produto', obrigatorio: false },
      { nome: 'Margem (%)', tipo: 'numero', descricao: 'Margem percentual', obrigatorio: false },
      { nome: 'Desconto Máximo (%)', tipo: 'numero', descricao: 'Desconto máximo permitido', obrigatorio: false },
      { nome: 'Faixa Qtd Mínima', tipo: 'numero', descricao: 'Qtd mínima para preço especial', obrigatorio: false },
      { nome: 'Faixa Qtd Máxima', tipo: 'numero', descricao: 'Qtd máxima da faixa', obrigatorio: false },
      { nome: 'Preço na Faixa', tipo: 'numero', descricao: 'Preço especial por volume', obrigatorio: false },
      { nome: 'Validade Início', tipo: 'data', descricao: 'Data início da vigência', obrigatorio: false },
      { nome: 'Validade Fim', tipo: 'data', descricao: 'Data fim da vigência', obrigatorio: false },
      { nome: 'Tipo de Cliente', tipo: 'lista', descricao: 'Segmento que usa esta tabela', obrigatorio: false, opcoes: ['Todos', 'Varejo', 'Atacado', 'Indústria', 'Especial'] },
    ],
  },
  estoque: {
    label: '📦 Gestão de Estoque',
    campos: [
      { nome: 'Código do Produto', tipo: 'texto', descricao: 'SKU do produto', obrigatorio: true },
      { nome: 'Estoque Atual', tipo: 'numero', descricao: 'Quantidade em estoque', obrigatorio: true },
      { nome: 'Estoque Reservado', tipo: 'numero', descricao: 'Quantidade reservada para pedidos', obrigatorio: false },
      { nome: 'Estoque Mínimo', tipo: 'numero', descricao: 'Ponto de reposição', obrigatorio: false },
      { nome: 'Estoque Máximo', tipo: 'numero', descricao: 'Capacidade máxima', obrigatorio: false },
      { nome: 'Localização', tipo: 'texto', descricao: 'Rua/Prateleira/Posição no depósito', obrigatorio: false },
      { nome: 'Lote', tipo: 'texto', descricao: 'Número do lote', obrigatorio: false },
      { nome: 'Data Validade', tipo: 'data', descricao: 'Validade do lote', obrigatorio: false },
      { nome: 'Tipo Armazenamento', tipo: 'lista', descricao: 'Como está armazenado', obrigatorio: false, opcoes: ['Pallet', 'Prateleira', 'Chão', 'Câmara Fria', 'Área Externa'] },
      { nome: 'Qtd por Pallet', tipo: 'numero', descricao: 'Unidades por pallet', obrigatorio: false },
      { nome: 'Peso Total (kg)', tipo: 'numero', descricao: 'Peso total do estoque', obrigatorio: false },
      { nome: 'Depósito', tipo: 'lista', descricao: 'Depósito/Filial', obrigatorio: false, opcoes: ['Principal', 'Filial 1', 'Filial 2', 'CD'] },
      { nome: 'Última Entrada', tipo: 'data', descricao: 'Data da última entrada', obrigatorio: false },
      { nome: 'Última Saída', tipo: 'data', descricao: 'Data da última saída', obrigatorio: false },
    ],
  },
  financeira: {
    label: '💳 Financeiro',
    campos: [
      { nome: 'Limite de Crédito', tipo: 'numero', descricao: 'Limite total aprovado', obrigatorio: true },
      { nome: 'Saldo Devedor', tipo: 'numero', descricao: 'Valor em aberto', obrigatorio: true },
      { nome: 'Crédito Disponível', tipo: 'numero', descricao: 'Limite - Saldo', obrigatorio: false },
      { nome: 'Títulos Vencidos', tipo: 'numero', descricao: 'Quantidade de títulos vencidos', obrigatorio: false },
      { nome: 'Valor Vencido', tipo: 'numero', descricao: 'Total de valores vencidos', obrigatorio: false },
      { nome: 'Dias Maior Atraso', tipo: 'numero', descricao: 'Maior atraso em dias', obrigatorio: false },
      { nome: 'Score de Crédito', tipo: 'numero', descricao: 'Pontuação de crédito do cliente', obrigatorio: false },
      { nome: 'Forma de Pagamento', tipo: 'lista', descricao: 'Forma preferencial', obrigatorio: false, opcoes: ['Boleto', 'PIX', 'Cartão', 'Depósito', 'Cheque'] },
      { nome: 'Prazo Padrão', tipo: 'lista', descricao: 'Condição padrão', obrigatorio: false, opcoes: ['À Vista', '7 dias', '14 dias', '21 dias', '28 dias', '30/60', '30/60/90'] },
    ],
  },
  logistica: {
    label: '🚚 Logística',
    campos: [
      { nome: 'CEP Destino', tipo: 'texto', descricao: 'CEP de entrega', obrigatorio: true },
      { nome: 'Cidade/UF', tipo: 'texto', descricao: 'Cidade e estado de entrega', obrigatorio: true },
      { nome: 'Região', tipo: 'lista', descricao: 'Região de entrega', obrigatorio: false, opcoes: ['Capital', 'Interior', 'Litoral', 'Grande SP', 'Nordeste', 'Sul'] },
      { nome: 'Tipo de Frete', tipo: 'lista', descricao: 'Modalidade de frete', obrigatorio: false, opcoes: ['CIF', 'FOB', 'Retira'] },
      { nome: 'Peso Total (kg)', tipo: 'numero', descricao: 'Peso do pedido', obrigatorio: false },
      { nome: 'Volume (m³)', tipo: 'numero', descricao: 'Volume cúbico do pedido', obrigatorio: false },
      { nome: 'Prazo Entrega (dias)', tipo: 'numero', descricao: 'Prazo estimado', obrigatorio: false },
      { nome: 'Valor do Frete', tipo: 'numero', descricao: 'Custo do frete', obrigatorio: false },
      { nome: 'Transportadora', tipo: 'texto', descricao: 'Nome da transportadora', obrigatorio: false },
      { nome: 'Restrição de Horário', tipo: 'texto', descricao: 'Horário permitido para entrega', obrigatorio: false },
    ],
  },
  tecnica: {
    label: '🔧 Técnico',
    campos: [
      { nome: 'Especificação Técnica', tipo: 'textarea', descricao: 'Ficha técnica resumida', obrigatorio: false },
      { nome: 'Norma/Certificação', tipo: 'texto', descricao: 'Normas aplicáveis (ABNT, ISO)', obrigatorio: false },
      { nome: 'Aplicação', tipo: 'texto', descricao: 'Para que serve o produto', obrigatorio: false },
      { nome: 'Compatibilidade', tipo: 'texto', descricao: 'Compatível com quais materiais', obrigatorio: false },
      { nome: 'Garantia (meses)', tipo: 'numero', descricao: 'Prazo de garantia', obrigatorio: false },
      { nome: 'Modo de Uso', tipo: 'textarea', descricao: 'Instruções de uso', obrigatorio: false },
      { nome: 'Armazenamento', tipo: 'texto', descricao: 'Condições de armazenamento', obrigatorio: false },
    ],
  },
  margem: {
    label: '📊 Margem e Estratégia',
    campos: [
      { nome: 'Custo Médio', tipo: 'numero', descricao: 'Custo médio do produto', obrigatorio: true },
      { nome: 'Margem Alvo (%)', tipo: 'numero', descricao: 'Margem ideal', obrigatorio: true },
      { nome: 'Margem Mínima (%)', tipo: 'numero', descricao: 'Margem mínima aceitável', obrigatorio: true },
      { nome: 'Custo Fixo Rateado', tipo: 'numero', descricao: 'Rateio de custos fixos', obrigatorio: false },
      { nome: 'Impostos (%)', tipo: 'numero', descricao: 'Percentual de impostos', obrigatorio: false },
      { nome: 'Comissão (%)', tipo: 'numero', descricao: 'Percentual de comissão', obrigatorio: false },
    ],
  },
  recompra: {
    label: '🔄 Recompra',
    campos: [
      { nome: 'Ciclo Médio (dias)', tipo: 'numero', descricao: 'Intervalo médio entre compras', obrigatorio: false },
      { nome: 'Última Compra', tipo: 'data', descricao: 'Data da última compra', obrigatorio: false },
      { nome: 'Próxima Previsão', tipo: 'data', descricao: 'Previsão de próxima compra', obrigatorio: false },
      { nome: 'Produto Mais Comprado', tipo: 'texto', descricao: 'Produto mais frequente', obrigatorio: false },
      { nome: 'Ticket Médio', tipo: 'numero', descricao: 'Valor médio por pedido', obrigatorio: false },
      { nome: 'Qtd Média', tipo: 'numero', descricao: 'Quantidade média por pedido', obrigatorio: false },
    ],
  },
  objecoes: {
    label: '🎙️ Objeções',
    campos: [
      { nome: 'Objeção', tipo: 'texto', descricao: 'Texto da objeção do cliente', obrigatorio: true },
      { nome: 'Categoria', tipo: 'lista', descricao: 'Tipo de objeção', obrigatorio: true, opcoes: ['Preço', 'Prazo', 'Qualidade', 'Concorrência', 'Confiança', 'Urgência'] },
      { nome: 'Resposta Sugerida', tipo: 'textarea', descricao: 'Argumentação para contornar', obrigatorio: true },
      { nome: 'Gatilho Mental', tipo: 'texto', descricao: 'Gatilho usado na argumentação', obrigatorio: false },
    ],
  },
  mix: {
    label: '🎯 Cross-Sell / Mix',
    campos: [
      { nome: 'Produto Origem', tipo: 'texto', descricao: 'Produto que o cliente quer', obrigatorio: true },
      { nome: 'Produto Sugerido', tipo: 'texto', descricao: 'Produto complementar sugerido', obrigatorio: true },
      { nome: 'Tipo', tipo: 'lista', descricao: 'Cross-sell ou up-sell', obrigatorio: true, opcoes: ['Cross-sell', 'Up-sell', 'Substituto'] },
      { nome: 'Motivo', tipo: 'texto', descricao: 'Por que sugerir', obrigatorio: false },
    ],
  },
};

// Domínio genérico para qualquer agente não mapeado
const GENERIC_SUGGESTIONS: SuggestedField[] = [
  { nome: 'Código', tipo: 'texto', descricao: 'Identificador único', obrigatorio: true },
  { nome: 'Nome', tipo: 'texto', descricao: 'Nome do registro', obrigatorio: true },
  { nome: 'Descrição', tipo: 'textarea', descricao: 'Descrição detalhada', obrigatorio: false },
  { nome: 'Categoria', tipo: 'texto', descricao: 'Classificação', obrigatorio: false },
  { nome: 'Status', tipo: 'lista', descricao: 'Estado do registro', obrigatorio: false, opcoes: ['Ativo', 'Inativo', 'Pendente'] },
  { nome: 'Observações', tipo: 'textarea', descricao: 'Notas adicionais', obrigatorio: false },
];

interface Props {
  agentId: string;
  estabelecimentoId: string;
  agentDomain?: string;
}

export default function AgentCustomFieldsManager({ agentId, estabelecimentoId, agentDomain }: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CustomField>>({});
  const [newOptionText, setNewOptionText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const loadFields = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_agent_custom_fields')
      .select('*')
      .eq('agent_id', agentId)
      .eq('estabelecimento_id', estabelecimentoId)
      .order('ordem');
    if (!error && data) {
      setFields(data as unknown as CustomField[]);
    }
    setLoading(false);
  }, [agentId, estabelecimentoId]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleAddField = async () => {
    const newField: any = {
      agent_id: agentId,
      estabelecimento_id: estabelecimentoId,
      nome: 'Novo Campo',
      tipo: 'texto',
      descricao: '',
      obrigatorio: false,
      opcoes: null,
      ordem: fields.length,
      ativo: true,
    };
    const { data, error } = await supabase
      .from('chat_agent_custom_fields')
      .insert(newField)
      .select()
      .single();
    if (error) {
      toast.error('Erro ao criar campo');
      return;
    }
    const created = data as unknown as CustomField;
    setFields([...fields, created]);
    setEditingId(created.id!);
    setEditForm(created);
    toast.success('Campo criado');
  };

  const handleAddSuggested = async (suggestion: SuggestedField) => {
    const exists = fields.some(f => f.nome.toLowerCase() === suggestion.nome.toLowerCase());
    if (exists) {
      toast.info(`Campo "${suggestion.nome}" já existe`);
      return;
    }
    const newField: any = {
      agent_id: agentId,
      estabelecimento_id: estabelecimentoId,
      nome: suggestion.nome,
      tipo: suggestion.tipo,
      descricao: suggestion.descricao,
      obrigatorio: suggestion.obrigatorio,
      opcoes: suggestion.opcoes || null,
      ordem: fields.length,
      ativo: true,
    };
    const { data, error } = await supabase
      .from('chat_agent_custom_fields')
      .insert(newField)
      .select()
      .single();
    if (error) {
      toast.error('Erro ao adicionar campo sugerido');
      return;
    }
    setFields([...fields, data as unknown as CustomField]);
    toast.success(`Campo "${suggestion.nome}" adicionado`);
  };

  const handleAddAllSuggested = async (suggestions: SuggestedField[]) => {
    const newOnes = suggestions.filter(s => !fields.some(f => f.nome.toLowerCase() === s.nome.toLowerCase()));
    if (newOnes.length === 0) {
      toast.info('Todos os campos sugeridos já foram adicionados');
      return;
    }
    const payload = newOnes.map((s, i) => ({
      agent_id: agentId,
      estabelecimento_id: estabelecimentoId,
      nome: s.nome,
      tipo: s.tipo,
      descricao: s.descricao,
      obrigatorio: s.obrigatorio,
      opcoes: s.opcoes || null,
      ordem: fields.length + i,
      ativo: true,
    }));
    const { data, error } = await supabase
      .from('chat_agent_custom_fields')
      .insert(payload as any)
      .select();
    if (error) {
      toast.error('Erro ao adicionar campos');
      return;
    }
    setFields([...fields, ...(data as unknown as CustomField[])]);
    toast.success(`${newOnes.length} campos adicionados!`);
    setShowSuggestions(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.nome?.trim()) {
      toast.error('Nome do campo é obrigatório');
      return;
    }
    const { error } = await supabase
      .from('chat_agent_custom_fields')
      .update({
        nome: editForm.nome,
        tipo: editForm.tipo,
        descricao: editForm.descricao || '',
        obrigatorio: editForm.obrigatorio,
        opcoes: editForm.tipo === 'lista' ? editForm.opcoes : null,
        ativo: editForm.ativo,
      } as any)
      .eq('id', editingId);
    if (error) {
      toast.error('Erro ao salvar');
      return;
    }
    setEditingId(null);
    await loadFields();
    toast.success('Campo atualizado');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('chat_agent_custom_fields')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
      return;
    }
    setFields(fields.filter(f => f.id !== id));
    if (editingId === id) setEditingId(null);
    toast.success('Campo removido');
  };

  const handleToggleActive = async (id: string, ativo: boolean) => {
    await supabase
      .from('chat_agent_custom_fields')
      .update({ ativo } as any)
      .eq('id', id);
    setFields(fields.map(f => f.id === id ? { ...f, ativo } : f));
  };

  const addOption = () => {
    if (!newOptionText.trim()) return;
    const current = editForm.opcoes || [];
    setEditForm({ ...editForm, opcoes: [...current, newOptionText.trim()] });
    setNewOptionText('');
  };

  const removeOption = (idx: number) => {
    const current = editForm.opcoes || [];
    setEditForm({ ...editForm, opcoes: current.filter((_, i) => i !== idx) });
  };

  // Determinar sugestões para o domínio atual
  const domainSuggestions = agentDomain && SUGGESTED_FIELDS[agentDomain]
    ? SUGGESTED_FIELDS[agentDomain]
    : { label: '📝 Campos Genéricos', campos: GENERIC_SUGGESTIONS };

  if (loading) return <div className="text-center py-4 text-muted-foreground text-sm">Carregando campos...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Campos Personalizados</p>
          <p className="text-xs text-muted-foreground">Defina os campos que este agente deve conhecer e utilizar</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSuggestions(!showSuggestions)} className="gap-1">
            <Lightbulb className="h-3 w-3 text-yellow-500" /> Sugestões
          </Button>
          <Button size="sm" onClick={handleAddField}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Campo
          </Button>
        </div>
      </div>

      {/* Painel de Sugestões */}
      {showSuggestions && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Campos sugeridos — {domainSuggestions.label}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddAllSuggested(domainSuggestions.campos)}>
                  Adicionar Todos
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowSuggestions(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {domainSuggestions.campos.map((s, i) => {
                  const alreadyAdded = fields.some(f => f.nome.toLowerCase() === s.nome.toLowerCase());
                  return (
                    <button
                      key={i}
                      onClick={() => !alreadyAdded && handleAddSuggested(s)}
                      disabled={alreadyAdded}
                      className={`flex items-center gap-2 p-2 rounded-md text-left text-xs transition-colors ${
                        alreadyAdded
                          ? 'bg-muted/50 opacity-50 cursor-not-allowed'
                          : 'hover:bg-accent cursor-pointer border border-transparent hover:border-border'
                      }`}
                    >
                      {alreadyAdded ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate">{s.nome}</span>
                          <Badge variant="outline" className="text-[9px] shrink-0 py-0">
                            {FIELD_TYPES.find(t => t.value === s.tipo)?.label || s.tipo}
                          </Badge>
                          {s.obrigatorio && <Badge variant="destructive" className="text-[9px] shrink-0 py-0">Obrig.</Badge>}
                        </div>
                        <span className="text-muted-foreground truncate block">{s.descricao}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {fields.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <Lightbulb className="h-8 w-8 mx-auto text-yellow-500/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum campo personalizado</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em <strong>Sugestões</strong> para ver campos recomendados ou adicione manualmente</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {fields.map((field) => (
              <Card key={field.id} className={`transition-opacity ${!field.ativo ? 'opacity-50' : ''}`}>
                <CardContent className="p-3">
                  {editingId === field.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nome do Campo *</Label>
                          <Input
                            value={editForm.nome || ''}
                            onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                            placeholder="Ex: Gramatura"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={editForm.tipo || 'texto'} onValueChange={v => setEditForm({ ...editForm, tipo: v })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Descrição</Label>
                        <Input
                          value={editForm.descricao || ''}
                          onChange={e => setEditForm({ ...editForm, descricao: e.target.value })}
                          placeholder="Descreva o que este campo representa"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editForm.obrigatorio || false}
                            onCheckedChange={v => setEditForm({ ...editForm, obrigatorio: v })}
                          />
                          <Label className="text-xs">Obrigatório</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editForm.ativo !== false}
                            onCheckedChange={v => setEditForm({ ...editForm, ativo: v })}
                          />
                          <Label className="text-xs">Ativo</Label>
                        </div>
                      </div>
                      {editForm.tipo === 'lista' && (
                        <div>
                          <Label className="text-xs">Opções da Lista</Label>
                          <div className="flex gap-2 mb-2">
                            <Input
                              value={newOptionText}
                              onChange={e => setNewOptionText(e.target.value)}
                              placeholder="Nova opção..."
                              className="h-8 text-sm"
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                            />
                            <Button size="sm" variant="outline" onClick={addOption} className="h-8">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(editForm.opcoes || []).map((opt, idx) => (
                              <Badge key={idx} variant="secondary" className="gap-1">
                                {opt}
                                <X className="h-3 w-3 cursor-pointer" onClick={() => removeOption(idx)} />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3 mr-1" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{field.nome}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {FIELD_TYPES.find(t => t.value === field.tipo)?.label || field.tipo}
                            </Badge>
                            {field.obrigatorio && <Badge variant="destructive" className="text-[10px] shrink-0">Obrigatório</Badge>}
                          </div>
                          {field.descricao && <p className="text-xs text-muted-foreground truncate">{field.descricao}</p>}
                          {field.tipo === 'lista' && field.opcoes?.length && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {field.opcoes.slice(0, 5).map((o, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">{o}</Badge>
                              ))}
                              {field.opcoes.length > 5 && <Badge variant="secondary" className="text-[10px]">+{field.opcoes.length - 5}</Badge>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={field.ativo}
                          onCheckedChange={v => handleToggleActive(field.id!, v)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(field.id!); setEditForm(field); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(field.id!)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
