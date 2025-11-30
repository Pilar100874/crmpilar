import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VeiculoPosicao } from '@/types/logistica';

interface HistoricoTimelineProps {
  posicoes: VeiculoPosicao[];
  onTimeChange: (filteredPosicoes: VeiculoPosicao[], currentIndex: number) => void;
  className?: string;
}

export const HistoricoTimeline: React.FC<HistoricoTimelineProps> = ({
  posicoes,
  onTimeChange,
  className
}) => {
  const [currentIndex, setCurrentIndex] = useState(posicoes.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get time range
  const firstPosicao = posicoes[0];
  const lastPosicao = posicoes[posicoes.length - 1];
  const currentPosicao = posicoes[currentIndex];

  // Update parent when index changes
  useEffect(() => {
    if (posicoes.length > 0) {
      const filteredPosicoes = posicoes.slice(0, currentIndex + 1);
      onTimeChange(filteredPosicoes, currentIndex);
    }
  }, [currentIndex, posicoes, onTimeChange]);

  // Reset when posicoes change
  useEffect(() => {
    setCurrentIndex(posicoes.length - 1);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [posicoes]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && posicoes.length > 0) {
      const interval = 1000 / playbackSpeed;
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= posicoes.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, posicoes.length]);

  const handleSliderChange = useCallback((value: number[]) => {
    setCurrentIndex(value[0]);
    setIsPlaying(false);
  }, []);

  const handlePlayPause = () => {
    if (currentIndex >= posicoes.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleSkipForward = () => {
    setIsPlaying(false);
    setCurrentIndex(posicoes.length - 1);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentIndex(prev => Math.min(posicoes.length - 1, prev + 1));
  };

  if (posicoes.length === 0) {
    return null;
  }

  const progress = ((currentIndex + 1) / posicoes.length) * 100;

  return (
    <div className={`bg-background/95 backdrop-blur-sm border rounded-lg p-3 space-y-3 ${className}`}>
      {/* Time display */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {firstPosicao && format(new Date(firstPosicao.data_hora), 'HH:mm', { locale: ptBR })}
          </span>
        </div>
        
        <Badge variant="secondary" className="font-mono text-sm px-3">
          {currentPosicao && format(new Date(currentPosicao.data_hora), 'HH:mm:ss', { locale: ptBR })}
        </Badge>
        
        <span className="text-muted-foreground text-sm">
          {lastPosicao && format(new Date(lastPosicao.data_hora), 'HH:mm', { locale: ptBR })}
        </span>
      </div>

      {/* Slider */}
      <div className="px-1">
        <Slider
          value={[currentIndex]}
          onValueChange={handleSliderChange}
          max={posicoes.length - 1}
          min={0}
          step={1}
          className="cursor-pointer"
        />
      </div>

      {/* Progress bar visual */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleSkipBack}
            title="Ir para o início"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleStepBack}
            title="Ponto anterior"
          >
            <SkipBack className="h-3 w-3" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            className="h-9 w-9"
            onClick={handlePlayPause}
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleStepForward}
            title="Próximo ponto"
          >
            <SkipForward className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleSkipForward}
            title="Ir para o fim"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Velocidade:</span>
          <Select 
            value={String(playbackSpeed)} 
            onValueChange={(v) => setPlaybackSpeed(Number(v))}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="5">5x</SelectItem>
              <SelectItem value="10">10x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Position info */}
        <div className="text-xs text-muted-foreground">
          {currentIndex + 1} / {posicoes.length}
        </div>
      </div>

      {/* Current position info */}
      {currentPosicao && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
          <span>
            Velocidade: <strong className="text-foreground">{currentPosicao.velocidade} km/h</strong>
          </span>
          <span>
            Lat: {currentPosicao.lat.toFixed(5)}, Lng: {currentPosicao.lng.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
};
