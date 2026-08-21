import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase, Tool } from "@/lib/supabase";
import {
  Lightbulb,
  Camera,
  Send,
  Loader2,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  Shield,
  Package,
  ShoppingCart,
  Search,
} from "lucide-react";

interface Solution {
  titulo: string;
  passos: string[];
  ferramentas: string[];
  dificuldade: "Fácil" | "Média" | "Difícil";
  tempo_estimado: string;
}

interface MatchedTool {
  name: string;
  tool: Tool | null;
  isBorrowed: boolean;
  borrowedBy?: string;
}

interface SolutionWithAvailability extends Solution {
  matchedTools: MatchedTool[];
  availableCount: number;
  borrowedCount: number;
  totalTools: number;
}

interface AIResponse {
  analise: string;
  solucoes: Solution[];
  dicas_seguranca: string[];
}

export default function ToolAssistantPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [problem, setProblem] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [sortedSolutions, setSortedSolutions] = useState<SolutionWithAvailability[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [borrowedToolIds, setBorrowedToolIds] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Carregar todas as ferramentas cadastradas e verificar empréstimos ativos
  useEffect(() => {
    const fetchToolsAndLoans = async () => {
      // Buscar ferramentas ativas
      const { data: toolsData } = await supabase
        .from("tools")
        .select("*")
        .eq("is_active", true);
      setAllTools(toolsData || []);

      // Buscar empréstimos ativos para saber quais ferramentas estão emprestadas
      const { data: loansData } = await supabase
        .from("loans")
        .select(`
          tool_id,
          profiles:user_id (full_name)
        `)
        .in("status", ["ativo", "vencido", "renovacao_solicitada"]);

      const borrowedMap = new Map<string, string>();
      if (loansData) {
        loansData.forEach((loan: any) => {
          const userName = loan.profiles?.full_name || "Usuário";
          borrowedMap.set(loan.tool_id, userName);
        });
      }
      setBorrowedToolIds(borrowedMap);
    };
    fetchToolsAndLoans();
  }, []);

  // Função para normalizar strings para comparação
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

  // Função para buscar ferramenta no cadastro por nome similar
  const findToolByName = (toolName: string): Tool | null => {
    const normalizedSearch = normalizeString(toolName);
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);

    // Primeiro, busca match exato
    let match = allTools.find(
      (t) => normalizeString(t.name) === normalizedSearch
    );
    if (match) return match;

    // Depois, busca se o nome da ferramenta contém as palavras principais
    match = allTools.find((t) => {
      const normalizedName = normalizeString(t.name);
      return searchWords.every((word) => normalizedName.includes(word));
    });
    if (match) return match;

    // Busca parcial - pelo menos metade das palavras
    match = allTools.find((t) => {
      const normalizedName = normalizeString(t.name);
      const matchCount = searchWords.filter((word) => normalizedName.includes(word)).length;
      return matchCount >= Math.ceil(searchWords.length / 2);
    });
    if (match) return match;

    // Busca por qualquer palavra principal (substantivos)
    match = allTools.find((t) => {
      const normalizedName = normalizeString(t.name);
      return searchWords.some((word) => word.length > 3 && normalizedName.includes(word));
    });

    return match || null;
  };

  // Processar soluções e ordenar por disponibilidade
  const processSolutionsWithAvailability = (solutions: Solution[]) => {
    const processedSolutions: SolutionWithAvailability[] = solutions.map((solution) => {
      const matchedTools: MatchedTool[] = solution.ferramentas.map((toolName) => {
        const tool = findToolByName(toolName);
        const isBorrowed = tool ? borrowedToolIds.has(tool.id) : false;
        const borrowedBy = tool && isBorrowed ? borrowedToolIds.get(tool.id) : undefined;
        return {
          name: toolName,
          tool,
          isBorrowed,
          borrowedBy,
        };
      });

      // Disponíveis = encontradas no cadastro E não emprestadas
      const availableCount = matchedTools.filter((mt) => mt.tool !== null && !mt.isBorrowed).length;
      const borrowedCount = matchedTools.filter((mt) => mt.tool !== null && mt.isBorrowed).length;

      return {
        ...solution,
        matchedTools,
        availableCount,
        borrowedCount,
        totalTools: solution.ferramentas.length,
      };
    });

    // Ordenar por quantidade de ferramentas disponíveis (mais ferramentas primeiro)
    processedSolutions.sort((a, b) => b.availableCount - a.availableCount);

    return processedSolutions;
  };

  // Criar solicitação com ferramentas pré-selecionadas (apenas as disponíveis)
  const handleCreateRequest = (solution: SolutionWithAvailability) => {
    // Apenas ferramentas que existem E não estão emprestadas
    const availableTools = solution.matchedTools
      .filter((mt) => mt.tool !== null && !mt.isBorrowed)
      .map((mt) => mt.tool!);

    if (availableTools.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhuma ferramenta disponível",
        description: "Todas as ferramentas sugeridas estão emprestadas ou não foram encontradas no cadastro",
      });
      return;
    }

    // Separar ferramentas individuais de kits
    const toolIds = availableTools.map((t) => t.id);
    const kitIds = [...new Set(availableTools.filter((t) => t.kit_id).map((t) => t.kit_id!))];

    // Avisar se algumas ferramentas foram excluídas por estarem emprestadas
    const borrowedTools = solution.matchedTools.filter((mt) => mt.tool !== null && mt.isBorrowed);
    if (borrowedTools.length > 0) {
      toast({
        title: "Solicitação parcial",
        description: `${borrowedTools.length} ferramenta(s) emprestada(s) foram excluídas da solicitação`,
      });
    }

    // Navegar para a tela de solicitação com as ferramentas pré-selecionadas
    // Inclui flag para pular etapa 1 e usar usuário logado
    navigate("/request-tools", {
      state: {
        preselectedToolIds: toolIds,
        preselectedKitIds: kitIds,
        fromAssistant: true,
        skipRecipientStep: true, // Pular etapa 1, usar usuário logado
      },
    });
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao acessar câmera",
        description: "Verifique as permissões do navegador",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setImagePreview(dataUrl);
    stopCamera();
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Fácil":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Média":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "Difícil":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "";
    }
  };

  const handleSubmit = async () => {
    if (!problem.trim()) {
      toast({
        variant: "destructive",
        title: "Descrição obrigatória",
        description: "Digite uma descrição do problema. A foto é opcional.",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke("tool-assistant", {
        body: {
          problem: problem.trim(),
          imageUrl: imagePreview,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.error,
        });
        return;
      }

      setResponse(data);
      
      // Processar e ordenar soluções por disponibilidade
      if (data.solucoes && data.solucoes.length > 0) {
        const processed = processSolutionsWithAvailability(data.solucoes);
        setSortedSolutions(processed);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao processar",
        description: error.message || "Tente novamente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewQuestion = () => {
    setProblem("");
    setImagePreview(null);
    setResponse(null);
    setSortedSolutions([]);
  };

  const getAvailabilityBadge = (solution: SolutionWithAvailability) => {
    const foundCount = solution.matchedTools.filter((mt) => mt.tool !== null).length;
    
    if (solution.availableCount === solution.totalTools) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Todas disponíveis
        </Badge>
      );
    } else if (solution.availableCount > 0) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Search className="mr-1 h-3 w-3" />
          {solution.availableCount}/{solution.totalTools} disponíveis
        </Badge>
      );
    } else if (solution.borrowedCount > 0) {
      return (
        <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
          <Clock className="mr-1 h-3 w-3" />
          Todas emprestadas
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          <X className="mr-1 h-3 w-3" />
          Nenhuma encontrada
        </Badge>
      );
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Assistente de Ferramentas"
        description="Descreva seu problema e receba sugestões de como resolver"
      />

      {!response ? (
        <div className="space-y-4">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                Qual é o problema?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="problem" className="text-sm font-medium">
                  Descrição do problema <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="problem"
                  placeholder="Ex: Como tirar um prego de uma tábua sem danificar a madeira? Como consertar uma torneira pingando?"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Descreva o problema com detalhes. Você pode adicionar uma foto para ajudar na análise.
                </p>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Foto do problema"
                    className="max-h-48 rounded-lg border object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Camera View */}
              {showCamera && (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-lg border bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={stopCamera}
                    >
                      Cancelar
                    </Button>
                    <Button className="flex-1" onClick={capturePhoto}>
                      <Camera className="mr-2 h-4 w-4" />
                      Capturar
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!showCamera && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={startCamera}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {imagePreview ? "Trocar Foto" : "Adicionar Foto"}
                  </Button>
                  <Button
                    className="w-full sm:flex-1"
                    onClick={handleSubmit}
                    disabled={isLoading || !problem.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Buscar Soluções
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Examples */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Exemplos de perguntas:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Como tirar um prego de uma tábua?",
                  "Como consertar uma torneira pingando?",
                  "Como fazer um furo em concreto?",
                  "Como remover tinta de madeira?",
                ].map((example) => (
                  <Badge
                    key={example}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setProblem(example)}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Analysis */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Análise do Problema</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {response.analise}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Solutions - Ordenadas por disponibilidade */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Soluções Sugeridas
              <Badge variant="outline" className="font-normal">
                Ordenadas por disponibilidade
              </Badge>
            </h3>
            {sortedSolutions.map((solution, index) => (
              <Card key={index} className={index === 0 && solution.availableCount > 0 ? "border-primary/50 shadow-md" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      {solution.titulo}
                      {index === 0 && solution.availableCount > 0 && (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          Recomendada
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {getAvailabilityBadge(solution)}
                      <Badge className={getDifficultyColor(solution.dificuldade)}>
                        {solution.dificuldade}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Time */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Tempo estimado: {solution.tempo_estimado}</span>
                  </div>

                  {/* Tools with availability status */}
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Wrench className="h-4 w-4 text-primary" />
                      Ferramentas necessárias:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {solution.matchedTools.map((mt, i) => {
                        // Define cor baseada no status
                        let badgeClass = "bg-muted text-muted-foreground"; // Não encontrada
                        let icon = <X className="mr-1 h-3 w-3" />;
                        let statusText = "";

                        if (mt.tool && !mt.isBorrowed) {
                          // Disponível
                          badgeClass = "bg-green-500/10 text-green-700 border-green-500/30";
                          icon = <CheckCircle2 className="mr-1 h-3 w-3" />;
                        } else if (mt.tool && mt.isBorrowed) {
                          // Emprestada
                          badgeClass = "bg-amber-500/10 text-amber-700 border-amber-500/30";
                          icon = <Clock className="mr-1 h-3 w-3" />;
                          statusText = mt.borrowedBy ? ` • com ${mt.borrowedBy}` : " • emprestada";
                        }

                        return (
                          <Badge 
                            key={i} 
                            variant={mt.tool ? "default" : "outline"}
                            className={badgeClass}
                          >
                            {icon}
                            {mt.name}
                            {mt.tool && !mt.isBorrowed && (
                              <span className="ml-1 text-xs opacity-70">
                                ({mt.tool.name})
                              </span>
                            )}
                            {statusText && (
                              <span className="ml-1 text-xs opacity-70">
                                {statusText}
                              </span>
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <p className="mb-2 text-sm font-medium">Passo a passo:</p>
                    <ol className="space-y-2">
                      {solution.passos.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Aviso de ferramentas emprestadas */}
                  {solution.borrowedCount > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-amber-700">
                        <span className="font-medium">{solution.borrowedCount} ferramenta(s) emprestada(s)</span>
                        {solution.availableCount > 0 && (
                          <span className="block text-xs mt-0.5 opacity-80">
                            Você pode solicitar as {solution.availableCount} ferramenta(s) disponível(is)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant={solution.availableCount > 0 ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCreateRequest(solution)}
                      disabled={solution.availableCount === 0}
                      className="flex-1 min-w-[200px]"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {solution.availableCount > 0 
                        ? `Solicitar ${solution.availableCount} ferramenta${solution.availableCount > 1 ? "s" : ""} disponível(is)`
                        : solution.borrowedCount > 0 
                          ? "Todas emprestadas"
                          : "Nenhuma ferramenta disponível"
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Safety Tips */}
          {response.dicas_seguranca && response.dicas_seguranca.length > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-yellow-700">
                  <Shield className="h-5 w-5" />
                  Dicas de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {response.dicas_seguranca.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-yellow-700"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* New Question Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleNewQuestion}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Nova Pergunta
          </Button>
        </div>
      )}
    </MainLayout>
  );
}
