import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HelpCircle, Bot, FileText, ListChecks, Database, Brain,
  Network, ChevronRight, Lightbulb, AlertTriangle, CheckCircle2,
  Zap, Settings, BookOpen, Target, Layers, Sparkles
} from 'lucide-react';

const STEPS = [
  {
    id: 'visao-geral',
    icon: BookOpen,
    title: 'Visão Geral',
    color: 'text-blue-500',
  },
  {
    id: 'identidade',
    icon: Bot,
    title: '1. Identidade',
    color: 'text-violet-500',
  },
  {
    id: 'prompt',
    icon: FileText,
    title: '2. Prompt',
    color: 'text-amber-500',
  },
  {
    id: 'campos',
    icon: ListChecks,
    title: '3. Campos',
    color: 'text-emerald-500',
  },
  {
    id: 'dados',
    icon: Database,
    title: '4. Dados',
    color: 'text-cyan-500',
  },
  {
    id: 'conhecimento',
    icon: Brain,
    title: '5. Conhecimento',
    color: 'text-pink-500',
  },
  {
    id: 'orquestrador',
    icon: Network,
    title: 'Orquestrador',
    color: 'text-orange-500',
  },
  {
    id: 'dicas',
    icon: Lightbulb,
    title: 'Dicas Avançadas',
    color: 'text-yellow-500',
  },
];

function StepContent({ stepId }: { stepId: string }) {
  switch (stepId) {
    case 'visao-geral':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Um agente de IA é um assistente virtual especializado em uma tarefa específica do seu negócio. 
            Para funcionar bem, ele precisa de <strong>identidade clara</strong>, <strong>instruções precisas</strong> e <strong>acesso aos dados certos</strong>.
          </p>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Fluxo Recomendado
            </h4>
            <div className="grid gap-2">
              {[
                { step: '1', label: 'Identidade', desc: 'Defina nome, tipo e modelo de IA' },
                { step: '2', label: 'Prompt', desc: 'Escreva as instruções do agente' },
                { step: '3', label: 'Campos', desc: 'Crie os campos de dados que o agente usará' },
                { step: '4', label: 'Dados', desc: 'Vincule os campos às fontes de dados reais' },
                { step: '5', label: 'Conhecimento', desc: 'Adicione base de conhecimento extra (opcional)' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center p-0 text-xs font-bold">
                    {item.step}
                  </Badge>
                  <div>
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>💡 Dica:</strong> Use a <strong>Configuração Rápida</strong> para criar agentes a partir de templates prontos e depois personalize cada um.
            </p>
          </div>
        </div>
      );

    case 'identidade':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A identidade define <strong>quem</strong> é o agente e como ele se comporta.
          </p>

          <div className="space-y-3">
            <DetailCard
              title="Nome do Agente"
              icon={<Bot className="h-4 w-4" />}
              content="Escolha um nome descritivo que reflita a especialidade. O sistema detecta automaticamente o domínio pelo nome para sugerir campos e configurações."
              example='Exemplos: "Consultor de Estoque", "Especialista em Preços", "Agente Financeiro"'
              tip="Evite nomes genéricos como 'Agente 1'. Nomes claros ajudam o sistema a sugerir campos automaticamente."
            />

            <DetailCard
              title="Tipo de Agente"
              icon={<Layers className="h-4 w-4" />}
              content="Específico: Foca em uma tarefa única (estoque, preços, etc). Orquestrador: Coordena vários agentes específicos e decide qual acionar baseado no contexto."
              tip="Comece criando agentes específicos. Só crie um orquestrador depois de ter pelo menos 2 agentes funcionando."
            />

            <DetailCard
              title="Modelo de IA"
              icon={<Zap className="h-4 w-4" />}
              content="Flash = respostas rápidas e econômicas, ideal para consultas simples. Pro/Avançado = mais preciso e detalhado, ideal para análises complexas."
              tip="Para a maioria dos casos, Gemini 3 Flash é suficiente. Use Pro apenas para agentes que precisam de raciocínio complexo."
            />

            <DetailCard
              title="Modo de Operação"
              icon={<Settings className="h-4 w-4" />}
              content="'Sugerir' = o agente sugere respostas ao atendente revisar. 'Autônomo' = responde diretamente ao cliente sem intervenção humana."
              warning="Use 'Autônomo' apenas em agentes bem testados e com regras de negócio claras."
            />
          </div>
        </div>
      );

    case 'prompt':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O prompt é a <strong>instrução principal</strong> que define o comportamento do agente. É o fator mais importante para a qualidade das respostas.
          </p>

          <DetailCard
            title="Estrutura Ideal do Prompt"
            icon={<FileText className="h-4 w-4" />}
            content="Um bom prompt deve conter: (1) Papel do agente, (2) Regras de negócio, (3) Tom de comunicação, (4) O que DEVE fazer, (5) O que NÃO deve fazer."
          />

          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <h4 className="text-sm font-semibold">📝 Modelo de Prompt</h4>
            <pre className="text-xs bg-background border rounded p-3 whitespace-pre-wrap font-mono leading-relaxed">
{`Você é um [PAPEL] especializado em [ÁREA].

## Regras de Negócio
- [Regra 1: ex: Desconto máximo de 10%]
- [Regra 2: ex: Prazo de entrega padrão 5 dias]

## Tom de Comunicação
- Seja [formal/informal], [objetivo/detalhado]
- Sempre cumprimente o cliente pelo nome

## O que DEVE fazer
- Consultar estoque antes de confirmar disponibilidade
- Sugerir produtos complementares quando relevante
- Informar prazos realistas

## O que NÃO deve fazer
- Nunca prometer descontos acima do permitido
- Não inventar informações sobre produtos
- Não encerrar atendimento sem perguntar se precisa de mais algo`}
            </pre>
          </div>

          <div className="rounded-lg border-l-4 border-amber-500 bg-amber-500/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>⚡ Use o Assistente de Prompt:</strong> O botão "✨ Gerar com IA" cria um prompt otimizado automaticamente baseado no nome e descrição do agente.
            </p>
          </div>
        </div>
      );

    case 'campos':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Os campos definem <strong>quais informações</strong> o agente vai manipular. Cada campo deve ter uma descrição clara para que a IA saiba como usá-lo.
          </p>

          <DetailCard
            title="Tipos de Campo"
            icon={<ListChecks className="h-4 w-4" />}
            content="Texto: informações textuais livres. Número: valores numéricos (preço, quantidade). Lista: opções predefinidas. Booleano: sim/não. Data: datas e períodos."
          />

          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-semibold">📋 Como descrever campos para o agente</h4>
            <div className="space-y-2">
              {[
                {
                  campo: 'preco_venda',
                  tipo: 'Número',
                  ruim: 'Preço do produto',
                  bom: 'Preço de venda ao consumidor final com impostos inclusos, em R$. Usar para informar ao cliente o valor do produto.',
                },
                {
                  campo: 'prazo_entrega',
                  tipo: 'Número',
                  ruim: 'Prazo',
                  bom: 'Prazo de entrega em dias úteis a partir da confirmação do pedido. Se o estoque for zero, informar que será sob consulta.',
                },
                {
                  campo: 'categoria',
                  tipo: 'Lista',
                  ruim: 'Categoria do item',
                  bom: 'Categoria principal do produto (Elétrico, Hidráulico, Pneumático). Usar para filtrar produtos similares e sugerir alternativas.',
                },
              ].map(item => (
                <div key={item.campo} className="rounded border p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.campo}</code>
                    <Badge variant="outline" className="text-[10px]">{item.tipo}</Badge>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-500 text-xs mt-0.5">✗</span>
                    <span className="text-xs text-muted-foreground line-through">{item.ruim}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-green-500 text-xs mt-0.5">✓</span>
                    <span className="text-xs">{item.bom}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border-l-4 border-emerald-500 bg-emerald-500/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>💡 Regra de ouro:</strong> Descreva cada campo como se estivesse explicando para um funcionário novo. Inclua: o que é, quando usar, formato esperado, e regras especiais.
            </p>
          </div>
        </div>
      );

    case 'dados':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O Wizard de Dados conecta cada campo criado a uma <strong>fonte real de informação</strong>: manual, tabelas do sistema ou APIs externas.
          </p>

          <div className="space-y-3">
            <DetailCard
              title="Manual"
              icon={<FileText className="h-4 w-4" />}
              content="Você digita o valor diretamente. Ideal para informações fixas como política de troca, horário de funcionamento, regras gerais."
              example='Ex: Campo "política_devolução" → Valor: "Aceitamos devoluções em até 7 dias com nota fiscal"'
            />

            <DetailCard
              title="Tabela do Sistema"
              icon={<Database className="h-4 w-4" />}
              content="O campo é alimentado por dados do seu banco. Você seleciona a(s) tabela(s) e mapeia as colunas. Suporta múltiplas tabelas relacionadas."
              example="Ex: Campo 'estoque_disponivel' → Tabela: Produtos → Coluna: quantidade_estoque"
              tip="Ao selecionar múltiplas tabelas, as colunas são prefixadas (Tabela.Coluna) para evitar ambiguidade."
            />

            <DetailCard
              title="API Externa"
              icon={<Zap className="h-4 w-4" />}
              content="Conecta a uma API já cadastrada nos endpoints. Ideal para dados que vêm de sistemas externos como ERP, WMS, CRM."
              example="Ex: Campo 'saldo_financeiro' → API: ERP Totvs → Campo: saldo_disponivel"
            />
          </div>

          <div className="rounded-lg border-l-4 border-cyan-500 bg-cyan-500/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>⚠️ Importante:</strong> Todos os campos criados na aba Campos devem ser mapeados no Wizard de Dados. Campos sem mapeamento serão vazios nas respostas do agente.
            </p>
          </div>
        </div>
      );

    case 'conhecimento':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A base de conhecimento fornece <strong>contexto adicional</strong> que o agente pode consultar para responder com mais profundidade.
          </p>

          <div className="space-y-3">
            <DetailCard
              title="Base Interna (Texto)"
              icon={<FileText className="h-4 w-4" />}
              content="Cole textos diretamente: manuais, FAQs, políticas, catálogos. O agente usa como referência para responder perguntas."
              example="Ex: Manual técnico do produto, tabela de especificações, FAQ de suporte"
            />

            <DetailCard
              title="Arquivos (Upload)"
              icon={<Brain className="h-4 w-4" />}
              content="Faça upload de PDFs, planilhas ou documentos. O agente extrai informações relevantes automaticamente."
              tip="Prefira documentos bem estruturados. PDFs com imagens ou scans podem ter menor precisão na extração."
            />
          </div>
        </div>
      );

    case 'orquestrador':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O Orquestrador é um agente especial que <strong>coordena vários agentes específicos</strong>, decidindo automaticamente qual acionar baseado no contexto da conversa.
          </p>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-semibold">🔄 Como funciona</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>1. O cliente faz uma pergunta</p>
              <p>2. O Orquestrador analisa a intenção</p>
              <p>3. Aciona o agente específico mais adequado</p>
              <p>4. Combina informações de múltiplos agentes se necessário</p>
              <p>5. Entrega uma resposta unificada ao cliente</p>
            </div>
          </div>

          <DetailCard
            title="Quando usar"
            icon={<Network className="h-4 w-4" />}
            content="Use quando o atendimento envolve múltiplas áreas (estoque + preço + prazo) e o cliente pode perguntar sobre qualquer uma delas na mesma conversa."
            warning="O prompt do Orquestrador deve descrever claramente quando acionar cada sub-agente e como combinar as respostas."
          />

          <div className="rounded-lg border-l-4 border-orange-500 bg-orange-500/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>📌 Pré-requisito:</strong> Crie e teste os agentes específicos individualmente antes de vinculá-los a um orquestrador.
            </p>
          </div>
        </div>
      );

    case 'dicas':
      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <TipCard
              type="success"
              title="Comece simples, itere depois"
              content="Crie um agente com poucos campos essenciais, teste com perguntas reais e vá adicionando complexidade gradualmente."
            />
            <TipCard
              type="success"
              title="Teste com perguntas reais"
              content="Use o chat de teste para simular perguntas que seus clientes fariam. Ajuste o prompt baseado nas respostas."
            />
            <TipCard
              type="success"
              title="Descreva campos detalhadamente"
              content="Quanto mais contexto na descrição de cada campo, melhor o agente interpreta e usa a informação nas respostas."
            />
            <TipCard
              type="warning"
              title="Evite prompts vagos"
              content="'Seja útil e responda bem' não é uma boa instrução. Seja específico sobre regras, limites e formato das respostas."
            />
            <TipCard
              type="warning"
              title="Não sobrecarregue um único agente"
              content="Se o agente precisa saber sobre estoque, preço, prazo, financeiro e logística, considere dividir em agentes especializados com um orquestrador."
            />
            <TipCard
              type="danger"
              title="Nunca publique sem testar"
              content="Sempre teste o agente no modo 'Sugerir' antes de colocar em modo 'Autônomo' para evitar respostas incorretas ao cliente."
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}

function DetailCard({ title, icon, content, example, tip, warning }: {
  title: string;
  icon: React.ReactNode;
  content: string;
  example?: string;
  tip?: string;
  warning?: string;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        {icon} {title}
      </h4>
      <p className="text-xs text-muted-foreground">{content}</p>
      {example && (
        <p className="text-xs italic text-muted-foreground/80 bg-muted/30 rounded px-2 py-1">
          {example}
        </p>
      )}
      {tip && (
        <p className="text-xs text-primary">
          <Lightbulb className="h-3 w-3 inline mr-1" />{tip}
        </p>
      )}
      {warning && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3 inline mr-1" />{warning}
        </p>
      )}
    </div>
  );
}

function TipCard({ type, title, content }: { type: 'success' | 'warning' | 'danger'; title: string; content: string }) {
  const styles = {
    success: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, border: 'border-l-emerald-500', bg: 'bg-emerald-500/5' },
    warning: { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, border: 'border-l-amber-500', bg: 'bg-amber-500/5' },
    danger: { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, border: 'border-l-red-500', bg: 'bg-red-500/5' },
  };
  const s = styles[type];
  return (
    <div className={`rounded-lg border-l-4 ${s.border} ${s.bg} p-3`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{s.icon}</span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{content}</p>
        </div>
      </div>
    </div>
  );
}

export default function AgentHelpGuide() {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState('visao-geral');

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <HelpCircle className="h-4 w-4" />
        Guia de Criação
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[900px] w-[calc(100vw-2rem)] max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Guia: Como Criar Agentes Eficientes
            </DialogTitle>
            <DialogDescription>
              Passo a passo para configurar agentes de IA que realmente funcionam
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 min-h-0 border-t">
            {/* Sidebar */}
            <div className="w-52 shrink-0 border-r bg-muted/20">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-0.5">
                  {STEPS.map(step => (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        activeStep === step.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <step.icon className={`h-4 w-4 shrink-0 ${activeStep === step.id ? 'text-primary' : step.color}`} />
                      <span className="truncate">{step.title}</span>
                      {activeStep === step.id && <ChevronRight className="h-3 w-3 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {(() => {
                    const step = STEPS.find(s => s.id === activeStep);
                    return step ? (
                      <>
                        <step.icon className={`h-5 w-5 ${step.color}`} />
                        {step.title}
                      </>
                    ) : null;
                  })()}
                </h3>
                <StepContent stepId={activeStep} />
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
