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
  AlertCircle,
  Circle,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { useAvisosSistema } from '@/hooks/useAvisosSistema';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AvisosPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const tipoIcons: Record<string, any> = {
  info: Info,
  alerta: AlertTriangle,
  urgente: AlertCircle,
  sucesso: CheckCircle,
  erro: AlertCircle,
};

const tipoCores: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  alerta: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  urgente: 'bg-red-500/10 text-red-500 border-red-500/20',
  sucesso: 'bg-green-500/10 text-green-500 border-green-500/20',
  erro: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function AvisosPanel({ isOpen, onClose }: AvisosPanelProps) {
  const {
    avisos,
    avisosNaoLidos,
    avisosPendentes,
    loading,
    marcarComoLido,
    marcarTodosComoLidos,
    marcarResolvido,
  } = useAvisosSistema();
  
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'resolvidos'>('pendentes');

  const avisosFiltrados = avisos.filter(a => {
    if (filtro === 'pendentes') return !a.resolvido;
    if (filtro === 'resolvidos') return a.resolvido;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-20 w-96 h-[500px] bg-background border rounded-lg shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b bg-primary/5 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-semibold">Avisos</span>
            {avisosPendentes > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1 flex items-center justify-center">
                {avisosPendentes}
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
                Ler
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="p-2 border-b flex gap-1">
        <Button
          variant={filtro === 'pendentes' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFiltro('pendentes')}
          className="text-xs flex-1"
        >
          Pendentes {avisosPendentes > 0 && `(${avisosPendentes})`}
        </Button>
        <Button
          variant={filtro === 'resolvidos' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFiltro('resolvidos')}
          className="text-xs flex-1"
        >
          Resolvidos
        </Button>
        <Button
          variant={filtro === 'todos' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFiltro('todos')}
          className="text-xs flex-1"
        >
          Todos
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : avisosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{filtro === 'pendentes' ? 'Nenhum aviso pendente' : 'Nenhum aviso'}</p>
          </div>
        ) : (
          <div className="divide-y">
            {avisosFiltrados.map((aviso) => {
              const Icon = tipoIcons[aviso.tipo] || Info;
              return (
                <div
                  key={aviso.id}
                  className={cn(
                    'w-full p-3 text-left transition-colors hover:bg-muted/50',
                    !aviso.lido && 'bg-primary/5',
                    aviso.resolvido && 'opacity-60'
                  )}
                >
                  <div className="flex gap-3">
                    {/* Resolve button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarResolvido(aviso.id, !aviso.resolvido);
                      }}
                      className="flex-shrink-0 mt-0.5"
                      title={aviso.resolvido ? 'Reabrir' : 'Marcar como resolvido'}
                    >
                      {aviso.resolvido ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>
                    
                    <div className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center border flex-shrink-0',
                      tipoCores[aviso.tipo] || tipoCores.info
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => !aviso.lido && marcarComoLido(aviso.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'font-medium text-sm',
                          aviso.resolvido && 'line-through text-muted-foreground',
                          !aviso.resolvido && !aviso.lido && 'text-foreground',
                          !aviso.resolvido && aviso.lido && 'text-muted-foreground'
                        )}>
                          {aviso.titulo}
                        </p>
                        {!aviso.lido && !aviso.resolvido && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className={cn(
                        "text-xs text-muted-foreground mt-1 line-clamp-2",
                        aviso.resolvido && "line-through"
                      )}>
                        {aviso.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(aviso.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        {aviso.resolvido && ' • Resolvido'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
