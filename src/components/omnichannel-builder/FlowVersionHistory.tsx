import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, RotateCcw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FlowVersion {
  id: string;
  flow_id: string;
  version_number: number;
  flow_data: any;
  created_at: string;
  created_by?: string;
  change_description?: string;
}

interface FlowVersionHistoryProps {
  flowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (flowData: any) => void;
}

export const FlowVersionHistory = ({ flowId, open, onOpenChange, onRestore }: FlowVersionHistoryProps) => {
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && flowId) {
      loadVersions();
    }
  }, [open, flowId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("omnichannel_flow_versions")
        .select("*")
        .eq("flow_id", flowId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setVersions((data as any) || []);
    } catch (error) {
      console.error("Erro ao carregar versões:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: FlowVersion) => {
    try {
      onRestore(version.flow_data);
      onOpenChange(false);
      toast.success(`Versão ${version.version_number} restaurada`);
    } catch (error) {
      console.error("Erro ao restaurar versão:", error);
      toast.error("Erro ao restaurar versão");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Versões</DialogTitle>
          <DialogDescription>
            Visualize e restaure versões anteriores do fluxo
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Nenhuma versão encontrada</div>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <Card key={version.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg">
                          Versão {version.version_number}
                        </span>
                        {version.version_number === versions[0]?.version_number && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Atual
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatDistanceToNow(new Date(version.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>

                        {version.created_by && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{version.created_by}</span>
                          </div>
                        )}

                        {version.change_description && (
                          <div className="mt-2 text-foreground">
                            {version.change_description}
                          </div>
                        )}

                        <div className="mt-2 text-xs">
                          {version.flow_data?.nodes?.length || 0} blocos •{" "}
                          {version.flow_data?.edges?.length || 0} conexões
                        </div>
                      </div>
                    </div>

                    {version.version_number !== versions[0]?.version_number && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(version)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
