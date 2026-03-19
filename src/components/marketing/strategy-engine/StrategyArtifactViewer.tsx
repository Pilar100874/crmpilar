import React, { useState } from 'react';
import { StrategyArtifact, AGENT_INFO } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, Eye, Code, LayoutList, ShieldCheck, Loader2, Check, X, RefreshCw, Pencil, Save, History, Columns } from 'lucide-react';
import { toast } from 'sonner';
import { ArtifactRenderer } from './renderers/ArtifactRenderer';
import { ArtifactHistory } from './ArtifactHistory';
import { ArtifactABComparison } from './ArtifactABComparison';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  artifacts: StrategyArtifact[];
  projectId: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRevise?: (id: string, agentType: string) => void;
  onUpdateContent?: (id: string, content: any) => void;
  runningAgent?: string | null;
}

export function StrategyArtifactViewer({ artifacts, projectId, onApprove, onReject, onRevise, onUpdateContent, runningAgent }: Props) {
  const [selectedArtifact, setSelectedArtifact] = useState<StrategyArtifact | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'json' | 'edit'>('formatted');
  const [validating, setValidating] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [editContent, setEditContent] = useState('');

  const exportJSON = (artifact: StrategyArtifact) => {
    const blob = new Blob([JSON.stringify(artifact.conteudo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.tipo}_v${artifact.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado');
  };

  const exportMarkdown = (artifact: StrategyArtifact) => {
    const md = jsonToMarkdown(artifact.titulo, artifact.conteudo);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.tipo}_v${artifact.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown exportado');
  };

  const handleValidate = async (artifact: StrategyArtifact) => {
    setValidating(artifact.id);
    try {
      const validators = ['clareza', 'especificidade', 'voc', 'diferenciacao', 'consistencia'];
      const results: Record<string, any> = {};

      for (const v of validators) {
        const { data, error } = await supabase.functions.invoke('strategy-engine', {
          body: { action: 'validate', validatorType: v, artifactContent: artifact.conteudo }
        });
        if (data?.success) {
          results[v] = data.validation;
        }
      }

      setValidationResults(prev => ({ ...prev, [artifact.id]: results }));

      // Check if auto-revision needed
      const avgScore = Math.round(
        (Object.values(results) as any[]).reduce((sum: number, v: any) => sum + (v?.pontuacao || 0), 0) / Object.keys(results).length
      );
      if (avgScore < 60) {
        toast.warning(`Score ${avgScore}% - Revisão automática recomendada`);
      } else {
        toast.success(`Validação concluída! Score: ${avgScore}%`);
      }
    } catch (err: any) {
      toast.error(`Erro na validação: ${err.message}`);
    } finally {
      setValidating(null);
    }
  };

  const handleStartEdit = (artifact: StrategyArtifact) => {
    setEditContent(JSON.stringify(artifact.conteudo, null, 2));
    setViewMode('edit');
  };

  const handleSaveEdit = (artifact: StrategyArtifact) => {
    try {
      const parsed = JSON.parse(editContent);
      onUpdateContent?.(artifact.id, parsed);
      setViewMode('formatted');
      // Update local selected artifact
      setSelectedArtifact({ ...artifact, conteudo: parsed });
    } catch {
      toast.error('JSON inválido');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Aprovado</Badge>;
      case 'rejected': return <Badge className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Rejeitado</Badge>;
      default: return <Badge variant="outline" className="text-xs">Pendente</Badge>;
    }
  };

  if (artifacts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum artefato gerado ainda. Execute o pipeline para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {artifacts.map(artifact => {
          const info = AGENT_INFO[artifact.tipo];
          const validation = validationResults[artifact.id];
          const avgScore = validation
            ? Math.round((Object.values(validation) as any[]).reduce((sum: number, v: any) => sum + (v?.pontuacao || 0), 0) / Object.keys(validation).length)
            : null;

          return (
            <Card key={artifact.id} className={`hover:border-primary/30 transition-colors ${artifact.status === 'approved' ? 'border-green-500/30' : artifact.status === 'rejected' ? 'border-red-500/30' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info?.icon || '📄'}</span>
                    <CardTitle className="text-sm">{artifact.titulo}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {avgScore !== null && (
                      <Badge
                        variant={avgScore >= 80 ? 'default' : avgScore >= 60 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {avgScore}%
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">v{artifact.version}</Badge>
                    {getStatusBadge(artifact.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedArtifact(artifact); setViewMode('formatted'); }}>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleValidate(artifact)}
                    disabled={validating === artifact.id}
                  >
                    {validating === artifact.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                    Validar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => exportJSON(artifact)}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    JSON
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => exportMarkdown(artifact)}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    MD
                  </Button>
                  <ArtifactABComparison
                    projectId={projectId}
                    artifactType={artifact.tipo}
                    currentContent={artifact.conteudo}
                    onSelectVariation={(content) => onUpdateContent?.(artifact.id, content)}
                  />
                </div>

                {/* Approve / Reject / Revise */}
                <div className="flex items-center gap-1.5 border-t pt-2">
                  {artifact.status !== 'approved' && (
                    <Button size="sm" variant="outline" className="text-green-600 border-green-500/30 hover:bg-green-500/10" onClick={() => onApprove?.(artifact.id)}>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Aprovar
                    </Button>
                  )}
                  {artifact.status !== 'rejected' && (
                    <Button size="sm" variant="outline" className="text-red-600 border-red-500/30 hover:bg-red-500/10" onClick={() => onReject?.(artifact.id)}>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Rejeitar
                    </Button>
                  )}
                  <Button
                    size="sm" variant="outline"
                    onClick={() => onRevise?.(artifact.id, artifact.tipo)}
                    disabled={runningAgent === artifact.tipo}
                  >
                    {runningAgent === artifact.tipo ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                    Revisar
                  </Button>
                </div>

                {/* Validation scores inline */}
                {validation && (
                  <div className="grid grid-cols-5 gap-1 border-t pt-2">
                    {Object.entries(validation).map(([key, val]: [string, any]) => (
                      <div key={key} className="text-center">
                        <div className={`text-xs font-bold ${val?.pontuacao >= 80 ? 'text-primary' : val?.pontuacao >= 60 ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {val?.pontuacao || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground capitalize truncate">{key}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedArtifact} onOpenChange={() => setSelectedArtifact(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{AGENT_INFO[selectedArtifact?.tipo || '']?.icon}</span>
              {selectedArtifact?.titulo}
              <Badge variant="outline" className="text-xs ml-2">v{selectedArtifact?.version}</Badge>
              {selectedArtifact && getStatusBadge(selectedArtifact.status)}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)}>
            <TabsList className="w-fit">
              <TabsTrigger value="formatted" className="text-xs">
                <LayoutList className="h-3 w-3 mr-1" />
                Formatado
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs">
                <Code className="h-3 w-3 mr-1" />
                JSON
              </TabsTrigger>
              <TabsTrigger value="edit" className="text-xs" onClick={() => selectedArtifact && handleStartEdit(selectedArtifact)}>
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 mt-3">
              <ScrollArea className="h-full max-h-[60vh]">
                <div className="pr-4">
                  <TabsContent value="formatted" className="mt-0">
                    {selectedArtifact && <ArtifactRenderer tipo={selectedArtifact.tipo} conteudo={selectedArtifact.conteudo} />}
                  </TabsContent>
                  <TabsContent value="json" className="mt-0">
                    <pre className="text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedArtifact?.conteudo, null, 2)}
                    </pre>
                  </TabsContent>
                  <TabsContent value="edit" className="mt-0 space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={20}
                      className="font-mono text-xs"
                      placeholder="Edite o JSON do artefato..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewMode('formatted')}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={() => selectedArtifact && handleSaveEdit(selectedArtifact)}>
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Salvar (nova versão)
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="history" className="mt-0">
                    {selectedArtifact && (
                      <ArtifactHistory projectId={projectId} artifactType={selectedArtifact.tipo} />
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>

          {/* Validation in dialog */}
          {selectedArtifact && validationResults[selectedArtifact.id] && (
            <div className="border-t pt-3 mt-2">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Resultados da Validação
              </h4>
              <div className="space-y-2">
                {Object.entries(validationResults[selectedArtifact.id]).map(([key, val]: [string, any]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize">{key}</span>
                      <Badge
                        variant={val?.pontuacao >= 80 ? 'default' : val?.pontuacao >= 60 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {val?.pontuacao}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{val?.diagnostico}</p>
                    {val?.sugestoes?.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {val.sugestoes.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground">💡 {s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function jsonToMarkdown(title: string, data: any, level = 1): string {
  let md = `${'#'.repeat(Math.min(level, 6))} ${title}\n\n`;
  if (typeof data === 'string') return md + data + '\n\n';
  if (Array.isArray(data)) {
    data.forEach((item, i) => {
      if (typeof item === 'object') {
        md += jsonToMarkdown(`Item ${i + 1}`, item, level + 1);
      } else {
        md += `- ${item}\n`;
      }
    });
    md += '\n';
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        md += jsonToMarkdown(key, value, level + 1);
      } else {
        md += `**${key}**: ${value}\n\n`;
      }
    });
  }
  return md;
}
