import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Zap, Clock, Key, BarChart3, ArrowRight, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "ads_tour_seen_v1";

interface Step {
  icon: any;
  title: string;
  body: string;
}

const steps: Step[] = [
  { icon: Sparkles, title: "Bem-vindo ao Painel de Ads", body: "Aqui você conecta Google, Meta, TikTok, Mercado Livre e Amazon Ads em um único lugar e automatiza decisões." },
  { icon: Key, title: "1. Conexões", body: "Cadastre o App do Desenvolvedor de cada plataforma e depois as Contas de Anúncio que quer monitorar." },
  { icon: Target, title: "2. Campanhas", body: "Veja todas as campanhas ativas com métricas unificadas (ROAS, CPA, CTR) por plataforma." },
  { icon: Zap, title: "3. Automações", body: "Crie regras (pausar CPA alto, aumentar orçamento com ROAS bom) ou use os Templates prontos." },
  { icon: Clock, title: "4. Agendamento", body: "Escolha a frequência (15min, 1h, diário) — o sistema roda as automações sozinho." },
  { icon: BarChart3, title: "5. Dashboard & Alertas", body: "Acompanhe o Health Score, receba alertas de performance e exporte relatórios." },
];

interface Props {
  onNavigate: (tab: string) => void;
}

export const AdsOnboardingTour: React.FC<Props> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const finish = () => {
    close();
    onNavigate("wizard");
  };

  const step = steps[i];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground">Passo {i + 1} de {steps.length}</div>
          </div>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{step.body}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 py-2">
          {steps.map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded ${idx <= i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={close}>Pular tour</Button>
          <div className="flex gap-2">
            {i > 0 && (
              <Button variant="outline" size="sm" onClick={() => setI(i - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}
            {i < steps.length - 1 ? (
              <Button size="sm" onClick={() => setI(i + 1)}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={finish}>
                <Sparkles className="h-4 w-4 mr-1" /> Iniciar setup
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
