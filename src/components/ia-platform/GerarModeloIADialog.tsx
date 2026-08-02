import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import ValidacaoModeloPanel from "@/components/ia-platform/ValidacaoModeloPanel";
import {
  ContextoValidacao,
  ModeloEntrada,
  ResultadoValidacao,
  validarModelo,
} from "@/lib/aip/validarModelo";

export interface ModeloGerado {
  nome: string;
  tipo: string;
  objetivo: string;
  detalhes: string;
  modelo_ia: string;
  skill_ids: string[];
  tool_ids: string[];
  mcp_ids: string[];
  modo_execucao: "unica" | "etapas";
  etapas: { titulo: string; instrucao?: string }[];
  agenda: { frequencia?: string; hora?: string; minuto?: string };
}

interface TipoResumo {
  id: string;
  titulo: string;
  subtitulo: string;
  criaRotina: boolean;
  precisaReferencias?: boolean;
}

interface Props {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  tipos: TipoResumo[];
  contexto: ContextoValidacao;
  construirCron: (agenda: { frequencia?: string; hora?: string; minuto?: string }) => string;
  onAplicar: (modelo: ModeloGerado) => void;
}

const MAX_TENTATIVAS = 3;

/**
 * Cria um novo modelo a partir de uma descrição livre.
 * A IA gera, o sistema valida e, enquanto houver bloqueios, pede o ajuste
 * automaticamente — até chegar em algo viável de executar.
 */
export default function GerarModeloIADialog({
  aberto,
  onOpenChange,
  tipos,
  contexto,
  construirCron,
  onAplicar,
}: Props) {
  const [descricao, setDescricao] = useState("");
  const [gerando, setGerando] = useState(false);
  const [etapaTexto, setEtapaTexto] = useState("");
  const [modelo, setModelo] = useState<ModeloGerado | null>(null);
  const [explicacao, setExplicacao] = useState("");
  const [faltando, setFaltando] = useState<string[]>([]);
  const [validacao, setValidacao] = useState<ResultadoValidacao | null>(null);
  const [tentativas, setTentativas] = useState(0);

  const validar = (m: ModeloGerado): ResultadoValidacao => {
    const tipo = tipos.find((t) => t.id === m.tipo);
    const entrada: ModeloEntrada = {
      nome: m.nome,
      tipo: m.tipo,
      objetivo: m.objetivo,
      detalhes: m.detalhes,
      modelo: m.modelo_ia,
      skill_ids: m.skill_ids,
      tool_ids: m.tool_ids,
      mcp_ids: m.mcp_ids,
      modo_execucao: m.modo_execucao,
      etapas: m.etapas,
      agenda: m.agenda,
      cron: tipo?.criaRotina ? construirCron(m.agenda ?? {}) : null,
      criaRotina: Boolean(tipo?.criaRotina),
      precisaReferencias: Boolean(tipo?.precisaReferencias),
    };
    return validarModelo(entrada, contexto);
  };

  const chamarIa = async (correcoes?: string, anterior?: ModeloGerado | null) => {
    const { data, error } = await supabase.functions.invoke("aip-gerar-modelo", {
      body: {
        descricao,
        correcoes: correcoes ?? "",
        modelo_anterior: anterior ?? null,
        tipos,
        modelos_ia: contexto.modelosDisponiveis,
        recursos: {
          skills: contexto.skills.map((s) => ({ id: s.id, nome: s.nome })),
          tools: contexto.tools.map((t) => ({ id: t.id, nome: t.nome })),
          mcps: contexto.mcps.map((m) => ({ id: m.id, nome: m.nome })),
        },
      },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.erro) throw new Error((data as any).erro);
    return data as { modelo: ModeloGerado; explicacao?: string; faltando?: string[] };
  };

  const gerar = async () => {
    if (descricao.trim().length < 10)
      return toast.warning("Descreva com um pouco mais de detalhe o que você quer.");
    setGerando(true);
    setValidacao(null);
    setModelo(null);
    try {
      let atual: ModeloGerado | null = null;
      let resultado: ResultadoValidacao | null = null;
      let voltas = 0;

      for (let i = 0; i < MAX_TENTATIVAS; i++) {
        voltas = i + 1;
        setEtapaTexto(
          i === 0 ? "Criando o modelo..." : `Ajustando o modelo (tentativa ${i + 1})...`,
        );
        const resposta = await chamarIa(i === 0 ? "" : resultado?.resumo, atual);
        atual = {
          nome: resposta.modelo?.nome ?? "",
          tipo: resposta.modelo?.tipo ?? tipos[0]?.id,
          objetivo: resposta.modelo?.objetivo ?? "",
          detalhes: resposta.modelo?.detalhes ?? "",
          modelo_ia: resposta.modelo?.modelo_ia ?? contexto.modelosDisponiveis[0],
          skill_ids: resposta.modelo?.skill_ids ?? [],
          tool_ids: resposta.modelo?.tool_ids ?? [],
          mcp_ids: resposta.modelo?.mcp_ids ?? [],
          modo_execucao: resposta.modelo?.modo_execucao === "etapas" ? "etapas" : "unica",
          etapas: resposta.modelo?.etapas ?? [],
          agenda: resposta.modelo?.agenda ?? {},
        };
        setExplicacao(resposta.explicacao ?? "");
        setFaltando(resposta.faltando ?? []);

        setEtapaTexto("Validando se dá para rodar...");
        resultado = validar(atual);
        if (resultado.ok) break;
      }

      setTentativas(voltas);
      setModelo(atual);
      setValidacao(resultado);
      if (resultado?.ok) toast.success("Modelo gerado e validado!");
      else toast.warning("O modelo foi gerado, mas ainda há pontos a resolver.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGerando(false);
      setEtapaTexto("");
    }
  };

  const aplicar = () => {
    if (!modelo) return;
    onAplicar(modelo);
    onOpenChange(false);
    setModelo(null);
    setValidacao(null);
    setDescricao("");
  };

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Criar modelo com IA
          </DialogTitle>
          <DialogDescription>
            Escreva com suas palavras o que você quer que aconteça. A IA monta o modelo, o sistema
            confere se dá para rodar e a IA ajusta até ficar viável.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>O que você quer criar?</Label>
              <Textarea
                rows={4}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: Toda segunda de manhã, reunir os orçamentos abertos da semana, resumir por vendedor e mandar no WhatsApp do gerente."
              />
              <p className="text-xs text-muted-foreground">
                A IA só vai usar skills, tools e MCPs que já existem aqui no sistema.
              </p>
            </div>

            {gerando && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {etapaTexto}
              </div>
            )}

            {modelo && (
              <div className="space-y-3">
                <div className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{modelo.nome}</p>
                    <Badge variant="secondary">
                      {tipos.find((t) => t.id === modelo.tipo)?.titulo ?? modelo.tipo}
                    </Badge>
                    <Badge variant="outline">{modelo.modelo_ia}</Badge>
                    <Badge variant="outline">
                      {modelo.modo_execucao === "etapas"
                        ? `${modelo.etapas.length} etapas`
                        : "execução única"}
                    </Badge>
                    {tentativas > 1 && (
                      <Badge variant="outline">{tentativas} ajustes da IA</Badge>
                    )}
                  </div>
                  {explicacao && (
                    <p className="mt-2 text-sm text-muted-foreground">{explicacao}</p>
                  )}
                  <p className="mt-2 text-sm">{modelo.objetivo}</p>
                  {modelo.etapas.length > 0 && (
                    <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-muted-foreground">
                      {modelo.etapas.map((e, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{e.titulo}</span>
                          {e.instrucao ? ` — ${e.instrucao}` : ""}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {faltando.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <span className="font-medium">Precisa cadastrar antes de rodar: </span>
                      {faltando.join(", ")}
                    </AlertDescription>
                  </Alert>
                )}

                {validacao && <ValidacaoModeloPanel resultado={validacao} />}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={gerar} disabled={gerando}>
            {gerando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {modelo ? "Gerar novamente" : "Gerar modelo"}
          </Button>
          <Button onClick={aplicar} disabled={!modelo || gerando}>
            Abrir no assistente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
