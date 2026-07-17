import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Car, Clock, Gauge, User, Wifi, WifiOff, MessageCircle } from 'lucide-react';
import { VeiculoComStatus } from '@/types/logistica';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatWhatsappNumber } from '@/lib/logistica/cvDriverLookup';

interface VeiculosListProps {
  veiculos: VeiculoComStatus[];
  selectedVeiculoId?: string;
  onVeiculoSelect: (veiculo: VeiculoComStatus) => void;
  onVeiculoDoubleClick?: (veiculo: VeiculoComStatus) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

const statusConfig = {
  movendo: { label: 'Em movimento', color: 'bg-green-500', textColor: 'text-green-600' },
  parado: { label: 'Parado', color: 'bg-amber-500', textColor: 'text-amber-600' },
  offline: { label: 'Offline', color: 'bg-gray-400', textColor: 'text-gray-500' }
};

export const VeiculosList: React.FC<VeiculosListProps> = ({
  veiculos,
  selectedVeiculoId,
  onVeiculoSelect,
  onVeiculoDoubleClick,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}) => {
  const filteredVeiculos = veiculos.filter(v => {
    const matchesSearch = 
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.motorista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.motorista_atual?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || v.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 sm:p-4 border-b space-y-2 sm:space-y-3">
        <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
          <Car className="h-4 w-4 sm:h-5 sm:w-5" />
          Veículos ({filteredVeiculos.length})
        </h2>
        <Input
          placeholder="Buscar placa, motorista..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 sm:h-9 text-sm"
        />
        <select 
          value={statusFilter} 
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="h-8 sm:h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="movendo">Em movimento</option>
          <option value="parado">Parado</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredVeiculos.map(veiculo => {
            const config = statusConfig[veiculo.status];
            const isSelected = selectedVeiculoId === veiculo.id;
            
            return (
              <div
                key={veiculo.id}
                onClick={() => onVeiculoSelect(veiculo)}
                onDoubleClick={() => onVeiculoDoubleClick?.(veiculo)}
                className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-primary/10 border-2 border-primary' 
                    : 'bg-card hover:bg-accent border border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {veiculo.status !== 'offline' ? (
                              <Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                            ) : (
                              <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {veiculo.status !== 'offline' ? 'Rastreando' : 'Sem sinal'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-semibold text-sm">{veiculo.placa}</span>
                    </div>
                    <Badge variant="outline" className={`${config.textColor} text-[10px] sm:text-xs`}>
                      {config.label}
                    </Badge>
                  </div>

                {veiculo.motorista_atual ? (
                  <div className="mb-1.5 space-y-1">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <User className="h-3 w-3 text-primary" />
                      <span className="truncate font-medium">{veiculo.motorista_atual.nome}</span>
                    </div>
                    {veiculo.motorista_atual.telefone && (() => {
                      const wa = formatWhatsappNumber(veiculo.motorista_atual!.telefone);
                      return wa ? (
                        <a
                          href={`https://web.whatsapp.com/send?phone=${wa}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600 hover:underline"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {veiculo.motorista_atual.telefone}
                        </a>
                      ) : null;
                    })()}
                  </div>
                ) : veiculo.motorista && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{veiculo.motorista}</span>
                  </div>
                )}


                {veiculo.ultima_posicao && (
                  <div className="space-y-1 text-[10px] sm:text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-3 w-3" />
                      {Math.round(veiculo.ultima_posicao.velocidade)} km/h
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(veiculo.ultima_posicao.data_hora), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                  </div>
                )}

                {!veiculo.ultima_posicao && (
                  <div className="text-[10px] sm:text-xs text-muted-foreground italic">
                    Sem posição registrada
                  </div>
                )}
              </div>
            );
          })}

          {filteredVeiculos.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nenhum veículo encontrado
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};