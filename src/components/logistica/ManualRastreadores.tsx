import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, BookOpen, Radio, Smartphone, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const CopyLine: React.FC<{ label?: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copiado para a área de transferência');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted-foreground min-w-[80px]">{label}</span>}
      <code className="flex-1 bg-muted rounded px-2 py-1 text-xs sm:text-sm font-mono break-all">{value}</code>
      <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copy}>
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

const ManualRastreadores: React.FC = () => {
  const endpoint = useMemo(() => {
    const base = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    return `${base.replace(/\/$/, '')}/functions/v1/rastreamento-posicao`;
  }, []);

  // Extrai host/porta para trackers que aceitam apenas host+porta (protocolos TCP nativos)
  const host = useMemo(() => {
    try {
      return new URL(endpoint).host;
    } catch {
      return 'crm.pilar.com.br';
    }
  }, [endpoint]);

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Manual de Configuração — Rastreadores
          </CardTitle>
          <CardDescription>
            Passo a passo para configurar rastreadores físicos e smartphones no Pilar Rastreador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              Endpoint HTTP do Pilar (para apps Traccar/OsmAnd e trackers com URL configurável):
            </div>
            <CopyLine label="URL" value={endpoint} />
            <p className="text-xs text-muted-foreground mt-1">
              Use este endereço em rastreadores/aplicativos que aceitem servidor via HTTP (OsmAnd, Traccar Client, GPSLogger).
            </p>
          </div>

          <Separator />

          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Host / Porta para rastreadores físicos (protocolos TCP binários):
            </div>
            <div className="grid gap-2">
              <CopyLine label="Host" value={host} />
              <CopyLine label="GPS103/TK103" value="Porta 5001" />
              <CopyLine label="GT06 / J16 / TK100" value="Porta 5023" />
              <CopyLine label="Mictrack" value="Porta 5031" />
              <CopyLine label="Suntech" value="Porta 5011" />
              <CopyLine label="OsmAnd / Traccar Client" value="Porta 5055" />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <span>
                Rastreadores físicos (GT06, TK103 etc.) usam protocolos TCP binários. Se você usa apenas o endpoint HTTP,
                será necessário um servidor Traccar intermediário publicado no host acima nas portas indicadas.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="preparacao" className="w-full">
        <TabsList className="w-full flex-wrap h-auto justify-start">
          <TabsTrigger value="preparacao">1. Preparação</TabsTrigger>
          <TabsTrigger value="celular">2. Celular</TabsTrigger>
          <TabsTrigger value="tk103">3. TK103 / GPS103</TabsTrigger>
          <TabsTrigger value="gt06">4. GT06 / J16</TabsTrigger>
          <TabsTrigger value="mictrack">5. Mictrack</TabsTrigger>
          <TabsTrigger value="cadastro">6. Cadastro no Pilar</TabsTrigger>
          <TabsTrigger value="bloqueio">7. Corte de Combustível</TabsTrigger>
        </TabsList>

        <TabsContent value="preparacao">
          <Card>
            <CardHeader><CardTitle className="text-base">Preparação (comum a todos)</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Adquira um chip SIM (2G ou 4G conforme o modelo) com plano de dados ativo (~10-50 MB/mês).</li>
                <li>Insira o chip no rastreador — retire tampa/parafusos com cuidado.</li>
                <li>Anote o <strong>IMEI</strong> (15 dígitos, na etiqueta do aparelho).</li>
                <li>Descubra o <strong>APN</strong> da operadora do chip (ex.: <code>zap.vivo.com.br</code>).</li>
                <li>Tenha em mãos o <strong>host</strong> e a <strong>porta</strong> do seu protocolo (ver acima).</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="celular">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Rastreamento por Celular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use o app <strong>Pilar Rastreador</strong> (ou Traccar Client / OsmAnd) instalado no celular do motorista.</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Instale o app no celular.</li>
                <li>Configure o servidor com a URL do endpoint HTTP acima.</li>
                <li>Coloque o <strong>IMEI/Device ID</strong> do celular igual ao cadastrado no veículo.</li>
                <li>Autorize permissões de localização (sempre) e desligue economia de bateria.</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tk103">
          <Card>
            <CardHeader><CardTitle className="text-base">TK103 / GPS103</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Envie os SMS abaixo <strong>para o número do chip</strong> que está no rastreador. Senha padrão: <code>123456</code>.</p>
              <div className="space-y-1">
                <CopyLine value="begin123456" />
                <CopyLine value="apn123456 zap.vivo.com.br" />
                <CopyLine value={`adminip123456 ${host} 5001`} />
                <CopyLine value="fix030s***n123456" />
              </div>
              <p className="text-xs text-muted-foreground">
                Substitua <code>zap.vivo.com.br</code> pelo APN da sua operadora.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gt06">
          <Card>
            <CardHeader><CardTitle className="text-base">GT06 / J16 / TK100 (com corte de ignição)</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <CopyLine value={`SERVER,1,${host},5023,0#`} />
                <CopyLine value="APN,zap.vivo.com.br,vivo,vivo#" />
                <CopyLine value="TIMER,30,60#" />
                <CopyLine value="GPRSON,1#" />
              </div>
              <div>
                <div className="font-medium mb-1">Corte de combustível via SMS:</div>
                <div className="space-y-1">
                  <CopyLine label="Cortar" value="RELAY,1#" />
                  <CopyLine label="Liberar" value="RELAY,0#" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Após a instalação do fio de corte, prefira usar o botão <strong>Bloquear Combustível</strong> na tela de Veículos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mictrack">
          <Card>
            <CardHeader><CardTitle className="text-base">Mictrack MT532 / MT600</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Baixe o app <strong>MiTrack</strong> na Play Store / App Store.</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Login com IMEI + senha (padrão <code>mt600</code> ou <code>123456</code>).</li>
                <li>Vá em <em>Settings → Server</em> e informe:</li>
              </ol>
              <div className="space-y-1 pl-6">
                <CopyLine label="Host" value={host} />
                <CopyLine label="Porta" value="5031" />
              </div>
              <p>Configure o APN em <em>Settings → APN</em> e salve. O aparelho reinicia sozinho.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cadastro">
          <Card>
            <CardHeader><CardTitle className="text-base">Cadastro no Pilar Rastreador</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Acesse <strong>Logística → Veículos → Novo Veículo</strong>.</li>
                <li>Preencha placa, modelo e motorista.</li>
                <li>Em <strong>Identificador do dispositivo</strong>, cole o <strong>IMEI</strong> (15 dígitos) do rastreador.</li>
                <li>Salve. O veículo aparecerá como <Badge variant="secondary">Aguardando sinal</Badge>.</li>
                <li>Ligue o rastreador em local aberto e aguarde 2 a 5 minutos.</li>
                <li>Confirme o status como <Badge>Online</Badge> na aba <em>Monitoramento</em>.</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bloqueio">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Corte de combustível pelo Pilar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Na aba <strong>Veículos</strong>, cada veículo com dispositivo GT06/J16/Mictrack tem o botão
                <Badge className="ml-1" variant="outline">Bloquear/Liberar Combustível</Badge>.
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Clique no ícone de raio ao lado do veículo.</li>
                <li>Confirme a ação (bloquear ou liberar).</li>
                <li>O comando é registrado e enviado pelo servidor Traccar ao aparelho.</li>
                <li>Acompanhe o <em>status do comando</em> (pendente → enviado → executado).</li>
              </ol>
              <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>
                  Nunca acione o bloqueio com o veículo em alta velocidade. O corte só interrompe a partida do motor —
                  use quando o veículo estiver parado ou em baixa velocidade.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManualRastreadores;
