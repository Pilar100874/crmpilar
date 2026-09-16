import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";

/** Bloco de passos numerados. */
function Passos({ itens }: { itens: string[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
      {itens.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ol>
  );
}

function Tabela({ linhas, cabecalho }: { cabecalho: string[]; linhas: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {cabecalho.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium text-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-t">
              {l.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top text-muted-foreground">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Guia passo a passo (do zero) para colocar o PABX Grandstream UCM6510
 * funcionando com o roteador, o certificado digital e o Pilar Fone.
 */
export function UCMAjudaGuia() {
  const [aberto, setAberto] = useState(false);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Ajuda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Guia completo: UCM6510 + roteador + Pilar Fone</DialogTitle>
          <DialogDescription>
            Passo a passo do zero, na ordem certa. Faça um item por vez e só avance quando o teste
            do passo funcionar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <Accordion type="single" collapsible defaultValue="p0" className="w-full">
            <AccordionItem value="p0">
              <AccordionTrigger>0. Antes de começar (o que você precisa ter)</AccordionTrigger>
              <AccordionContent>
                <Passos
                  itens={[
                    "PABX Grandstream UCM6510 ligado na rede e com acesso à internet.",
                    "Acesso de administrador do UCM (usuário e senha) e do roteador da empresa.",
                    "Um endereço na internet para o PABX: um domínio próprio (ex.: pabx.suaempresa.com.br) ou um DDNS gratuito (ex.: suaempresa.myddns.me). Sem isso não há certificado nem uso fora da empresa.",
                    "Internet com IP público. Se o provedor usar CGNAT (IP compartilhado), peça um IP público fixo — caso contrário o telefone só funciona dentro da empresa.",
                    "Anote desde já: IP interno do PABX, endereço externo (domínio/DDNS), usuário e senha de API, números dos ramais.",
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p1">
              <AccordionTrigger>1. Configurar o UCM6510 (rede e acesso)</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <Passos
                  itens={[
                    "Conecte a porta LAN do UCM ao switch/roteador da empresa e acesse o painel pelo navegador: https://IP-DO-UCM (o IP aparece no visor do aparelho).",
                    "Entre em Sistema → Configurações de Rede e defina modo Roteador desativado (use como Switch/LAN simples) quando o roteador da empresa já faz a internet.",
                    "Coloque um IP fixo no UCM, dentro da sua faixa de rede, fora do intervalo automático do roteador. Ex.: 192.168.1.100, máscara 255.255.255.0, gateway 192.168.1.1, DNS 8.8.8.8.",
                    "Em Sistema → Data e Hora, ative o servidor de horário (pool.ntp.org) e o fuso de Brasília. Hora errada quebra certificados e gravações.",
                    "Troque a senha padrão do administrador e crie um administrador separado só para a integração (será usado no CRM).",
                    "Teste: abra https://192.168.1.100 de um computador da rede e faça login.",
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p2">
              <AccordionTrigger>2. Configurar o roteador (IP fixo, DDNS e portas)</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <Passos
                  itens={[
                    "No roteador, reserve o IP do UCM no DHCP (reserva por MAC), para ele nunca mudar de endereço.",
                    "Se você não tem IP fixo do provedor, ative o DDNS no roteador (No-IP, DuckDNS, DDNS do próprio fabricante) e anote o endereço criado.",
                    "Abra o redirecionamento de portas (Port Forwarding / Virtual Server) apontando as portas abaixo para o IP interno do UCM.",
                    "Se o roteador tiver 'SIP ALG' ou 'SIP Helper', DESATIVE — é a causa mais comum de chamada que cai ou fica sem áudio.",
                    "Se houver firewall com bloqueio por país/faixa, libere apenas o necessário e mantenha o resto fechado.",
                  ]}
                />
                <Tabela
                  cabecalho={["Porta", "Protocolo", "Para que serve", "Precisa abrir?"]}
                  linhas={[
                    ["8089", "TCP", "WebSocket seguro (WSS) — é por aqui que o Pilar Fone fala com o PABX", "Sim, obrigatório"],
                    ["5061", "TCP", "SIP com criptografia (TLS) para telefones e aparelhos externos", "Sim, recomendado"],
                    ["5060", "UDP/TCP", "SIP sem criptografia (aparelhos antigos, alguns troncos)", "Só se precisar"],
                    ["10000–20000", "UDP", "Áudio e vídeo das chamadas (RTP)", "Sim, obrigatório"],
                    ["80 e 443", "TCP", "Validação do certificado Let's Encrypt (pode fechar depois)", "Durante a emissão"],
                    ["8443", "TCP", "Painel de administração do UCM pela internet", "Evite abrir"],
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  Teste: em um celular fora do Wi‑Fi da empresa, acesse{" "}
                  <span className="font-mono">https://seu-endereco:8089/ws</span>. Uma resposta de
                  erro do servidor já indica que a porta está chegando no PABX; “não foi possível
                  conectar” indica porta fechada.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p3">
              <AccordionTrigger>3. Certificado digital (obrigatório para o Pilar Fone)</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  O navegador e o aplicativo só conectam em servidor com certificado válido. Um
                  certificado “autoassinado” do próprio UCM <strong>não funciona</strong>.
                </p>
                <Passos
                  itens={[
                    "Aponte seu domínio/DDNS para o IP público da empresa (registro A ou o próprio DDNS do roteador).",
                    "No UCM, vá em Sistema → Segurança → Certificado (ou Let's Encrypt, conforme a versão do firmware).",
                    "Opção A (recomendada): use o Let's Encrypt embutido. Informe o domínio (ex.: pabx.suaempresa.com.br), deixe as portas 80/443 redirecionadas para o UCM e clique em Emitir. A renovação é automática.",
                    "Opção B: emita o certificado em outro servidor e envie no UCM os arquivos de certificado (.crt/fullchain) e chave privada (.key).",
                    "Depois de emitido, ative o certificado para o serviço HTTPS e para SIP TLS/WSS e reinicie os serviços quando o UCM pedir.",
                    "Teste: acesse https://seu-dominio:8089 pelo navegador e confira o cadeado sem aviso de segurança.",
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  Atenção: sempre use o <strong>domínio</strong> nos cadastros do CRM (não o IP) para
                  uso externo — o certificado é emitido para o nome, não para o número.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p4">
              <AccordionTrigger>4. Criar e configurar o ramal do usuário</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <Passos
                  itens={[
                    "No UCM, vá em Ramal/Tronco → Ramais → Adicionar e escolha o tipo SIP.",
                    "Número do ramal: use 3 ou 4 dígitos (ex.: 1001). Preencha o nome do usuário.",
                    "Senha SIP: crie uma senha forte (letras, números e símbolos). Essa mesma senha vai no cadastro do usuário no CRM.",
                    "Na aba Mídia, ative os codecs OPUS, G.722, G.711 (PCMU/PCMA) e, se for usar vídeo, VP8/H.264.",
                    "Ative NAT / 'Suporte a NAT' e 'ICE' no ramal — essencial para chamadas fora da empresa.",
                    "Ative WebRTC no ramal (em firmwares mais novos aparece como 'Enable WebRTC Support'). Sem isso o Pilar Fone não registra.",
                    "Na aba Recursos, defina o Privilégio de discagem (Interno, Local, Nacional ou Internacional) conforme o que o usuário pode ligar. Sem privilégio, ligações externas caem na hora.",
                    "Salve e clique em Aplicar Alterações (barra laranja no topo do UCM).",
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p5">
              <AccordionTrigger>5. Criar o usuário de API (integração com o sistema)</AccordionTrigger>
              <AccordionContent>
                <Passos
                  itens={[
                    "No UCM, vá em Configurações do Sistema → Configuração de API / HTTPS API e ative a API.",
                    "Crie um usuário exclusivo para a integração (ex.: apicrm) com uma senha forte — não use a conta do administrador principal.",
                    "Se houver lista de IPs permitidos, inclua a rede do CRM ou deixe liberado apenas se o acesso for interno.",
                    "Anote usuário e senha: eles vão nos campos 'Usuário API' e 'Senha' desta tela.",
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p6">
              <AccordionTrigger>6. O que preencher no nosso sistema</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    Aqui nesta tela (Telefonia UCM)
                  </Badge>
                  <Tabela
                    cabecalho={["Campo", "O que colocar", "Exemplo"]}
                    linhas={[
                      ["Host Local do UCM", "IP fixo do PABX na rede interna, sem https://", "192.168.1.100"],
                      ["Host Remoto do UCM", "Domínio/DDNS para uso fora da empresa, sem https://", "pabx.suaempresa.com.br"],
                      ["Usuário API", "Usuário criado no passo 5", "apicrm"],
                      ["Senha", "Senha do usuário de API", "••••••••"],
                      ["Sala de conferência", "Número criado no UCM em Chamadas → Conferência", "8000"],
                      ["UCM na rede local", "Ligado quando o PABX está na mesma rede da empresa", "Ligado"],
                      ["Ativo", "Liga a integração", "Ligado"],
                    ]}
                  />
                </div>
                <div>
                  <Badge variant="secondary" className="mb-2">
                    No cadastro de cada usuário (Configurações → Usuários)
                  </Badge>
                  <Tabela
                    cabecalho={["Campo", "O que colocar", "Exemplo"]}
                    linhas={[
                      ["Ramal", "Número do ramal criado no passo 4", "1001"],
                      ["Usuário SIP", "Normalmente igual ao ramal", "1001"],
                      ["Senha SIP", "Senha do ramal no UCM", "••••••••"],
                      ["Servidor (PABX)", "Endereço interno do PABX", "192.168.1.100"],
                      ["Porta", "Porta do WebSocket seguro", "8089"],
                      ["Servidor alternativo", "Domínio/DDNS para uso fora da empresa", "pabx.suaempresa.com.br"],
                      ["Porta alternativa", "Mesma porta segura", "8089"],
                      ["Abas liberadas", "Quais recursos o usuário vê no Pilar Fone", "Teclado, Ramais, Agenda"],
                    ]}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p7">
              <AccordionTrigger>7. Testar na ordem certa</AccordionTrigger>
              <AccordionContent>
                <Passos
                  itens={[
                    "Dentro da empresa: abra o Pilar Fone e confira o status 'Conectado'. Ligue de um ramal para outro.",
                    "Ligue do ramal para um celular (teste de saída) e do celular para o número da empresa (teste de entrada).",
                    "Fora da empresa (4G): repita os testes. Se conectar só na empresa, o problema está nas portas/certificado do endereço externo.",
                    "Confira o áudio nos dois sentidos. Áudio em um lado só é quase sempre faixa RTP (10000–20000 UDP) fechada ou SIP ALG ligado.",
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p8">
              <AccordionTrigger>8. Problemas comuns e solução</AccordionTrigger>
              <AccordionContent>
                <Tabela
                  cabecalho={["Sintoma", "Causa mais provável", "O que fazer"]}
                  linhas={[
                    ["Telefone não conecta (fica 'Desconectado')", "Porta 8089 fechada ou certificado inválido", "Revise o passo 2 e o passo 3"],
                    ["Conecta na empresa, não conecta fora", "DDNS/domínio errado ou porta não redirecionada", "Confira o campo 'Servidor alternativo' e o roteador"],
                    ["Chamada cai após poucos segundos", "SIP ALG ligado no roteador", "Desative SIP ALG/SIP Helper"],
                    ["Sem áudio ou áudio em um lado só", "Faixa RTP 10000–20000 UDP fechada", "Abra a faixa e ative NAT/ICE no ramal"],
                    ["Ligação interna funciona, externa não", "Privilégio de discagem do ramal", "Ajuste o privilégio no passo 4"],
                    ["Aviso de segurança no navegador", "Certificado autoassinado ou vencido", "Reemita pelo Let's Encrypt (passo 3)"],
                  ]}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
