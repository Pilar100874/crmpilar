import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Car, User, MapPin, Gauge, Clock, Navigation, History, Route } from 'lucide-react';
import { VeiculoComStatus } from '@/types/logistica';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

interface VeiculoDetailsPanelProps {
  veiculo: VeiculoComStatus;
  onClose: () => void;
}

const statusConfig = {
  movendo: { label: 'Em movimento', color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  parado: { label: 'Parado', color: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  offline: { label: 'Offline', color: 'bg-gray-400', bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
};

export const VeiculoDetailsPanel: React.FC<VeiculoDetailsPanelProps> = ({
  veiculo,
  onClose
}) => {
  const navigate = useNavigate();
  const config = statusConfig[veiculo.status];

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Car className="h-5 w-5" />
          Detalhes do Veículo
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${config.bgColor} mb-3`}>
            <Car className={`h-8 w-8 ${config.textColor}`} />
          </div>
          <h3 className="text-2xl font-bold">{veiculo.placa}</h3>
          {veiculo.descricao && (
            <p className="text-muted-foreground">{veiculo.descricao}</p>
          )}
          <Badge className={`mt-2 ${config.bgColor} ${config.textColor} border-0`}>
            <div className={`w-2 h-2 rounded-full ${config.color} mr-2`} />
            {config.label}
          </Badge>
        </div>

        <Separator />

        {/* Info */}
        <div className="space-y-4">
          {veiculo.motorista && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Motorista</p>
                <p className="font-medium">{veiculo.motorista}</p>
              </div>
            </div>
          )}

          {veiculo.tipo_veiculo && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Car className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{veiculo.tipo_veiculo}</p>
              </div>
            </div>
          )}

          {veiculo.ultima_posicao && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium font-mono text-sm">
                    {veiculo.ultima_posicao.lat.toFixed(6)}, {veiculo.ultima_posicao.lng.toFixed(6)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Gauge className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Velocidade</p>
                  <p className="font-medium">{Math.round(veiculo.ultima_posicao.velocidade)} km/h</p>
                </div>
              </div>

              {veiculo.ultima_posicao.direcao !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Navigation className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Direção</p>
                    <p className="font-medium">{Math.round(veiculo.ultima_posicao.direcao)}°</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Atualização</p>
                  <p className="font-medium">
                    {format(new Date(veiculo.ultima_posicao.data_hora), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(veiculo.ultima_posicao.data_hora), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => navigate(`/logistica/historico/${veiculo.id}`)}
          >
            <History className="h-4 w-4 mr-2" />
            Ver Histórico
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              if (veiculo.ultima_posicao) {
                window.open(
                  `https://www.google.com/maps?q=${veiculo.ultima_posicao.lat},${veiculo.ultima_posicao.lng}`,
                  '_blank'
                );
              }
            }}
            disabled={!veiculo.ultima_posicao}
          >
            <Route className="h-4 w-4 mr-2" />
            Abrir no Google Maps
          </Button>
        </div>
      </div>
    </div>
  );
};