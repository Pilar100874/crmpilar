import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Check, Clipboard, Clock, Film, Image as ImageIcon, Workflow } from "lucide-react";
import { toast } from "sonner";

interface Exemplo {
  titulo: string;
  objetivo: string;
  agenda?: string;
  passos: string[];
  prompt: string;
}

const ROTINAS: Exemplo[] = [
  {
    titulo: "Resumo diário de vendas no WhatsApp",
    objetivo: "Todo dia útil às 8h, resumir as vendas do dia anterior e enviar para o grupo comercial.",
    agenda: "0 8 * * 1-5",
    passos: [
      "Rotinas → Nova rotina → nome “Resumo diário de vendas”.",
      "Agenda: 0 8 * * 1-5 (dias úteis, 8h).",
      "Agente: Analista Comercial. Conector: banco de dados + canal de WhatsApp.",
      "Rode em dry-run para conferir o payload antes de ativar.",
    ],
    prompt:
      "Consulte os pedidos de ontem, calcule faturamento total, ticket médio e os 5 melhores clientes. Escreva um resumo curto em português, com emojis discretos, pronto para WhatsApp.",
  },
  {
    titulo: "Monitor de licitações toda manhã",
    objetivo: "Buscar novas licitações compatíveis e alertar o time responsável.",
    agenda: "0 7 * * *",
    passos: [
      "Rotinas → Nova rotina → agenda 0 7 * * *.",
      "Agente: Pesquisador de Licitações com a tool de busca web/Playwright.",
      "Ative retries automáticos (3 tentativas com backoff).",
      "Saída: gravar oportunidades e notificar por e-mail.",
    ],
    prompt:
      "Busque licitações publicadas nas últimas 24h com as palavras-chave cadastradas. Para cada uma, traga órgão, objeto, valor estimado, prazo e um score de aderência de 0 a 100.",
  },
  {
    titulo: "Higienização semanal da base de empresas",
    objetivo: "Enriquecer cadastros incompletos com dados públicos de CNPJ.",
    agenda: "0 3 * * 1",
    passos: [
      "Rotinas → agenda 0 3 * * 1 (segunda, 3h).",
      "Limite de concorrência: 1, para não sobrecarregar as APIs.",
      "Agente: Enriquecedor de Cadastros.",
      "Aprovação humana opcional antes de gravar alterações.",
    ],
    prompt:
      "Liste as empresas sem telefone, e-mail ou endereço completo. Para cada CNPJ, consulte os dados públicos, normalize e proponha a atualização. Não sobrescreva campos preenchidos manualmente.",
  },
  {
    titulo: "Relatório mensal de marketing",
    objetivo: "No dia 1º, consolidar campanhas, custos e resultados do mês anterior.",
    agenda: "0 9 1 * *",
    passos: [
      "Rotinas → agenda 0 9 1 * *.",
      "Workflow com 3 etapas: coletar dados → analisar → gerar PDF.",
      "Etapa final com aprovação humana antes do envio.",
      "Assets ficam salvos em Agentes IA → Assets.",
    ],
    prompt:
      "Consolide as campanhas do mês anterior: investimento, alcance, cliques, leads e CPL por plataforma. Compare com o mês anterior e destaque 3 recomendações práticas.",
  },
];

const IMAGENS: Exemplo[] = [
  {
    titulo: "Post de produto para redes sociais",
    objetivo: "Gerar uma imagem 1080x1080 com o produto em destaque.",
    passos: [
      "Playground → escolha o agente de criação visual.",
      "Anexe a foto do produto em Recursos.",
      "Peça formato quadrado e fundo coerente com a marca.",
      "Aprove e publique direto pelo módulo de Marketing.",
    ],
    prompt:
      "Crie uma imagem quadrada (1080x1080) do produto anexado sobre fundo escuro com iluminação suave, espaço livre no topo para título curto e paleta laranja da marca.",
  },
  {
    titulo: "Banner de campanha promocional",
    objetivo: "Criar variações de banner para teste A/B.",
    passos: [
      "Workflow com 1 etapa de geração e 1 de revisão.",
      "Peça 3 variações do mesmo conceito.",
      "Compare os assets lado a lado antes de aprovar.",
    ],
    prompt:
      "Gere 3 variações de banner 1200x628 para uma promoção de frete grátis, mantendo a mesma identidade visual e mudando apenas composição e enquadramento.",
  },
  {
    titulo: "Fotos de ambientação do catálogo",
    objetivo: "Colocar produtos do catálogo em cenários realistas.",
    passos: [
      "Recursos → envie as fotos originais dos produtos.",
      "Agente de imagem com referência de produto marcada como prioridade.",
      "Rode em lote por grupo de produtos.",
    ],
    prompt:
      "Use a foto anexada como referência fiel do produto (não altere formato, cor ou rótulo) e componha uma cena realista de uso em ambiente profissional, luz natural.",
  },
  {
    titulo: "Ilustração para artigo da base de conhecimento",
    objetivo: "Capa simples e limpa para artigos internos.",
    passos: [
      "Playground → agente de criação visual.",
      "Peça estilo minimalista e sem texto na imagem.",
      "Salve o asset e use no editor do artigo.",
    ],
    prompt:
      "Crie uma ilustração horizontal minimalista, estilo vetorial, sem nenhum texto, representando o tema do artigo, com fundo claro e detalhes na cor laranja.",
  },
];

const VIDEOS: Exemplo[] = [
  {
    titulo: "Vídeo curto de produto (Higgsfield)",
    objetivo: "Clipe de 5 a 10 segundos para redes sociais.",
    passos: [
      "Configure a chave do Higgsfield em Configurações do servidor.",
      "Playground → agente de vídeo → anexe a imagem inicial.",
      "Escolha 9:16 para stories e reels.",
    ],
    prompt:
      "Anime a imagem anexada com um movimento suave de câmera aproximando do produto, 5 segundos, formato 9:16, sem textos sobrepostos.",
  },
  {
    titulo: "Vídeo com locução automática",
    objetivo: "Unir roteiro, narração e imagens em um vídeo pronto.",
    passos: [
      "Workflow: roteirista → narração → montagem (Remotion).",
      "Aprovação humana entre roteiro e montagem.",
      "O arquivo final aparece em Assets.",
    ],
    prompt:
      "Escreva um roteiro de 30 segundos apresentando o serviço, gere a narração e monte o vídeo com as imagens da campanha, legendas em português e trilha discreta.",
  },
  {
    titulo: "Vídeo institucional a partir de template Remotion",
    objetivo: "Padronizar aberturas e encerramentos com a marca.",
    passos: [
      "Cadastre o template como recurso da plataforma.",
      "A rotina só troca textos, cores e imagens.",
      "Ideal para agendar semanalmente.",
    ],
    prompt:
      "Renderize o template institucional trocando o título, a chamada e as 4 imagens indicadas, mantendo as animações e a identidade visual originais.",
  },
  {
    titulo: "Resumo em vídeo dos resultados da semana",
    objetivo: "Transformar números em um vídeo curto para a diretoria.",
    agenda: "0 18 * * 5",
    passos: [
      "Rotina agendada para sexta às 18h.",
      "Etapa 1 consulta os dados, etapa 2 monta o vídeo.",
      "Envie o link do asset por e-mail ou WhatsApp.",
    ],
    prompt:
      "Colete os indicadores da semana, monte um vídeo de 40 segundos com gráficos simples e narração objetiva, destacando o que melhorou e o que piorou.",
  },
];

const COMUNS: Exemplo[] = [
  {
    titulo: "Atendimento: rascunho de resposta ao cliente",
    objetivo: "Sugerir respostas coerentes com o histórico e as políticas internas.",
    passos: [
      "Agente com acesso à base de conhecimento e às políticas internas.",
      "Use no atendimento como sugestão, nunca envio automático.",
    ],
    prompt:
      "Leia o histórico da conversa e escreva uma resposta cordial, objetiva e alinhada às políticas internas. Se faltar informação, liste o que precisa ser perguntado ao cliente.",
  },
  {
    titulo: "Prospecção: qualificar lista de empresas",
    objetivo: "Classificar leads por aderência ao perfil ideal.",
    passos: [
      "Importe a lista em Prospecção.",
      "Rotina diária qualifica os novos registros.",
      "Grave o score e o motivo no cadastro da empresa.",
    ],
    prompt:
      "Para cada empresa, avalie porte, segmento e região. Dê nota de 0 a 100 de aderência ao nosso perfil ideal e justifique em uma frase.",
  },
  {
    titulo: "Operação: navegação automatizada (Playwright)",
    objetivo: "Coletar dados em portais que não têm API.",
    passos: [
      "Cadastre as credenciais do portal em Credenciais.",
      "Navegação costuma demorar: acompanhe pelo monitor do servidor.",
      "Prefira rodar de madrugada.",
    ],
    prompt:
      "Acesse o portal com as credenciais cadastradas, baixe os documentos publicados hoje e devolva a lista com nome, data e link do arquivo salvo.",
  },
  {
    titulo: "Gestão: revisão de documentos e contratos",
    objetivo: "Apontar riscos e cláusulas fora do padrão.",
    passos: [
      "Anexe o documento em Recursos.",
      "Ative aprovação humana antes de qualquer ação.",
      "O parecer fica registrado no histórico.",
    ],
    prompt:
      "Analise o documento anexado e liste cláusulas de risco, prazos críticos e divergências em relação ao nosso padrão. Não conclua nada além do que está escrito no texto.",
  },
];

function BlocoExemplos({ exemplos }: { exemplos: Exemplo[] }) {
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = async (texto: string, id: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(id);
    toast.success("Prompt copiado");
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      {exemplos.map((ex) => (
        <AccordionItem key={ex.titulo} value={ex.titulo}>
          <AccordionTrigger className="text-left">
            <span className="flex flex-wrap items-center gap-2">
              {ex.titulo}
              {ex.agenda && (
                <Badge variant="outline" className="font-mono text-[11px]">
                  {ex.agenda}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{ex.objetivo}</p>
            <div>
              <p className="mb-1.5 text-sm font-medium">Como montar</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {ex.passos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Prompt sugerido</p>
                <Button size="sm" variant="ghost" onClick={() => copiar(ex.prompt, ex.titulo)}>
                  {copiado === ex.titulo ? (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Copiar
                </Button>
              </div>
              <p className="text-sm leading-relaxed">{ex.prompt}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function ManualPage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Manual de uso</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Como a plataforma funciona e exemplos prontos de rotinas agendadas, geração de
                imagens, vídeos e usos do dia a dia.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conceitos em 1 minuto</CardTitle>
          <CardDescription>O vocabulário da plataforma, sem enrolação.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Agente", "Quem executa. Tem papel, instruções e modelo."],
            ["Skill", "Um conhecimento/instrução reaproveitável pelo agente."],
            ["Tool", "Uma API ou função que o agente pode chamar."],
            ["MCP", "Servidor externo que expõe várias ferramentas de uma vez."],
            ["Workflow", "Sequência visual de etapas, com aprovação humana opcional."],
            ["Rotina", "Um workflow ou agente disparado por horário (cron)."],
            ["Execução", "Um disparo específico, com log passo a passo."],
            ["Asset", "Arquivo gerado (imagem, vídeo, documento) com versões."],
          ].map(([termo, desc]) => (
            <div key={termo} className="rounded-lg border border-border p-3">
              <p className="font-medium">{termo}</p>
              <p className="text-muted-foreground">{desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exemplos prontos</CardTitle>
          <CardDescription>Quatro casos de cada tipo, com passos e prompt para copiar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rotinas">
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="rotinas">
                <Clock className="mr-1.5 h-4 w-4" /> Rotinas agendadas
              </TabsTrigger>
              <TabsTrigger value="imagens">
                <ImageIcon className="mr-1.5 h-4 w-4" /> Imagens
              </TabsTrigger>
              <TabsTrigger value="videos">
                <Film className="mr-1.5 h-4 w-4" /> Vídeos
              </TabsTrigger>
              <TabsTrigger value="comuns">
                <Workflow className="mr-1.5 h-4 w-4" /> Uso comum
              </TabsTrigger>
            </TabsList>
            <Separator className="my-4" />
            <TabsContent value="rotinas">
              <BlocoExemplos exemplos={ROTINAS} />
            </TabsContent>
            <TabsContent value="imagens">
              <BlocoExemplos exemplos={IMAGENS} />
            </TabsContent>
            <TabsContent value="videos">
              <BlocoExemplos exemplos={VIDEOS} />
            </TabsContent>
            <TabsContent value="comuns">
              <BlocoExemplos exemplos={COMUNS} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boas práticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Comece sempre com dry-run antes de ativar uma rotina.</p>
          <p>• Use aprovação humana em qualquer etapa que envie mensagem ou altere dados.</p>
          <p>• Tarefas longas (vídeo, Playwright) rodam no servidor Claude Agent SDK.</p>
          <p>• Guarde chaves em Credenciais ou Configurações do servidor, nunca no texto do prompt.</p>
          <p>• Revise o histórico de execuções para ajustar prompts que erram com frequência.</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/ia-platform/wizard-inicial">Voltar ao wizard inicial</Link>
        </Button>
        <Button asChild>
          <Link to="/ia-platform/playground">Testar no playground</Link>
        </Button>
      </div>
    </div>
  );
}
