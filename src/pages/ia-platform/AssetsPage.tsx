import { useMemo, useState } from "react";
import { useAipTable } from "@/lib/aip/db";
import { AipAsset } from "@/lib/aip/types";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Download, ExternalLink, FileText, Trash2 } from "lucide-react";

const TIPOS = ["todos", "imagem", "video", "audio", "documento", "texto"];

export default function AssetsPage() {
  const { items, loading, remove } = useAipTable<AipAsset>("aip_assets");
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [excluir, setExcluir] = useState<AipAsset | null>(null);

  const filtrados = useMemo(
    () =>
      items
        .filter((a) => tipo === "todos" || a.tipo === tipo)
        .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())),
    [items, busca, tipo],
  );

  return (
    <>
      <AipToolbar
        busca={busca}
        onBusca={setBusca}
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhum asset gerado ainda."
        acoes={
          <div className="flex flex-wrap gap-1">
            {TIPOS.map((t) => (
              <Button key={t} size="sm" variant={tipo === t ? "default" : "outline"} onClick={() => setTipo(t)}>
                {t}
              </Button>
            ))}
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((a) => (
            <Card key={a.id} className="overflow-hidden transition-all hover:shadow-md">
              <div className="flex h-36 items-center justify-center bg-muted">
                {a.tipo === "imagem" && a.url ? (
                  <img src={a.url} alt={a.nome} className="h-full w-full object-cover" loading="lazy" />
                ) : a.tipo === "video" && a.url ? (
                  <video src={a.url} className="h-full w-full object-cover" controls />
                ) : a.tipo === "audio" && a.url ? (
                  <audio src={a.url} controls className="w-full px-3" />
                ) : (
                  <FileText className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <CardContent className="space-y-2 p-3">
                <p className="truncate text-sm font-medium">{a.nome}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{a.tipo}</Badge>
                  <Badge variant="outline">v{a.versao}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </p>
                <div className="flex flex-nowrap gap-1">
                  {a.url && (
                    <>
                      <Button size="sm" variant="outline" asChild>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={a.url} download={a.nome}>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setExcluir(a)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AipToolbar>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        itemName={excluir?.nome}
        onConfirm={async () => {
          if (excluir) await remove(excluir.id);
          setExcluir(null);
        }}
      />
    </>
  );
}
