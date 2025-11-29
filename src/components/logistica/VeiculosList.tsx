import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Car, MapPin, Clock, Gauge, User, Circle } from 'lucide-react';
import { VeiculoComStatus } from '@/types/logistica';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface VeiculosListProps {
  veiculos: VeiculoComStatus[];
  selectedVeiculoId?: string;
  onVeiculoSelect: (veiculo: VeiculoComStatus) => void;
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
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}) => {
  const filteredVeiculos = veiculos.filter(v => {
    const matchesSearch = 
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.motorista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || v.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col bg-background border-r">
      <div className="p-4 border-b space-y-3">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Car className="h-5 w-5" />
          Veículos ({filteredVeiculos.length})
        </h2>
        <Input
          placeholder="Buscar placa, motorista..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9"
        />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="movendo">Em movimento</SelectItem>
            <SelectItem value="parado">Parado</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
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
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-primary/10 border-2 border-primary' 
                    : 'bg-card hover:bg-accent border border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.color}`} />
                    <span className="font-semibold">{veiculo.placa}</span>
                  </div>
                  <Badge variant="outline" className={`${config.textColor} text-xs`}>
                    {config.label}
                  </Badge>
                </div>

                {veiculo.motorista && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="h-3 w-3" />
                    {veiculo.motorista}
                  </div>
                )}

                {veiculo.ultima_posicao && (
                  <div className="space-y-1 text-xs text-muted-foreground">
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
                  <div className="text-xs text-muted-foreground italic">
                    Sem posição registrada
                  </div>
                )}
              </div>
            );
          })}

          {filteredVeiculos.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              Nenhum veículo encontrado
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};