import React, { useState } from 'react';
import { StrategyProjectsList } from './StrategyProjectsList';
import { StrategyProjectDetail } from './StrategyProjectDetail';
import { StrategyAdminPanel } from './StrategyAdminPanel';
import { StrategyManual } from './StrategyManual';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FolderKanban, Shield, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StrategyEngine() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'projects' | 'admin' | 'manual'>('projects');

  if (selectedProjectId) {
    return (
      <StrategyProjectDetail
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  const sections: { id: 'projects' | 'admin' | 'manual'; label: string; icon: React.ElementType }[] = [
    { id: 'projects', label: 'Projetos', icon: FolderKanban },
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'manual', label: 'Manual', icon: BookOpen },
  ];

  return (
    <div className="space-y-5">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 sm:p-6">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-primary-glow/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Motor de Estratégia com IA
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Transforme descrições de negócio em estratégias completas de marketing
              </p>
            </div>
          </div>

          {/* Pill tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-card/60 backdrop-blur border border-border/60 shadow-sm self-start md:self-auto w-full md:w-auto overflow-x-auto">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeSection === 'projects' ? (
        <StrategyProjectsList onSelectProject={setSelectedProjectId} />
      ) : activeSection === 'admin' ? (
        <StrategyAdminPanel />
      ) : (
        <StrategyManual />
      )}
    </div>
  );
}
