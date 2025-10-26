import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Funil {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
}

interface FunilSelectorProps {
  selectedFunilId: string | null;
  onFunilChange: (funilId: string) => void;
  onNewFunil: () => void;
  onManageFunis: () => void;
}

export function FunilSelector({ selectedFunilId, onFunilChange, onNewFunil, onManageFunis }: FunilSelectorProps) {
  const [funis, setFunis] = useState<Funil[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunis();
  }, []);

  const loadFunis = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from('funis')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setFunis(data || []);
      
      // Se não tem funil selecionado, seleciona o primeiro
      if (!selectedFunilId && data && data.length > 0) {
        onFunilChange(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-10 w-64 animate-pulse bg-muted rounded" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedFunilId || undefined} onValueChange={onFunilChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Selecione um funil" />
        </SelectTrigger>
        <SelectContent>
          {funis.map((funil) => (
            <SelectItem key={funil.id} value={funil.id}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: funil.cor }}
                />
                {funil.nome}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="icon"
        onClick={onNewFunil}
        title="Criar novo funil"
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={onManageFunis}
        title="Gerenciar funis"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
