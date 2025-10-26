import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";

interface Stage {
  nome: string;
  cor: string;
}

interface NewFunilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (funilId: string) => void;
}

const defaultStages: Stage[] = [
  { nome: 'Lead', cor: '#64748b' },
  { nome: 'Qualificação', cor: '#3b82f6' },
  { nome: 'Proposta', cor: '#8b5cf6' },
  { nome: 'Negociação', cor: '#f59e0b' },
  { nome: 'Fechamento', cor: '#10b981' },
];

export function NewFunilDialog({ open, onOpenChange, onSuccess }: NewFunilDialogProps) {
  const [loading, setLoading] = useState(false);
  const [funilNome, setFunilNome] = useState('');
  const [funilDescricao, setFunilDescricao] = useState('');
  const [funilCor, setFunilCor] = useState('#3b82f6');
  const [stages, setStages] = useState<Stage[]>(defaultStages);

  const handleAddStage = () => {
    setStages([...stages, { nome: '', cor: '#64748b' }]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      toast.error('O funil precisa ter pelo menos uma etapa');
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleStageChange = (index: number, field: 'nome' | 'cor', value: string) => {
    const newStages = [...stages];
    newStages[index][field] = value;
    setStages(newStages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error('Por favor, selecione um estabelecimento primeiro');
        return;
      }

      // Validação
      if (!funilNome.trim()) {
        toast.error('Nome do funil é obrigatório');
        return;
      }

      if (stages.some(s => !s.nome.trim())) {
        toast.error('Todas as etapas precisam ter nome');
        return;
      }

      // Criar funil
      const { data: funilData, error: funilError } = await supabase
        .from('funis')
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: funilNome,
          descricao: funilDescricao,
          cor: funilCor,
        })
        .select()
        .single();

      if (funilError) throw funilError;

      // Criar etapas
      const stagesData = stages.map((stage, index) => ({
        funil_id: funilData.id,
        nome: stage.nome,
        cor: stage.cor,
        ordem: index,
        is_final: index === stages.length - 1,
      }));

      const { error: stagesError } = await supabase
        .from('funil_stages')
        .insert(stagesData);

      if (stagesError) throw stagesError;

      toast.success('Funil criado com sucesso!');
      
      // Reset form
      setFunilNome('');
      setFunilDescricao('');
      setFunilCor('#3b82f6');
      setStages(defaultStages);
      
      onSuccess(funilData.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar funil:', error);
      toast.error('Erro ao criar funil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Funil</DialogTitle>
          <DialogDescription>
            Configure o nome do funil e as etapas que ele terá
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h3 className="font-medium">Informações do Funil</h3>
            
            <div>
              <Label>Nome do Funil *</Label>
              <Input
                value={funilNome}
                onChange={(e) => setFunilNome(e.target.value)}
                placeholder="Ex: Vendas B2B, Pós-venda, Recrutamento"
                required
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={funilDescricao}
                onChange={(e) => setFunilDescricao(e.target.value)}
                placeholder="Descreva o propósito deste funil"
                rows={2}
              />
            </div>

            <div>
              <Label>Cor do Funil</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={funilCor}
                  onChange={(e) => setFunilCor(e.target.value)}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{funilCor}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Etapas do Funil</h3>
              <Button type="button" size="sm" variant="outline" onClick={handleAddStage}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Etapa
              </Button>
            </div>

            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <Input
                      value={stage.nome}
                      onChange={(e) => handleStageChange(index, 'nome', e.target.value)}
                      placeholder={`Nome da etapa ${index + 1}`}
                      required
                    />
                  </div>
                  
                  <Input
                    type="color"
                    value={stage.cor}
                    onChange={(e) => handleStageChange(index, 'cor', e.target.value)}
                    className="w-16 h-10"
                  />
                  
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveStage(index)}
                    disabled={stages.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              As etapas serão exibidas na ordem acima. A última etapa será marcada como final.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Criando...' : 'Criar Funil'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
