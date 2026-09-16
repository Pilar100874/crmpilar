import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCatalogoPermissoes, getMapaPais, idsDoRamo, type NoPermissao } from "@/lib/permissoes/catalogo";

export interface MenuPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export const ACOES = ["view", "create", "edit", "delete"] as const;
export type Acao = (typeof ACOES)[number];

export const ACAO_LABEL: Record<Acao, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
};

const VAZIO: MenuPermissions = { view: false, create: false, edit: false, delete: false };

interface ArvorePermissoesProps {
  valor: Record<string, MenuPermissions>;
  onChange: (valor: Record<string, MenuPermissions>) => void;
}

const correspondeBusca = (no: NoPermissao, termo: string): boolean => {
  if (!termo) return true;
  if (no.label.toLocaleLowerCase("pt-BR").includes(termo)) return true;
  return no.filhos.some((f) => correspondeBusca(f, termo));
};

export function ArvorePermissoes({ valor, onChange }: ArvorePermissoesProps) {
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  const termo = busca.trim().toLocaleLowerCase("pt-BR");

  const catalogoFiltrado = useMemo(
    () => getCatalogoPermissoes().filter((no) => correspondeBusca(no, termo)),
    [termo]
  );

  const permissaoDe = (id: string) => valor[id] || VAZIO;

  const aplicar = (ids: string[], acao: Acao, ligar: boolean) => {
    const novo = { ...valor };
    for (const id of ids) {
      const atual = novo[id] || { ...VAZIO };
      const proximo: MenuPermissions = { ...atual, [acao]: ligar };
      if (ligar && acao !== "view") proximo.view = true;
      if (!ligar && acao === "view") {
        proximo.create = false;
        proximo.edit = false;
        proximo.delete = false;
      }
      if (!proximo.view && !proximo.create && !proximo.edit && !proximo.delete) {
        delete novo[id];
      } else {
        novo[id] = proximo;
      }
    }
    if (ligar) {
      // garante que os pais fiquem visíveis
      for (const id of ids) {
        let pai = getMapaPais()[id];
        while (pai) {
          novo[pai] = { ...(novo[pai] || { ...VAZIO }), view: true };
          pai = getMapaPais()[pai];
        }
      }
    }
    onChange(novo);
  };

  const alternarNo = (no: NoPermissao, acao: Acao, comFilhos: boolean) => {
    const ligado = permissaoDe(no.id)[acao];
    const ids = comFilhos ? idsDoRamo(no) : [no.id];
    aplicar(ids, acao, !ligado);
  };

  const contarLiberados = (no: NoPermissao) =>
    idsDoRamo(no).filter((id) => valor[id]?.view).length;

  const renderLinha = (no: NoPermissao, profundidade: number) => {
    const temFilhos = no.filhos.length > 0;
    const aberto = abertos[no.id] ?? (profundidade === 0 ? false : true);
    const filhosVisiveis = no.filhos.filter((f) => correspondeBusca(f, termo));
    const perm = permissaoDe(no.id);
    const liberados = contarLiberados(no);

    return (
      <div key={no.id} className="border-b last:border-b-0">
        <div
          className="flex flex-col gap-2 py-2 pr-2 sm:flex-row sm:items-center sm:justify-between"
          style={{ paddingLeft: `${profundidade * 16 + 8}px` }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {temFilhos ? (
              <button
                type="button"
                onClick={() => setAbertos((p) => ({ ...p, [no.id]: !aberto }))}
                className="rounded p-0.5 hover:bg-muted"
                aria-label={aberto ? "Recolher" : "Expandir"}
              >
                {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span
              className={`truncate text-sm ${
                profundidade === 0 ? "font-semibold" : profundidade === 1 ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {no.label}
            </span>
            {no.nivel === "modulo" && (
              <Badge variant="outline" className="h-5 shrink-0 text-[10px]">
                módulo
              </Badge>
            )}
            {temFilhos && liberados > 0 && (
              <Badge variant="secondary" className="h-5 shrink-0 text-[10px]">
                {liberados}
              </Badge>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {ACOES.map((acao) => (
              <label key={acao} className="flex cursor-pointer select-none items-center gap-1">
                <Checkbox
                  checked={perm[acao]}
                  onCheckedChange={() => alternarNo(no, acao, false)}
                  className="h-4 w-4"
                  aria-label={`${ACAO_LABEL[acao]} — ${no.label}`}
                />
                <span className="text-xs text-muted-foreground">{ACAO_LABEL[acao]}</span>
              </label>
            ))}
            {temFilhos && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => aplicar(idsDoRamo(no), "view", !perm.view)}
              >
                {perm.view ? "Desmarcar tudo" : "Marcar tudo"}
              </Button>
            )}
          </div>
        </div>

        {temFilhos && (aberto || termo) && (
          <div>{filhosVisiveis.map((filho) => renderLinha(filho, profundidade + 1))}</div>
        )}
      </div>
    );
  };

  const marcarColuna = (acao: Acao, ligar: boolean) => {
    const todos = getCatalogoPermissoes().flatMap((no) => idsDoRamo(no));
    aplicar(todos, acao, ligar);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar menu, submenu ou módulo"
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1">
          {ACOES.map((acao) => (
            <Button
              key={acao}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => marcarColuna(acao, true)}
            >
              Tudo: {ACAO_LABEL[acao]}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange({})}
          >
            Limpar
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[420px] rounded-lg border">
        <div>{catalogoFiltrado.map((no) => renderLinha(no, 0))}</div>
      </ScrollArea>
    </div>
  );
}
