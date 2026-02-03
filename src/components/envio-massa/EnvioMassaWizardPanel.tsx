import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
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

interface EnvioMassaWizardPanelProps {
  onClose: () => void;
  onComplete?: () => void;
}

const STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'channel', label: 'Canal', number: 1 },
  { key: 'filter', label: 'Filtrar Contatos', number: 2 },
  { key: 'compose', label: 'Montar Mensagem', number: 3 },
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

export function EnvioMassaWizardPanel({ 
  onClose,
  onComplete 
}: EnvioMassaWizardPanelProps) {
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
      // Get usuario.id from usuarios table
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

  // Hooks for data - pass canal to filter contacts
  const { 
    contacts,
    contactsByChannel,
    segmentos, 
    loading: loadingContacts,
    filters,
    applyFilters 
  } = useContactsFilter(estabelecimentoId, state.canal);

  const { 
    replies: quickReplies, 
    getGroupedReplies,
    loading: loadingReplies 
  } = useQuickReplies(estabelecimentoId);

  const { 
    templates: envioMassaTemplates,
    loading: loadingTemplates
  } = useEnvioMassaTemplates(estabelecimentoId);

  const { 
    media, 
    uploadMedia,
    loading: loadingMedia 
  } = useMediaGallery(estabelecimentoId);

  // Navigation
  const goToStep = (step: WizardStep) => {
    setState(prev => ({ ...prev, step }));
  };

  const handleCanalChange = (canal: CanalEnvio) => {
    setState(prev => ({ 
      ...prev, 
      canal,
      selectedContacts: [] // Reset selected contacts when changing channel
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

  // Replace variables in content
  const replaceVariables = (text: string, contact: ContactForBulkSend) => {
    return text
      .replace(/\{\{contato\}\}/gi, contact.nome)
      .replace(/\{\{empresa\}\}/gi, contact.empresa || 'N/A')
      .replace(/\{\{whatsapp\}\}/gi, contact.telefone || 'N/A')
      .replace(/\{\{email\}\}/gi, contact.email || 'N/A');
  };

  // Send
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
        // Build description from content items
        const description = state.contentItems
          .map((item, idx) => {
            const content = item.type === 'image' || item.type === 'video' 
              ? `[${item.type === 'video' ? 'Vídeo' : 'Imagem'}] ${item.content}`
              : replaceVariables(item.content, contact);
            return `${idx + 1}. ${content}`;
          })
          .join('\n');

        // Create task for next contact
        const { error } = await supabase
          .from('calendario_tarefas')
          .insert({
            user_id: usuarioId,
            estabelecimento_id: estabelecimentoId,
            contact_id: contact.id,
            contact_name: contact.nome,
            title: `Retorno: Envio em massa (${state.canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'})`,
            description: description.substring(0, 1000), // Limit description
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Envio em Massa</h1>
          {state.canal && (
            <Badge variant="secondary">
              {state.canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Etapa {currentStepIndex + 1} de {STEPS.length}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center py-4 px-2 overflow-x-auto border-b bg-muted/30 shrink-0">
        {STEPS.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div 
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0
                ${index <= currentStepIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}
              `}
            >
              {step.number}
            </div>
            <span 
              className={`
                hidden sm:block ml-2 text-sm whitespace-nowrap
                ${index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}
              `}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <div 
                className={`
                  w-4 sm:w-6 md:w-8 h-0.5 mx-1 sm:mx-2 shrink-0
                  ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
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
    </div>
  );
}
