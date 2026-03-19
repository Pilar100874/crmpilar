import React, { useState } from 'react';
import { StrategyArtifact, AGENT_INFO } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, Code, LayoutList, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ArtifactRenderer } from './renderers/ArtifactRenderer';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  artifacts: StrategyArtifact[];
  onValidate?: (artifactId: string) => void;
}

export function StrategyArtifactViewer({ artifacts, onValidate }: Props) {
  const [selectedArtifact, setSelectedArtifact] = useState<StrategyArtifact | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>('formatted');
  const [validating, setValidating] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});

  const exportJSON = (artifact: StrategyArtifact) => {
    const blob = new Blob([JSON.stringify(artifact.conteudo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.tipo}_${artifact.titulo.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado como JSON');
  };

  const exportMarkdown = (artifact: StrategyArtifact) => {
    const md = jsonToMarkdown(artifact.titulo, artifact.conteudo);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.tipo}_${artifact.titulo.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado como Markdown');
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
      toast.success('Validação concluída!');
    } catch (err: any) {
      toast.error(`Erro na validação: ${err.message}`);
    } finally {
      setValidating(null);
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
            <Card key={artifact.id} className="hover:border-primary/30 transition-colors">
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
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex items-center gap-1.5 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setSelectedArtifact(artifact)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Ver
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
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
              </CardContent>

              {/* Validation Results Inline */}
              {validation && (
                <CardContent className="pt-0 pb-3">
                  <div className="grid grid-cols-5 gap-1">
                    {Object.entries(validation).map(([key, val]: [string, any]) => (
                      <div key={key} className="text-center">
                        <div className={`text-xs font-bold ${val?.pontuacao >= 80 ? 'text-primary' : val?.pontuacao >= 60 ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {val?.pontuacao || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground capitalize truncate">{key}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedArtifact} onOpenChange={() => setSelectedArtifact(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{AGENT_INFO[selectedArtifact?.tipo || '']?.icon}</span>
              {selectedArtifact?.titulo}
              <Badge variant="outline" className="text-xs ml-2">v{selectedArtifact?.version}</Badge>
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
            </TabsList>

            <ScrollArea className="max-h-[60vh] mt-3">
              <TabsContent value="formatted" className="mt-0">
                {selectedArtifact && <ArtifactRenderer tipo={selectedArtifact.tipo} conteudo={selectedArtifact.conteudo} />}
              </TabsContent>
              <TabsContent value="json" className="mt-0">
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedArtifact?.conteudo, null, 2)}
                </pre>
              </TabsContent>
            </ScrollArea>
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
