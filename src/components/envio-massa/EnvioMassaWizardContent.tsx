import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

import { StepChannel } from "./steps/StepChannel";
import { StepFilter } from "./steps/StepFilter";
import { StepCompose } from "./steps/StepCompose";
import { StepPreview } from "./steps/StepPreview";
import { StepSchedule } from "./steps/StepSchedule";
import { StepConfirm } from "./steps/StepConfirm";
import { useContactsFilter } from "./hooks/useContactsFilter";
import { useQuickReplies } from "./hooks/useQuickReplies";
import { useMediaGallery } from "./hooks/useMediaGallery";
import { useEnvioMassaTemplates } from "./hooks/useEnvioMassaTemplates";
import { 
  WizardStep, ContentItem, ContactForBulkSend, 
  EnvioMassaFilters, EnvioMassaState, CanalEnvio 
} from "./types";

interface EnvioMassaWizardContentProps {
  onClose: () => void;
  onComplete?: () => void;
}

const STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'channel', label: 'Canal', number: 1 },
  { key: 'filter', label: 'Filtrar', number: 2 },
  { key: 'compose', label: 'Montar', number: 3 },
  { key: 'preview', label: 'Preview', number: 4 },
  { key: 'schedule', label: 'Agendar', number: 5 },
  { key: 'confirm', label: 'Confirmar', number: 6 },
];

const getInitialState = (): EnvioMassaState => ({
  step: 'channel',
  canal: null,
  filters: {},
  selectedContacts: [],
  contentItems: [],
  proximaDataContato: addDays(new Date(), 3)
});

export function EnvioMassaWizardContent({ 
  onClose,
  onComplete 
}: EnvioMassaWizardContentProps) {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>('');
  const [usuarioId, setUsuarioId] = useState<string>('');
  const [state, setState] = useState<EnvioMassaState>(getInitialState());
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // Load estabelecimento and usuario
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      if (usuarioData) {
        setUsuarioId(usuarioData.id);
      }
    }
  };

  // Hooks for data
  const { 
    contacts,
    segmentos, 
    applyFilters 
  } = useContactsFilter(estabelecimentoId, state.canal);

  const { 
    replies: quickReplies, 
    getGroupedReplies 
  } = useQuickReplies(estabelecimentoId);

  const { 
    templates: envioMassaTemplates 
  } = useEnvioMassaTemplates(estabelecimentoId);

  const { 
    media, 
    uploadMedia 
  } = useMediaGallery(estabelecimentoId);

  // Navigation
  const goToStep = (step: WizardStep) => {
    setState(prev => ({ ...prev, step }));
  };

  const handleCanalChange = (canal: CanalEnvio) => {
    setState(prev => ({ 
      ...prev, 
      canal,
      selectedContacts: []
    }));
  };

  const handleFilterChange = (newFilters: EnvioMassaFilters) => {
    applyFilters(newFilters);
    setState(prev => ({ ...prev, filters: newFilters }));
  };

  const handleSelectContacts = (contacts: ContactForBulkSend[]) => {
    setState(prev => ({ ...prev, selectedContacts: contacts }));
  };

  const handleContentChange = (items: ContentItem[]) => {
    setState(prev => ({ ...prev, contentItems: items }));
  };

  const handleDateChange = (date: Date) => {
    setState(prev => ({ ...prev, proximaDataContato: date }));
  };

  const replaceVariables = (text: string, contact: ContactForBulkSend) => {
    return text
      .replace(/\{\{contato\}\}/gi, contact.nome)
      .replace(/\{\{empresa\}\}/gi, contact.empresa || 'N/A')
      .replace(/\{\{whatsapp\}\}/gi, contact.telefone || 'N/A')
      .replace(/\{\{email\}\}/gi, contact.email || 'N/A');
  };

  const handleConfirm = async () => {
    if (!usuarioId || !estabelecimentoId) {
      toast.error('Dados do usuário não encontrados');
      return;
    }

    setIsSending(true);
    setSendProgress(0);

    try {
      const total = state.selectedContacts.length;
      let completed = 0;

      for (const contact of state.selectedContacts) {
        const description = state.contentItems
          .map((item, idx) => {
            const content = item.type === 'image' || item.type === 'video' 
              ? `[${item.type === 'video' ? 'Vídeo' : 'Imagem'}] ${item.content}`
              : replaceVariables(item.content, contact);
            return `${idx + 1}. ${content}`;
          })
          .join('\n');

        const { error } = await supabase
          .from('calendario_tarefas')
          .insert({
            user_id: usuarioId,
            estabelecimento_id: estabelecimentoId,
            contact_id: contact.id,
            contact_name: contact.nome,
            title: `Retorno: Envio em massa (${state.canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'})`,
            description: description.substring(0, 1000),
            date: format(state.proximaDataContato, 'yyyy-MM-dd'),
            origem: 'envio_massa',
            origem_sub_item: state.canal,
            status: 'pendente'
          });

        if (error) {
          console.error('Error creating task:', error);
        }

        completed++;
        setSendProgress((completed / total) * 100);
      }

      toast.success(`${completed} tarefas criadas com sucesso!`);
      onComplete?.();
      onClose();
    } catch (error: any) {
      console.error('Error in bulk send:', error);
      toast.error('Erro ao processar envio em massa');
    } finally {
      setIsSending(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === state.step);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Envio em Massa</h2>
          {state.canal && (
            <Badge variant="secondary" className="text-xs">
              {state.canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentStepIndex + 1}/{STEPS.length}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Steps - Compact */}
      <div className="flex items-center justify-center py-2 px-2 gap-1 border-b bg-muted/30 shrink-0 overflow-x-auto">
        {STEPS.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div 
              className={`
                flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0
                ${index <= currentStepIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}
              `}
            >
              {step.number}
            </div>
            <span 
              className={`
                hidden lg:block ml-1 text-xs whitespace-nowrap
                ${index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}
              `}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <div 
                className={`
                  w-3 h-0.5 mx-1 shrink-0
                  ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {state.step === 'channel' && (
          <StepChannel
            selectedCanal={state.canal}
            onSelectCanal={handleCanalChange}
            onNext={() => goToStep('filter')}
          />
        )}

        {state.step === 'filter' && (
          <StepFilter
            contacts={contacts}
            selectedContacts={state.selectedContacts}
            segmentos={segmentos}
            filters={state.filters}
            onFilterChange={handleFilterChange}
            onSelectContacts={handleSelectContacts}
            onBack={() => goToStep('channel')}
            onNext={() => goToStep('compose')}
            canal={state.canal}
          />
        )}

        {state.step === 'compose' && (
          <StepCompose
            contentItems={state.contentItems}
            quickReplies={quickReplies}
            groupedReplies={getGroupedReplies()}
            templates={envioMassaTemplates}
            media={media}
            onContentChange={handleContentChange}
            onUploadMedia={uploadMedia}
            onBack={() => goToStep('filter')}
            onNext={() => goToStep('preview')}
          />
        )}

        {state.step === 'preview' && (
          <StepPreview
            contentItems={state.contentItems}
            selectedContacts={state.selectedContacts}
            onBack={() => goToStep('compose')}
            onNext={() => goToStep('schedule')}
          />
        )}

        {state.step === 'schedule' && (
          <StepSchedule
            proximaDataContato={state.proximaDataContato}
            onDateChange={handleDateChange}
            onBack={() => goToStep('preview')}
            onNext={() => goToStep('confirm')}
          />
        )}

        {state.step === 'confirm' && (
          <StepConfirm
            contentItems={state.contentItems}
            selectedContacts={state.selectedContacts}
            proximaDataContato={state.proximaDataContato}
            isSending={isSending}
            progress={sendProgress}
            onBack={() => goToStep('schedule')}
            onConfirm={handleConfirm}
            canal={state.canal}
          />
        )}
      </div>
    </div>
  );
}
