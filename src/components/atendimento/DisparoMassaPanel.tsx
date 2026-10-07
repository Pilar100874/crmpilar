import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, ListOrdered, Loader2, Mail, MessageCircle, Phone,
  PhoneForwarded, Rocket, Search, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHAVE_PARAR_AO_RECEBER, lerPararAoReceber } from "@/components/atendimento/DiscadorModoDialog";
import { cn } from "@/lib/utils";

export type CanalDisparo = "whatsapp" | "email" | "telefone";
type Aba = "tudo" | "agendados" | "recebidos";
type FiltroData = "hoje" | "atrasados" | "futuros";

export interface DisparoFontes {
  /** Contatos vinculados ao usuário/equipe. */
  tudo: string[];
  /** Tarefas agendadas (contato + data yyyy-MM-dd). */
  agendados: { id: string; data?: string | null }[];
  /** Contatos com WhatsApp recebido sem resposta. */
  recebidos: string[];
  /** E-mails de remetentes com e-mail recebido sem resposta. */
  recebidosEmails: string[];
}

interface Props {
  fontes: DisparoFontes;
  onClose: () => void;
  onIniciarLigacao: (ids: string[], modo: "sequencial" | "previa") => void;
  onIniciarEnvio: (ids: string[], canal: "whatsapp" | "email") => void;
  abaInicial?: Aba;
}

interface Contato {
  id: string;
  nome: string;
  empresa: string;
  temWhats: boolean;
  temTel: boolean;
  temEmail: boolean;
  cidade: string;
  estado: string;
  tipo: string;
  categoria: string;
  prospect: string;
  usuarios: string[];
  produtos: string[];
  grupos: string[];
  emailRecebido: boolean;
}

const CANAIS: { id: CanalDisparo; label: string; desc: string; icon: typeof Phone; cor: string; fundo: string }[] = [
  { id: "whatsapp", label: "WhatsApp", desc: "Mensagens em massa com sequência de conteúdos", icon: MessageCircle, cor: "text-success", fundo: "bg-success/10" },
  { id: "email", label: "E-mail", desc: "Campanha de e-mail para os contatos escolhidos", icon: Mail, cor: "text-info", fundo: "bg-info/10" },
  { id: "telefone", label: "Telefone", desc: "Discador sequencial ou com aprovação uma a uma", icon: Phone, cor: "text-primary", fundo: "bg-primary/10" },
];

const ROTULO_TIPO: Record<string, string> = { B2B: "B2B", vendedor: "Vendedor", transportadora: "Transportadora" };
const ROTULO_STATUS: Record<string, string> = { prospect: "Prospect", cliente_ativo: "Cliente ativo", cliente_inativo: "Cliente inativo" };
const STATUS_NAO_COMPRA = new Set(["em_aberto", "perdido", "cancelado", "rascunho", "recusado"]);

function soDigitos(v?: string | null) { return (v || "").replace(/\D/g, ""); }

function FiltroMulti({ rotulo, opcoes, valor, onChange }: {
  rotulo: string; opcoes: { id: string; label: string }[]; valor: string[]; onChange: (v: string[]) => void;
}) {
  const [busca, setBusca] = useState("");
  const lista = opcoes.filter((o) => o.label.toLowerCase().includes(busca.toLowerCase()));
  const ativo = valor.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={opcoes.length === 0}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:opacity-40",
            ativo ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          {rotulo}
          {ativo && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{valor.length}</span>}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        {opcoes.length > 6 && (
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="mb-2 h-8 text-xs" />
        )}
        <div className="max-h-64 overflow-y-auto">
          {lista.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent">
              <Checkbox
                checked={valor.includes(o.id)}
                onCheckedChange={(v) => onChange(v ? [...valor, o.id] : valor.filter((x) => x !== o.id))}
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
          {lista.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">Nada encontrado</p>}
        </div>
        {ativo && (
          <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded px-2 py-1 text-left text-[11px] text-muted-foreground hover:text-foreground">
            Limpar
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function DisparoMassaPanel({ fontes, onClose, onIniciarLigacao, onIniciarEnvio, abaInicial = "tudo" }: Props) {
  const [canal, setCanal] = useState<CanalDisparo | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({});
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [busca, setBusca] = useState("");
  const [fData, setFData] = useState<FiltroData[]>([]);
  const [fTipo, setFTipo] = useState<string[]>([]);
  const [fCategoria, setFCategoria] = useState<string[]>([]);
  const [fProspect, setFProspect] = useState<string[]>([]);
  const [fUsuario, setFUsuario] = useState<string[]>([]);
  const [fLocal, setFLocal] = useState<string[]>([]);
  const [fProduto, setFProduto] = useState<string[]>([]);
  const [fGrupo, setFGrupo] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<"sequencial" | "previa">("sequencial");
  const [pararAoReceber, setPararAoReceber] = useState(lerPararAoReceber());

  const datasAgendadas = useMemo(() => {
    const m = new Map<string, string[]>();
    fontes.agendados.forEach((a) => { m.set(a.id, [...(m.get(a.id) || []), a.data || ""]); });
    return m;
  }, [fontes.agendados]);

  const chaveFontes = [fontes.tudo.length, fontes.agendados.length, fontes.recebidos.length, fontes.recebidosEmails.length].join("-");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCarregando(true);
      const ids = Array.from(new Set([...fontes.tudo, ...fontes.agendados.map((a) => a.id), ...fontes.recebidos]));
      const campos = "id, nome, telefone, tel, email, cidade, estado, empresa_id, customer_empresas ( empresa_id, is_primary )";
      const lotes: any[] = [];
      for (let i = 0; i < ids.length; i += 300) {
        const { data } = await supabase.from("customers").select(campos).in("id", ids.slice(i, i + 300));
        lotes.push(...(data || []));
      }
      const emails = Array.from(new Set(fontes.recebidosEmails.map((e) => e.toLowerCase().trim()).filter(Boolean)));
      if (emails.length) {
        const { data } = await supabase.from("customers").select(campos).in("email", emails.slice(0, 300));
        (data || []).forEach((c: any) => { if (!lotes.some((x) => x.id === c.id)) lotes.push(c); });
      }
      const idsTodos = lotes.map((c) => c.id);
      const empresaDe = (c: any) =>
        (c.customer_empresas || []).find((e: any) => e.is_primary)?.empresa_id || c.customer_empresas?.[0]?.empresa_id || c.empresa_id || null;
      const empresaIds = Array.from(new Set(lotes.map(empresaDe).filter(Boolean)));

      const [emp, vincC, vincE, orc] = await Promise.all([
        empresaIds.length
          ? supabase.from("empresas").select("id, nome, nome_fantasia, cidade, estado, tipo_cliente, status_comercial, segmentos:segmento_id ( nome )").in("id", empresaIds)
          : Promise.resolve({ data: [] as any[] }),
        idsTodos.length ? supabase.from("customer_vinculos").select("customer_id, usuario_id").in("customer_id", idsTodos) : Promise.resolve({ data: [] as any[] }),
        empresaIds.length ? supabase.from("empresa_vinculos").select("empresa_id, usuario_id, vendedor_id").in("empresa_id", empresaIds) : Promise.resolve({ data: [] as any[] }),
        idsTodos.length
          ? supabase.from("orcamentos").select("cliente_id, empresa_id, status, orcamento_itens ( produto_id, produtos:produto_id ( nome, produto_grupos:grupo_id ( nome ) ) )").in("cliente_id", idsTodos)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const empMap = new Map<string, any>(((emp as any).data || []).map((e: any) => [e.id, e]));
      const usuariosPorContato = new Map<string, Set<string>>();
      const add = (k: string, u?: string | null) => { if (!u) return; const s = usuariosPorContato.get(k) || new Set(); s.add(u); usuariosPorContato.set(k, s); };
      ((vincC as any).data || []).forEach((v: any) => add(`c:${v.customer_id}`, v.usuario_id));
      ((vincE as any).data || []).forEach((v: any) => { add(`e:${v.empresa_id}`, v.usuario_id); add(`e:${v.empresa_id}`, v.vendedor_id); });
      const compras = new Map<string, { p: Set<string>; g: Set<string> }>();
      ((orc as any).data || []).forEach((o: any) => {
        if (STATUS_NAO_COMPRA.has(o.status)) return;
        const r = compras.get(o.cliente_id) || { p: new Set<string>(), g: new Set<string>() };
        (o.orcamento_itens || []).forEach((it: any) => {
          if (it.produtos?.nome) r.p.add(it.produtos.nome);
          if (it.produtos?.produto_grupos?.nome) r.g.add(it.produtos.produto_grupos.nome);
        });
        compras.set(o.cliente_id, r);
      });

      const emailsSet = new Set(emails);
      const lista: Contato[] = lotes.map((c: any) => {
        const eid = empresaDe(c);
        const e = eid ? empMap.get(eid) : null;
        const tel = soDigitos(c.telefone);
        const fixo = soDigitos(c.tel);
        const usuarios = new Set<string>([...(usuariosPorContato.get(`c:${c.id}`) || []), ...(eid ? usuariosPorContato.get(`e:${eid}`) || [] : [])]);
        return {
          id: c.id,
          nome: c.nome || "Sem nome",
          empresa: e?.nome_fantasia || e?.nome || "",
          temWhats: tel.length >= 10,
          temTel: tel.length >= 8 || fixo.length >= 8,
          temEmail: !!c.email && String(c.email).includes("@"),
          cidade: c.cidade || e?.cidade || "",
          estado: c.estado || e?.estado || "",
          tipo: e?.tipo_cliente || "",
          categoria: e?.segmentos?.nome || "",
          prospect: e?.status_comercial || "",
          usuarios: [...usuarios],
          produtos: [...(compras.get(c.id)?.p || [])],
          grupos: [...(compras.get(c.id)?.g || [])],
          emailRecebido: !!c.email && emailsSet.has(String(c.email).toLowerCase().trim()),
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      const todosUsuarios = Array.from(new Set(lista.flatMap((c) => c.usuarios)));
      let nomes: Record<string, string> = {};
      if (todosUsuarios.length) {
        const { data } = await supabase.from("usuarios").select("id, nome").in("id", todosUsuarios);
        (data || []).forEach((u: any) => { nomes[u.id] = u.nome || "Usuário"; });
      }
      if (cancelado) return;
      setNomesUsuarios(nomes);
      setContatos(lista);
      setCarregando(false);
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFontes]);

  const recebidosSet = useMemo(() => {
    const s = new Set(fontes.recebidos);
    const emails = new Set(fontes.recebidosEmails.map((e) => e.toLowerCase().trim()));
    return { ids: s, emails };
  }, [fontes.recebidos, fontes.recebidosEmails]);
  const tudoSet = useMemo(() => new Set(fontes.tudo), [fontes.tudo]);

  const temCanal = (c: Contato, k: CanalDisparo) => (k === "whatsapp" ? c.temWhats : k === "email" ? c.temEmail : c.temTel);
  const naAba = (c: Contato, a: Aba) => {
    if (a === "agendados") return datasAgendadas.has(c.id);
    if (a === "recebidos") return recebidosSet.ids.has(c.id) || contatosEmailRecebido.has(c.id);
    return tudoSet.has(c.id);
  };
  const contatosEmailRecebido = useMemo(
    () => new Set(contatos.filter((c) => c.emailRecebido).map((c) => c.id)),
    [contatos]
  );

  const hoje = new Date().toLocaleDateString("en-CA");
  const passaData = (c: Contato) => {
    if (fData.length === 0) return true;
    const datas = datasAgendadas.get(c.id) || [];
    return datas.some((d) =>
      (fData.includes("atrasados") && d && d < hoje) ||
      (fData.includes("hoje") && d === hoje) ||
      (fData.includes("futuros") && d > hoje)
    );
  };

  const doCanal = useMemo(() => (canal ? contatos.filter((c) => temCanal(c, canal)) : []), [contatos, canal]);

  const filtrados = useMemo(() => doCanal.filter((c) => {
    if (!naAba(c, aba)) return false;
    if (busca && !`${c.nome} ${c.empresa}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (!passaData(c)) return false;
    if (fTipo.length && !fTipo.includes(c.tipo)) return false;
    if (fCategoria.length && !fCategoria.includes(c.categoria)) return false;
    if (fProspect.length && !fProspect.includes(c.prospect)) return false;
    if (fUsuario.length && !c.usuarios.some((u) => fUsuario.includes(u))) return false;
    if (fLocal.length && !fLocal.includes(`${c.cidade}/${c.estado}`) && !fLocal.includes(`UF:${c.estado}`)) return false;
    if (fProduto.length && !c.produtos.some((p) => fProduto.includes(p))) return false;
    if (fGrupo.length && !c.grupos.some((g) => fGrupo.includes(g))) return false;
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [doCanal, aba, busca, fData, fTipo, fCategoria, fProspect, fUsuario, fLocal, fProduto, fGrupo, datasAgendadas, recebidosSet, tudoSet]);

  const opcoes = (valores: string[], rotulo?: Record<string, string>) =>
    Array.from(new Set(valores.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")).map((v) => ({ id: v, label: rotulo?.[v] || v }));
  const opLocal = useMemo(() => {
    const ufs = opcoes(doCanal.map((c) => c.estado)).map((o) => ({ id: `UF:${o.id}`, label: `Estado: ${o.label}` }));
    const cidades = opcoes(doCanal.filter((c) => c.cidade).map((c) => `${c.cidade}/${c.estado}`));
    return [...ufs, ...cidades];
  }, [doCanal]);

  const totalAba = (a: Aba) => doCanal.filter((c) => naAba(c, a)).length;
  const totalCanal = (k: CanalDisparo) => contatos.filter((c) => temCanal(c, k) && (tudoSet.has(c.id) || datasAgendadas.has(c.id) || recebidosSet.ids.has(c.id) || contatosEmailRecebido.has(c.id))).length;

  const todosMarcados = filtrados.length > 0 && filtrados.every((c) => selecionados.has(c.id));
  const alternarTodos = () => setSelecionados((ant) => {
    const n = new Set(ant);
    if (todosMarcados) filtrados.forEach((c) => n.delete(c.id)); else filtrados.forEach((c) => n.add(c.id));
    return n;
  });
  const alternar = (id: string) => setSelecionados((ant) => { const n = new Set(ant); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const limparFiltros = () => { setFData([]); setFTipo([]); setFCategoria([]); setFProspect([]); setFUsuario([]); setFLocal([]); setFProduto([]); setFGrupo([]); setBusca(""); };
  const temFiltro = fData.length + fTipo.length + fCategoria.length + fProspect.length + fUsuario.length + fLocal.length + fProduto.length + fGrupo.length > 0 || !!busca;

  const escolherCanal = (k: CanalDisparo) => { setCanal(k); setSelecionados(new Set()); };

  const iniciar = () => {
    const ids = [...selecionados];
    if (!canal || ids.length === 0) return;
    if (canal === "telefone") onIniciarLigacao(ids, modo);
    else onIniciarEnvio(ids, canal);
  };

  const cfgCanal = CANAIS.find((c) => c.id === canal);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Cabeçalho */}
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {canal && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCanal(null)} aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">Disparo em massa</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {canal ? `${cfgCanal?.label} · escolha os contatos e inicie` : "Escolha o canal do disparo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(["canal", "contatos"] as const).map((etapa, i) => {
            const ativa = (etapa === "canal" && !canal) || (etapa === "contatos" && !!canal);
            return (
              <span key={etapa} className={cn("hidden h-6 items-center gap-1 rounded-full px-2 text-[10px] font-semibold sm:flex", ativa ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {i + 1} {etapa === "canal" ? "Canal" : "Contatos"}
              </span>
            );
          })}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!canal ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
            {CANAIS.map((k) => {
              const Icone = k.icon;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => escolherCanal(k.id)}
                  className="group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg animate-fade-in"
                >
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", k.fundo)}>
                    <Icone className={cn("h-6 w-6", k.cor)} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{k.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{k.desc}</p>
                  </div>
                  <div className="mt-auto flex w-full items-end justify-between">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {carregando ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : totalCanal(k.id)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">contatos com {k.label.toLowerCase()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="flex-shrink-0 space-y-2 border-b border-border/40 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["tudo", "agendados", "recebidos"] as Aba[]).map((a) => {
                const ativo = aba === a;
                const total = totalAba(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setAba(a); setSelecionados(new Set()); }}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                      ativo ? "bg-primary/10 font-semibold text-primary" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    {a === "tudo" ? "Tudo" : a === "agendados" ? "Agendados" : "Recebidos"}
                    <span className={cn("flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold", ativo ? "bg-primary text-primary-foreground" : "bg-background text-foreground/70")}>
                      {total}
                    </span>
                  </button>
                );
              })}
              <div className="relative ml-auto w-full sm:w-52">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar contato ou empresa" className="h-8 pl-8 text-xs" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <FiltroMulti rotulo="Data da tarefa" valor={fData} onChange={(v) => setFData(v as FiltroData[])}
                opcoes={[{ id: "atrasados", label: "Atrasados" }, { id: "hoje", label: "Hoje" }, { id: "futuros", label: "Próximos dias" }]} />
              <FiltroMulti rotulo="Tipo" valor={fTipo} onChange={setFTipo} opcoes={opcoes(doCanal.map((c) => c.tipo), ROTULO_TIPO)} />
              <FiltroMulti rotulo="Categoria" valor={fCategoria} onChange={setFCategoria} opcoes={opcoes(doCanal.map((c) => c.categoria))} />
              <FiltroMulti rotulo="Categoria de prospect" valor={fProspect} onChange={setFProspect} opcoes={opcoes(doCanal.map((c) => c.prospect), ROTULO_STATUS)} />
              <FiltroMulti rotulo="Vendedor" valor={fUsuario} onChange={setFUsuario}
                opcoes={opcoes(doCanal.flatMap((c) => c.usuarios)).map((o) => ({ id: o.id, label: nomesUsuarios[o.id] || "Usuário" }))} />
              <FiltroMulti rotulo="Cidade/Estado" valor={fLocal} onChange={setFLocal} opcoes={opLocal} />
              <FiltroMulti rotulo="Produtos comprados" valor={fProduto} onChange={setFProduto} opcoes={opcoes(doCanal.flatMap((c) => c.produtos))} />
              <FiltroMulti rotulo="Grupos de produto" valor={fGrupo} onChange={setFGrupo} opcoes={opcoes(doCanal.flatMap((c) => c.grupos))} />
              {temFiltro && (
                <button type="button" onClick={limparFiltros} className="h-8 rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Seleção */}
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border/40 bg-muted/30 px-4 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <Checkbox checked={todosMarcados} onCheckedChange={alternarTodos} disabled={filtrados.length === 0} />
              Selecionar todos ({filtrados.length})
            </label>
            <span className="text-[11px] text-muted-foreground">
              {selecionados.size} selecionado{selecionados.size === 1 ? "" : "s"}
              {selecionados.size > 0 && (
                <button type="button" onClick={() => setSelecionados(new Set())} className="ml-2 underline hover:text-foreground">limpar</button>
              )}
            </span>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando contatos...
              </div>
            ) : filtrados.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">Nenhum contato com {cfgCanal?.label.toLowerCase()} nesses filtros.</p>
            ) : (
              filtrados.map((c) => {
                const marcado = selecionados.has(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn("flex cursor-pointer items-center gap-3 border-b border-border/20 px-4 py-2.5 transition-colors", marcado ? "bg-primary/[0.06]" : "hover:bg-muted/40")}
                  >
                    <Checkbox checked={marcado} onCheckedChange={() => alternar(c.id)} />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground/70">
                      {c.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{c.nome}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[c.empresa, c.cidade && `${c.cidade}${c.estado ? `/${c.estado}` : ""}`].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="hidden items-center gap-1 sm:flex">
                      {c.tipo && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{ROTULO_TIPO[c.tipo] || c.tipo}</span>}
                      {c.prospect && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{ROTULO_STATUS[c.prospect] || c.prospect}</span>}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Início */}
          <div className="flex-shrink-0 border-t border-border/40 bg-card py-3 pl-4 pr-16">
            {canal === "telefone" && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {([
                  { id: "sequencial", label: "Discagem sequencial", icon: ListOrdered, desc: "Liga um após o outro" },
                  { id: "previa", label: "Aprovação uma a uma", icon: PhoneForwarded, desc: "Você confirma cada ligação" },
                ] as const).map((m) => {
                  const Icone = m.icon;
                  const ativo = modo === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModo(m.id)}
                      className={cn(
                        "flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                        ativo ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50"
                      )}
                    >
                      <Icone className={cn("h-4 w-4", ativo ? "text-primary" : "text-muted-foreground")} />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-foreground">{m.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{m.desc}</span>
                      </span>
                      {ativo && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Switch checked={pararAoReceber} onCheckedChange={(v) => { setPararAoReceber(v); localStorage.setItem(CHAVE_PARAR_AO_RECEBER, v ? "1" : "0"); }} />
                  Parar ao receber ligação
                </label>
              </div>
            )}
            <Button className="h-11 w-full gap-2 text-sm font-semibold" disabled={selecionados.size === 0} onClick={iniciar}>
              <Rocket className="h-4 w-4" />
              {selecionados.size === 0
                ? "Selecione os contatos"
                : canal === "telefone"
                  ? `Iniciar ligações (${selecionados.size})`
                  : `Continuar para a mensagem (${selecionados.size})`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
