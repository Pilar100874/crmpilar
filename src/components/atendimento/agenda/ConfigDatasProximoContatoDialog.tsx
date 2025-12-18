import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Phone, MessageSquare, Mail, Users, Save, Loader2, Settings2 } from "lucide-react";

interface ConfigDatasProximoContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estabelecimentoId: string;
}

const TIPOS_CONTATO = [
  { id: 'telefone', label: 'Telefone', icon: Phone, defaultDias: 3 },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, defaultDias: 2 },
  { id: 'email', label: 'E-mail', icon: Mail, defaultDias: 5 },
  { id: 'presencial', label: 'Presencial', icon: Users, defaultDias: 7 },
];

export function ConfigDatasProximoContatoDialog({
  open,
  onOpenChange,
  estabelecimentoId
}: ConfigDatasProximoContatoDialogProps) {
  const [configs, setConfigs] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && estabelecimentoId) {
      loadConfigs();
    }
  }, [open, estabelecimentoId]);

  const loadConfigs = async () => {
    const { data } = await supabase
      .from('atendimento_config_proxima_data')
      .select('tipo_contato, dias_padrao')
      .eq('estabelecimento_id', estabelecimentoId);

    if (data) {
      const configMap: Record<string, number> = {};
      data.forEach(item => {
        configMap[item.tipo_contato] = item.dias_padrao;
      });
      // Fill with defaults if missing
      TIPOS_CONTATO.forEach(tipo => {
        if (!(tipo.id in configMap)) {
          configMap[tipo.id] = tipo.defaultDias;
        }
      });
      setConfigs(configMap);
    } else {
      // Set defaults
      const defaults: Record<string, number> = {};
      TIPOS_CONTATO.forEach(tipo => {
        defaults[tipo.id] = tipo.defaultDias;
      });
      setConfigs(defaults);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const tipo of TIPOS_CONTATO) {
        const dias = configs[tipo.id] || tipo.defaultDias;
        
        const { error } = await supabase
          .from('atendimento_config_proxima_data')
          .upsert({
            estabelecimento_id: estabelecimentoId,
            tipo_contato: tipo.id,
            dias_padrao: dias,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'estabelecimento_id,tipo_contato'
          });

        if (error) throw error;
      }

      toast.success('Configurações salvas');
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Dias Padrão para Próximo Contato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Configure quantos dias no futuro será sugerido o próximo contato para cada tipo de interação.
          </p>

          {TIPOS_CONTATO.map(tipo => (
            <div key={tipo.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32">
                <tipo.icon className="h-4 w-4 text-muted-foreground" />
                <Label>{tipo.label}</Label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={configs[tipo.id] || tipo.defaultDias}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    [tipo.id]: parseInt(e.target.value) || tipo.defaultDias
                  }))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
