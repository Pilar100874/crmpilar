import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { enviarArquivosSkill } from "@/components/ia-platform/SkillArquivosMd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Campo {
  id: string;
  label: string;
  ajuda?: string;
  tipo?: "texto" | "textarea" | "escolha" | "multipla";
  opcoes?: string[];
  exemplo?: string;
  obrigatorio?: boolean;
}

interface Etapa {
  titulo: string;
  explicacao?: string;
  campos: Campo[];
}

interface RascunhoSkill {
  nome: string;
  slug?: string;
  descricao?: string;
  categoria?: string;
  tags?: string[];
  conteudo_md: string;
  arquivos?: Array<{ caminho: string; conteudo: string }>;
}

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Criação de skills por entrevista guiada (estilo Claude Code, em formato wizard).
 * A IA faz uma pergunta por vez, o usuário responde em campos prontos e, ao final,
 * um rascunho da pasta da skill é gerado para aprovação ou ajuste em linguagem natural.
 */
export default function SkillAssistentePage() {
  const navigate = useNavigate();
  const estabelecimentoId = useEstabelecimento();

  const [carregando, setCarregando] = useState(false);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [progresso, setProgresso] = useState(5);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [historico, setHistorico] = useState<Array<{ pergunta: string; resposta: string }>>([]);
  const [rascunho, setRascunho] = useState<RascunhoSkill | null>(null);
  const [resumo, setResumo] = useState("");
  const [ajuste, setAjuste] = useState("");
  const [salvando, setSalvando] = useState(false);

  const chamar = useCallback(
    async (payload: Record<string, unknown>) => {
      setCarregando(true);
      try {
        const { data, error } = await supabase.functions.invoke("aip-skill-builder", {
          body: payload,
        });
        if (error) throw error;
        if ((data as any)?.erro) throw new Error((data as any).erro);

        if ((data as any).acao === "gerar") {
          setRascunho((data as any).skill as RascunhoSkill);
          setResumo((data as any).resumo ?? "");
          setEtapa(null);
          setProgresso(100);
        } else {
          setEtapa((data as any).etapa as Etapa);
          setValores({});
          setProgresso(Number((data as any).progresso) || 20);
        }
      } catch (err: any) {
        toast.error(err?.message ?? "Falha ao conversar com o assistente");
      } finally {
        setCarregando(false);
      }
    },
    [],
  );

  useEffect(() => {
    chamar({ historico: [] });
  }, [chamar]);

  const responder = async (finalizar = false) => {
    if (!etapa) return;
    const faltando = etapa.campos.filter((c) => c.obrigatorio && !valores[c.id]?.trim());
    if (faltando.length && !finalizar) {
      return toast.error(`Preencha: ${faltando.map((c) => c.label).join(", ")}`);
    }
    const resposta = etapa.campos
      .map((c) => `${c.label}: ${valores[c.id]?.trim() || "(não informado)"}`)
      .join("\n");
    const novo = [...historico, { pergunta: etapa.titulo, resposta }];
    setHistorico(novo);
    await chamar({ historico: novo, finalizar });
  };

  const voltar = async () => {
    const novo = historico.slice(0, -1);
    setHistorico(novo);
    setRascunho(null);
    await chamar({ historico: novo });
  };

  const pedirAjuste = async () => {
    if (!ajuste.trim()) return toast.error("Descreva o que deseja mudar");
    await chamar({ historico, rascunho, ajuste: ajuste.trim() });
    setAjuste("");
  };

  const salvar = async () => {
    if (!rascunho || !estabelecimentoId) return;
    setSalvando(true);
    try {
      const { data, error } = await db
        .from("aip_skills")
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: rascunho.nome,
          slug: rascunho.slug || slugify(rascunho.nome),
          descricao: rascunho.descricao ?? "",
          categoria: rascunho.categoria ?? "conhecimento",
          tags: rascunho.tags ?? [],
          conteudo_md: rascunho.conteudo_md,
          status: "rascunho",
          ativo: true,
        })
        .select()
        .single();
      if (error) throw error;

      const anexos = (rascunho.arquivos ?? []).map(
        (a) =>
          new File([a.conteudo], a.caminho, {
            type: "text/markdown",
          }),
      );
      if (anexos.length) await enviarArquivosSkill(data.id, estabelecimentoId, anexos);

      toast.success("Skill criada! Abrindo a lista de skills.");
      navigate("/ia-platform/skills");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao salvar a skill");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-gradient-to-r from-primary/10 to-transparent p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Criar skill com o assistente</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          A IA faz perguntas simples, uma de cada vez. Você só preenche os campos, revisa o
          resultado e aprova — igual ao Claude Code, mas guiado.
        </p>
        <Progress value={progresso} className="mt-3 h-2" />
      </div>

      {carregando && (
        <Card>
          <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Pensando na próxima pergunta...
          </CardContent>
        </Card>
      )}

      {!carregando && etapa && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Etapa {historico.length + 1} — {etapa.titulo}
            </CardTitle>
            {etapa.explicacao && (
              <p className="text-sm text-muted-foreground">{etapa.explicacao}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {etapa.campos.map((c) => (
              <div key={c.id} className="space-y-1.5">
                <Label>
                  {c.label}
                  {c.obrigatorio && <span className="ml-1 text-destructive">*</span>}
                </Label>
                {c.ajuda && <p className="text-xs text-muted-foreground">{c.ajuda}</p>}

                {c.tipo === "escolha" && c.opcoes?.length ? (
                  <Select
                    value={valores[c.id] ?? ""}
                    onValueChange={(v) => setValores((s) => ({ ...s, [c.id]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {c.opcoes.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : c.tipo === "multipla" && c.opcoes?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {c.opcoes.map((o) => {
                      const sel = (valores[c.id] ?? "").split(", ").filter(Boolean);
                      const ativo = sel.includes(o);
                      return (
                        <Badge
                          key={o}
                          variant={ativo ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            setValores((s) => ({
                              ...s,
                              [c.id]: (ativo ? sel.filter((x) => x !== o) : [...sel, o]).join(", "),
                            }))
                          }
                        >
                          {o}
                        </Badge>
                      );
                    })}
                  </div>
                ) : c.tipo === "texto" ? (
                  <Input
                    value={valores[c.id] ?? ""}
                    placeholder={c.exemplo}
                    onChange={(e) => setValores((s) => ({ ...s, [c.id]: e.target.value }))}
                  />
                ) : (
                  <Textarea
                    rows={4}
                    value={valores[c.id] ?? ""}
                    placeholder={c.exemplo}
                    onChange={(e) => setValores((s) => ({ ...s, [c.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => responder(false)}>
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => responder(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Já tenho o suficiente, gerar skill
              </Button>
              {historico.length > 0 && (
                <Button variant="ghost" onClick={voltar}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!carregando && rascunho && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Rascunho da skill: {rascunho.nome}
            </CardTitle>
            {resumo && <p className="text-sm text-muted-foreground">{resumo}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {rascunho.categoria && <Badge variant="outline">{rascunho.categoria}</Badge>}
              {(rascunho.tags ?? []).map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>

            <div>
              <Label>SKILL.md</Label>
              <Textarea
                rows={16}
                className="font-mono text-xs"
                value={rascunho.conteudo_md}
                onChange={(e) => setRascunho({ ...rascunho, conteudo_md: e.target.value })}
              />
            </div>

            {(rascunho.arquivos ?? []).length > 0 && (
              <div className="space-y-1">
                <Label>Arquivos de apoio</Label>
                <div className="rounded-lg border divide-y">
                  {rascunho.arquivos!.map((a) => (
                    <div key={a.caminho} className="flex items-center gap-2 p-2 text-xs">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="font-mono">{a.caminho}</span>
                      <span className="ml-auto text-muted-foreground">
                        {a.conteudo.length} caracteres
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <Label>Quer ajustar algo? Escreva com suas palavras</Label>
              <Textarea
                rows={2}
                value={ajuste}
                placeholder="Ex.: deixe o passo a passo mais curto e inclua um exemplo de e-mail"
                onChange={(e) => setAjuste(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={pedirAjuste}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refazer com esse ajuste
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Aprovar e salvar skill
              </Button>
              <Button variant="ghost" onClick={voltar}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar às perguntas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
