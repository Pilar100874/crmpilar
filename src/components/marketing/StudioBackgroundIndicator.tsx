import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, CheckCircle2, AlertCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { studioBackgroundJobs, StudioJob, formatSeconds } from './ai-studio/backgroundJobsStore';
import { cn } from '@/lib/utils';

const elapsed = (j: StudioJob) => Math.floor(((j.finishedAt ?? Date.now()) - j.startedAt) / 1000);

export const StudioBackgroundIndicator: React.FC = () => {
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();

  useEffect(() => studioBackgroundJobs.subscribe(setJobs), []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (jobs.length === 0) return null;

  const running = jobs.filter((j) => j.status === 'running');
  const hasRunning = running.length > 0;
  const hasErrors = jobs.some((j) => j.status === 'error');

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
      {open && (
        <div className="pointer-events-auto w-[360px] max-h-[60vh] overflow-y-auto rounded-xl border bg-card shadow-2xl p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Criações em background
            </div>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => studioBackgroundJobs.clearFinished()}>
              Limpar prontos
            </Button>
          </div>
          {jobs.map((j) => (
            <div key={j.id} className="rounded-lg border bg-background/60 p-2 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-medium truncate flex-1" title={j.workflowName}>
                  {j.workflowName}
                </div>
                <div className="flex items-center gap-1">
                  {j.status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  {j.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                  {j.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); studioBackgroundJobs.remove(j.id); }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2">{j.message}</div>
              {j.status === 'running' && (
                <>
                  {typeof j.progress === 'number' ? (
                    <Progress value={j.progress} className="h-1.5" />
                  ) : (
                    <Progress value={undefined as any} className="h-1.5 animate-pulse" />
                  )}
                  <div className="text-[10px] text-muted-foreground flex justify-between">
                    <span>
                      {j.nodesTotal > 0 && `${j.nodesDone}/${j.nodesTotal} blocos`}
                      {j.sceneTotal && ` • cena ${j.sceneDone ?? 0}/${j.sceneTotal}`}
                    </span>
                    <span>
                      {elapsed(j)}s
                      {j.etaSeconds && ` / ~${formatSeconds(j.etaSeconds)}`}
                    </span>
                  </div>
                </>
              )}
              {j.status !== 'running' && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {j.status === 'success' ? `Concluído em ${elapsed(j)}s` : (j.error || 'Falhou')}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => { navigate(j.returnTo); setOpen(false); }}
                  >
                    Abrir
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'pointer-events-auto flex items-center gap-2 rounded-full pl-3 pr-4 py-2 shadow-2xl border text-sm font-medium transition-all',
          hasRunning
            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-white/20 hover:scale-105'
            : hasErrors
              ? 'bg-destructive text-destructive-foreground border-destructive/40'
              : 'bg-green-600 text-white border-green-700/40'
        )}
        title="Clique para ver detalhes"
      >
        {hasRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasErrors ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        <span>
          {hasRunning
            ? `Criando IA${running.length > 1 ? ` (${running.length})` : ''}`
            : hasErrors ? 'Falhou' : 'Pronto'}
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

export default StudioBackgroundIndicator;
