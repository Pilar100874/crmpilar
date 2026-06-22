import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Smartphone,
  ShieldCheck,
  Building2,
  Users,
  Clock,
  FileSignature,
  Wrench,
  Lock,
  FileDown,
  FileText,
  FileCode,
  Upload,
  Bell,
  Sparkles,
  TrendingUp,
  Calculator,
  MapPin,
  QrCode,
  Plane,
  ShieldAlert,
  Printer,
  Download,
} from "lucide-react";

const sections = [
  {
    id: "primeiros-passos",
    icon: BookOpen,
    title: "1. Primeiros Passos",
    badge: "Comece aqui",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          O módulo <b>Controle de Ponto</b> cobre todo o ciclo: cadastros,
          marcação, tratamento, fechamento, exportação para folha e obrigações
          legais (Portaria 671/2021 e eSocial).
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Cadastre a <b>Empresa</b> em <i>Configurações → Empresas</i> (CNPJ, CNAE, CCT).</li>
          <li>Cadastre <b>Filiais</b> com geolocalização (geofence anti-fraude).</li>
          <li>Cadastre <b>Funcionários</b> (CPF, PIS validado, jornada, escala).</li>
          <li>Conecte os <b>Equipamentos</b> (relógios Control iD) ou habilite o app.</li>
          <li>Defina <b>Antifraude</b>: geofences, redes Wi-Fi e dispositivos autorizados.</li>
        </ol>
      </div>
    ),
  },
  {
    id: "cadastros",
    icon: Building2,
    title: "2. Cadastros (Empresa, Filial, Funcionário)",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>
          Todos os campos usam <b>máscara e validação BR</b>: CPF (dígito
          verificador), PIS (módulo 11), CNPJ (com lookup BrasilAPI), CEP
          (ViaCEP preenche endereço), UF e cidade com select dinâmico (IBGE).
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Empresas</b>: CNPJ, razão social, CNAE, sindicato, CCT vigente.</li>
          <li><b>Filiais</b>: endereço, lat/long (capturada do navegador), raio do geofence.</li>
          <li><b>Funcionários</b>: dados pessoais, admissão, jornada, escala, vínculos múltiplos (multi-empresa).</li>
          <li><b>Importação em Lote</b>: CSV em <i>Ponto → Importação em Lote</i>.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "marcacao",
    icon: Smartphone,
    title: "3. Marcação de Ponto",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>O sistema aceita 4 canais de marcação:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>App / Portal do Funcionário</b>: selfie + GPS + dispositivo autorizado.</li>
          <li><b>QR Code Totem</b>: tela compartilhada em tablet, leitura por QR.</li>
          <li><b>Relógio Control iD</b>: integração via Coletor Desktop (Electron).</li>
          <li><b>Coletor Manual</b>: importação de AFD do relógio.</li>
        </ul>
        <p>
          Toda marcação passa por <b>validação antifraude</b>: face match (IA),
          checagem de deslocamento impossível, geofence, hash SHA-256 encadeado
          no log de auditoria.
        </p>
      </div>
    ),
  },
  {
    id: "antifraude",
    icon: ShieldCheck,
    title: "4. Antifraude e Auditoria",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Real Face Match</b>: Gemini Vision compara selfie com foto cadastral.</li>
          <li><b>Geofencing</b>: bloqueia marcação fora do raio configurado.</li>
          <li><b>Redes Wi-Fi e dispositivos</b> autorizados em <i>Ponto → Antifraude</i>.</li>
          <li><b>Auditoria imutável</b>: cada registro grava hash SHA-256 encadeado.</li>
          <li><b>Alertas</b> em tempo real (atrasos, ausências, marcações suspeitas).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "jornada",
    icon: Clock,
    title: "5. Jornada, HE e DSR",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>
          O cálculo de jornada roda automaticamente todas as noites (cron 02:00)
          ou sob demanda em <i>Tratamento</i>. Considera:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tolerância de <b>5 min</b> por marcação (10 min total/dia).</li>
          <li>Intervalo intra-jornada mínimo de <b>1h</b> (jornada {">"} 6h).</li>
          <li>Adicional noturno (52'30") e DSR sobre HE.</li>
          <li>Banco de Horas (créditos/débitos, expiração configurável).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "tratamento",
    icon: Wrench,
    title: "6. Tratamento e Ajustes",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Tratamento</b>: revisão em lote de até 7 dias por vez.</li>
          <li><b>Ajustes</b>: justificativas (esquecimento, médico, falta), com upload de atestado.</li>
          <li><b>Espelho</b>: visualização e assinatura digital (ICP-Brasil/e-CPF).</li>
          <li><b>Simulador</b>: testa cenários de jornada antes de aplicar.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "compliance",
    icon: FileText,
    title: "7. Compliance Legal (Portaria 671/2021)",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>Em <i>Ponto → Arquivos Legais (AFD/AEJ)</i> você gera:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>AFD</b> — Arquivo Fonte de Dados (origem das marcações).</li>
          <li><b>AFDT</b> — Arquivo Fonte de Dados Tratado.</li>
          <li><b>AEJ</b> — Arquivo Eletrônico de Jornada (consolidado).</li>
        </ul>
        <p>Validação automática de quantidade de marcações conforme CCT/sindicato.</p>
      </div>
    ),
  },
  {
    id: "folha",
    icon: Lock,
    title: "8. Fechamento e Exportação para Folha",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Revise pendências em <i>Tratamento</i> e <i>Alertas</i>.</li>
          <li>Em <i>Fechamento</i>, trave o período (bloqueia novos ajustes).</li>
          <li>Em <i>Exportação Domínio</i>, escolha o sistema de folha:
            <b> Domínio, Sage, Senior ou Folhamatic</b>.</li>
          <li>Baixe o arquivo e importe na folha.</li>
        </ol>
      </div>
    ),
  },
  {
    id: "esocial",
    icon: FileCode,
    title: "9. eSocial (S-2230 / S-2240)",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>
          Em <i>Ponto → eSocial</i>, geramos os XMLs:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>S-2230</b> — Afastamentos Temporários (atestados, férias, licença).</li>
          <li><b>S-2240</b> — Condições Ambientais (insalubridade, periculosidade).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "ferias",
    icon: Plane,
    title: "10. Férias, Afastamentos e Banco de Horas",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Férias</b>: programação e gozo, com <i>bloqueio automático</i> de marcação no período.</li>
          <li><b>Afastamentos</b>: INSS, acidente, licença-maternidade.</li>
          <li><b>Banco de Horas</b>: saldo por funcionário, compensação e expiração programada.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "ia",
    icon: Sparkles,
    title: "11. IA: Assistente, Predições e Risco",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Assistente RH</b>: pergunte em linguagem natural ("quem teve mais HE este mês?").</li>
          <li><b>Predições</b>: rotatividade, absenteísmo, recomendação de contratação.</li>
          <li><b>Risco Trabalhista</b>: alerta padrões de exposição (jornada excessiva, intervalo).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "notificacoes",
    icon: Bell,
    title: "12. Notificações e Automação (Cron)",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <ul className="list-disc pl-5 space-y-1">
          <li>Cron <b>02:00</b> — cálculo noturno de jornada do dia anterior.</li>
          <li>Cron <b>08:00</b> — notificações de atrasos, ausências, banco a expirar.</li>
          <li>Configure canais (e-mail, push, WhatsApp) em <i>Ponto → Notificações</i>.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "perfis",
    icon: Users,
    title: "13. Perfis de Acesso",
    body: (
      <div className="space-y-2 text-sm leading-relaxed">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>RH/Admin</b>: acesso completo (cadastros, fechamento, exportações).</li>
          <li><b>Gestor</b>: tratamento, ajustes e relatórios da equipe.</li>
          <li><b>Funcionário</b>: portal próprio (marcação, espelho, atestado, férias).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq",
    icon: ShieldAlert,
    title: "14. Perguntas Frequentes",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <div>
          <p className="font-medium">Esqueci de bater o ponto. O que fazer?</p>
          <p className="text-muted-foreground">Vá em <i>Portal do Funcionário → Ajustes</i> e abra uma solicitação com justificativa. O gestor aprova.</p>
        </div>
        <div>
          <p className="font-medium">Posso bater ponto fora da empresa?</p>
          <p className="text-muted-foreground">Apenas se a filial permitir trabalho remoto ou se você estiver dentro do geofence configurado.</p>
        </div>
        <div>
          <p className="font-medium">A face match falhou. E agora?</p>
          <p className="text-muted-foreground">Marcação fica pendente para validação manual do gestor. Atualize sua foto cadastral.</p>
        </div>
        <div>
          <p className="font-medium">Como fechar a folha do mês?</p>
          <p className="text-muted-foreground">Tratamento → Fechamento → Exportação. Após fechado, ajustes ficam bloqueados.</p>
        </div>
      </div>
    ),
  },
];

const quickLinks = [
  { url: "/ponto", label: "Dashboard", icon: TrendingUp },
  { url: "/ponto/funcionarios", label: "Funcionários", icon: Users },
  { url: "/ponto/registro", label: "Registrar Ponto", icon: Smartphone },
  { url: "/ponto/tratamento", label: "Tratamento", icon: Wrench },
  { url: "/ponto/espelho", label: "Espelho", icon: FileSignature },
  { url: "/ponto/fechamento", label: "Fechamento", icon: Lock },
  { url: "/ponto/exportacao", label: "Exportação", icon: FileDown },
  { url: "/ponto/afd", label: "AFD/AEJ", icon: FileText },
  { url: "/ponto/esocial", label: "eSocial", icon: FileCode },
  { url: "/ponto/banco-horas", label: "Banco de Horas", icon: Clock },
  { url: "/ponto/ferias", label: "Férias", icon: Plane },
  { url: "/ponto/importacao", label: "Importação", icon: Upload },
  { url: "/ponto/notificacoes", label: "Notificações", icon: Bell },
  { url: "/ponto/mapa", label: "Mapa de Equipes", icon: MapPin },
  { url: "/ponto/qrcode", label: "QR Code Totem", icon: QrCode },
  { url: "/ponto/antifraude", label: "Antifraude", icon: ShieldCheck },
  { url: "/ponto/assistente", label: "Assistente IA", icon: Sparkles },
  { url: "/ponto/predicoes", label: "Predições", icon: TrendingUp },
  { url: "/ponto/simulador", label: "Simulador", icon: Calculator },
];

export default function PontoManual() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/15 p-3 text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Manual do Controle de Ponto
            </h1>
            <p className="text-sm text-muted-foreground">
              Guia completo de uso · cadastros, marcação, fechamento e
              obrigações legais
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary">Portaria 671/2021</Badge>
              <Badge variant="secondary">eSocial</Badge>
              <Badge variant="secondary">LGPD</Badge>
              <Badge variant="secondary">v1.0</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Atalhos rápidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {quickLinks.map((q) => {
              const Icon = q.icon;
              return (
                <a
                  key={q.url}
                  href={q.url}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm"
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate font-medium">{q.label}</span>
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conteúdo do manual</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[70vh] pr-3">
            <Accordion type="multiple" defaultValue={["primeiros-passos"]}>
              {sections.map((s) => {
                const Icon = s.icon;
                return (
                  <AccordionItem key={s.id} value={s.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.title}</span>
                          {s.badge && (
                            <Badge variant="outline" className="text-[10px]">
                              {s.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11">
                      {s.body}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </ScrollArea>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Dúvidas? Use o <b>Assistente RH (IA)</b> no menu Ponto · respostas em
        linguagem natural sobre qualquer recurso do módulo.
      </p>
    </div>
  );
}
