import { enviarEmailMassa } from "./enviarEmailMassa";
import { useExecucaoEnvio } from "./hooks/useExecucaoEnvio";
import { useState, useEffect, useRef } from "react";
import { dataPadraoProximoContato, origemDoCanalMassa } from "@/lib/atendimento/prazosProximoContato";
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
import { StepComposeChamada } from "./steps/StepComposeChamada";
import { StepPreview } from "./steps/StepPreview";
import { StepSchedule } from "./steps/StepSchedule";
import { StepConfirm } from "./steps/StepConfirm";
import { useContactsFilter } from "./hooks/useContactsFilter";
import { useQuickReplies } from "./hooks/useQuickReplies";
import { useMediaGallery } from "./hooks/useMediaGallery";
import { useEnvioMassaTemplates } from "./hooks/useEnvioMassaTemplates";
import { lerPararAoReceber } from "@/components/atendimento/DiscadorModoDialog";
import {
  WizardStep, ContentItem, ContactForBulkSend,
  EnvioMassaFilters, EnvioMassaState, CanalEnvio,
  canalEhChamada, ROTULO_CANAL, ConfigCampanhaIa
} from "./types";

interface EnvioMassaWizardContentProps {
  onClose: () => void;
  onComplete?: () => void;
  contatosIniciais?: string[];
  /** Canal já escolhido na tela de disparo: pula direto para Montar. */
  canalInicial?: CanalEnvio;
  /** Quando a seleção veio da tela de Disparo em massa, voltar ao filtro reabre essa mesma tela. */
  onVoltarSelecao?: () => void;
  /** Canal Telefone: inicia o discador no Fluxo de Atendimento. */
  onIniciarDiscador?: (contatos: ContactForBulkSend[], modo: 'sequencial' | 'previa', dataRetorno: Date) => void;
  /** Canal Ligação com IA: inicia a campanha sequencial de ligações. */
  onIniciarCampanhaIa?: (config: ConfigCampanhaIa) => void;
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
  proximaDataContato: dataPadraoProximoContato("massa_whatsapp"),
  modoDiscador: 'sequencial',
  pararAoReceber: lerPararAoReceber(),
  agenteIaId: '',
  agenteIaNome: '',
  ramalIa: '',
  objetivoIa: ''
});

export function EnvioMassaWizardContent({
  onClose,
  onComplete,
  contatosIniciais = [],
  canalInicial,
  onVoltarSelecao,
  onIniciarDiscador,
  onIniciarCampanhaIa
}: EnvioMassaWizardContentProps) {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>('');
  const [usuarioId, setUsuarioId] = useState<string>('');
  const [state, setState] = useState<EnvioMassaState>(() => ({ ...getInitialState(), step: canalInicial ? (contatosIniciais.length > 0 ? 'compose' : 'filter') : 'channel', canal: canalInicial ?? null, proximaDataContato: dataPadraoProximoContato(origemDoCanalMassa(canalInicial)) }));
  const pulouParaMontarRef = useRef(false);
  const { isSending, sendProgress, itensEnvio, executarEnvio, cancelarEnvio, cancelamentoSolicitado } = useExecucaoEnvio();

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
    applyFilters,
    fonte, setFonte
  } = useContactsFilter(estabelecimentoId, state.canal);

  // Contatos já selecionados na lista de Contatos: força "todos" e pré-seleciona
  const chaveIniciais = contatosIniciais.join(',');
  useEffect(() => {
    if (contatosIniciais.length > 0 && fonte !== 'todos') setFonte('todos');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveIniciais]);
  useEffect(() => {
    if (contatosIniciais.length === 0 || !state.canal) return;
    const ids = new Set(contatosIniciais);
    const escolhidos = contacts.filter(c => ids.has(c.id));
    const pular = !!canalInicial && !pulouParaMontarRef.current && escolhidos.length > 0;
    if (pular) pulouParaMontarRef.current = true;
    setState(prev => ({ ...prev, selectedContacts: escolhidos, ...(pular ? { step: 'compose' as WizardStep } : {}) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, state.canal, chaveIniciais]);

  const { 
    replies: quickReplies, 
    getGroupedReplies 
  } = useQuickReplies(estabelecimentoId);

  const { 
    refetch: recarregarTemplates,
    templates: envioMassaTemplates 
  } = useEnvioMassaTemplates(estabelecimentoId);

  const { 
    media, 
    uploadMedia 
  } = useMediaGallery(estabelecimentoId);

  // Navigation
  const goToStep = (step: WizardStep) => {
    if (step === 'filter' && onVoltarSelecao) { onVoltarSelecao(); return; }
    setState(prev => ({ ...prev, step }));
  };

  const handleCanalChange = (canal: CanalEnvio) => {
    setState(prev => ({ 
      ...prev, 
      canal,
      proximaDataContato: dataPadraoProximoContato(origemDoCanalMassa(canal)),
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

    // Canais de chamada: a execução fica com o discador (Fluxo de Atendimento)
    // ou com a campanha de IA (popup global); o assistente só entrega a configuração.
    if (state.canal === 'telefone') {
      onIniciarDiscador?.(state.selectedContacts, state.modoDiscador ?? 'sequencial', state.proximaDataContato);
      return;
    }
    if (state.canal === 'ia') {
      onIniciarCampanhaIa?.({
        agenteId: state.agenteIaId || '',
        agenteNome: state.agenteIaNome || '',
        ramal: (state.ramalIa || '').trim(),
        objetivo: (state.objetivoIa || '').trim(),
        contatos: state.selectedContacts,
        dataRetorno: state.proximaDataContato,
      });
      return;
    }

    if (state.canal === 'email') {
      await executarEnvio(state.selectedContacts, state.canal, contact => enviarEmailMassa(state.contentItems, contact, estabelecimentoId, usuarioId, format(state.proximaDataContato, 'yyyy-MM-dd')));
      return;
    }

    await executarEnvio(state.selectedContacts, state.canal, async (contact) => {
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

        if (error) throw new Error('Não foi possível registrar o retorno deste contato');

      return { status: 'registrado', detalhe: 'Tarefa de retorno criada; este caminho não confirma envio de mensagem' };
    });
  };

  // O canal já foi escolhido antes de abrir o assistente: a etapa "Canal" sai da lista.
  // Canais de chamada não têm mensagem: a etapa "Preview" sai da lista.
  const chamada = canalEhChamada(state.canal);
  const passosVisiveis = STEPS.filter(s =>
    (!canalInicial || s.key !== 'channel') && (!chamada || s.key !== 'preview')
  );
  const currentStepIndex = Math.max(0, passosVisiveis.findIndex(s => s.key === state.step));
  const rotuloPasso = (s: { key: WizardStep; label: string }) =>
    s.key === 'compose' && chamada ? 'Configurar' : s.label;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Envio em Massa</h2>
          {state.canal && (
            <Badge variant="secondary" className="text-xs">
              {ROTULO_CANAL[state.canal]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentStepIndex + 1}/{passosVisiveis.length}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (isSending) { cancelarEnvio(); return; } onClose(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Steps - Compact */}
      <div className="flex items-center justify-center py-2 px-2 gap-1 border-b bg-muted/30 shrink-0 overflow-x-hidden">
        {passosVisiveis.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div 
              className={`
                flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0
                ${index <= currentStepIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}
              `}
            >
              {index + 1}
            </div>
            <span
              className={`
                hidden lg:block ml-1 text-xs whitespace-nowrap
                ${index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}
              `}
            >
              {rotuloPasso(step)}
            </span>
            {index < passosVisiveis.length - 1 && (
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
              fonte={fonte}
              onFonteChange={setFonte}
            contacts={contacts}
            selectedContacts={state.selectedContacts}
            segmentos={segmentos}
            filters={state.filters}
            onFilterChange={handleFilterChange}
            onSelectContacts={handleSelectContacts}
            onBack={canalInicial ? undefined : () => goToStep('channel')}
            onNext={() => goToStep('compose')}
            canal={state.canal}
          />
        )}

        {state.step === 'compose' && (chamada && state.canal ? (
          <StepComposeChamada
            canal={state.canal}
            modoDiscador={state.modoDiscador ?? 'sequencial'}
            pararAoReceber={state.pararAoReceber ?? false}
            agenteIaId={state.agenteIaId ?? ''}
            ramalIa={state.ramalIa ?? ''}
            objetivoIa={state.objetivoIa ?? ''}
            onModoChange={(modo) => setState(prev => ({ ...prev, modoDiscador: modo }))}
            onPararAoReceberChange={(v) => setState(prev => ({ ...prev, pararAoReceber: v }))}
            onAgenteChange={(id, nome) => setState(prev => ({ ...prev, agenteIaId: id, agenteIaNome: nome }))}
            onRamalChange={(ramal) => setState(prev => ({ ...prev, ramalIa: ramal }))}
            onObjetivoChange={(objetivo) => setState(prev => ({ ...prev, objetivoIa: objetivo }))}
            onBack={() => goToStep('filter')}
            onNext={() => goToStep('schedule')}
          />
        ) : (
          <StepCompose
            canal={state.canal}
            onTemplatesChanged={recarregarTemplates}
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
        ))}

        {state.step === 'preview' && (
          <StepPreview
            canal={state.canal}
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
            onBack={() => goToStep(chamada ? 'compose' : 'preview')}
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
            itensEnvio={itensEnvio}
            cancelamentoSolicitado={cancelamentoSolicitado}
            onCancel={cancelarEnvio}
            onClose={() => { onComplete?.(); onClose(); }}
            onBack={() => goToStep('schedule')}
            onConfirm={handleConfirm}
            canal={state.canal}
            resumoChamada={chamada ? {
              modo: state.canal === 'telefone' ? (state.modoDiscador === 'previa' ? 'Aprovação uma a uma' : 'Discagem sequencial') : undefined,
              agente: state.canal === 'ia' ? state.agenteIaNome : undefined,
              ramal: state.canal === 'ia' ? state.ramalIa : undefined,
              objetivo: state.canal === 'ia' ? state.objetivoIa : undefined,
            } : undefined}
          />
        )}
      </div>
    </div>
  );
}
