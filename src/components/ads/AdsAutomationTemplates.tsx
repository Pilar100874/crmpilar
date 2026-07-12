import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LibraryBig, Zap, TrendingDown, TrendingUp, DollarSign, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { useState } from "react";

interface Template {
  id: string;
  nome: string;
  descricao: string;
  categoria: "protecao" | "crescimento" | "alerta";
  icon: any;
  gatilho: string;
  acao: string;
  config: any;
}

const templates: Template[] = [
  {
    id: "pause-high-cpa", nome: "Pausar campanha com CPA alto", descricao: "Pausa automaticamente quando CPA passa de 2x a meta.",
    categoria: "protecao", icon: TrendingDown,
    gatilho: "CPA > 2x meta", acao: "Pausar campanha",
    config: { tipo: "condicional", condicao: { metrica: "cpa", operador: ">", valor_multiplicador: 2 }, acao: { tipo: "pausar" } },
  },
  {
    id: "boost-roas", nome: "Aumentar budget em campanhas com ROAS alto", descricao: "+20% no orçamento diário quando ROAS > 3.",
    categoria: "crescimento", icon: TrendingUp,
    gatilho: "ROAS > 3", acao: "Aumentar budget em 20%",
    config: { tipo: "condicional", condicao: { metrica: "roas", operador: ">", valor: 3 }, acao: { tipo: "ajustar_budget", percentual: 20 } },
  },
  {
    id: "low-ctr-alert", nome: "Alertar quando CTR cair", descricao: "Envia notificação se CTR médio ficar abaixo de 1% por 3 dias.",
    categoria: "alerta", icon: AlertTriangle,
    gatilho: "CTR < 1% (3 dias)", acao: "Notificar por push + email",
    config: { tipo: "alerta", condicao: { metrica: "ctr", operador: "<", valor: 1, janela_dias: 3 }, acao: { tipo: "notificar", canais: ["push", "email"] } },
  },
  {
    id: "budget-cap", nome: "Cap de gasto diário", descricao: "Pausa todas as campanhas ao atingir 110% do budget planejado.",
    categoria: "protecao", icon: DollarSign,
    gatilho: "Gasto diário > 110% do budget", acao: "Pausar todas as campanhas",
    config: { tipo: "condicional", condicao: { metrica: "spend", operador: ">", valor_percentual: 110 }, acao: { tipo: "pausar_todas" } },
  },
  {
    id: "reactivate-morning", nome: "Reativar campanhas às 06h", descricao: "Reativa campanhas pausadas por cap na manhã seguinte.",
    categoria: "crescimento", icon: Zap,
    gatilho: "Diário às 06:00", acao: "Reativar campanhas pausadas",
    config: { tipo: "cronograma", horario: "06:00", acao: { tipo: "reativar" } },
  },
  {
    id: "frequency-cap", nome: "Alertar frequência alta (Meta)", descricao: "Avisa quando frequência > 4 (cansaço criativo).",
    categoria: "alerta", icon: AlertTriangle,
    gatilho: "Frequency > 4", acao: "Notificar",
    config: { tipo: "alerta", plataforma: "meta_ads", condicao: { metrica: "frequency", operador: ">", valor: 4 }, acao: { tipo: "notificar" } },
  },
  {
    id: "pause-zero-conv", nome: "Pausar ad set sem conversão", descricao: "Após 100 cliques sem 1 conversão, pausa o ad set.",
    categoria: "protecao", icon: TrendingDown,
    gatilho: "100 cliques + 0 conversões", acao: "Pausar ad set",
    config: { tipo: "condicional", condicao: { metrica: "clicks", operador: ">=", valor: 100, e: { metrica: "conversions", operador: "=", valor: 0 } }, acao: { tipo: "pausar" } },
  },
  {
    id: "budget-shift", nome: "Realocar budget para melhor campanha", descricao: "Move 10% do budget da pior para a melhor ROAS semanal.",
    categoria: "crescimento", icon: TrendingUp,
    gatilho: "Semanal - análise ROAS", acao: "Realocar 10% do budget",
    config: { tipo: "cronograma", periodicidade: "semanal", acao: { tipo: "realocar_budget", percentual: 10 } },
  },
];

const catBadge = { protecao: "Proteção", crescimento: "Crescimento", alerta: "Alerta" } as const;
const catColor = {
  protecao: "bg-red-500/10 text-red-600 border-red-500/30",
  crescimento: "bg-green-500/10 text-green-600 border-green-500/30",
  alerta: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

interface Props {
  onCreated?: () => void;
  trigger?: React.ReactNode;
}

export const AdsAutomationTemplates: React.FC<Props> = ({ onCreated, trigger }) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const useTemplate = async (t: Template) => {
    try {
      setCreating(t.id);
      const estabId = await getEstabelecimentoId();
      if (!estabId) throw new Error("Estabelecimento não encontrado");
      const { error } = await supabase.from("ads_automacoes").insert({
        estabelecimento_id: estabId,
        nome: t.nome,
        descricao: t.descricao,
        config: t.config,
        ativo: false,
      } as any);
      if (error) throw error;
      toast.success(`Automação "${t.nome}" criada como rascunho. Revise e ative.`);
      setOpen(false);
      onCreated?.();
    } catch (e: any) {
      toast.error("Erro ao criar: " + e.message);
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline"><LibraryBig className="h-4 w-4 mr-2" /> Biblioteca de Templates</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LibraryBig className="h-5 w-5 text-primary" /> Templates de Automação</DialogTitle>
          <DialogDescription>Escolha um template pronto — ele é criado como rascunho para você revisar e ativar.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-3">
          {templates.map((t) => {
            const Icon = t.icon;
            return (
              <Card key={t.id} className="hover:border-primary transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-md bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                      <div className="font-medium text-sm">{t.nome}</div>
                    </div>
                    <Badge className={catColor[t.categoria]}>{catBadge[t.categoria]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.descricao}</p>
                  <div className="text-xs space-y-0.5 pt-1">
                    <div><b>Gatilho:</b> {t.gatilho}</div>
                    <div><b>Ação:</b> {t.acao}</div>
                  </div>
                  <Button size="sm" className="w-full mt-2" disabled={creating === t.id} onClick={() => useTemplate(t)}>
                    <Copy className="h-3 w-3 mr-1" /> {creating === t.id ? "Criando..." : "Usar este template"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
