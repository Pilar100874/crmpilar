import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, TrendingUp, ExternalLink, Zap, Image, Film, Music, Mic, Type, ScanEye, Wand2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ResourceCost {
  icon: React.ElementType;
  label: string;
  costPerUse: string;
  color: string;
  description: string;
}

const RESOURCE_COSTS: ResourceCost[] = [
  { icon: Type, label: 'Processar com LLM', costPerUse: '~0.01 - 0.10', color: '#0ea5e9', description: 'Depende do modelo e tokens usados' },
  { icon: Image, label: 'Gerar Imagem', costPerUse: '~0.02 - 0.20', color: '#f43f5e', description: 'Varia por resolução e modelo' },
  { icon: Wand2, label: 'Editar Imagem', costPerUse: '~0.03 - 0.25', color: '#ec4899', description: 'Depende da complexidade da edição' },
  { icon: ScanEye, label: 'Analisar Imagem', costPerUse: '~0.01 - 0.05', color: '#14b8a6', description: 'Baseado no modelo de visão' },
  { icon: Film, label: 'Gerar Vídeo', costPerUse: '~0.50 - 5.00', color: '#f59e0b', description: 'Alto custo por duração e resolução' },
  { icon: Link2, label: 'Unir Vídeos', costPerUse: '~0.10 - 0.50', color: '#eab308', description: 'Baseado na duração total' },
  { icon: Mic, label: 'Gerar Áudio / TTS', costPerUse: '~0.01 - 0.30', color: '#22c55e', description: 'Depende da duração e voz escolhida' },
  { icon: Music, label: 'Criar Música', costPerUse: '~0.05 - 1.00', color: '#14b8a6', description: 'Varia por duração e complexidade' },
  { icon: Zap, label: 'Lip Sync', costPerUse: '~0.20 - 1.00', color: '#06b6d4', description: 'Baseado na duração do vídeo' },
];

// Simulated usage data
const USAGE_DATA = {
  totalCredits: 100,
  usedCredits: 37.5,
  thisMonth: [
    { resource: 'Gerar Imagem', count: 45, cost: 6.75, icon: Image, color: '#f43f5e' },
    { resource: 'Processar com LLM', count: 120, cost: 4.80, icon: Type, color: '#0ea5e9' },
    { resource: 'Gerar Vídeo', count: 8, cost: 16.00, icon: Film, color: '#f59e0b' },
    { resource: 'Gerar Áudio', count: 25, cost: 3.75, icon: Mic, color: '#22c55e' },
    { resource: 'Criar Música', count: 10, cost: 5.00, icon: Music, color: '#14b8a6' },
    { resource: 'Editar Imagem', count: 5, cost: 0.75, icon: Wand2, color: '#ec4899' },
    { resource: 'Analisar Imagem', count: 15, cost: 0.45, icon: ScanEye, color: '#14b8a6' },
  ],
};

const StudioCreditsPanel: React.FC<Props> = ({ open, onClose }) => {
  const usagePercent = (USAGE_DATA.usedCredits / USAGE_DATA.totalCredits) * 100;
  const remaining = USAGE_DATA.totalCredits - USAGE_DATA.usedCredits;

  const getProgressColor = () => {
    if (usagePercent > 80) return 'bg-destructive';
    if (usagePercent > 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleAddCredits = () => {
    window.open('https://docs.lovable.dev/features/ai', '_blank');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Créditos de IA</h2>
                <p className="text-xs text-muted-foreground">Monitore seu consumo por recurso</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="max-h-[70vh]">
            <div className="p-5 space-y-5">
              {/* Credits Overview */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Saldo de Créditos</span>
                  <span className="text-2xl font-bold text-foreground">
                    ${remaining.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground"> / ${USAGE_DATA.totalCredits.toFixed(2)}</span>
                  </span>
                </div>
                <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getProgressColor()}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{usagePercent.toFixed(0)}% utilizado este mês</span>
                  <span>${USAGE_DATA.usedCredits.toFixed(2)} consumido</span>
                </div>
                <Button
                  onClick={handleAddCredits}
                  className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-1"
                  size="sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Adicionar Créditos
                </Button>
              </div>

              {/* Usage This Month */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Consumo deste Mês</h3>
                </div>
                <div className="space-y-2">
                  {USAGE_DATA.thisMonth
                    .sort((a, b) => b.cost - a.cost)
                    .map((item, i) => {
                      const Icon = item.icon;
                      const pct = (item.cost / USAGE_DATA.usedCredits) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">{item.resource}</span>
                              <span className="text-xs font-bold text-foreground">${item.cost.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{item.count} uso{item.count > 1 ? 's' : ''}</span>
                              <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <Separator />

              {/* Cost per Resource Reference */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">💡 Custo Estimado por Recurso</h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {RESOURCE_COSTS.map((rc, i) => {
                    const Icon = rc.icon;
                    return (
                      <div key={i} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: `${rc.color}12` }}>
                          <Icon className="h-3 w-3" style={{ color: rc.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-foreground">{rc.label}</span>
                        </div>
                        <span className="text-xs font-mono font-medium text-primary whitespace-nowrap">${rc.costPerUse}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  * Valores aproximados em USD. O custo real depende do modelo e parâmetros selecionados.
                </p>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StudioCreditsPanel;
