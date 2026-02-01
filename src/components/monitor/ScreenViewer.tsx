import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, X, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScreenViewerProps {
  usuarioId: string;
  usuarioNome: string;
  onClose: () => void;
}

export function ScreenViewer({ usuarioId, usuarioNome, onClose }: ScreenViewerProps) {
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Notificar que viewer está ativo
    const notifyViewerStart = async () => {
      try {
        await supabase.functions.invoke('extension-status', {
          body: { usuario_id: usuarioId, action: 'viewer-start' }
        });
        console.log('[ScreenViewer] Viewer iniciado para:', usuarioId);
      } catch (err) {
        console.error('[ScreenViewer] Erro ao notificar viewer-start:', err);
      }
    };

    notifyViewerStart();

    // Conectar ao canal de broadcast do usuário
    const channel = supabase.channel(`screen-share-${usuarioId}`)
      .on('broadcast', { event: 'frame' }, (payload) => {
        if (payload.payload?.frame) {
          setCurrentFrame(payload.payload.frame);
          setLastUpdate(new Date());
          setIsConnecting(false);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ScreenViewer] Conectado ao canal de tela');
          setIsConnecting(false);
        }
      });

    channelRef.current = channel;

    return () => {
      // Notificar que viewer parou
      const notifyViewerStop = async () => {
        try {
          await supabase.functions.invoke('extension-status', {
            body: { usuario_id: usuarioId, action: 'viewer-stop' }
          });
          console.log('[ScreenViewer] Viewer parado para:', usuarioId);
        } catch (err) {
          console.error('[ScreenViewer] Erro ao notificar viewer-stop:', err);
        }
      };

      notifyViewerStop();

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [usuarioId]);

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-black' 
    : '';

  return (
    <div className={containerClass}>
      <Card className={isFullscreen ? 'h-full rounded-none border-0' : ''}>
        <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Tela: {usuarioNome}
            </CardTitle>
            <CardDescription className="text-xs">
              {isConnecting ? (
                <span className="text-yellow-500">Conectando ao canal...</span>
              ) : lastUpdate ? (
                <span className="text-green-500">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </span>
              ) : (
                <span className="text-muted-foreground">Aguardando frames da extensão...</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={currentFrame ? "default" : "secondary"} className="text-[10px]">
              {currentFrame ? 'Ao Vivo' : 'Aguardando'}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`p-2 ${isFullscreen ? 'h-[calc(100%-60px)]' : ''}`}>
          {isConnecting ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mb-4 animate-spin" />
              <p className="text-sm">Conectando ao canal de monitoramento...</p>
            </div>
          ) : currentFrame ? (
            <div className={`relative ${isFullscreen ? 'h-full' : ''}`}>
              <img 
                src={currentFrame} 
                alt="Tela do usuário"
                className={`w-full ${isFullscreen ? 'h-full object-contain' : 'rounded-lg border'}`}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Monitor className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">Aguardando frames da extensão...</p>
              <p className="text-xs mt-2">O colaborador precisa ter a extensão ativa e compartilhando tela</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
