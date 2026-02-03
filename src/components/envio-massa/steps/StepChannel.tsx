import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Mail, Check } from "lucide-react";
import { CanalEnvio } from "../types";
import { cn } from "@/lib/utils";

interface StepChannelProps {
  selectedCanal: CanalEnvio | null;
  onSelectCanal: (canal: CanalEnvio) => void;
  onNext: () => void;
}

export function StepChannel({
  selectedCanal,
  onSelectCanal,
  onNext
}: StepChannelProps) {
  const channels = [
    {
      id: 'whatsapp' as CanalEnvio,
      label: 'WhatsApp',
      description: 'Envio de mensagens via WhatsApp. Apenas contatos com telefone cadastrado serão exibidos.',
      icon: MessageSquare,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500'
    },
    {
      id: 'email' as CanalEnvio,
      label: 'E-mail',
      description: 'Envio de e-mails em massa. Apenas contatos com e-mail cadastrado serão exibidos.',
      icon: Mail,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Selecione o Canal de Envio</h3>
        <p className="text-sm text-muted-foreground">
          Escolha por qual canal deseja realizar o envio em massa
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const isSelected = selectedCanal === channel.id;
          
          return (
            <Card
              key={channel.id}
              className={cn(
                "p-6 cursor-pointer transition-all hover:shadow-md relative",
                isSelected 
                  ? `${channel.borderColor} border-2 ${channel.bgColor}` 
                  : "hover:border-muted-foreground/30"
              )}
              onClick={() => onSelectCanal(channel.id)}
            >
              {isSelected && (
                <div className={cn(
                  "absolute top-3 right-3 rounded-full p-1",
                  channel.bgColor
                )}>
                  <Check className={cn("h-4 w-4", channel.color)} />
                </div>
              )}
              
              <div className="flex flex-col items-center text-center gap-4">
                <div className={cn(
                  "p-4 rounded-full",
                  channel.bgColor
                )}>
                  <Icon className={cn("h-8 w-8", channel.color)} />
                </div>
                
                <div>
                  <h4 className="font-semibold text-lg mb-2">{channel.label}</h4>
                  <p className="text-sm text-muted-foreground">
                    {channel.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNext} disabled={!selectedCanal}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
