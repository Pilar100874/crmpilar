import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Save, Search, ShieldCheck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [copiarAberto, setCopiarAberto] = useState(false);

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
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="sticky top-0 z-20 flex flex-col gap-4 border-b bg-card/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold sm:text-lg">Gestão de permissões</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">Selecione um recurso e compare os acessos entre os grupos.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onDescartar} disabled={alterados.size === 0 || salvando}>
            <Undo2 className="h-4 w-4" /> Descartar
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={onSalvar} disabled={alterados.size === 0 || salvando}>
            <Save className="h-4 w-4" /> {salvando ? "Salvando..." : "Salvar"}
            {alterados.size > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center px-1.5">{alterados.size}</Badge>}
          </Button>
        </div>
      </div>

      <div className="grid min-h-[540px] lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b bg-muted/20 lg:border-b-0 lg:border-r">
          <div className="border-b p-3 sm:p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Menus e módulos</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={buscaItem} onChange={(e) => setBuscaItem(e.target.value)} placeholder="Buscar recurso" className="bg-background pl-9" />
            </div>
          </div>
          <ScrollArea className="h-[260px] p-2 sm:h-[320px] lg:h-[475px]">{catalogo.map((no) => renderNo(no, 0))}</ScrollArea>
        </aside>

        <section className="min-w-0 bg-card">
          {!selecionado ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground lg:h-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted"><ShieldCheck className="h-6 w-6" /></div>
              <span>Selecione um menu, submenu ou módulo para configurar os grupos.</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div><div className="flex items-center gap-2"><p className="font-semibold">{selecionado.label}</p><Badge variant="outline" className="font-normal">{selecionado.nivel === "modulo" ? "Módulo" : selecionado.nivel === "submenu" ? "Submenu" : "Menu"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Defina o que cada grupo pode fazer neste recurso.</p></div>
                <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={buscaGrupo} onChange={(e) => setBuscaGrupo(e.target.value)} placeholder="Buscar grupo" className="pl-9" /></div>
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40"><tr className="border-b"><th className="p-4 text-left text-xs font-semibold uppercase text-muted-foreground">Grupo</th>{ACOES.map((acao) => <th key={acao} className="w-20 p-3 text-center text-xs font-semibold uppercase text-muted-foreground"><Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => aplicarTodosGrupos(acao, true)}>{ACAO_LABEL[acao]}</Button></th>)}<th className="w-32 p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Ramo</th></tr></thead>
                  <tbody>{gruposVisiveis.map((grupo) => {
                    const perm = permissao(grupo.id, selecionado.id);
                    const admin = grupo.perfil === "admin";
                    return <tr key={grupo.id} className="border-b transition-colors last:border-0 hover:bg-muted/30"><td className="p-4"><div className="flex items-center gap-2"><div className="font-medium">{grupo.nome}</div>{alterados.has(grupo.id) && <span className="h-2 w-2 rounded-full bg-primary" />}</div><div className="text-xs text-muted-foreground">{admin ? "Acesso total" : alterados.has(grupo.id) ? "Alteração pendente" : "Sem alterações"}</div></td>{ACOES.map((acao) => <td key={acao} className="p-3 text-center"><Checkbox checked={admin || perm[acao]} disabled={admin} className="h-5 w-5" onCheckedChange={(valor) => aplicar(grupo.id, [selecionado.id], acao, valor === true)} aria-label={`${ACAO_LABEL[acao]} — ${selecionado.label} — ${grupo.nome}`} /></td>)}<td className="p-3 text-right"><Button type="button" variant="ghost" size="sm" disabled={admin} onClick={() => aplicar(grupo.id, idsDoRamo(selecionado), "view", !perm.view)}>{perm.view ? "Remover" : "Liberar"}</Button></td></tr>;
                  })}</tbody>
                </table>
              </div>
              <div className="space-y-3 p-3 sm:hidden">{gruposVisiveis.map((grupo) => {
                const perm = permissao(grupo.id, selecionado.id);
                const admin = grupo.perfil === "admin";
                return <div key={grupo.id} className="rounded-md border bg-background p-3 shadow-sm"><div className="mb-3 flex items-center justify-between gap-2"><div><div className="flex items-center gap-2 font-medium">{grupo.nome}{alterados.has(grupo.id) && <span className="h-2 w-2 rounded-full bg-primary" />}</div><p className="text-xs text-muted-foreground">{admin ? "Acesso total" : alterados.has(grupo.id) ? "Alteração pendente" : "Sem alterações"}</p></div><Button type="button" variant="outline" size="sm" disabled={admin} onClick={() => aplicar(grupo.id, idsDoRamo(selecionado), "view", !perm.view)}>{perm.view ? "Remover ramo" : "Liberar ramo"}</Button></div><div className="grid grid-cols-2 gap-2">{ACOES.map((acao) => <label key={acao} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-muted/50 px-3 text-sm"><Checkbox checked={admin || perm[acao]} disabled={admin} className="h-5 w-5" onCheckedChange={(valor) => aplicar(grupo.id, [selecionado.id], acao, valor === true)} />{ACAO_LABEL[acao]}</label>)}</div></div>;
              })}</div>
            </>
          )}
        </section>
      </div>

      <div className="space-y-4 border-t bg-muted/20 p-4 sm:p-5">
        <div><div className="flex items-center gap-2"><Copy className="h-4 w-4 text-primary" /><h3 className="font-semibold">Copiar permissões</h3></div><p className="mt-1 text-xs text-muted-foreground">Use um grupo como modelo para configurar outros rapidamente.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_minmax(260px,1fr)_220px_auto] xl:items-end">
          <div className="space-y-1.5"><Label>Grupo modelo</Label><Select value={origem} onValueChange={(valor) => { setOrigem(valor); setDestinos(new Set()); }}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{grupos.map((grupo) => <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Grupos de destino</Label><div className="flex min-h-10 flex-wrap gap-3 rounded-md border p-2">{grupos.filter((grupo) => grupo.id !== origem && grupo.perfil !== "admin").map((grupo) => <label key={grupo.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={destinos.has(grupo.id)} onCheckedChange={(marcado) => setDestinos((atuais) => { const novos = new Set(atuais); if (marcado) novos.add(grupo.id); else novos.delete(grupo.id); return novos; })} />{grupo.nome}</label>)}</div></div>
          <RadioGroup value={modoCopia} onValueChange={(valor) => setModoCopia(valor as "substituir" | "acrescentar")} className="grid grid-cols-2 gap-2 rounded-md border bg-background p-2"><label className="flex min-h-9 items-center gap-2 rounded px-2 text-sm"><RadioGroupItem value="substituir" />Substituir</label><label className="flex min-h-9 items-center gap-2 rounded px-2 text-sm"><RadioGroupItem value="acrescentar" />Acrescentar</label></RadioGroup>
          <Button type="button" variant="outline" className="w-full" disabled={!origem || destinos.size === 0} onClick={() => setConfirmarCopia(true)}><Copy className="h-4 w-4" /> Aplicar cópia</Button>
        </div>
      </div>

      <AlertDialog open={confirmarCopia} onOpenChange={setConfirmarCopia}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Aplicar permissões do grupo modelo?</AlertDialogTitle><AlertDialogDescription>{modoCopia === "substituir" ? "As permissões atuais dos grupos selecionados serão substituídas." : "As permissões do modelo serão acrescentadas sem remover liberações existentes."} A alteração ficará pendente até você clicar em Salvar alterações.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={executarCopia}>Aplicar aos {destinos.size} grupos</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}