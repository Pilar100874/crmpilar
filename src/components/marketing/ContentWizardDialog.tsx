import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Send,
  Image,
  Music,
  Video,
  FileText,
  MessageCircle,
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  Info,
  RefreshCw,
  X,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import {
  MarketingResource,
  PublishChannel,
  CHANNEL_CONFIG,
  ReturnType,
  RETURN_TYPE_LABELS,
  FormStep,
} from './types';

interface ContentWizardDialogProps {
  open: boolean;
  onClose: () => void;
  resource: MarketingResource;
}

const ChannelIcon: React.FC<{ channel: PublishChannel }> = ({ channel }) => {
  const icons: Record<PublishChannel, React.ReactNode> = {
    whatsapp: <MessageCircle className="h-5 w-5" />,
    instagram: <Instagram className="h-5 w-5" />,
    facebook: <Facebook className="h-5 w-5" />,
    twitter: <span className="text-lg font-bold">𝕏</span>,
    linkedin: <Linkedin className="h-5 w-5" />,
    telegram: <Send className="h-5 w-5" />,
    email: <Mail className="h-5 w-5" />,
  };
  return <>{icons[channel]}</>;
};

const ReturnTypeIcon: React.FC<{ type: ReturnType }> = ({ type }) => {
  const icons: Record<ReturnType, React.ReactNode> = {
    image: <Image className="h-8 w-8" />,
    audio: <Music className="h-8 w-8" />,
    video: <Video className="h-8 w-8" />,
    text: <FileText className="h-8 w-8" />,
  };
  return <>{icons[type]}</>;
};

export const ContentWizardDialog: React.FC<ContentWizardDialogProps> = ({
  open,
  onClose,
  resource,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [selectedChannels, setSelectedChannels] = useState<PublishChannel[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<{ type: ReturnType; content: string } | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  // Build wizard steps: form steps (if any) + channels + review + result
  const wizardSteps = useMemo(() => {
    const steps: { id: string; type: 'form' | 'channels' | 'review' | 'result'; label: string; formStep?: FormStep }[] = [];
    
    // Add form steps
    if (resource.steps && resource.steps.length > 0) {
      resource.steps.forEach((formStep) => {
        steps.push({
          id: `form-${formStep.id}`,
          type: 'form',
          label: formStep.title,
          formStep,
        });
      });
    } else if (resource.fields.length > 0) {
      // If no steps defined but has fields, show all fields in one step
      steps.push({
        id: 'form-all',
        type: 'form',
        label: 'Preencher Campos',
      });
    }
    
    // Add channels step
    steps.push({ id: 'channels', type: 'channels', label: 'Canais' });
    
    // Add review step
    steps.push({ id: 'review', type: 'review', label: 'Revisar' });
    
    // Add result step
    steps.push({ id: 'result', type: 'result', label: 'Resultado' });
    
    return steps;
  }, [resource.steps, resource.fields.length]);

  const currentStep = wizardSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / wizardSteps.length) * 100;

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleChannel = (channel: PublishChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const getFieldsForCurrentStep = () => {
    if (currentStep?.type !== 'form') return [];
    
    if (currentStep.formStep) {
      // Return fields belonging to this step
      return resource.fields.filter((f) => f.stepId === currentStep.formStep?.id);
    }
    
    // Return all fields (no steps defined)
    return resource.fields;
  };

  const validateCurrentStep = () => {
    if (currentStep?.type !== 'form') return true;
    
    const stepFields = getFieldsForCurrentStep();
    const missingRequired = stepFields.filter(
      (field) => field.required && !fieldValues[field.id]
    );
    return missingRequired.length === 0;
  };

  const goToNextStep = () => {
    if (currentStepIndex < wizardSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!resource.n8nWebhookUrl) {
      toast.error('URL do webhook n8n não configurada neste recurso');
      return;
    }

    setIsProcessing(true);
    goToNextStep(); // Go to result step

    try {
      // Prepare payload
      const payload = {
        resourceId: resource.id,
        resourceName: resource.name,
        returnType: resource.returnType,
        fields: resource.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          value: fieldValues[field.id],
        })),
        channels: selectedChannels,
        autoPublishEnabled: resource.autoPublishEnabled || false,
        timestamp: new Date().toISOString(),
      };

      // Send to n8n
      const response = await fetch(resource.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar para n8n');
      }

      const data = await response.json();
      const contentResult = data.result || data.url || data.text || '';

      // Set result based on return type
      setResult({
        type: resource.returnType,
        content: contentResult,
      });

      toast.success('Conteúdo gerado com sucesso!');
    } catch (error) {
      console.error('Error sending to n8n:', error);
      toast.error('Erro ao gerar conteúdo. Verifique a URL do webhook.');
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!result) return;

    setIsPublishing(true);

    try {
      // Get user's estabelecimento_id
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('auth_user_id', userData.user.id)
          .maybeSingle();

        if (usuarioData?.estabelecimento_id) {
          // Save to marketing_content table
          await supabase.from('marketing_content').insert({
            estabelecimento_id: usuarioData.estabelecimento_id,
            resource_id: resource.id,
            resource_name: resource.name,
            content_type: resource.returnType,
            content_url: resource.returnType !== 'text' ? result.content : null,
            text_content: resource.returnType === 'text' ? result.content : null,
            input_data: resource.fields.map((field) => ({
              name: field.name,
              label: field.label,
              type: field.type,
              value: fieldValues[field.id],
            })),
            channels: selectedChannels,
            status: 'completed',
            created_by: userData.user.id,
          });
        }
      }

      setIsPublished(true);
      toast.success('Conteúdo publicado com sucesso!');
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Erro ao publicar conteúdo');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRegenerate = () => {
    setResult(null);
    setIsPublished(false);
    // Go back to review step
    setCurrentStepIndex(wizardSteps.length - 2);
  };

  const handleClose = () => {
    setCurrentStepIndex(0);
    setFieldValues({});
    setSelectedChannels([]);
    setResult(null);
    setIsPublished(false);
    onClose();
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStep.type) {
      case 'form':
        const stepFields = getFieldsForCurrentStep();
        const formStep = currentStep.formStep;
        
        return (
          <div className="space-y-4">
            {formStep?.description && (
              <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{formStep.description}</p>
              </div>
            )}
            
            {stepFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum campo configurado nesta etapa</p>
              </div>
            ) : (
              stepFields.map((field) => (
                <DynamicFieldRenderer
                  key={field.id}
                  field={field}
                  value={fieldValues[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />
              ))
            )}
          </div>
        );

      case 'channels':
        const availableChannels = resource.publishChannels || [];
        const hasChannelsConfigured = availableChannels.length > 0;
        
        if (!hasChannelsConfigured) {
          return (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">
                Nenhum canal de publicação configurado para este recurso.
              </p>
              <p className="text-xs text-muted-foreground">
                Configure os canais na edição do recurso de marketing.
              </p>
            </div>
          );
        }
        
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione em quais canais deseja publicar o resultado
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableChannels.map((channel) => {
                  const config = CHANNEL_CONFIG[channel];
                  const isSelected = selectedChannels.includes(channel);
                  return (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(channel)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 relative ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${config.color} text-white`}>
                        <ChannelIcon channel={channel} />
                      </div>
                      <span className="text-sm font-medium">{config.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedChannels.length > 0 && resource.autoPublishEnabled && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium text-sm text-green-600">Publicação Automática Ativada</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  O conteúdo será publicado automaticamente nos canais selecionados após a geração.
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedChannels.map((channel) => {
                    const config = CHANNEL_CONFIG[channel];
                    return (
                      <Badge key={channel} className={`${config.color} text-white`}>
                        {config.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'review':
        const getFieldValue = (fieldId: string) => {
          const val = fieldValues[fieldId];
          if (!val) return '-';
          if (typeof val === 'object') {
            if (val.productName) return val.productName;
            if (val.file?.name) return val.file.name;
            if (val.url) return val.url;
            if (val.value) return val.value;
            return 'Arquivo selecionado';
          }
          return val;
        };

        const getFieldPreviewUrl = (field: typeof resource.fields[0]) => {
          const val = fieldValues[field.id];
          if (!val) return null;
          
          // Check if it's a media type that should show preview
          const mediaTypes = ['media_image', 'media_audio', 'media_video', 'selection_image', 'selection_audio', 'selection_video', 'product_image'];
          if (!mediaTypes.includes(field.type)) return null;
          
          if (typeof val === 'string') return val;
          if (typeof val === 'object') {
            return val.previewUrl || val.url || val.imageUrl || val.audioUrl || val.videoUrl || val.value;
          }
          return null;
        };

        const getPreviewType = (field: typeof resource.fields[0]): 'image' | 'audio' | 'video' | null => {
          if (['media_image', 'selection_image', 'product_image'].includes(field.type)) return 'image';
          if (['media_audio', 'selection_audio'].includes(field.type)) return 'audio';
          if (['media_video', 'selection_video'].includes(field.type)) return 'video';
          return null;
        };

        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Dados Preenchidos</h4>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Variável</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Valor</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resource.fields.map((field) => {
                          const previewUrl = getFieldPreviewUrl(field);
                          const previewType = getPreviewType(field);
                          
                          return (
                            <tr key={field.id} className="border-b last:border-0">
                              <td className="p-3">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {field.name || field.id}
                                </code>
                              </td>
                              <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                                {getFieldValue(field.id)}
                              </td>
                              <td className="p-3">
                                {previewUrl && previewType === 'image' && (
                                  <img 
                                    src={previewUrl} 
                                    alt="Preview" 
                                    className="w-16 h-16 object-cover rounded-lg border"
                                  />
                                )}
                                {previewUrl && previewType === 'audio' && (
                                  <audio controls src={previewUrl} className="h-8 w-32" />
                                )}
                                {previewUrl && previewType === 'video' && (
                                  <video 
                                    controls 
                                    src={previewUrl} 
                                    className="w-24 h-16 object-cover rounded-lg"
                                  />
                                )}
                                {!previewUrl && (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Canais Selecionados</h4>
              <div className="flex flex-wrap gap-2">
                {selectedChannels.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Nenhum canal selecionado</span>
                ) : (
                  selectedChannels.map((channel) => (
                    <Badge 
                      key={channel} 
                      variant={resource.autoPublishEnabled ? "default" : "secondary"} 
                      className="flex items-center gap-1"
                    >
                      <ChannelIcon channel={channel} />
                      {CHANNEL_CONFIG[channel].label}
                      {resource.autoPublishEnabled && (
                        <span className="text-xs ml-1">(Auto)</span>
                      )}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Tipo de Retorno</h4>
              <Badge variant="outline" className="flex items-center gap-2 w-fit">
                <ReturnTypeIcon type={resource.returnType} />
                {RETURN_TYPE_LABELS[resource.returnType]}
              </Badge>
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            {isProcessing ? (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Gerando conteúdo...</p>
                <p className="text-xs text-muted-foreground">
                  Enviando para n8n e aguardando resposta
                </p>
              </div>
            ) : result ? (
              <div className="w-full space-y-4">
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                    isPublished ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {isPublished ? <Check className="h-6 w-6" /> : <Image className="h-6 w-6" />}
                  </div>
                  <h3 className="font-semibold">
                    {isPublished ? 'Conteúdo Publicado!' : 'Conteúdo Gerado - O que deseja fazer?'}
                  </h3>
                  {!isPublished && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Revise o resultado abaixo e escolha uma ação
                    </p>
                  )}
                </div>

                <Card>
                  <CardContent className="p-4">
                    {result.type === 'image' && result.content && (
                      <img
                        src={result.content}
                        alt="Generated"
                        className="w-full max-h-96 object-contain rounded-lg"
                      />
                    )}
                    {result.type === 'audio' && result.content && (
                      <audio controls src={result.content} className="w-full" />
                    )}
                    {result.type === 'video' && result.content && (
                      <video controls src={result.content} className="w-full rounded-lg" />
                    )}
                    {result.type === 'text' && (
                      <p className="whitespace-pre-wrap">{result.content}</p>
                    )}
                    {!result.content && (
                      <p className="text-muted-foreground text-center py-4">
                        Aguardando resultado do n8n...
                      </p>
                    )}
                  </CardContent>
                </Card>

                {selectedChannels.length > 0 && (
                  <div className="text-center text-sm text-muted-foreground space-y-3">
                    <p>Canais selecionados:</p>
                    <div className="flex justify-center flex-wrap gap-2">
                      {selectedChannels.map((channel) => (
                        <Badge 
                          key={channel} 
                          variant={isPublished ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          {CHANNEL_CONFIG[channel].label}
                          {isPublished && (
                            <Check className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Erro ao gerar conteúdo</p>
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  className="mt-4"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (!currentStep) return false;
    
    switch (currentStep.type) {
      case 'form':
        return validateCurrentStep();
      case 'channels':
        return true; // Channels are optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const isLastFormStep = currentStep?.type === 'review';
  const isResultStep = currentStep?.type === 'result';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ReturnTypeIcon type={resource.returnType} />
            {resource.name}
          </DialogTitle>
          <div className="pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="text-primary font-medium">
                {currentStep?.label} ({currentStepIndex + 1}/{wizardSteps.length})
              </span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
          <div className="px-6 py-6">{renderStepContent()}</div>
        </ScrollArea>

        {!isResultStep && (
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-between">
            <Button
              variant="outline"
              onClick={currentStepIndex === 0 ? handleClose : goToPrevStep}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStepIndex === 0 ? 'Cancelar' : 'Voltar'}
            </Button>
            
            {isLastFormStep ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gerar Conteúdo
              </Button>
            ) : (
              <Button
                onClick={goToNextStep}
                disabled={!canProceed()}
                className="gap-2"
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {isResultStep && (
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-between">
            {!isPublished && result && !isProcessing ? (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerar
                  </Button>
                </div>
                <Button 
                  onClick={handlePublish} 
                  disabled={isPublishing}
                  className="gap-2"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Publicar
                </Button>
              </>
            ) : (
              <div className="w-full flex justify-end">
                <Button onClick={handleClose} className="gap-2">
                  <Check className="h-4 w-4" />
                  Concluir
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};