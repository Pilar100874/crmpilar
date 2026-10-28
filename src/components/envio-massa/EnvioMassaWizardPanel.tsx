import { enviarEmailMassa } from "./enviarEmailMassa";
import { useExecucaoEnvio } from "./hooks/useExecucaoEnvio";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { dataPadraoProximoContato, origemDoCanalMassa } from "@/lib/atendimento/prazosProximoContato";
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

interface EnvioMassaWizardPanelProps {
  onClose: () => void;
  onComplete?: () => void;
  contatosIniciais?: string[];
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
  proximaDataContato: addDays(new Date(), 1),
  modoDiscador: 'sequencial',
  pararAoReceber: lerPararAoReceber(),
  agenteIaId: '',
  agenteIaNome: '',
  ramalIa: '',
  objetivoIa: ''
});

export function EnvioMassaWizardPanel({
  onClose,
  onComplete,
  contatosIniciais = [],
  canalInicial,
  onVoltarSelecao,
  onIniciarDiscador,
  onIniciarCampanhaIa
}: EnvioMassaWizardPanelProps) {
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
    applyFilters,
    fonte, setFonte
  } = useContactsFilter(estabelecimentoId, state.canal);

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
    getGroupedReplies,
    loading: loadingReplies 
  } = useQuickReplies(estabelecimentoId);

  const { 
    refetch: recarregarTemplates,
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
    if (step === 'filter' && onVoltarSelecao) { onVoltarSelecao(); return; }
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

  // Get webhook config
  const getWebhookConfig = async () => {
    // Get envio_massa_config to find the webhook_id
    const { data: configData } = await supabase
      .from('envio_massa_config' as any)
      .select('webhook_id')
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle() as any;

    if (!configData?.webhook_id) return null;

    // Get webhook details
    const { data: webhookData } = await supabase
      .from('webhooks')
      .select('id, name, url, method')
      .eq('id', configData.webhook_id)
      .eq('active', true)
      .maybeSingle();

    return webhookData;
  };

  // Call webhook via n8n-proxy
  const callWebhook = async (webhookUrl: string, webhookMethod: string, payload: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-proxy', {
        body: {
          webhookUrl,
          payload,
          expectResponse: false,
          httpMethod: webhookMethod || 'POST'
        }
      });

      if (error) {
        console.error('Error calling webhook:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error calling webhook:', err);
      return false;
    }
  };

  // Send
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

    const configuracao = getWebhookConfig();
    await executarEnvio(state.selectedContacts, state.canal, async (contact, indice) => {
      const webhook = await configuracao;
      const total = state.selectedContacts.length;
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

        if (error) throw new Error('Não foi possível registrar o retorno deste contato');

        // Call webhook with full data payload for n8n
        if (webhook?.url) {
          // Build content items with processed data for n8n
          const processedContentItems = state.contentItems.map(item => ({
            id: item.id,
            type: item.type,
            content: replaceVariables(item.content, contact),
            originalContent: item.content,
            mediaUrl: item.mediaUrl || null,
            mediaThumbnail: item.mediaThumbnail || null,
            mediaDuration: item.mediaDuration || null,
            quickReplyId: item.quickReplyId || null,
            quickReplyTitle: item.quickReplyTitle || null,
            catalogId: item.catalogId || null,
            catalogName: item.catalogName || null,
            fileType: item.fileType || null
          }));

          // Full payload for n8n with all bulk send data
          const webhookPayload = {
            // Contact info
            contato: {
              id: contact.id,
              nome: contact.nome,
              telefone: contact.telefone,
              email: contact.email,
              empresa: contact.empresa || null,
              tags: contact.tags || []
            },
            
            // Channel and campaign info
            canal: state.canal,
            estabelecimentoId: estabelecimentoId,
            usuarioId: usuarioId,
            
            // Content items (messages, media, catalogs, files)
            contentItems: processedContentItems,
            
            // Legacy format for backward compatibility
            mensagem: description,
            telefone: contact.telefone,
            email: contact.email,
            empresa: contact.empresa || null,
            
            // First text message for simple integrations
            mensagemPrincipal: state.contentItems.find(i => i.type === 'text' || i.type === 'quick_reply')
              ? replaceVariables((state.contentItems.find(i => i.type === 'text' || i.type === 'quick_reply')?.content || ''), contact)
              : null,
            
            // Media info
            midia: state.contentItems
              .filter(i => i.type === 'image' || i.type === 'video')
              .map(i => ({
                type: i.type,
                url: i.mediaUrl,
                thumbnail: i.mediaThumbnail,
                duration: i.mediaDuration,
                caption: i.content
              })),
            
            // Catalog info
            catalogo: state.contentItems
              .filter(i => i.type === 'catalog')
              .map(i => ({
                id: i.catalogId,
                name: i.catalogName,
                url: i.mediaUrl
              })),
            
            // Files info
            arquivos: state.contentItems
              .filter(i => i.type === 'file')
              .map(i => ({
                type: i.fileType,
                url: i.mediaUrl,
                content: i.content
              })),
            
            // Scheduling info
            proximaDataContato: format(state.proximaDataContato, 'yyyy-MM-dd'),
            proximaDataContatoISO: state.proximaDataContato.toISOString(),
            
            // Metadata
            timestamp: new Date().toISOString(),
            totalContatos: total,
            contatoAtual: indice + 1,
            
            // Filters applied (for reference)
            filtrosAplicados: state.filters
          };

          const success = await callWebhook(webhook.url, webhook.method, webhookPayload);
          if (!success) return { status: 'erro', detalhe: 'Retorno registrado, mas o encaminhamento para envio falhou' };
          return { status: 'encaminhado', detalhe: 'Aceito pela integração; entrega não confirmada' };
        }

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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { if (isSending) { cancelarEnvio(); return; } onClose(); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Envio em Massa</h1>
          {state.canal && (
            <Badge variant="secondary">
              {ROTULO_CANAL[state.canal]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Etapa {currentStepIndex + 1} de {passosVisiveis.length}
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => { if (isSending) { cancelarEnvio(); return; } onClose(); }}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center py-4 px-2 overflow-x-hidden border-b bg-muted/30 shrink-0">
        {passosVisiveis.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div 
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0
                ${index <= currentStepIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}
              `}
            >
              {index + 1}
            </div>
            <span
              className={`
                hidden xl:block ml-2 text-sm whitespace-nowrap
                ${index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}
              `}
            >
              {rotuloPasso(step)}
            </span>
            {index < passosVisiveis.length - 1 && (
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
            itensEnvio={itensEnvio}
            cancelamentoSolicitado={cancelamentoSolicitado}
            onCancel={cancelarEnvio}
            onClose={() => { onComplete?.(); onClose(); }}
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
