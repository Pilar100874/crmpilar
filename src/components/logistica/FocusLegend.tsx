import React from 'react';
import { X, Car, User, MessageCircle, Gauge } from 'lucide-react';
import { VeiculoComStatus } from '@/types/logistica';
import { formatWhatsappNumber } from '@/lib/logistica/cvDriverLookup';

interface FocusLegendProps {
  veiculo?: VeiculoComStatus;
  onClose: () => void;
}

export const FocusLegend: React.FC<FocusLegendProps> = ({ veiculo, onClose }) => {
  if (!veiculo) return null;
  const motorista = veiculo.motorista_atual?.nome || veiculo.motorista;
  const telefone = veiculo.motorista_atual?.telefone;
  const wa = telefone ? formatWhatsappNumber(telefone) : null;
  const vel = veiculo.ultima_posicao ? Math.round(veiculo.ultima_posicao.velocidade) : null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
      <div className="flex items-center gap-3 bg-background/25 backdrop-blur border border-border shadow-lg rounded-full pl-3 pr-2 py-1.5 text-xs sm:text-sm max-w-[92vw]">
        <div className="flex items-center gap-1.5 font-semibold">
          <Car className="h-3.5 w-3.5 text-primary" />
          <span className="truncate max-w-[120px]">{veiculo.placa}</span>
        </div>
        {motorista && (
          <div className="flex items-center gap-1.5 border-l pl-3">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate max-w-[160px]">{motorista}</span>
          </div>
        )}
        {wa && (
          <a
            href={`https://web.whatsapp.com/send?phone=${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-600 hover:underline border-l pl-3"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{telefone}</span>
          </a>
        )}
        {vel !== null && (
          <div className="flex items-center gap-1 text-muted-foreground border-l pl-3">
            <Gauge className="h-3.5 w-3.5" />
            {vel} km/h
          </div>
        )}
        <button
          onClick={onClose}
          className="ml-1 rounded-full hover:bg-accent p-1"
          title="Fechar zoom"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default FocusLegend;
