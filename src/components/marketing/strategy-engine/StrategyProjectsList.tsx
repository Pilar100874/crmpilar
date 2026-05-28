import React, { useState } from 'react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useStrategyProjects } from './hooks/useStrategyProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Loader2, Rocket, Clock, CheckCircle2, AlertCircle, Copy, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NicheTemplates } from './NicheTemplates';

interface Props {
  onSelectProject: (id: string) => void;
}

export function StrategyProjectsList({ onSelectProject }: Props) {
  const [estabId] = useState(() => {
    const stored = localStorage.getItem('estabelecimentoId');
    return stored || undefined;
  });
  const { projects, loading, createProject, deleteProject, refetch } = useStrategyProjects(estabId);
  const [showCreate, setShowCreate] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [creating, setCreating] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async () => {
    if (!nome.trim() || !descricao.trim()) {
      toast.error('Preencha nome e descrição do negócio');
      return;
    }
    setCreating(true);
    const userId = localStorage.getItem('usuarioId') || '';
    const project = await createProject(nome, descricao, userId);
    if (project) {
      setShowCreate(false);
      setNome('');
      setDescricao('');
      onSelectProject(project.id);
    }
    setCreating(false);
  };

  const handleClone = async (projectId: string, projectName: string) => {
    setCloning(projectId);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'clone_project', sourceProjectId: projectId, newName: `${projectName} (Cópia)` }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success('Projeto clonado com sucesso!');
      refetch();
    } catch (err: any) {
      toast.error(`Erro ao clonar: ${err.message}`);
    } finally {
      setCloning(null);
    }
  };

  const handleTemplateSelect = (templateNome: string, templateDesc: string) => {
    setNome(templateNome);
    setDescricao(templateDesc);
    setShowCreate(true);
  };

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode; ringColor: string }> = {
    draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground border-border', ringColor: 'from-muted-foreground/20 to-muted-foreground/5', icon: <Clock className="h-3 w-3" /> },
    processing: { label: 'Processando', className: 'bg-primary/15 text-primary border-primary/30', ringColor: 'from-primary/30 to-primary/5', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { label: 'Concluído', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', ringColor: 'from-emerald-500/30 to-emerald-500/5', icon: <CheckCircle2 className="h-3 w-3" /> },
    failed: { label: 'Falhou', className: 'bg-destructive/15 text-destructive border-destructive/30', ringColor: 'from-destructive/30 to-destructive/5', icon: <AlertCircle className="h-3 w-3" /> },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        <NicheTemplates onSelectTemplate={handleTemplateSelect} />
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Projeto Estratégico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium">Nome do Projeto</label>
                <Input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Lançamento Curso de Marketing Digital"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descreva seu Negócio</label>
                <Textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva seu negócio, produto/serviço, público-alvo, e o que você quer alcançar..."
                  rows={6}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Rocket className="h-4 w-4 mr-1" />}
                Criar e Iniciar Estratégia
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-2 bg-gradient-to-br from-card via-card to-primary/[0.03]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-xl shadow-primary/30">
                <Rocket className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Nenhum projeto criado</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-5">
              Descreva seu negócio e nossa IA criará uma estratégia completa de marketing.
            </p>
            <div className="flex gap-2">
              <NicheTemplates onSelectTemplate={handleTemplateSelect} />
              <Button onClick={() => setShowCreate(true)} className="shadow-md shadow-primary/20">
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeiro Projeto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            // Treat stuck "processing" projects (>10min) as draft
            const isStuck = project.status === 'processing' && 
              new Date().getTime() - new Date(project.updated_at || project.created_at).getTime() > 10 * 60 * 1000;
            const st = statusConfig[isStuck ? 'draft' : project.status] || statusConfig.draft;
            return (
              <Card
                key={project.id}
                className="relative cursor-pointer overflow-hidden border-border/60 hover:border-primary/50 transition-all duration-300 group hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 bg-gradient-to-br from-card to-card/60"
                onClick={() => onSelectProject(project.id)}
              >
                {/* Decorative glow */}
                <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${st.ringColor} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardHeader className="pb-2 relative">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">{project.nome}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => handleClone(project.id, project.nome)}
                          disabled={cloning === project.id}
                        >
                          {cloning === project.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                          Duplicar Projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            // Aguarda o DropdownMenu desmontar antes de abrir o dialog,
                            // evitando pointer-events: none travado no body do Radix.
                            setTimeout(() => setDeleteTarget({ id: project.id, name: project.nome }), 50);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                    {project.descricao_negocio}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 relative">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.className}`}>
                      {st.icon}
                      {st.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {format(new Date(project.created_at), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            // Garante que o body não fique com pointer-events travado pelo Radix
            setTimeout(() => {
              if (document.body.style.pointerEvents === 'none') {
                document.body.style.pointerEvents = '';
              }
            }, 100);
          }
        }}
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Excluir projeto"
        itemName={deleteTarget?.name}
      />
          setDeleteTarget(null);
        }}
        title="Excluir projeto"
        itemName={deleteTarget?.name}
      />
    </div>
  );
}
