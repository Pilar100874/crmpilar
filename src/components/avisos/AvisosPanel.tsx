import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  X, 
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAvisosSistema } from '@/hooks/useAvisosSistema';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AvisosPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const tipoIcons = {
  info: Info,
  alerta: AlertTriangle,
  urgente: AlertCircle,
  sucesso: CheckCircle,
};

const tipoCores = {
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  alerta: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  urgente: 'bg-red-500/10 text-red-500 border-red-500/20',
  sucesso: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export function AvisosPanel({ isOpen, onClose }: AvisosPanelProps) {
  const {
    avisos,
    avisosNaoLidos,
    loading,
    marcarComoLido,
    marcarTodosComoLidos,
  } = useAvisosSistema();

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-20 w-96 h-[500px] bg-background border rounded-lg shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b bg-primary/5 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-semibold">Avisos do Sistema</span>
            {avisosNaoLidos > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
                {avisosNaoLidos}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {avisosNaoLidos > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={marcarTodosComoLidos}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Ler todos
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : avisos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum aviso no momento</p>
          </div>
        ) : (
          <div className="divide-y">
            {avisos.map((aviso) => {
              const Icon = tipoIcons[aviso.tipo];
              return (
                <button
                  key={aviso.id}
                  onClick={() => !aviso.lido && marcarComoLido(aviso.id)}
                  className={cn(
                    'w-full p-4 text-left transition-colors hover:bg-muted/50',
                    !aviso.lido && 'bg-primary/5'
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center border',
                      tipoCores[aviso.tipo]
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'font-medium text-sm',
                          !aviso.lido && 'text-foreground',
                          aviso.lido && 'text-muted-foreground'
                        )}>
                          {aviso.titulo}
                        </p>
                        {!aviso.lido && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {aviso.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(aviso.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
