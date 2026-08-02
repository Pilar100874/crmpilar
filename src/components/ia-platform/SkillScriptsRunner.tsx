import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/aip/db";
import { agentRunner, SkillExecResult } from "@/lib/aip/runner";
import { BUCKET_SKILLS } from "@/components/ia-platform/SkillArquivosMd";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Terminal, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface Arquivo {
  nome_arquivo: string;
  storage_path: string;
}

interface Props {
  skillId: string;
  skillSlug: string;
  conteudoMd?: string | null;
}

/**
 * Executa scripts da skill (pasta Claude Code) no motor remoto do Railway.
 * O navegador não roda bash/ffmpeg: os arquivos são enviados ao runner, que
 * monta um workspace isolado e devolve stdout/stderr e os artefatos gerados.
 */
export function SkillScriptsRunner({ skillId, skillSlug, conteudoMd }: Props) {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [rodando, setRodando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SkillExecResult | null>(null);

  const carregar = useCallback(async () => {
    const { data } = await db
      .from("aip_skill_files")
      .select("nome_arquivo, storage_path")
      .eq("skill_id", skillId);
    setArquivos((data as Arquivo[]) ?? []);
  }, [skillId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const scripts = useMemo(
    () => arquivos.filter((a) => /^scripts\/.+\.(sh|bash|py|js|mjs|cjs)$/i.test(a.nome_arquivo)),
    [arquivos],
  );

  const executar = async (script: string) => {
    setRodando(script);
    setResultado(null);
    try {
      const conteudos: Array<{ caminho: string; conteudo: string }> = [
        { caminho: "SKILL.md", conteudo: conteudoMd ?? "" },
      ];
      for (const a of arquivos) {
        const { data, error } = await supabase.storage.from(BUCKET_SKILLS).download(a.storage_path);
        if (error || !data) continue;
        conteudos.push({ caminho: a.nome_arquivo, conteudo: await data.text() });
      }

      const r = await agentRunner.execSkillScript({
        skill_slug: skillSlug || "skill",
        arquivos: conteudos,
        script,
      });
      setResultado(r);
      if (r.simulado) toast.warning("Servidor de execução não configurado.");
      else if (r.ok) toast.success("Script executado com sucesso");
      else toast.error(r.erro ?? `Script terminou com código ${r.codigo}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao executar o script");
    } finally {
      setRodando(null);
    }
  };

  if (!scripts.length) return null;

  return (
    <div className="space-y-2">
      <div>
        <Label>Scripts da skill</Label>
        <p className="text-xs text-muted-foreground">
          Rodam no motor remoto (bash, ffmpeg, jq, python). Use para testar o preflight antes de gastar crédito.
        </p>
      </div>

      <div className="rounded-lg border divide-y">
        {scripts.map((s) => (
          <div key={s.nome_arquivo} className="flex items-center gap-2 p-2">
            <Terminal className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{s.nome_arquivo}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={!!rodando}
              onClick={() => executar(s.nome_arquivo)}
            >
              {rodando === s.nome_arquivo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {resultado && (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={resultado.ok ? "default" : "destructive"}>
              {resultado.ok ? "sucesso" : `código ${resultado.codigo ?? "-"}`}
            </Badge>
            {resultado.duracao_ms != null && (
              <Badge variant="outline">{Math.round(resultado.duracao_ms / 100) / 10}s</Badge>
            )}
            {(resultado.artefatos ?? []).length > 0 && (
              <Badge variant="outline">{resultado.artefatos!.length} artefato(s)</Badge>
            )}
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {(resultado.stdout || "") + (resultado.stderr ? `\n${resultado.stderr}` : "") ||
              resultado.erro ||
              "Sem saída."}
          </pre>
        </div>
      )}
    </div>
  );
}
