import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Clock, Plus, Trash2, Settings, MapPin } from 'lucide-react';
import { useIsochrone } from './useIsochrone';
import { toast } from 'sonner';

interface IsochronePanelProps {
  onIsochroneClick?: (lat: number, lng: number) => void;
  selectedPoint?: { lat: number; lng: number } | null;
}

const MODOS_TRANSPORTE = [
  { value: 'driving-car', label: 'Carro' },
  { value: 'driving-hgv', label: 'Caminhão' },
  { value: 'cycling-regular', label: 'Bicicleta' },
  { value: 'foot-walking', label: 'A pé' }
];

const TEMPOS = [5, 10, 15, 20, 30, 45, 60];

export const IsochronePanel: React.FC<IsochronePanelProps> = ({ selectedPoint }) => {
  const { isocronas, loading, apiKey, setApiKey, fetchSavedIsochrones, generateIsochrone, deleteIsochrone } = useIsochrone();
  const [open, setOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempo, setTempo] = useState(15);
  const [modo, setModo] = useState('driving-car');
  const [nome, setNome] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSavedIsochrones();
    }
  }, [open, fetchSavedIsochrones]);

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim());
      setShowApiInput(false);
      toast.success('API Key salva');
    }
  };

  const handleGenerate = async () => {
    if (!selectedPoint) {
      toast.error('Clique no mapa para selecionar um ponto');
      return;
    }

    await generateIsochrone(
      selectedPoint.lat,
      selectedPoint.lng,
      tempo,
      modo,
      nome || `Isócrona ${tempo}min`
    );
    setNome('');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          Isócronas
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Isócronas (Área de Alcance)
          </SheetTitle>
          <SheetDescription>
            Visualize áreas alcançáveis em X minutos a partir de um ponto
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* API Key Config */}
          {!apiKey && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                Para usar isócronas, configure uma API Key gratuita do OpenRouteService:
              </p>
              <a 
                href="https://openrouteservice.org/dev/#/signup" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                → Criar conta gratuita (40 req/min)
              </a>
              <div className="flex gap-2 mt-3">
                <Input
                  type="password"
                  placeholder="Cole sua API Key aqui"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSaveApiKey}>Salvar</Button>
              </div>
            </div>
          )}

          {apiKey && (
            <>
              {/* Nova Isócrona */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Nova Isócrona</h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowApiInput(!showApiInput)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {showApiInput && (
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Nova API Key"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleSaveApiKey}>Atualizar</Button>
                  </div>
                )}

                <div>
                  <Label>Nome (opcional)</Label>
                  <Input
                    placeholder="Ex: Loja Centro"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tempo (minutos)</Label>
                    <Select value={String(tempo)} onValueChange={(v) => setTempo(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPOS.map(t => (
                          <SelectItem key={t} value={String(t)}>{t} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transporte</Label>
                    <Select value={modo} onValueChange={setModo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODOS_TRANSPORTE.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedPoint ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Ponto: {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Clique no mapa para selecionar um ponto central
                  </p>
                )}

                <Button 
                  onClick={handleGenerate} 
                  disabled={!selectedPoint || loading}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? 'Gerando...' : 'Gerar Isócrona'}
                </Button>
              </div>

              {/* Isócronas Salvas */}
              <div className="space-y-3">
                <h4 className="font-medium">Isócronas Salvas</h4>
                {isocronas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma isócrona salva</p>
                ) : (
                  <div className="space-y-2">
                    {isocronas.map(iso => (
                      <div 
                        key={iso.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{iso.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {iso.tempo_minutos} min • {MODOS_TRANSPORTE.find(m => m.value === iso.modo_transporte)?.label || iso.modo_transporte}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => iso.id && deleteIsochrone(iso.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
