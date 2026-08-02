import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FileText, Loader2, Trash2, Upload, Download } from "lucide-react";
import { toast } from "sonner";

export const BUCKET_SKILLS = "aip-skills";

export interface SkillFile {
  id: string;
  nome_arquivo: string;
  storage_path: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
}

/** Envia arquivos .md/.txt para o bucket e registra em aip_skill_files. */
export async function enviarArquivosSkill(
  skillId: string,
  estabelecimentoId: string,
  arquivos: File[],
) {
  for (const file of arquivos) {
    const path = `${estabelecimentoId}/${skillId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET_SKILLS).upload(path, file, {
      contentType: file.type || "text/markdown",
      upsert: false,
    });
    if (error) throw error;
    const { error: dbError } = await db.from("aip_skill_files").insert({
      skill_id: skillId,
      estabelecimento_id: estabelecimentoId,
      nome_arquivo: file.name,
      storage_path: path,
      tamanho_bytes: file.size,
      mime_type: file.type || "text/markdown",
    });
    if (dbError) throw dbError;
  }
}

const formatarTamanho = (b?: number | null) =>
  !b ? "—" : b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

interface Props {
  skillId: string;
}

export function SkillArquivosMd({ skillId }: Props) {
  const estabelecimentoId = useEstabelecimento();
  const [arquivos, setArquivos] = useState<SkillFile[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [excluir, setExcluir] = useState<SkillFile | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data } = await db
      .from("aip_skill_files")
      .select("id, nome_arquivo, storage_path, tamanho_bytes, mime_type")
      .eq("skill_id", skillId)
      .order("created_at", { ascending: true });
    setArquivos((data as SkillFile[]) ?? []);
    setCarregando(false);
  }, [skillId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aoSelecionar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (!estabelecimentoId) return toast.error("Estabelecimento não identificado");
    setEnviando(true);
    try {
      await enviarArquivosSkill(skillId, estabelecimentoId, files);
      toast.success(`${files.length} arquivo(s) anexado(s)`);
      await carregar();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar arquivos");
    } finally {
      setEnviando(false);
    }
  };

  const baixar = async (a: SkillFile) => {
    const { data, error } = await supabase.storage.from(BUCKET_SKILLS).download(a.storage_path);
    if (error || !data) return toast.error("Não foi possível baixar o arquivo");
    const url = URL.createObjectURL(data);
    const el = document.createElement("a");
    el.href = url;
    el.download = a.nome_arquivo;
    el.click();
    URL.revokeObjectURL(url);
  };

  const remover = async (a: SkillFile) => {
    await supabase.storage.from(BUCKET_SKILLS).remove([a.storage_path]);
    await db.from("aip_skill_files").delete().eq("id", a.id);
    toast.success("Arquivo removido");
    carregar();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label>Arquivos de conhecimento (.md)</Label>
          <p className="text-xs text-muted-foreground">
            Anexe vários arquivos Markdown. O agente lê a skill + estes arquivos como contexto.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild disabled={enviando}>
          <label className="cursor-pointer">
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Anexar arquivos
            <input
              type="file"
              multiple
              accept=".md,.markdown,.txt,.sh,.bash,.py,.js,.ts,.json,.yaml,.yml"
              className="hidden"
              onChange={aoSelecionar}
            />
          </label>
        </Button>
      </div>

      <div className="rounded-lg border">
        {carregando ? (
          <p className="p-3 text-sm text-muted-foreground">Carregando…</p>
        ) : arquivos.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
        ) : (
          <ul className="divide-y">
            {arquivos.map((a) => (
              <li key={a.id} className="flex items-center gap-2 p-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{a.nome_arquivo}</span>
                <Badge variant="outline">{formatarTamanho(a.tamanho_bytes)}</Badge>
                <Button size="icon" variant="ghost" onClick={() => baixar(a)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setExcluir(a)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        itemName={excluir?.nome_arquivo}
        onConfirm={async () => {
          if (excluir) await remover(excluir);
          setExcluir(null);
        }}
      />
    </div>
  );
}
