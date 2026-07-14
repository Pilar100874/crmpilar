import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Car, User, MapPin, Gauge, Clock, Navigation, History, Route, Copy, Check, Phone, MessageCircle } from 'lucide-react';
import { VeiculoComStatus } from '@/types/logistica';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatWhatsappNumber } from '@/lib/logistica/cvDriverLookup';

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
  const [copied, setCopied] = useState(false);

  const handleCopyGoogleMapsLink = async () => {
    if (veiculo.ultima_posicao) {
      const link = `https://www.google.com/maps?q=${veiculo.ultima_posicao.lat},${veiculo.ultima_posicao.lng}`;
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Link copiado! Cole em uma nova aba do navegador.');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error('Erro ao copiar link');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 sm:p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
          <Car className="h-4 w-4 sm:h-5 sm:w-5" />
          Detalhes do Veículo
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full ${config.bgColor} mb-2 sm:mb-3`}>
            <Car className={`h-6 w-6 sm:h-8 sm:w-8 ${config.textColor}`} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold">{veiculo.placa}</h3>
          {veiculo.descricao && (
            <p className="text-sm text-muted-foreground">{veiculo.descricao}</p>
          )}
          <Badge className={`mt-2 ${config.bgColor} ${config.textColor} border-0 text-xs`}>
            <div className={`w-2 h-2 rounded-full ${config.color} mr-2`} />
            {config.label}
          </Badge>
        </div>

        <Separator />

        {/* Info */}
        <div className="space-y-3 sm:space-y-4">
          {veiculo.motorista_atual ? (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Motorista (dirigindo agora)</p>
                  <p className="font-medium text-sm truncate">{veiculo.motorista_atual.nome}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Saída: {format(new Date(veiculo.motorista_atual.exit_time), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {veiculo.motorista_atual.telefone && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`tel:${veiculo.motorista_atual!.telefone}`)}
                  >
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    Ligar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      const wa = formatWhatsappNumber(veiculo.motorista_atual!.telefone);
                      if (wa) window.open(`https://wa.me/${wa}`, '_blank');
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                    WhatsApp
                  </Button>
                </div>
              )}
            </div>
          ) : veiculo.motorista && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Motorista</p>
                <p className="font-medium text-sm truncate">{veiculo.motorista}</p>
              </div>
            </div>
          )}

          {veiculo.tipo_veiculo && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Car className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium text-sm">{veiculo.tipo_veiculo}</p>
              </div>
            </div>
          )}

          {veiculo.ultima_posicao && (
            <>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium font-mono text-xs sm:text-sm truncate">
                    {veiculo.ultima_posicao.lat.toFixed(6)}, {veiculo.ultima_posicao.lng.toFixed(6)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Velocidade</p>
                  <p className="font-medium text-sm">{Math.round(veiculo.ultima_posicao.velocidade)} km/h</p>
                </div>
              </div>

              {veiculo.ultima_posicao.direcao !== undefined && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Direção</p>
                    <p className="font-medium text-sm">{Math.round(veiculo.ultima_posicao.direcao)}°</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Última Atualização</p>
                  <p className="font-medium text-sm">
                    {format(new Date(veiculo.ultima_posicao.data_hora), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
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
            className="w-full justify-start text-sm"
            onClick={() => navigate(`/logistica/historico/${veiculo.id}`)}
            size="sm"
          >
            <History className="h-4 w-4 mr-2" />
            Ver Histórico
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-sm"
            onClick={handleCopyGoogleMapsLink}
            disabled={!veiculo.ultima_posicao}
            size="sm"
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Link Copiado!" : "Copiar Link Google Maps"}
          </Button>
        </div>
      </div>
    </div>
  );
};
