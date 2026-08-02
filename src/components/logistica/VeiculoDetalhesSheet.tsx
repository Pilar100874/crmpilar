import React, { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  X, Car, User, MapPin, Gauge, Clock, Navigation, History, Route,
  MessageCircle, Phone, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VeiculoComStatus, VeiculoPosicao } from '@/types/logistica';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatWhatsappNumber } from '@/lib/logistica/cvDriverLookup';
import { IgnicaoBadge } from '@/components/logistica/IgnicaoBadge';
import { CorteCombustivelBadge } from '@/components/logistica/CorteCombustivelBadge';
import { cn } from '@/lib/utils';

const statusConfig = {
  movendo: { label: 'Em movimento', dot: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-500/40' },
  parado: { label: 'Parado', dot: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-500/40' },
  offline: { label: 'Offline', dot: 'bg-muted-foreground/50', text: 'text-muted-foreground', ring: 'ring-muted-foreground/30' }
};

const PERIODOS = [
  { value: '1', label: '1h' },
  { value: '6', label: '6h' },
  { value: '12', label: '12h' },
  { value: '24', label: '24h' }
];

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export interface VeiculoDetalhesSheetProps {
  veiculo: VeiculoComStatus;
  onClose: () => void;
  /** Recebe as coordenadas da rota no período para desenhar no mapa */
  onRouteChange?: (coords: Array<{ lat: number; lng: number }> | null) => void;
  onFocusPosition?: (pos: { lat: number; lng: number }) => void;
  className?: string;
}

export const VeiculoDetalhesSheet: React.FC<VeiculoDetalhesSheetProps> = ({
  veiculo,
  onClose,
  onRouteChange,
  onFocusPosition,
  className
}) => {
  const navigate = useNavigate();
  const [horas, setHoras] = useState('6');
  const [posicoes, setPosicoes] = useState<VeiculoPosicao[]>([]);
  const [loading, setLoading] = useState(false);
  const config = statusConfig[veiculo.status];

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      try {
        const desde = subHours(new Date(), Number(horas)).toISOString();
        const { data, error } = await supabase
          .from('veiculo_posicoes')
          .select('*')
          .eq('veiculo_id', veiculo.id)
          .gte('data_hora', desde)
          .order('data_hora', { ascending: true })
          .limit(2000);

        if (error) throw error;
        if (cancelado) return;
        setPosicoes((data || []) as VeiculoPosicao[]);
      } catch (e) {
        console.error('Erro ao carregar rota do veículo', e);
        if (!cancelado) setPosicoes([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    carregar();
    return () => { cancelado = true; };
  }, [veiculo.id, horas]);

  // Envia rota para o mapa
  useEffect(() => {
    const coords = posicoes.map(p => ({ lat: p.lat, lng: p.lng }));
    onRouteChange?.(coords.length > 1 ? coords : null);
  }, [posicoes, onRouteChange]);

  useEffect(() => {
    return () => { onRouteChange?.(null); };
  }, [onRouteChange]);

  const resumo = useMemo(() => {
    let distancia = 0;
    let velMax = 0;
    for (let i = 0; i < posicoes.length; i++) {
      velMax = Math.max(velMax, posicoes[i].velocidade || 0);
      if (i > 0) distancia += haversineKm(posicoes[i - 1], posicoes[i]);
    }
    const emMovimento = posicoes.filter(p => (p.velocidade || 0) > 5).length;
    return {
      distancia,
      velMax,
      percentualMovimento: posicoes.length ? Math.round((emMovimento / posicoes.length) * 100) : 0,
      pontos: posicoes.length
    };
  }, [posicoes]);

  // Linha do tempo: eventos relevantes (mudança de movimento/parada) + amostragem
  const linhaDoTempo = useMemo(() => {
    const eventos: Array<{ pos: VeiculoPosicao; tipo: 'movimento' | 'parada' | 'ponto' }> = [];
    let anteriorMovendo: boolean | null = null;
    posicoes.forEach((p, idx) => {
      const movendo = (p.velocidade || 0) > 5;
      if (anteriorMovendo === null || movendo !== anteriorMovendo) {
        eventos.push({ pos: p, tipo: movendo ? 'movimento' : 'parada' });
        anteriorMovendo = movendo;
      } else if (idx % 25 === 0) {
        eventos.push({ pos: p, tipo: 'ponto' });
      }
    });
    return eventos.reverse().slice(0, 80);
  }, [posicoes]);

  const wa = veiculo.motorista_atual?.telefone ? formatWhatsappNumber(veiculo.motorista_atual.telefone) : null;

  return (
    <div className={cn("h-full flex flex-col bg-background/95 backdrop-blur-md", className)}>
      {/* Cabeçalho */}
      <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between shrink-0">
        <h3 className="font-medium text-xs uppercase tracking-wide flex items-center gap-2">
          <Car className="h-3.5 w-3.5" />
          Detalhes do veículo
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Fechar">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Identificação + status */}
          <div className={cn("rounded-xl border border-border/60 bg-card/70 p-3 ring-1", config.ring)}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{veiculo.placa}</p>
                {veiculo.descricao && (
                  <p className="text-xs text-muted-foreground truncate">{veiculo.descricao}</p>
                )}
              </div>
              <Badge variant="outline" className={cn("shrink-0 gap-1.5", config.text)}>
                <span className={cn("h-2 w-2 rounded-full", config.dot, veiculo.status === 'movendo' && 'animate-pulse')} />
                {config.label}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {veiculo.status !== 'offline'
                ? <Badge variant="outline" className="text-[10px] gap-1 text-green-600"><Wifi className="h-3 w-3" />Rastreando</Badge>
                : <Badge variant="outline" className="text-[10px] gap-1 text-destructive"><WifiOff className="h-3 w-3" />Sem sinal</Badge>}
              <IgnicaoBadge ignicao={veiculo.ultima_posicao?.ignicao} compact />
              <CorteCombustivelBadge corte={veiculo.ultima_posicao?.corte_combustivel} compact />
            </div>
          </div>

          {/* Última atualização */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/60 bg-card/60 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Velocidade
              </p>
              <p className="text-sm font-bold tabular-nums">
                {veiculo.ultima_posicao ? `${Math.round(veiculo.ultima_posicao.velocidade)} km/h` : '-'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/60 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Navigation className="h-3 w-3" /> Direção
              </p>
              <p className="text-sm font-bold tabular-nums">
                {veiculo.ultima_posicao?.direcao !== undefined && veiculo.ultima_posicao?.direcao !== null
                  ? `${Math.round(veiculo.ultima_posicao.direcao)}°`
                  : '-'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/60 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Última atualização
            </p>
            {veiculo.ultima_posicao ? (
              <>
                <p className="text-sm font-medium">
                  {format(new Date(veiculo.ultima_posicao.data_hora), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(veiculo.ultima_posicao.data_hora), { addSuffix: true, locale: ptBR })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem posição registrada</p>
            )}
            {veiculo.ultima_posicao && (
              <button
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                onClick={() => onFocusPosition?.({ lat: veiculo.ultima_posicao!.lat, lng: veiculo.ultima_posicao!.lng })}
              >
                <MapPin className="h-3 w-3" />
                {veiculo.ultima_posicao.lat.toFixed(5)}, {veiculo.ultima_posicao.lng.toFixed(5)}
              </button>
            )}
          </div>

          {/* Motorista */}
          {veiculo.motorista_atual ? (
            <div className="rounded-lg border border-border/60 bg-card/60 p-2 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dirigindo agora</p>
                  <p className="text-sm font-medium truncate">{veiculo.motorista_atual.nome}</p>
                </div>
              </div>
              {veiculo.motorista_atual.telefone && (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 h-7 text-xs">
                    <a href={`tel:${veiculo.motorista_atual.telefone}`}>
                      <Phone className="h-3 w-3 mr-1" /> Ligar
                    </a>
                  </Button>
                  {wa && (
                    <Button asChild size="sm" variant="outline" className="flex-1 h-7 text-xs text-emerald-600">
                      <a href={`https://web.whatsapp.com/send?phone=${wa}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : veiculo.motorista ? (
            <div className="rounded-lg border border-border/60 bg-card/60 p-2 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{veiculo.motorista}</span>
            </div>
          ) : null}

          <Separator />

          {/* Rota no tempo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide flex items-center gap-1.5">
                <Route className="h-3.5 w-3.5" /> Rota no tempo
              </p>
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            <Tabs value={horas} onValueChange={setHoras}>
              <TabsList className="grid grid-cols-4 h-8">
                {PERIODOS.map(p => (
                  <TabsTrigger key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Distância</p>
                <p className="text-sm font-bold tabular-nums">{resumo.distancia.toFixed(1)} km</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Vel. máx</p>
                <p className="text-sm font-bold tabular-nums">{Math.round(resumo.velMax)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Em rota</p>
                <p className="text-sm font-bold tabular-nums">{resumo.percentualMovimento}%</p>
              </div>
            </div>

            {/* Linha do tempo */}
            <div className="relative pl-4">
              <span className="absolute left-[6px] top-1 bottom-1 w-px bg-border" />
              {linhaDoTempo.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground py-3">Nenhuma posição registrada no período.</p>
              )}
              <div className="space-y-2">
                {linhaDoTempo.map((ev, i) => {
                  const movendo = (ev.pos.velocidade || 0) > 5;
                  return (
                    <button
                      key={`${ev.pos.id}-${i}`}
                      onClick={() => onFocusPosition?.({ lat: ev.pos.lat, lng: ev.pos.lng })}
                      className="w-full text-left group"
                    >
                      <span
                        className={cn(
                          "absolute -translate-x-[11px] mt-1.5 h-2 w-2 rounded-full ring-2 ring-background",
                          movendo ? 'bg-green-500' : 'bg-amber-500'
                        )}
                      />
                      <div className="rounded-md px-2 py-1 group-hover:bg-accent transition-colors">
                        <p className="text-[11px] font-medium">
                          {format(new Date(ev.pos.data_hora), "dd/MM HH:mm:ss", { locale: ptBR })}
                          <span className={cn("ml-2 font-normal", movendo ? 'text-green-600' : 'text-amber-600')}>
                            {movendo ? `${Math.round(ev.pos.velocidade)} km/h` : 'parado'}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {ev.pos.lat.toFixed(5)}, {ev.pos.lng.toFixed(5)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => navigate(`/logistica/historico/${veiculo.id}`)}
          >
            <History className="h-3.5 w-3.5 mr-2" />
            Ver histórico completo
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};

export default VeiculoDetalhesSheet;
