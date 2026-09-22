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
              <AccordionContent className="space-y-4">
                <Passos
                  itens={[
                    "No UCM, vá em Extension/Trunk → Extensions → Add e escolha o tipo SIP.",
                    "Preencha os campos essenciais da tabela abaixo.",
                    "Ao final, clique em Save e depois em Apply Changes (barra amarela no topo do UCM). Sem o Apply Changes, nada do que você mudou passa a valer.",
                  ]}
                />
                <div>
                  <Badge variant="secondary" className="mb-2">
                    Campos essenciais do ramal (sem eles o Pilar Fone não funciona)
                  </Badge>
                  <Tabela
                    cabecalho={["Campo no UCM", "O que colocar", "Valor recomendado"]}
                    linhas={[
                      ["Extension (número do ramal)", "3 ou 4 dígitos, sem repetir outro ramal", "Ex.: 1001"],
                      ["CallerID Name (nome)", "Nome do usuário que aparece nas chamadas internas", "Ex.: Maria Silva"],
                      ["CallerID Number", "Número da empresa (com DDD), usado na identificação das ligações externas", "Ex.: 1121354444"],
                      ["SIP/IAX Password (senha do ramal)", "Senha forte — é a mesma que vai no cadastro do usuário no CRM", "Letras, números e símbolos"],
                      ["Permission (permissão de discagem)", "Define até onde o ramal pode ligar. Para ligar para celulares e fixos do Brasil, precisa ser National. Em Internal a ligação externa é recusada antes de chamar.", "National"],
                      ["DOD (Direct Outward Dialing)", "Vincule o DOD do tronco de saída com o CallerID da empresa — sem ele, a operadora pode recusar a ligação", "DOD do tronco principal"],
                      ["NAT Support", "Ligado — essencial para chamadas fora da empresa", "Ligado"],
                      ["ICE Support", "Ligado — ajuda o áudio a atravessar roteadores e 4G", "Ligado"],
                      ["Enable WebRTC", "Ligado — sem isso o Pilar Fone não registra o ramal", "Ligado"],
                      ["Codecs de áudio", "Deixe PCMU, PCMA, G.722 e OPUS. Desative G726 — o navegador recusa esse codec e a chamada falha ao atender.", "PCMU, PCMA, G.722, OPUS"],
                      ["DTMF Mode", "Forma de envio dos dígitos em menus (URA)", "RFC2833"],
                      ["Voicemail (caixa postal)", "Opcional, conforme a necessidade do usuário", "A critério da empresa"],
                    ]}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Importante: os dois erros mais comuns são deixar <strong>Permission em Internal</strong>{" "}
                  (a ligação externa é recusada antes de o celular tocar) e salvar sem clicar em{" "}
                  <strong>Apply Changes</strong>. Depois de qualquer ajuste no ramal, confirme as duas coisas.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p5">
              <AccordionTrigger>5. Ativar a API do UCM (integração com o sistema)</AccordionTrigger>
              <AccordionContent>
                <Passos
                  itens={[
                    "No UCM, vá em Value-added Features → API Configuration → HTTPS API Settings (New). Ative a opção Enable, defina um usuário e senha fortes (ex.: apicrm) — não use a conta do administrador principal — e salve.",
                    "Clique em Apply Changes (barra amarela no topo) para a API começar a responder. Sem isso as requisições falham com erro de autenticação.",
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

            <AccordionItem value="p8_cdr">
              <AccordionTrigger>8. Histórico de ligações (CDR) na Mesa da Telefonista</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  A aba "Ligações do dia" da Telefonista lê o CDR do próprio UCM pela API HTTPS. Se ela
                  ficar vazia ou mostrar aviso, o UCM ainda não está expondo os registros.
                </p>
                <Passos
                  itens={[
                    "Confirme que a API HTTPS New está ativa e com Apply Changes aplicado (passo 5).",
                    "Verifique se o usuário e senha de API estão iguais nos campos 'Usuário API' e 'Senha' desta tela.",
                    "O UCM grava o CDR em hora local; a consulta usa o fuso de Brasília. Certifique-se de que o relógio do PABX está correto (Sistema → Data e Hora).",
                    "A configuração 'CDR Real-time Output Settings' é opcional — não precisa estar ativada só para ler o histórico.",
                    "A API legada na porta 8443 funciona como fallback, mas prefira manter a API New na 8089.",
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="p9">
              <AccordionTrigger>9. Problemas comuns e solução</AccordionTrigger>
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
