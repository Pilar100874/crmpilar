import React, { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  MarketingResource,
  PublishChannel,
  CHANNEL_CONFIG,
  ReturnType,
  RETURN_TYPE_LABELS,
} from './types';

interface ContentWizardDialogProps {
  open: boolean;
  onClose: () => void;
  resource: MarketingResource;
}

type WizardStep = 'fields' | 'channels' | 'review' | 'result';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'fields', label: 'Preencher Campos' },
  { id: 'channels', label: 'Canais' },
  { id: 'review', label: 'Revisar' },
  { id: 'result', label: 'Resultado' },
];

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
  const [currentStep, setCurrentStep] = useState<WizardStep>('fields');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [selectedChannels, setSelectedChannels] = useState<PublishChannel[]>([]);
  const [autoPublishChannels, setAutoPublishChannels] = useState<PublishChannel[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: ReturnType; content: string } | null>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleChannel = (channel: PublishChannel) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channel)) {
        // Remove from auto-publish as well
        setAutoPublishChannels((auto) => auto.filter((c) => c !== channel));
        return prev.filter((c) => c !== channel);
      }
      return [...prev, channel];
    });
  };

  const toggleAutoPublish = (channel: PublishChannel) => {
    setAutoPublishChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const validateFields = () => {
    const missingRequired = resource.fields.filter(
      (field) => field.required && !fieldValues[field.id]
    );
    return missingRequired.length === 0;
  };

  const goToNextStep = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!resource.n8nWebhookUrl) {
      toast.error('URL do webhook n8n não configurada neste recurso');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('result');

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
        autoPublishChannels: autoPublishChannels,
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

      // Get user's estabelecimento_id
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('auth_user_id', userData.user.id)
          .single();

        if (usuarioData?.estabelecimento_id) {
          // Save to marketing_content table
          await supabase.from('marketing_content').insert({
            estabelecimento_id: usuarioData.estabelecimento_id,
            resource_id: resource.id,
            resource_name: resource.name,
            content_type: resource.returnType,
            content_url: resource.returnType !== 'text' ? contentResult : null,
            text_content: resource.returnType === 'text' ? contentResult : null,
            input_data: payload.fields,
            channels: selectedChannels,
            status: 'completed',
            created_by: userData.user.id,
          });
        }
      }

      toast.success('Conteúdo gerado com sucesso!');
    } catch (error) {
      console.error('Error sending to n8n:', error);
      toast.error('Erro ao gerar conteúdo. Verifique a URL do webhook.');
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('fields');
    setFieldValues({});
    setSelectedChannels([]);
    setAutoPublishChannels([]);
    setResult(null);
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'fields':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Preencha os campos abaixo para gerar seu conteúdo
            </p>
            {resource.fields.map((field) => (
              <DynamicFieldRenderer
                key={field.id}
                field={field}
                value={fieldValues[field.id]}
                onChange={(value) => handleFieldChange(field.id, value)}
              />
            ))}
          </div>
        );

      case 'channels':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione em quais canais deseja publicar o resultado
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(CHANNEL_CONFIG) as PublishChannel[]).map((channel) => {
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

            {selectedChannels.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Publicação Automática</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Ative para publicar automaticamente após a geração do conteúdo
                </p>
                <div className="space-y-3">
                  {selectedChannels.map((channel) => {
                    const config = CHANNEL_CONFIG[channel];
                    const isAutoPublish = autoPublishChannels.includes(channel);
                    return (
                      <div
                        key={channel}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${config.color} text-white`}>
                            <ChannelIcon channel={channel} />
                          </div>
                          <Label htmlFor={`auto-${channel}`} className="font-medium cursor-pointer">
                            {config.label}
                          </Label>
                        </div>
                        <Switch
                          id={`auto-${channel}`}
                          checked={isAutoPublish}
                          onCheckedChange={() => toggleAutoPublish(channel)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Dados Preenchidos</h4>
              <Card>
                <CardContent className="p-4 space-y-2">
                  {resource.fields.map((field) => (
                    <div key={field.id} className="flex items-start gap-2 text-sm">
                      <span className="font-medium text-muted-foreground min-w-[120px]">
                        {field.label}:
                      </span>
                      <span className="flex-1">
                        {typeof fieldValues[field.id] === 'object'
                          ? fieldValues[field.id]?.name || 'Arquivo selecionado'
                          : fieldValues[field.id] || '-'}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Canais Selecionados</h4>
              <div className="flex flex-wrap gap-2">
                {selectedChannels.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Nenhum canal selecionado</span>
                ) : (
                  selectedChannels.map((channel) => {
                    const isAutoPublish = autoPublishChannels.includes(channel);
                    return (
                      <Badge 
                        key={channel} 
                        variant={isAutoPublish ? "default" : "secondary"} 
                        className="flex items-center gap-1"
                      >
                        <ChannelIcon channel={channel} />
                        {CHANNEL_CONFIG[channel].label}
                        {isAutoPublish && (
                          <span className="text-xs ml-1">(Auto)</span>
                        )}
                      </Badge>
                    );
                  })
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
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3">
                    <Check className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">Conteúdo Gerado!</h3>
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
                      {selectedChannels.map((channel) => {
                        const isAutoPublish = autoPublishChannels.includes(channel);
                        return (
                          <Badge 
                            key={channel} 
                            variant={isAutoPublish ? "default" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            {CHANNEL_CONFIG[channel].label}
                            {isAutoPublish && (
                              <span className="text-xs ml-1">(Automático)</span>
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                    {autoPublishChannels.length > 0 && (
                      <p className="text-xs text-green-600">
                        ✓ Publicação automática ativada para {autoPublishChannels.length} canal(is)
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Erro ao gerar conteúdo</p>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('review')}
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
    switch (currentStep) {
      case 'fields':
        return validateFields();
      case 'channels':
        return true; // Channels are optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

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
              {STEPS.map((step, index) => (
                <span
                  key={step.id}
                  className={currentStepIndex >= index ? 'text-primary font-medium' : ''}
                >
                  {step.label}
                </span>
              ))}
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] px-6 py-4">
          {renderStepContent()}
        </ScrollArea>

        <div className="px-6 py-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 'fields' ? handleClose : goToPrevStep}
            disabled={isProcessing}
          >
            {currentStep === 'fields' ? (
              'Cancelar'
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </>
            )}
          </Button>

          {currentStep === 'result' ? (
            <Button onClick={handleClose}>
              Concluir
            </Button>
          ) : currentStep === 'review' ? (
            <Button onClick={handleSubmit} disabled={isProcessing}>
              <Send className="h-4 w-4 mr-1" />
              Gerar Conteúdo
            </Button>
          ) : (
            <Button onClick={goToNextStep} disabled={!canProceed()}>
              Próximo
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
