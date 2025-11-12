import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

interface Props {
  isProcessing: boolean;
  processedCount: number;
  totalCount: number;
  errors: string[];
  completed: boolean;
}

export function VinculosWizardStep4({
  isProcessing,
  processedCount,
  totalCount,
  errors,
  completed,
}: Props) {
  const successCount = processedCount - errors.length;
  const progress = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Passo 4: Processamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {processedCount} / {totalCount} empresas
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  completed 
                    ? errors.length > 0 
                      ? "bg-yellow-500" 
                      : "bg-green-500"
                    : "bg-primary"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {isProcessing && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Processando vínculos... Por favor aguarde.
              </p>
            </div>
          )}

          {completed && (
            <div className="space-y-4">
              {errors.length === 0 ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Processamento Concluído com Sucesso!
                      </p>
                      <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                        Todos os {totalCount} vínculos foram atualizados.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          Processamento Concluído com Avisos
                        </p>
                        <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                          {successCount} vínculos atualizados, {errors.length} erro(s) encontrado(s).
                        </p>
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Erros Encontrados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {errors.map((error, index) => (
                          <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
                            {error}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  ✓ {successCount} Sucesso
                </Badge>
                {errors.length > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    ✗ {errors.length} Erro(s)
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
