import React from 'react';
import { 
  Smartphone, 
  Navigation, 
  Download, 
  ExternalLink, 
  QrCode,
  Copy,
  Check,
  Apple,
  Chrome
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const PilarRastreadorApps: React.FC = () => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  // URL base do app PWA
  const APP_URL = `${window.location.origin}/pilar-rastreador`;
  
  const NATIVE_APP_URL = `${window.location.origin}/pilar-rastreador-nativo`;
  
  const apps = [
    {
      id: 'pwa',
      name: 'Pilar Rastreador PWA',
      description: 'App PWA instalável para Android e iOS. Rastreia localização GPS e envia dados para o sistema de logística.',
      icon: Navigation,
      platforms: ['Android', 'iOS'],
      type: 'PWA',
      url: APP_URL,
      features: [
        'Rastreamento GPS em tempo real',
        'Funciona offline (sincroniza quando online)',
        'Instalável na tela inicial',
        'Baixo consumo de bateria',
        'Intervalo de envio configurável'
      ]
    },
    {
      id: 'nativo',
      name: 'Pilar Rastreador Nativo',
      description: 'App nativo para Android e iOS com GPS nativo do dispositivo. Melhor desempenho em segundo plano.',
      icon: Smartphone,
      platforms: ['Android', 'iOS'],
      type: 'Nativo',
      url: NATIVE_APP_URL,
      features: [
        'GPS nativo do dispositivo',
        'Rastreamento em segundo plano confiável',
        'Melhor precisão e performance',
        'Indicador de bateria',
        'Publicável nas lojas de apps'
      ]
    },
    {
      id: 'traccar',
      name: 'Traccar Client',
      description: 'App oficial Traccar para rastreamento em segundo plano. Compatível com nosso sistema.',
      icon: Smartphone,
      platforms: ['Android', 'iOS'],
      type: 'Externo',
      url: 'https://www.traccar.org/client/',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=org.traccar.client',
      appStoreUrl: 'https://apps.apple.com/app/traccar-client/id843156974',
      features: [
        'Rastreamento em segundo plano',
        'Altamente configurável',
        'Suporte a múltiplos protocolos',
        'Open source'
      ]
    }
  ];

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
    toast.success('URL copiada!');
  };

  const openApp = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Navigation className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Pilar Rastreador</h2>
          <p className="text-sm text-muted-foreground">
            Apps de rastreamento GPS para celulares e dispositivos móveis
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <Card key={app.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {app.type}
                        </Badge>
                        {app.platforms.map((platform) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {app.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Recursos:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {app.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* QR Code for PWA and Nativo */}
                {(app.id === 'pwa' || app.id === 'nativo') && (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="bg-white p-2 rounded-lg">
                      <QRCodeSVG value={app.url} size={80} level="M" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Escaneie para abrir</p>
                      <p className="text-xs text-muted-foreground">
                        {app.id === 'nativo' 
                          ? 'Use para desenvolvimento ou compile como app nativo'
                          : 'Abra no celular e instale na tela inicial'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {(app.id === 'pwa' || app.id === 'nativo') ? (
                    <>
                      <Button 
                        className="flex-1"
                        onClick={() => openApp(app.url)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir App
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => copyUrl(app.url)}
                      >
                        {copiedUrl === app.url ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      {app.playStoreUrl && (
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => openApp(app.playStoreUrl!)}
                        >
                          <Chrome className="h-4 w-4 mr-2" />
                          Play Store
                        </Button>
                      )}
                      {app.appStoreUrl && (
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => openApp(app.appStoreUrl!)}
                        >
                          <Apple className="h-4 w-4 mr-2" />
                          App Store
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como configurar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm mb-2">Pilar Rastreador (PWA)</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Abra o app no navegador do celular</li>
                <li>Copie o token em Logística → Configuração</li>
                <li>Cole o token no app e defina um ID</li>
                <li>Cadastre o dispositivo em Veículos com tipo "Celular"</li>
                <li>Use o mesmo ID do dispositivo no cadastro</li>
                <li>Clique em "Iniciar Rastreamento"</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Traccar Client</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Baixe o app na loja (Android/iOS)</li>
                <li>Configure a URL do servidor com seu endpoint</li>
                <li>Defina um ID único para o dispositivo</li>
                <li>Cadastre o veículo com o ID do Traccar</li>
                <li>Ative o rastreamento no app</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PilarRastreadorApps;
