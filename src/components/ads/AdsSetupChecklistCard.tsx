import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Sparkles, ArrowRight } from "lucide-react";
import { useAdsSetupStatus } from "./AdsSetupStatusBanner";

interface Props {
  estabelecimentoId: string | null;
  onGoToWizard: () => void;
  onNavigate?: (tabId: string) => void;
}

const stepToTab: Record<string, string> = {
  apps: "connections",
  accounts: "connections",
  automation: "automation",
  scheduler: "scheduler",
  test: "scheduler",
};

export const AdsSetupChecklistCard: React.FC<Props> = ({ estabelecimentoId, onGoToWizard, onNavigate }) => {
  const { steps, done, total, complete, loading } = useAdsSetupStatus(estabelecimentoId);
  if (loading || total === 0 || complete) return null;

  const pct = Math.round((done / total) * 100);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Comece por aqui — Setup dos Anúncios
              <Badge variant="secondary">{done}/{total}</Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Complete estas etapas para deixar suas automações rodando automaticamente.
            </CardDescription>
          </div>
          <Button size="sm" onClick={onGoToWizard} className="shrink-0">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Abrir assistente
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={pct} className="h-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {steps.map((s, i) => {
            const target = stepToTab[s.id];
            return (
              <button
                key={s.id}
                onClick={() => target && onNavigate?.(target)}
                className={`text-left rounded-md border p-2.5 transition-colors hover:bg-muted/60 ${s.ok ? "opacity-70" : "border-primary/40"}`}
              >
                <div className="flex items-center gap-2">
                  {s.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate">{i + 1}. {s.label}</span>
                </div>
                {!s.ok && target && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-primary">
                    Ir agora <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
