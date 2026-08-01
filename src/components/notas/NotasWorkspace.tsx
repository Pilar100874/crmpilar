import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  FileText,
  Link2,
  Plus,
  Save,
  Search,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNotas, type Nota } from "@/hooks/useNotas";
import { normalizarTitulo, resumoNota } from "@/lib/notas/wikilinks";
import { NotaMarkdown } from "./NotaMarkdown";

interface NotasWorkspaceProps {
  entidadeTipo?: "empresa" | "contato" | "kb_artigo";
  entidadeId?: string | null;
  entidadeNome?: string;
  className?: string;
}

export function NotasWorkspace({ entidadeTipo, entidadeId, entidadeNome, className }: NotasWorkspaceProps) {
  const { notas, loading, salvarNota, excluirNota, alternarFavorito, backlinksDe, saidasDe } = useNotas({
    entidadeTipo,
    entidadeId,
  });

  const [busca, setBusca] = useState("");
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluirAlvo, setExcluirAlvo] = useState<Nota | null>(null);

  const selecionada = useMemo(() => notas.find((n) => n.id === selecionadaId) || null, [notas, selecionadaId]);

  const todasTags = useMemo(() => {
    const set = new Set<string>();
    notas.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notas]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return notas
      .filter((n) => (tagFiltro ? n.tags.includes(tagFiltro) : true))
      .filter((n) =>
        termo ? n.titulo.toLowerCase().includes(termo) || n.conteudo.toLowerCase().includes(termo) : true
      )
      .sort((a, b) => Number(b.favorito) - Number(a.favorito));
  }, [notas, busca, tagFiltro]);

  const abrirNota = (nota: Nota) => {
    setSelecionadaId(nota.id);
    setTitulo(nota.titulo);
    setConteudo(nota.conteudo);
    setEditando(false);
  };

  const novaNota = (tituloInicial = "") => {
    setSelecionadaId(null);
    setTitulo(tituloInicial || (entidadeNome ? `Nota — ${entidadeNome}` : ""));
    setConteudo("");
    setEditando(true);
  };

  const abrirPorTitulo = (alvo: string) => {
    const encontrada = notas.find((n) => normalizarTitulo(n.titulo) === normalizarTitulo(alvo));
    if (encontrada) abrirNota(encontrada);
    else novaNota(alvo);
  };

  const salvar = async () => {
    if (!titulo.trim()) {
      toast.error("Informe um título para a nota");
      return;
    }
    setSalvando(true);
    try {
      const id = await salvarNota({
        id: selecionadaId ?? undefined,
        titulo,
        conteudo,
        entidade_tipo: entidadeTipo ?? null,
        entidade_id: entidadeId ?? null,
        favorito: selecionada?.favorito ?? false,
      });
      setSelecionadaId(id);
      setEditando(false);
      toast.success("Nota salva");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar nota");
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!excluirAlvo) return;
    try {
      await excluirNota(excluirAlvo.id);
      if (selecionadaId === excluirAlvo.id) {
        setSelecionadaId(null);
        setTitulo("");
        setConteudo("");
      }
      toast.success("Nota excluída");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir nota");
    } finally {
      setExcluirAlvo(null);
    }
  };

  const backlinks = backlinksDe(selecionada);
  const saidas = saidasDe(selecionada);

  return (
    <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_240px]", className)}>
      {/* Lista */}
      <Card className="flex min-h-[320px] flex-col overflow-hidden">
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar notas..."
              className="pl-8"
            />
          </div>
          <Button size="sm" className="w-full" onClick={() => novaNota()}>
            <Plus className="mr-1 h-4 w-4" /> Nova nota
          </Button>
          {todasTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {todasTags.map((t) => (
                <Badge
                  key={t}
                  variant={tagFiltro === t ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setTagFiltro(tagFiltro === t ? null : t)}
                >
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {loading && <p className="p-2 text-sm text-muted-foreground">Carregando...</p>}
            {!loading && filtradas.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">Nenhuma nota encontrada.</p>
            )}
            {filtradas.map((n) => (
              <button
                key={n.id}
                onClick={() => abrirNota(n)}
                className={cn(
                  "w-full rounded-md border border-transparent p-2 text-left transition-colors hover:bg-muted",
                  selecionadaId === n.id && "border-primary/40 bg-muted"
                )}
              >
                <div className="flex items-center gap-1">
                  {n.favorito && <Star className="h-3 w-3 fill-current text-amber-500" />}
                  <span className="truncate text-sm font-medium">{n.titulo}</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{resumoNota(n.conteudo, 90)}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Editor / leitura */}
      <Card className="flex min-h-[320px] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Input
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              setEditando(true);
            }}
            placeholder="Título da nota"
            className="h-9 flex-1 min-w-[160px] font-medium"
          />
          {selecionada && (
            <Button
              variant="ghost"
              size="icon"
              title="Favoritar"
              onClick={() => alternarFavorito(selecionada)}
            >
              <Star className={cn("h-4 w-4", selecionada.favorito && "fill-current text-amber-500")} />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditando((v) => !v)}>
            <ArrowLeftRight className="mr-1 h-4 w-4" />
            {editando ? "Visualizar" : "Editar"}
          </Button>
          <Button size="sm" onClick={salvar} disabled={salvando}>
            <Save className="mr-1 h-4 w-4" /> Salvar
          </Button>
          {selecionada && (
            <Button variant="ghost" size="icon" onClick={() => setExcluirAlvo(selecionada)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3">
          {editando ? (
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder={"Escreva em Markdown.\nUse [[Nome da outra nota]] para criar links e #tag para etiquetar."}
              className="min-h-[280px] resize-none font-mono text-sm"
            />
          ) : (
            <NotaMarkdown
              conteudo={conteudo}
              onAbrirLink={abrirPorTitulo}
              linkExiste={(t) => notas.some((n) => normalizarTitulo(n.titulo) === normalizarTitulo(t))}
            />
          )}
        </div>

        {selecionada && selecionada.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t p-2">
            {selecionada.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                <Tag className="mr-1 h-3 w-3" />
                {t}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Relações */}
      <Card className="flex min-h-[200px] flex-col overflow-hidden">
        <div className="border-b p-3">
          <h3 className="flex items-center gap-1 text-sm font-semibold">
            <Link2 className="h-4 w-4" /> Conexões
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Menções ({backlinks.length})</p>
              {backlinks.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma menção ainda.</p>}
              {backlinks.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrirNota(n)}
                  className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-sm hover:bg-muted"
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{n.titulo}</span>
                </button>
              ))}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Links de saída ({saidas.length})</p>
              {saidas.length === 0 && <p className="text-xs text-muted-foreground">Use [[título]] no texto.</p>}
              {saidas.map((s) => (
                <button
                  key={s.titulo}
                  onClick={() => abrirPorTitulo(s.titulo)}
                  className={cn(
                    "flex w-full items-center gap-1 rounded px-1 py-1 text-left text-sm hover:bg-muted",
                    !s.nota && "text-muted-foreground italic"
                  )}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{s.titulo}</span>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </Card>

      <DeleteConfirmDialog
        open={!!excluirAlvo}
        onOpenChange={(o) => !o && setExcluirAlvo(null)}
        onConfirm={confirmarExclusao}
        itemName={excluirAlvo?.titulo}
      />
    </div>
  );
}
