import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Save, Search, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCatalogoPermissoes, getMapaPais, idsDoRamo, type NoPermissao } from "@/lib/permissoes/catalogo";
import { ACAO_LABEL, ACOES, type Acao, type MenuPermissions } from "./ArvorePermissoes";

export interface GrupoPermissoes {
  id: string;
  nome: string;
  perfil?: string;
  menus_permitidos: Record<string, MenuPermissions>;
}

interface Props {
  grupos: GrupoPermissoes[];
  valores: Record<string, Record<string, MenuPermissions>>;
  alterados: Set<string>;
  salvando: boolean;
  onChange: (grupoId: string, valor: Record<string, MenuPermissions>) => void;
  onSalvar: () => void;
  onDescartar: () => void;
}

const VAZIO: MenuPermissions = { view: false, create: false, edit: false, delete: false };

const corresponde = (no: NoPermissao, termo: string): boolean =>
  !termo || no.label.toLocaleLowerCase("pt-BR").includes(termo) || no.filhos.some((filho) => corresponde(filho, termo));

export function GerenciadorPermissoesGrupos({ grupos, valores, alterados, salvando, onChange, onSalvar, onDescartar }: Props) {
  const [buscaItem, setBuscaItem] = useState("");
  const [buscaGrupo, setBuscaGrupo] = useState("");
  const [selecionado, setSelecionado] = useState<NoPermissao | null>(null);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [origem, setOrigem] = useState("");
  const [destinos, setDestinos] = useState<Set<string>>(new Set());
  const [modoCopia, setModoCopia] = useState<"substituir" | "acrescentar">("substituir");
  const [confirmarCopia, setConfirmarCopia] = useState(false);

  const termoItem = buscaItem.trim().toLocaleLowerCase("pt-BR");
  const termoGrupo = buscaGrupo.trim().toLocaleLowerCase("pt-BR");
  const catalogo = useMemo(() => getCatalogoPermissoes().filter((no) => corresponde(no, termoItem)), [termoItem]);
  const gruposVisiveis = useMemo(
    () => grupos.filter((grupo) => grupo.nome.toLocaleLowerCase("pt-BR").includes(termoGrupo)),
    [grupos, termoGrupo],
  );

  const permissao = (grupoId: string, itemId: string) => valores[grupoId]?.[itemId] || VAZIO;

  const aplicar = (grupoId: string, ids: string[], acao: Acao, ligar: boolean) => {
    const novo = { ...(valores[grupoId] || {}) };
    for (const id of ids) {
      const atual = novo[id] || { ...VAZIO };
      const proximo = { ...atual, [acao]: ligar };
      if (ligar && acao !== "view") proximo.view = true;
      if (!ligar && acao === "view") Object.assign(proximo, VAZIO);
      if (Object.values(proximo).every((valor) => !valor)) delete novo[id];
      else novo[id] = proximo;
    }
    if (ligar) {
      for (const id of ids) {
        let pai = getMapaPais()[id];
        while (pai) {
          novo[pai] = { ...(novo[pai] || VAZIO), view: true };
          pai = getMapaPais()[pai];
        }
      }
    }
    onChange(grupoId, novo);
  };

  const aplicarTodosGrupos = (acao: Acao, ligar: boolean) => {
    if (!selecionado) return;
    for (const grupo of gruposVisiveis) aplicar(grupo.id, [selecionado.id], acao, ligar);
  };

  const executarCopia = () => {
    const permissoesOrigem = valores[origem] || {};
    for (const destino of destinos) {
      if (modoCopia === "substituir") onChange(destino, structuredClone(permissoesOrigem));
      else {
        const combinado = { ...(valores[destino] || {}) };
        for (const [id, perm] of Object.entries(permissoesOrigem)) {
          const atual = combinado[id] || VAZIO;
          combinado[id] = {
            view: atual.view || perm.view,
            create: atual.create || perm.create,
            edit: atual.edit || perm.edit,
            delete: atual.delete || perm.delete,
          };
        }
        onChange(destino, combinado);
      }
    }
    setConfirmarCopia(false);
    setDestinos(new Set());
  };

  const renderNo = (no: NoPermissao, profundidade: number) => {
    const filhos = no.filhos.filter((filho) => corresponde(filho, termoItem));
    const aberto = abertos[no.id] ?? Boolean(termoItem);
    return (
      <div key={no.id}>
        <div className="flex items-center gap-1" style={{ paddingLeft: `${profundidade * 14}px` }}>
          {no.filhos.length > 0 ? (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setAbertos((atual) => ({ ...atual, [no.id]: !aberto }))} aria-label={aberto ? "Recolher" : "Expandir"}>
              {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : <span className="w-7" />}
          <Button
            type="button"
            variant={selecionado?.id === no.id ? "secondary" : "ghost"}
            className="h-auto min-h-8 flex-1 justify-start whitespace-normal px-2 py-1 text-left text-xs"
            onClick={() => setSelecionado(no)}
          >
            {no.label}
          </Button>
        </div>
        {no.filhos.length > 0 && aberto && filhos.map((filho) => renderNo(filho, profundidade + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-semibold">Gerenciar permissões</h3>
          <p className="text-sm text-muted-foreground">Escolha um item e compare as liberações de todos os grupos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onDescartar} disabled={alterados.size === 0 || salvando}>
            <Undo2 className="h-4 w-4" /> Descartar
          </Button>
          <Button type="button" onClick={onSalvar} disabled={alterados.size === 0 || salvando}>
            <Save className="h-4 w-4" /> {salvando ? "Salvando..." : `Salvar alterações${alterados.size ? ` (${alterados.size})` : ""}`}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={buscaItem} onChange={(e) => setBuscaItem(e.target.value)} placeholder="Buscar menu ou módulo" className="pl-9" />
            </div>
          </div>
          <ScrollArea className="h-[520px] p-2">{catalogo.map((no) => renderNo(no, 0))}</ScrollArea>
        </div>

        <div className="min-w-0 space-y-3 rounded-lg border bg-card p-3">
          {!selecionado ? (
            <div className="flex h-[520px] items-center justify-center text-center text-sm text-muted-foreground">Selecione um menu, submenu ou módulo na árvore.</div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
                <div><p className="font-semibold">{selecionado.label}</p><p className="text-xs text-muted-foreground">{selecionado.nivel === "modulo" ? "Módulo interno" : selecionado.nivel === "submenu" ? "Submenu" : "Menu"}</p></div>
                <div className="relative w-full md:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={buscaGrupo} onChange={(e) => setBuscaGrupo(e.target.value)} placeholder="Buscar grupo" className="pl-9" /></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead><tr className="border-b"><th className="p-2 text-left font-medium">Grupo</th>{ACOES.map((acao) => <th key={acao} className="p-2 text-center font-medium"><button type="button" className="hover:text-primary" onClick={() => aplicarTodosGrupos(acao, true)}>{ACAO_LABEL[acao]}</button></th>)}<th className="p-2 text-right font-medium">Ramo</th></tr></thead>
                  <tbody>{gruposVisiveis.map((grupo) => {
                    const perm = permissao(grupo.id, selecionado.id);
                    const admin = grupo.perfil === "admin";
                    return <tr key={grupo.id} className="border-b last:border-0"><td className="p-2"><div className="font-medium">{grupo.nome}</div><div className="text-xs text-muted-foreground">{admin ? "Acesso total" : alterados.has(grupo.id) ? "Alterado" : "Sem alterações"}</div></td>{ACOES.map((acao) => <td key={acao} className="p-2 text-center"><Checkbox checked={admin || perm[acao]} disabled={admin} onCheckedChange={(valor) => aplicar(grupo.id, [selecionado.id], acao, valor === true)} aria-label={`${ACAO_LABEL[acao]} — ${selecionado.label} — ${grupo.nome}`} /></td>)}<td className="p-2 text-right"><Button type="button" variant="ghost" size="sm" disabled={admin} onClick={() => aplicar(grupo.id, idsDoRamo(selecionado), "view", !perm.view)}>{perm.view ? "Remover ramo" : "Liberar ramo"}</Button></td></tr>;
                  })}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2"><Copy className="h-4 w-4 text-primary" /><h3 className="font-semibold">Copiar permissões entre grupos</h3></div>
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_240px_auto] lg:items-end">
          <div className="space-y-1.5"><Label>Grupo modelo</Label><Select value={origem} onValueChange={(valor) => { setOrigem(valor); setDestinos(new Set()); }}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{grupos.map((grupo) => <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Grupos de destino</Label><div className="flex min-h-10 flex-wrap gap-3 rounded-md border p-2">{grupos.filter((grupo) => grupo.id !== origem && grupo.perfil !== "admin").map((grupo) => <label key={grupo.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={destinos.has(grupo.id)} onCheckedChange={(marcado) => setDestinos((atuais) => { const novos = new Set(atuais); if (marcado) novos.add(grupo.id); else novos.delete(grupo.id); return novos; })} />{grupo.nome}</label>)}</div></div>
          <RadioGroup value={modoCopia} onValueChange={(valor) => setModoCopia(valor as "substituir" | "acrescentar")} className="flex gap-4 rounded-md border p-3"><label className="flex items-center gap-2 text-sm"><RadioGroupItem value="substituir" />Substituir</label><label className="flex items-center gap-2 text-sm"><RadioGroupItem value="acrescentar" />Acrescentar</label></RadioGroup>
          <Button type="button" variant="outline" disabled={!origem || destinos.size === 0} onClick={() => setConfirmarCopia(true)}><Copy className="h-4 w-4" /> Aplicar cópia</Button>
        </div>
      </div>

      <AlertDialog open={confirmarCopia} onOpenChange={setConfirmarCopia}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Aplicar permissões do grupo modelo?</AlertDialogTitle><AlertDialogDescription>{modoCopia === "substituir" ? "As permissões atuais dos grupos selecionados serão substituídas." : "As permissões do modelo serão acrescentadas sem remover liberações existentes."} A alteração ficará pendente até você clicar em Salvar alterações.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={executarCopia}>Aplicar aos {destinos.size} grupos</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}