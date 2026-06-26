import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import {
  BookOpen, Building2, Users, Clock, Settings, FileSignature, ShieldCheck,
  Bell, Sparkles, TrendingUp, Calculator, FileText, Smartphone, MapPin,
  QrCode, Upload, FileDown, Wrench, Lock, RefreshCw, ListChecks, Shield,
  Brain, CalendarDays, GitBranch, AlertTriangle, CheckCircle2, ArrowRight,
} from "lucide-react";

type Passo = {
  titulo: string;
  descricao: string;
  link?: string;
  campos?: { nome: string; explica: string; obrigatorio?: boolean }[];
  dica?: string;
};

type Secao = {
  id: string;
  titulo: string;
  icone: any;
  objetivo: string;
  passos: Passo[];
};

const SECOES: Secao[] = [
  {
    id: "1-empresa",
    titulo: "1. Cadastrar Empresa e Filiais",
    icone: Building2,
    objetivo: "Antes de qualquer batida, o sistema precisa saber QUEM é o empregador (CNPJ, razão social, endereço) para emitir AFD/AEJ e eSocial.",
    passos: [
      {
        titulo: "Cadastrar a empresa matriz",
        link: "/ponto/empresas",
        descricao: "Crie a empresa principal com CNPJ e dados fiscais.",
        campos: [
          { nome: "Razão Social", explica: "Nome jurídico exato do contrato social. Aparece no AFD e no eSocial.", obrigatorio: true },
          { nome: "CNPJ", explica: "14 dígitos. Validado pelo sistema. Usado como chave em todos os arquivos legais.", obrigatorio: true },
          { nome: "CNAE principal", explica: "Determina a categoria de risco e regras de adicional de insalubridade.", obrigatorio: true },
          { nome: "Inscrição Estadual", explica: "Para empresas isentas, deixe em branco.", obrigatorio: false },
        ],
        dica: "Se você tem mais de uma empresa, cadastre cada CNPJ separadamente.",
      },
      {
        titulo: "Cadastrar filiais (se houver)",
        link: "/ponto/filiais",
        descricao: "Filiais herdam o CNPJ-raiz mas têm endereço próprio.",
        campos: [
          { nome: "CNPJ filial", explica: "Mesma raiz da matriz, com ordem diferente (ex.: 0002, 0003).", obrigatorio: true },
          { nome: "Endereço completo", explica: "Necessário para validação de geofence (cerca virtual de localização).", obrigatorio: true },
        ],
      },
      {
        titulo: "Cadastrar departamentos e cargos",
        link: "/ponto/departamentos",
        descricao: "Estrutura organizacional. Cargos definem CBO (Classificação Brasileira de Ocupações) usada no eSocial.",
        campos: [
          { nome: "CBO", explica: "Código de 6 dígitos da ocupação. Obrigatório para eSocial S-2200.", obrigatorio: true },
        ],
      },
    ],
  },
  {
    id: "2-regras-clt",
    titulo: "2. Configurar Regras CLT da Empresa",
    icone: Calculator,
    objetivo: "Define como o sistema calcula horas extras, adicional noturno, intervalos e tolerâncias. Tudo segue a Portaria MTP 671/2021.",
    passos: [
      {
        titulo: "Configuração CLT geral",
        link: "/ponto/clt-config",
        descricao: "Parâmetros legais aplicados em toda a empresa.",
        campos: [
          { nome: "Tolerância de atraso (min)", explica: "Até 10 min/dia conforme art. 58 §1º CLT. O sistema NÃO conta como atraso dentro dessa janela.", obrigatorio: true },
          { nome: "Multiplicador HE 50%", explica: "Hora extra normal. CLT manda 1.5x. Acordo coletivo pode aumentar.", obrigatorio: true },
          { nome: "Multiplicador HE 100%", explica: "Domingos/feriados. Mínimo 2.0x.", obrigatorio: true },
          { nome: "Adicional noturno %", explica: "Entre 22h-05h. Mínimo legal 20%.", obrigatorio: true },
          { nome: "Hora noturna (minutos)", explica: "Hora noturna reduzida = 52min30s (art. 73 §1º CLT). Mantenha 52 a menos que CCT diga outro valor.", obrigatorio: true },
          { nome: "SLA de aprovação (h)", explica: "Quanto tempo o gestor tem antes de escalar para o próximo nível.", obrigatorio: true },
        ],
        dica: "Se houver Convenção Coletiva (CCT), os valores dela substituem essas regras globais. Veja seção 11.",
      },
    ],
  },
  {
    id: "3-escalas",
    titulo: "3. Criar Escalas de Trabalho",
    icone: CalendarDays,
    objetivo: "Define a jornada de cada funcionário (ex.: 8h-12h / 13h-17h, 12x36, 6x1).",
    passos: [
      {
        titulo: "Cadastrar escala-padrão",
        link: "/ponto/escalas",
        descricao: "Modelos reutilizáveis para vários funcionários.",
        campos: [
          { nome: "Tipo de escala", explica: "5x2 (segunda-sexta), 6x1 (folga rotativa), 12x36 (plantão), turno", obrigatorio: true },
          { nome: "Horário de entrada/saída", explica: "Janela esperada. Batidas fora geram anomalia automática.", obrigatorio: true },
          { nome: "Intervalo (min)", explica: "Mínimo 60min para jornadas >6h (art. 71 CLT).", obrigatorio: true },
        ],
      },
      {
        titulo: "Configurar feriados",
        link: "/ponto/config",
        descricao: "Calendário nacional vem pré-carregado. Adicione feriados municipais/estaduais.",
      },
    ],
  },
  {
    id: "4-funcionarios",
    titulo: "4. Cadastrar Funcionários",
    icone: Users,
    objetivo: "Vincular cada CPF a empresa, cargo, escala e métodos de batida.",
    passos: [
      {
        titulo: "Cadastro individual",
        link: "/ponto/funcionarios",
        descricao: "Use o wizard para preencher rapidamente.",
        campos: [
          { nome: "CPF", explica: "Validado. Chave única usada no AFD e eSocial.", obrigatorio: true },
          { nome: "PIS/NIS", explica: "Obrigatório para eSocial S-2200 (admissão).", obrigatorio: true },
          { nome: "Data de admissão", explica: "Marco para cálculo de férias e DSR.", obrigatorio: true },
          { nome: "Cargo + CBO", explica: "Vincula automaticamente ao CBO cadastrado na seção 1.", obrigatorio: true },
          { nome: "Escala", explica: "Define a jornada esperada (seção 3).", obrigatorio: true },
          { nome: "Filial", explica: "Define geofence e regras locais.", obrigatorio: true },
        ],
        dica: "Importação em massa por CSV está disponível em Importação.",
      },
      {
        titulo: "Cadastrar biometria facial (opcional, recomendado)",
        link: "/ponto/face-enroll",
        descricao: "3 fotos em ângulos diferentes. Reduz fraudes em 95%.",
      },
    ],
  },
  {
    id: "5-equipamentos",
    titulo: "5. Configurar Pontos de Coleta",
    icone: QrCode,
    objetivo: "O funcionário pode bater ponto via: web/app pessoal, totem QR-code, REP físico ou coletor offline.",
    passos: [
      {
        titulo: "Cadastrar equipamentos REP/Totens",
        link: "/ponto/equipamentos",
        descricao: "Cada equipamento gera NSR (Número Sequencial de Registro) único.",
        campos: [
          { nome: "Tipo", explica: "REP-A (homologado INMETRO), REP-P (alternativo), Web, App, Totem", obrigatorio: true },
          { nome: "Localização (lat/long)", explica: "Para geofence. Bate só dentro do raio definido.", obrigatorio: true },
          { nome: "Raio geofence (m)", explica: "Recomendado 100-200m. Valores menores podem bloquear em dias de GPS ruim.", obrigatorio: true },
        ],
      },
      {
        titulo: "Gerar QR-Code para totens",
        link: "/ponto/qr-code-totem",
        descricao: "Imprima e fixe na entrada. Funcionário escaneia + biometria.",
      },
      {
        titulo: "Configurar redes Wi-Fi autorizadas (opcional)",
        link: "/ponto/config",
        descricao: "Restringe batida via app ao Wi-Fi corporativo.",
      },
    ],
  },
  {
    id: "6-batida",
    titulo: "6. Funcionário Bate Ponto",
    icone: Clock,
    objetivo: "Operação diária. O funcionário marca entrada, almoço (saída/volta) e saída.",
    passos: [
      {
        titulo: "Via portal/app pessoal",
        link: "/ponto/registro",
        descricao: "O funcionário entra com login dele, captura selfie + GPS, e o sistema valida geofence + biometria.",
        dica: "Se a captura falhar, o registro fica em quarentena para análise.",
      },
      {
        titulo: "Via totem (QR-Code)",
        link: "/ponto/qr-code-totem",
        descricao: "Sem login necessário. Escaneia QR, confirma face, registro instantâneo.",
      },
    ],
  },
  {
    id: "7-aprovacao",
    titulo: "7. Aprovações e Multi-nível",
    icone: GitBranch,
    objetivo: "Quando há anomalia (atraso, HE não autorizada, intervalo curto), o gestor aprova/recusa. Casos críticos sobem para RH.",
    passos: [
      {
        titulo: "Configurar regras de aprovação",
        link: "/ponto/aprovacao-regras",
        descricao: "Defina QUEM aprova O QUÊ em qual prazo.",
        campos: [
          { nome: "Tipo de anomalia", explica: "HE, atraso, intervalo, falta, etc.", obrigatorio: true },
          { nome: "Faixa de valor", explica: "Ex.: HE até 2h vai para Gestor; acima vai para RH.", obrigatorio: true },
          { nome: "Nível 1, 2, 3", explica: "Hierarquia. Se nível 1 não aprovar no SLA, escala automaticamente.", obrigatorio: true },
        ],
      },
      {
        titulo: "Aprovações pendentes (gestor/RH)",
        link: "/ponto/aprovacoes",
        descricao: "Fila diária. Cada item mostra anomalia + justificativa do funcionário.",
        dica: "Aprovadores com perfil sensível são obrigados a confirmar 2FA antes de aprovar valores altos.",
      },
    ],
  },
  {
    id: "8-banco-horas",
    titulo: "8. Banco de Horas (com FIFO)",
    icone: TrendingUp,
    objetivo: "Acumula HE como crédito a ser compensado. Sistema consome do lote mais antigo primeiro (FIFO) e zera lotes vencidos automaticamente todo dia 00:30.",
    passos: [
      {
        titulo: "Visão geral de saldos",
        link: "/ponto/banco-horas",
        descricao: "Saldo atual por funcionário com lotes detalhados.",
      },
      {
        titulo: "Lotes próximos do vencimento",
        link: "/ponto/banco-horas-expirar",
        descricao: "Funcionários recebem push em 90, 60, 30, 15 e 7 dias antes do vencimento.",
        dica: "Programe compensação para evitar conversão em pagamento (mais caro).",
      },
    ],
  },
  {
    id: "9-fechamento",
    titulo: "9. Fechamento Mensal e Espelho",
    icone: FileSignature,
    objetivo: "No fim do mês, gera o espelho de ponto e o funcionário assina (via 2FA + magic link).",
    passos: [
      {
        titulo: "Pré-fechamento",
        link: "/ponto/pre-fechamento",
        descricao: "Revisão final de divergências antes do bloqueio.",
      },
      {
        titulo: "Fechamento oficial",
        link: "/ponto/fechamento",
        descricao: "Bloqueia o período. Após isso, qualquer ajuste é auditado.",
      },
      {
        titulo: "Envio do espelho",
        link: "/ponto/espelho",
        descricao: "Sistema envia link por email/SMS. Funcionário valida 2FA e assina digitalmente.",
      },
    ],
  },
  {
    id: "10-esocial",
    titulo: "10. Transmissão eSocial",
    icone: ShieldCheck,
    objetivo: "Envia eventos S-1200/S-2299/etc. para o governo. Em caso de falha, fila reprocessa com backoff exponencial; após 5 tentativas, vai para DLQ.",
    passos: [
      {
        titulo: "Transmissão de eventos",
        link: "/ponto/esocial",
        descricao: "Lista eventos prontos para envio.",
      },
      {
        titulo: "Monitorar fila e DLQ",
        link: "/ponto/esocial-fila",
        descricao: "Worker roda a cada 5min. Aqui você reprocessa manualmente eventos da DLQ.",
        dica: "Erros 4xx geralmente são de payload. Erros 5xx são reprocessados automaticamente.",
      },
    ],
  },
  {
    id: "11-cct",
    titulo: "11. Convenções Coletivas (CCT/ACT)",
    icone: FileText,
    objetivo: "Sobrescreve as regras CLT globais para grupos específicos (categoria sindical, filial, cargo).",
    passos: [
      {
        titulo: "Cadastrar CCT/ACT",
        link: "/ponto/acordos-coletivos",
        descricao: "Anexe o PDF e informe vigência + multiplicadores específicos.",
        campos: [
          { nome: "Vigência início/fim", explica: "Após o fim, as regras voltam ao padrão CLT.", obrigatorio: true },
          { nome: "HE 50%/100%", explica: "Se a CCT define 1.7x e 2.5x, sistema usa esses valores em vez do CLT.", obrigatorio: true },
          { nome: "Sindicato CNPJ", explica: "Usado para vincular automaticamente funcionários da categoria.", obrigatorio: false },
        ],
      },
    ],
  },
  {
    id: "12-lgpd",
    titulo: "12. Portal LGPD (titular dos dados)",
    icone: Shield,
    objetivo: "Funcionário exerce direitos da Lei 13.709/2018: exportar, corrigir, portar, anonimizar ou excluir.",
    passos: [
      {
        titulo: "Abrir solicitação",
        link: "/ponto/lgpd",
        descricao: "Funcionário escolhe o tipo. Prazo legal de resposta: 15 dias.",
        dica: "Exportação gera JSON completo com link válido 7 dias. Anonimização preserva registros legais (5 anos) mas remove dados pessoais.",
      },
    ],
  },
  {
    id: "13-ia",
    titulo: "13. Inteligência Artificial Preditiva",
    icone: Brain,
    objetivo: "Modelo Gemini analisa últimos 90 dias e prevê risco de absenteísmo, turnover e excesso de HE.",
    passos: [
      {
        titulo: "Predições por funcionário",
        link: "/ponto/predicoes",
        descricao: "Score 0-100 com nível baixo/médio/alto/crítico + recomendações.",
        dica: "Use para acionar RH preventivamente em funcionários com score >70.",
      },
    ],
  },
  {
    id: "14-compliance",
    titulo: "14. Compliance e Auditoria",
    icone: Lock,
    objetivo: "Tudo é logado em hash-chain. Backups AFD/AEJ ficam 5 anos com SHA-256.",
    passos: [
      {
        titulo: "Auditoria completa",
        link: "/ponto/auditoria",
        descricao: "Filtra por usuário, ação, tabela, período. Exporta para fiscalização.",
      },
      {
        titulo: "Painel de compliance",
        link: "/ponto/compliance",
        descricao: "Status de prontidão legal: AFD, AEJ, eSocial, assinaturas, backups.",
      },
      {
        titulo: "Exportação AFD/AEJ",
        link: "/ponto/exportacao",
        descricao: "Gera arquivos no layout MTE para entrega à fiscalização.",
      },
    ],
  },
  {
    id: "15-compensacao",
    titulo: "15. Compensação de Jornada (Emenda Feriado / Eventos)",
    icone: CalendarDays,
    objetivo: "Acordos para dispensar funcionários em pontes de feriado, jogos da Copa, eventos ou meio-período, compensando com minutos extras nos dias seguintes — sem precisar usar banco de horas. Base legal: art. 59 e 59-B CLT + Súmula 85 TST.",
    passos: [
      {
        titulo: "Criar acordo de compensação",
        link: "/ponto/compensacao",
        descricao: "Configure dispensa (dia inteiro ou parcial em minutos), período de compensação e quanto cada dia trabalhado adicionará.",
        campos: [
          { nome: "Motivo", explica: "Emenda de feriado, evento esportivo (Copa), confraternização, etc.", obrigatorio: true },
          { nome: "Modalidade", explica: "Individual (1 funcionário), coletivo (grupo selecionado) ou empresa toda.", obrigatorio: true },
          { nome: "Tipo de dispensa", explica: "Dia completo (feriado/ponte = 8h) OU parcial (informa minutos exatos, ex.: 180 min para jogo da tarde).", obrigatorio: true },
          { nome: "Dias dispensados", explica: "Lista de datas em que os funcionários NÃO trabalharão.", obrigatorio: true },
          { nome: "Período de compensação", explica: "Janela em que os minutos extras serão acumulados (ex.: 15 dias úteis seguintes).", obrigatorio: true },
          { nome: "Minutos extras/dia", explica: "Quanto cada dia útil terá a mais. Limite legal de 2h (120 min) por dia.", obrigatorio: true },
          { nome: "Usar banco de horas", explica: "Se marcado, em vez de exigir extras, debita do saldo de BH do funcionário.", obrigatorio: false },
        ],
        dica: "A prévia automática mostra se o saldo de minutos cobre a dispensa antes de você salvar.",
      },
      {
        titulo: "Vincular funcionários e coletar assinatura",
        descricao: "Em modalidades individual/coletivo, selecione os CPFs. Ao ativar, o sistema envia magic link + 2FA para cada um assinar digitalmente.",
      },
    ],
  },
  {
    id: "16-coletor",
    titulo: "16. Coletor Desktop (Windows / macOS / Linux)",
    icone: Smartphone,
    objetivo: "Agente local que conecta nos relógios Control iD/iDClass (mesmo offline) e envia batidas para a nuvem. Necessário quando o equipamento não tem internet própria.",
    passos: [
      {
        titulo: "Baixar e instalar",
        link: "/ponto/coletor",
        descricao: "Escolha o instalador da sua plataforma (Windows .exe, macOS .dmg Intel/Apple Silicon, Linux AppImage).",
      },
      {
        titulo: "Configurar IP do relógio",
        link: "/ponto/equipamentos",
        descricao: "Informe IP, usuário, senha e marque 'Usar HTTPS' se o relógio exigir. Botão 'Testar conexão' valida em tempo real.",
        campos: [
          { nome: "IP local", explica: "Ex.: 192.168.0.50. Deve estar na mesma rede do coletor.", obrigatorio: true },
          { nome: "Usar HTTPS", explica: "Ative para Control iD P671 com firmware recente.", obrigatorio: false },
        ],
        dica: "Se o coletor cair, batidas ficam em fila offline e sincronizam quando voltar — sem perder NSR.",
      },
    ],
  },
  {
    id: "17-afd",
    titulo: "17. Importar AFD de Outro Sistema",
    icone: Upload,
    objetivo: "Migrar de outro REP/software. O sistema lê o arquivo AFD (Portaria 671) e popula funcionários + batidas históricas com idempotência (não duplica).",
    passos: [
      {
        titulo: "Importar AFD",
        link: "/ponto/importar-afd",
        descricao: "Selecione o .txt AFD. O sistema valida CNPJ-cabeçalho, identifica tipo 2/3/7 e gera log com cada NSR processado.",
        dica: "Reimportações são seguras — registros com mesmo NSR são ignorados.",
      },
    ],
  },
  {
    id: "18-sobreaviso-dsr",
    titulo: "18. Sobreaviso e DSR",
    icone: Clock,
    objetivo: "Sobreaviso (plantão remoto) paga 1/3 da hora normal. DSR (descanso semanal remunerado) é perdido se houver falta injustificada na semana.",
    passos: [
      {
        titulo: "Lançar escalas de sobreaviso",
        link: "/ponto/sobreaviso",
        descricao: "Defina período do plantão e funcionário. Cálculo de 1/3 entra automático na folha.",
      },
      {
        titulo: "Apurar DSR",
        link: "/ponto/dsr",
        descricao: "Mostra quem perdeu DSR por faltas/atrasos. Integra com o layout de exportação.",
      },
    ],
  },
  {
    id: "19-portal-colaborador",
    titulo: "19. Portal do Colaborador",
    icone: Smartphone,
    objetivo: "App/web do funcionário: ver espelho, solicitar férias, justificar faltas, anexar atestados.",
    passos: [
      {
        titulo: "Acessar portal",
        link: "/ponto/portal",
        descricao: "Funcionário vê batidas, saldos de BH, férias e abre solicitações que entram na fila de aprovação multinível.",
      },
      {
        titulo: "Solicitar férias (regra 14+5+5)",
        link: "/ponto/ferias",
        descricao: "Sistema impõe divisão legal: 1 período de no mínimo 14 dias + até 2 outros de 5+ dias, com aviso prévio de 30 dias.",
      },
    ],
  },
  {
    id: "20-dashboards",
    titulo: "20. Dashboards Executivos e Anomalias",
    icone: TrendingUp,
    objetivo: "Visão consolidada de KPIs (absenteísmo, HE, turnover) e violações detectadas automaticamente.",
    passos: [
      {
        titulo: "Dashboard executivo",
        link: "/ponto/dashboard-executivo",
        descricao: "Cards de KPI por filial, gráficos de tendência e ranking de gestores.",
      },
      {
        titulo: "Anomalias detectadas",
        link: "/ponto/anomalias",
        descricao: "Job diário identifica intervalos curtos, HE acima do limite, batidas fora de geofence, intervalos interjornada <11h, etc.",
        dica: "Cada anomalia gera uma sugestão de motivo padrão para o gestor justificar/abonar com 1 clique.",
      },
    ],
  },
  {
    id: "21-webhook",
    titulo: "21. Webhook em Tempo Real (Catracas)",
    icone: GitBranch,
    objetivo: "Receber batidas direto do hardware (Control iD push) sem precisar do coletor.",
    passos: [
      {
        titulo: "Gerar token de webhook",
        link: "/ponto/webhook-catracas",
        descricao: "Crie um token por equipamento e cole a URL no painel do relógio. Toda batida chega na hora.",
      },
    ],
  },
  {
    id: "22-edicao-lote",
    titulo: "22. Edição em Lote de Funcionários",
    icone: Users,
    objetivo: "Atualizar centenas de cadastros de uma vez (cargo, escala, layout de folha, filial, etc.) respeitando travamentos de período fechado.",
    passos: [
      {
        titulo: "Selecionar e editar",
        link: "/ponto/funcionarios",
        descricao: "Marque os checkboxes da lista e clique em 'Editar em lote'. Escolha qual campo alterar e o novo valor.",
        dica: "Se algum funcionário tiver período fechado afetando a mudança (ex.: trocar escala em mês exportado), o sistema bloqueia só os afetados e processa o resto.",
      },
    ],
  },
  {
    id: "23-exportacao-multi",
    titulo: "23. Exportação Consolidada (multi-layout)",
    icone: FileDown,
    objetivo: "Empresa com funcionários em layouts diferentes (ex.: alguns com adicional 50%, outros 60%) gera UM único arquivo consolidado.",
    passos: [
      {
        titulo: "Vincular layout por funcionário",
        link: "/ponto/funcionarios",
        descricao: "Cada funcionário tem o campo 'Layout de exportação' (Domínio, Sage, custom 60%...).",
      },
      {
        titulo: "Faixas customizadas de HE",
        link: "/ponto/acordos-coletivos",
        descricao: "Defina multiplicadores extras (ex.: 60%, 80%) no acordo da categoria. O exportador usa a faixa correta por funcionário.",
      },
      {
        titulo: "Exportar consolidado",
        link: "/ponto/exportacao",
        descricao: "Botão 'Exportar consolidado' agrupa funcionários por layout, gera cada bloco e devolve um único pacote pronto para a folha.",
      },
    ],
  },
  {
    id: "24-bloqueios",
    titulo: "24. Travamentos e Avisos",
    icone: Lock,
    objetivo: "Após exportação/fechamento, o sistema bloqueia alterações em batidas, ajustes, escalas, férias, feriados e regras do período. Avisos amigáveis com link para a tela que destrava.",
    passos: [
      {
        titulo: "Ver bloqueios ativos",
        link: "/ponto/fechamento",
        descricao: "Banner global lista fechamentos e exportações vigentes com links para reabrir/excluir.",
      },
      {
        titulo: "Reabrir período / excluir exportação",
        link: "/ponto/exportacao",
        descricao: "Botões 'Reabrir período' (apaga fechamento) e 'Excluir exportação' (remove arquivos do storage e libera o intervalo).",
        dica: "Toda reabertura fica registrada em auditoria com usuário, data e motivo.",
      },
    ],
  },
  {
    id: "25-configuracoes-extras",
    titulo: "25. Configurações Avançadas",
    icone: Settings,
    objetivo: "Telas de ajuste fino que normalmente o DP só toca quando muda lei ou política interna.",
    passos: [
      {
        titulo: "Regras de aprovação multinível",
        link: "/ponto/aprovacao-regras",
        descricao: "Quem aprova o quê, em quantos níveis, com qual SLA. Já coberto na seção 7.",
      },
      {
        titulo: "Notificações automáticas",
        link: "/ponto/notificacoes",
        descricao: "Configure templates (Resend/email + push) para atraso, HE pendente, espelho a assinar, BH vencendo.",
      },
      {
        titulo: "Sugestão de escala por IA",
        link: "/ponto/sugerir-escala",
        descricao: "IA analisa histórico e sugere a melhor escala para reduzir HE/absenteísmo.",
      },
      {
        titulo: "Antifraude",
        link: "/ponto/antifraude",
        descricao: "Geofences, redes Wi-Fi autorizadas e regras de selfie obrigatória.",
      },
    ],
  },
];

export default function PontoManual() {
  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Manual passo a passo</h1>
          <p className="text-muted-foreground">Para colocar o sistema de ponto 100% operacional, mesmo sem conhecimento técnico.</p>
        </div>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Como usar este manual</AlertTitle>
        <AlertDescription>
          Siga as seções na ordem. Cada passo tem um botão <Badge variant="outline">Abrir tela</Badge> que leva direto à página correspondente.
          Os <span className="font-medium">campos obrigatórios</span> estão marcados em vermelho. Termine uma seção antes de partir para a próxima — algumas dependem da anterior.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" />Índice</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SECOES.map(s => (
            <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 text-sm hover:text-primary">
              <s.icone className="h-4 w-4" />{s.titulo}
            </a>
          ))}
        </CardContent>
      </Card>

      {SECOES.map((s) => (
        <Card key={s.id} id={s.id} className="scroll-mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <s.icone className="h-6 w-6 text-primary" />{s.titulo}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{s.objetivo}</p>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {s.passos.map((p, idx) => (
                <AccordionItem key={idx} value={`${s.id}-${idx}`}>
                  <AccordionTrigger className="text-left">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{p.titulo}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pl-6">
                    <p className="text-sm">{p.descricao}</p>

                    {p.campos && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Campos</p>
                        {p.campos.map((c, i) => (
                          <div key={i} className="border-l-2 border-muted pl-3 py-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{c.nome}</span>
                              {c.obrigatorio && <Badge variant="destructive" className="text-[10px]">obrigatório</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{c.explica}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {p.dica && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{p.dica}</AlertDescription>
                      </Alert>
                    )}

                    {p.link && (
                      <Button size="sm" asChild>
                        <Link to={p.link}>Abrir tela <ArrowRight className="h-3 w-3 ml-1" /></Link>
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-primary/5">
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" />Pronto!</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Se você concluiu as 14 seções, seu sistema está:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Em conformidade com a Portaria MTP 671/2021 e CLT</li>
            <li>Transmitindo eSocial automaticamente com retry e DLQ</li>
            <li>Calculando HE, DSR, adicional noturno e sobreaviso conforme CCT</li>
            <li>Protegido por 2FA para aprovadores e LGPD para titulares</li>
            <li>Com IA preditiva acionando RH antes de problemas acontecerem</li>
          </ul>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" asChild><Link to="/ponto/dashboard">Ir para o Dashboard</Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/ponto/compliance">Ver Compliance</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
