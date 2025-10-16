import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Rocket, Cpu } from "lucide-react";
import AIImageDialog from "./AIImageDialog";

const AIPanel = () => {
  const [showLovableAI, setShowLovableAI] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('lovable-ai');

  const aiServices = [
    {
      id: 'lovable-ai',
      name: 'Lovable AI',
      description: 'Gemini Image Preview - Rápido e eficiente',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      badge: 'GRÁTIS até 6 Out',
      badgeVariant: 'default' as const,
      features: ['Alta qualidade', 'Muito rápido', 'Gratuito agora'],
      provider: 'lovable-ai',
      onClick: () => setShowLovableAI(true),
    },
    {
      id: 'pollinations',
      name: 'Pollinations AI',
      description: '100% Grátis - Sem limites, sem API key',
      icon: Rocket,
      color: 'from-blue-500 to-cyan-500',
      badge: 'SEMPRE GRÁTIS',
      badgeVariant: 'default' as const,
      features: ['Totalmente gratuito', 'Sem API key', 'Ilimitado'],
      provider: 'pollinations',
      onClick: () => setShowLovableAI(true),
    },
  ];

  return (
    <>
      <AIImageDialog 
        open={showLovableAI} 
        onOpenChange={setShowLovableAI}
        provider={selectedProvider}
      />
      
      <div className="w-full bg-background flex flex-col">
        <div className="px-4 py-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Geração com IA
          </h3>
          <p className="text-xs text-muted-foreground">Crie imagens com IA</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            {aiServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.id}
                  className="cursor-pointer hover:border-primary transition-all"
                  onClick={() => {
                    setSelectedProvider(service.provider);
                    service.onClick();
                  }}
                >
                  <CardHeader className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-r ${service.color} flex-shrink-0`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-xs truncate">{service.name}</CardTitle>
                        </div>
                      </div>
                      <Badge variant={service.badgeVariant} className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0">
                        {service.badge}
                      </Badge>
                    </div>
                    <CardDescription className="text-[10px] mt-1.5 line-clamp-2">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0">
                    <ul className="space-y-0.5">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                          <span className="truncate">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="px-4 pb-4 pt-2">
            <div className="bg-muted/50 rounded-lg p-2.5 border border-border">
              <h4 className="font-medium text-[10px] mb-1">💡 Dica</h4>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Use <strong>Lovable AI</strong> com limite gratuito mensal!
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default AIPanel;
