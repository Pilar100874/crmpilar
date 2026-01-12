import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, Store, X, ChevronDown, CheckSquare } from 'lucide-react';

interface Cnae {
  id: string;
  codigo: string;
  descricao: string;
  secao: string | null;
  divisao: string | null;
  grupo: string | null;
  classe: string | null;
}

interface CnaeFilterSelectProps {
  selectedCnaes: string[];
  onCnaesChange: (cnaes: string[]) => void;
  disabled?: boolean;
}

export const CnaeFilterSelect: React.FC<CnaeFilterSelectProps> = ({
  selectedCnaes,
  onCnaesChange,
  disabled = false
}) => {
  const [cnaes, setCnaes] = useState<Cnae[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchCnaes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cnaes')
        .select('*')
        .order('codigo');

      if (data && !error) {
        setCnaes(data);
      }
      setLoading(false);
    };

    fetchCnaes();
  }, []);

  const filteredCnaes = cnaes.filter(cnae => {
    const searchLower = searchTerm.toLowerCase();
    return (
      cnae.codigo.toLowerCase().includes(searchLower) ||
      cnae.descricao.toLowerCase().includes(searchLower)
    );
  });

  // Agrupa por divisão para melhor organização
  const groupedCnaes = filteredCnaes.reduce((acc, cnae) => {
    const divisao = cnae.divisao || 'Outros';
    if (!acc[divisao]) {
      acc[divisao] = [];
    }
    acc[divisao].push(cnae);
    return acc;
  }, {} as Record<string, Cnae[]>);

  const handleToggleCnae = (codigo: string) => {
    if (selectedCnaes.includes(codigo)) {
      onCnaesChange(selectedCnaes.filter(c => c !== codigo));
    } else {
      onCnaesChange([...selectedCnaes, codigo]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCnaes.length === filteredCnaes.length) {
      onCnaesChange([]);
    } else {
      onCnaesChange(filteredCnaes.map(c => c.codigo));
    }
  };

  const handleClearAll = () => {
    onCnaesChange([]);
    setSearchTerm('');
  };

  const getDivisaoNome = (divisao: string) => {
    const nomes: Record<string, string> = {
      '47': '47 - Comércio Varejista',
      '56': '56 - Alimentação',
      'Outros': 'Outros'
    };
    return nomes[divisao] || `Divisão ${divisao}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 text-xs sm:text-sm gap-1 min-w-[100px]"
        >
          <Store className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">CNAEs</span>
          {selectedCnaes.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selectedCnaes.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 sm:w-96 p-0" 
        align="start"
        style={{ zIndex: 99999 }}
      >
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Filtrar por CNAE (Concorrência)
            </h4>
            {selectedCnaes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar CNAE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{selectedCnaes.length} de {cnaes.length} selecionados</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-6 px-2 text-xs"
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              {selectedCnaes.length === filteredCnaes.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[280px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando CNAEs...
            </div>
          ) : Object.keys(groupedCnaes).length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum CNAE encontrado
            </div>
          ) : (
            Object.entries(groupedCnaes).map(([divisao, cnaesList]) => (
              <div key={divisao} className="border-b last:border-0">
                <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground sticky top-0">
                  {getDivisaoNome(divisao)}
                </div>
                {cnaesList.map((cnae) => (
                  <label
                    key={cnae.id}
                    className="flex items-start gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-border/50 last:border-0"
                  >
                    <Checkbox
                      checked={selectedCnaes.includes(cnae.codigo)}
                      onCheckedChange={() => handleToggleCnae(cnae.codigo)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 shrink-0 font-mono">
                          {cnae.codigo}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {cnae.descricao}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ))
          )}
        </ScrollArea>

        {selectedCnaes.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <div className="flex flex-wrap gap-1">
              {selectedCnaes.slice(0, 5).map((codigo) => {
                const cnae = cnaes.find(c => c.codigo === codigo);
                return (
                  <Badge
                    key={codigo}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => handleToggleCnae(codigo)}
                  >
                    {codigo}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                );
              })}
              {selectedCnaes.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedCnaes.length - 5} mais
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
