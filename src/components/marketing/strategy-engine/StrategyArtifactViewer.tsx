import React, { useState } from 'react';
import { StrategyArtifact, AGENT_INFO } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  artifacts: StrategyArtifact[];
}

export function StrategyArtifactViewer({ artifacts }: Props) {
  const [selectedArtifact, setSelectedArtifact] = useState<StrategyArtifact | null>(null);

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
          return (
            <Card key={artifact.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info?.icon || '📄'}</span>
                    <CardTitle className="text-sm">{artifact.titulo}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">v{artifact.version}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedArtifact(artifact)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Ver
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
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedArtifact} onOpenChange={() => setSelectedArtifact(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{AGENT_INFO[selectedArtifact?.tipo || '']?.icon}</span>
              {selectedArtifact?.titulo}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap">
              {JSON.stringify(selectedArtifact?.conteudo, null, 2)}
            </pre>
          </ScrollArea>
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
