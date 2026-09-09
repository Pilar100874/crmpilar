import { useCallback, useEffect, useRef, useState } from "react";
import {
  Move, Plus, Check, Pencil, Trash2, Grid3X3, MousePointer2, Monitor,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Lock, Unlock, Layers, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
  Eye, EyeOff, Minus, Maximize2, Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import BlocoCard from "@/components/automacao/BlocoCard";
import BlocoEditorDialog from "@/components/automacao/BlocoEditorDialog";
import AmbienteDialog from "@/components/automacao/AmbienteDialog";
import {
  Ambiente, Bloco, CameraSimples, DispositivoSimples, TELA_PADRAO,
  excluirAmbiente, excluirBloco, listarAmbientes, listarBlocos,
  listarCameras, listarDispositivos, moverBloco, salvarBloco, salvarModoAmbiente, urlImagemAutomacao,
} from "@/lib/automacao/api";
import { EventoPainel, Regra, listarRegras, rodarRegras } from "@/lib/automacao/workflow";
import { supabase } from "@/integrations/supabase/client";
import { isAdministradorSistema } from "@/lib/portaria/porteiros";


const COLUNAS = 12;
const ALTURA_LINHA = 74;
const ESPACO = 8;

type Modo = "grade" | "livre";
interface PosLivre { l: number; t: number; w: number; h: number }

const posLivre = (b: Bloco, cx: number): PosLivre => {
  const p = (b.config as any)?.pos;
  if (p && typeof p.l === "number") return p as PosLivre;
  return {
    l: b.x * cx,
    t: b.y * (ALTURA_LINHA + ESPACO),
    w: Math.max(60, b.w * cx - ESPACO),
    h: b.h * ALTURA_LINHA + (b.h - 1) * ESPACO,
  };
};

export default function AutomacaoPainel() {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoSimples[]>([]);
  const [cameras, setCameras] = useState<CameraSimples[]>([]);
  const [ambienteId, setAmbienteId] = useState<string>("");
  const [edicao, setEdicao] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [modo, setModo] = useState<Modo>("grade");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [estados, setEstados] = useState<Record<string, boolean | null>>({});
  const [blocoEdit, setBlocoEdit] = useState<Partial<Bloco> | null>(null);
  const [ambienteEdit, setAmbienteEdit] = useState<Partial<Ambiente> | null>(null);
  const [excluir, setExcluir] = useState<{ tipo: "ambiente" | "bloco"; id: string; nome: string } | null>(null);
  const [escala, setEscala] = useState(1);
  const [fundoUrl, setFundoUrl] = useState<string | null>(null);
  const [camadasAbertas, setCamadasAbertas] = useState(true);
  const [camadasAmpliadas, setCamadasAmpliadas] = useState(false);
  const [regras, setRegras] = useState<Regra[]>([]);
  const palcoRef = useRef<HTMLDivElement | null>(null);
  const gradeRef = useRef<HTMLDivElement | null>(null);
  const estadosRef = useRef<Record<string, boolean | null>>({});
  const blocosRef = useRef<Bloco[]>([]);
  const regrasRef = useRef<Regra[]>([]);
  const arrasto = useRef<{ id: string; ox: number; oy: number; bx: number; by: number; pl: number; pt: number } | null>(null);
  const redim = useRef<{ id: string; ox: number; oy: number; bw: number; bh: number; pw: number; ph: number } | null>(null);


  const carregar = useCallback(async () => {
    const [a, b, d, c, r] = await Promise.all([
      listarAmbientes(), listarBlocos(), listarDispositivos(), listarCameras(), listarRegras(),
    ]);
    setAmbientes(a);
    setBlocos(b);
    setDispositivos(d);
    setCameras(c);
    setRegras(r);
    setAmbienteId((atual) => (a.some((x) => x.id === atual) ? atual : a[0]?.id || ""));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Guarda o estado mais recente para as automações consultarem durante a execução.
  useEffect(() => { estadosRef.current = estados; }, [estados]);
  useEffect(() => { blocosRef.current = blocos; regrasRef.current = regras; }, [blocos, regras]);

  /** Aplica o estado no elemento e em todos os outros que usam o mesmo equipamento. */
  const aplicarEstado = useCallback((deviceId: string | null, blocoId: string | null, ligado: boolean | null) => {
    setEstados((s) => {
      const proximo = { ...s };
      if (blocoId) proximo[blocoId] = ligado;
      if (deviceId) {
        for (const outro of blocosRef.current) {
          if (outro.device_id === deviceId) proximo[outro.id] = ligado;
        }
      }
      estadosRef.current = proximo;
      return proximo;
    });
  }, []);

  const dispararRegras = useCallback((ev: EventoPainel) => {
    if (!regrasRef.current.length) return;
    rodarRegras(ev, {
      regras: regrasRef.current,
      blocos: blocosRef.current,
      estados: estadosRef.current,
      aplicarEstado,
      aviso: (t, erro) => (erro ? toast.error(t) : toast.info(t)),
    }).catch(() => toast.error("Não foi possível concluir a automação."));
  }, [aplicarEstado]);


  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: u } = await supabase.from("usuarios").select("id").eq("auth_user_id", uid).maybeSingle();
      setAdmin(await isAdministradorSistema(uid, (u as any)?.id ?? null));
    })();
  }, []);

  // O modo fica guardado no banco, junto do ambiente, para voltar igual
  // em qualquer aparelho depois do login.
  useEffect(() => {
    if (!ambienteId) return;
    const salvoBanco = ambientes.find((a) => a.id === ambienteId)?.modo;
    const salvo = salvoBanco ?? localStorage.getItem(`automacao_modo_${ambienteId}`);
    setModo(salvo === "livre" ? "livre" : "grade");
    setSelecionados([]);
  }, [ambienteId, ambientes]);

  const trocarModo = (m: Modo) => {
    setModo(m);
    if (!ambienteId) return;
    localStorage.setItem(`automacao_modo_${ambienteId}`, m);
    setAmbientes((atual) => atual.map((a) => (a.id === ambienteId ? { ...a, modo: m } : a)));
    salvarModoAmbiente(ambienteId, m);
  };

  const podeEditar = admin && edicao;
  const doAmbiente = blocos.filter((b) => b.ambiente_id === ambienteId);

  // Camadas (como no Photoshop) e bloqueio de elementos ficam guardados
  // junto do elemento, para voltar igual em qualquer aparelho.
  const estaTravado = (b: Bloco) => !!(b.config as any)?.travado;
  const estaVisivel = (b: Bloco) => b.visivel !== false;
  const camadaDe = (b: Bloco) => Number((b.config as any)?.camada ?? 0);
  // Do fundo para a frente.
  const daFrenteParaTras = [...doAmbiente].sort((a, b) => camadaDe(b) - camadaDe(a));
  const doFundoParaFrente = [...doAmbiente].sort((a, b) => camadaDe(a) - camadaDe(b));

  const gravarCamadas = async (ordem: Bloco[]) => {
    const mapa = new Map(ordem.map((b, i) => [b.id, i]));
    setBlocos((ant) =>
      ant.map((b) => (mapa.has(b.id) ? { ...b, config: { ...(b.config ?? {}), camada: mapa.get(b.id) } } : b)),
    );
    await Promise.all(
      ordem.map((b, i) =>
        camadaDe(b) === i ? null : salvarBloco({ ...b, config: { ...(b.config ?? {}), camada: i } }),
      ),
    );
  };

  const moverCamada = async (id: string, acao: "frente" | "fundo" | "subir" | "descer") => {
    const ordem = [...doFundoParaFrente];
    const i = ordem.findIndex((b) => b.id === id);
    if (i < 0) return;
    const [item] = ordem.splice(i, 1);
    const destino =
      acao === "frente" ? ordem.length : acao === "fundo" ? 0 : acao === "subir" ? Math.min(ordem.length, i + 1) : Math.max(0, i - 1);
    ordem.splice(destino, 0, item);
    await gravarCamadas(ordem);
  };

  const alternarTravado = async (bloco: Bloco) => {
    const novo = !estaTravado(bloco);
    setBlocos((ant) =>
      ant.map((b) => (b.id === bloco.id ? { ...b, config: { ...(b.config ?? {}), travado: novo } } : b)),
    );
    await salvarBloco({ ...bloco, config: { ...(bloco.config ?? {}), travado: novo } });
    toast.success(novo ? "Elemento bloqueado." : "Elemento liberado.");
  };

  const alternarVisivel = async (bloco: Bloco) => {
    const novo = !estaVisivel(bloco);
    setBlocos((ant) => ant.map((b) => (b.id === bloco.id ? { ...b, visivel: novo } : b)));
    await salvarBloco({ ...bloco, visivel: novo });
    toast.success(novo ? "Elemento visível." : "Elemento oculto.");
  };

  // Tela de parede do ambiente: o painel é montado nesse tamanho e depois
  // reduzido/ampliado para caber por inteiro no espaço disponível.
  const ambienteAtual = ambientes.find((a) => a.id === ambienteId);
  const telaL = ambienteAtual?.tela_largura ?? TELA_PADRAO.largura;
  const telaA = ambienteAtual?.tela_altura ?? TELA_PADRAO.altura;
  const fundoAjuste = ambienteAtual?.fundo_ajuste ?? "cobrir";
  const fundoOpacidade = Math.max(0, Math.min(100, ambienteAtual?.fundo_opacidade ?? 100)) / 100;

  // Foto de fundo do ambiente (arquivo enviado ou endereço da internet).
  useEffect(() => {
    let ativo = true;
    const caminho = ambienteAtual?.fundo_caminho;
    if (!caminho) { setFundoUrl(null); return; }
    if (/^https?:\/\//.test(caminho)) { setFundoUrl(caminho); return; }
    urlImagemAutomacao(caminho).then((u) => { if (ativo) setFundoUrl(u); });
    return () => { ativo = false; };
  }, [ambienteAtual?.fundo_caminho]);

  useEffect(() => {
    const alvo = palcoRef.current;
    if (!alvo) return;
    const medir = () => {
      const disponivel = alvo.clientWidth || telaL;
      setEscala(Math.max(0.1, Math.min(disponivel / telaL, 1)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(alvo);
    return () => ro.disconnect();
  }, [telaL, telaA, ambienteId, ambientes.length]);

  const celula = () => ({ cx: telaL / COLUNAS, cy: ALTURA_LINHA });

  const atualizarPos = (id: string, pos: PosLivre) =>
    setBlocos((ant) => ant.map((b) => (b.id === id ? { ...b, config: { ...(b.config ?? {}), pos } } : b)));

  const estaSelecionado = (id: string) => selecionados.includes(id);

  /** Clique simples troca a seleção; com Shift/Ctrl/Cmd soma ou tira da seleção. */
  const selecionar = (id: string, e?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
    const juntar = !!(e?.shiftKey || e?.ctrlKey || e?.metaKey);
    setSelecionados((ant) => {
      if (!juntar) return ant.length === 1 && ant[0] === id ? ant : [id];
      return ant.includes(id) ? ant.filter((x) => x !== id) : [...ant, id];
    });
  };

  const aoArrastar = (e: React.PointerEvent, bloco: Bloco) => {
    if (!podeEditar) return;
    selecionar(bloco.id, e);
    if (estaTravado(bloco)) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = posLivre(bloco, celula().cx);
    arrasto.current = { id: bloco.id, ox: e.clientX, oy: e.clientY, bx: bloco.x, by: bloco.y, pl: p.l, pt: p.t };
  };

  const aoRedimensionar = (e: React.PointerEvent, bloco: Bloco) => {
    if (!podeEditar || estaTravado(bloco)) return;
    e.stopPropagation();
    selecionar(bloco.id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = posLivre(bloco, celula().cx);
    redim.current = { id: bloco.id, ox: e.clientX, oy: e.clientY, bw: bloco.w, bh: bloco.h, pw: p.w, ph: p.h };
  };

  const aoMover = (e: React.PointerEvent) => {
    const { cx, cy } = celula();
    // O painel pode estar reduzido na tela: converte o movimento do dedo/mouse
    // para o tamanho real da tela de parede.
    const dx = (px: number) => px / escala;
    const r = redim.current;
    if (r) {
      const bloco = blocos.find((b) => b.id === r.id);
      if (!bloco) return;
      if (modo === "livre") {
        const p = posLivre(bloco, cx);
        atualizarPos(bloco.id, {
          ...p,
          w: Math.max(40, r.pw + dx(e.clientX - r.ox)),
          h: Math.max(40, r.ph + dx(e.clientY - r.oy)),
        });
        return;
      }
      const nw = Math.max(1, Math.min(COLUNAS - bloco.x, r.bw + Math.round(dx(e.clientX - r.ox) / cx)));
      const nh = Math.max(1, Math.min(12, r.bh + Math.round(dx(e.clientY - r.oy) / cy)));
      if (nw !== bloco.w || nh !== bloco.h) {
        setBlocos((ant) => ant.map((b) => (b.id === r.id ? { ...b, w: nw, h: nh } : b)));
      }
      return;
    }
    const a = arrasto.current;
    if (!a) return;
    const bloco = blocos.find((b) => b.id === a.id);
    if (!bloco) return;
    if (modo === "livre") {
      const p = posLivre(bloco, cx);
      atualizarPos(bloco.id, {
        ...p,
        l: Math.max(0, a.pl + dx(e.clientX - a.ox)),
        t: Math.max(0, a.pt + dx(e.clientY - a.oy)),
      });
      return;
    }
    const nx = Math.max(0, Math.min(COLUNAS - bloco.w, a.bx + Math.round(dx(e.clientX - a.ox) / cx)));
    const ny = Math.max(0, a.by + Math.round(dx(e.clientY - a.oy) / cy));
    if (nx !== bloco.x || ny !== bloco.y) {
      setBlocos((ant) => ant.map((b) => (b.id === a.id ? { ...b, x: nx, y: ny } : b)));
    }
  };

  const gravarBloco = async (bloco: Bloco) => {
    if (modo === "livre") await salvarBloco(bloco);
    else await moverBloco(bloco.id, { x: bloco.x, y: bloco.y, w: bloco.w, h: bloco.h });
  };

  const aoSoltar = async () => {
    const alvo = redim.current ?? arrasto.current;
    redim.current = null;
    arrasto.current = null;
    if (!alvo) return;
    const bloco = blocos.find((b) => b.id === alvo.id);
    if (bloco) await gravarBloco(bloco);
  };

  const alinhar = async (dir: "esq" | "centroH" | "dir" | "topo" | "centroV" | "base") => {
    const escolhidos = doAmbiente.filter((b) => estaSelecionado(b.id));
    if (!escolhidos.length) { toast.error("Escolha um ou mais elementos tocando neles."); return; }
    const livres = escolhidos.filter((b) => !estaTravado(b));
    if (!livres.length) { toast.error("Os elementos escolhidos estão bloqueados. Libere o cadeado para movê-los."); return; }
    const { cx } = celula();
    const varios = livres.length > 1;

    if (modo === "livre") {
      const pos = livres.map((b) => ({ b, p: posLivre(b, cx) }));
      // Com vários elementos, o alinhamento usa a área ocupada pela seleção;
      // com um só, usa a tela de parede inteira.
      const esq = varios ? Math.min(...pos.map((x) => x.p.l)) : 0;
      const dirLim = varios ? Math.max(...pos.map((x) => x.p.l + x.p.w)) : telaL;
      const topo = varios ? Math.min(...pos.map((x) => x.p.t)) : 0;
      const baseLim = varios ? Math.max(...pos.map((x) => x.p.t + x.p.h)) : telaA;

      for (const { b, p } of pos) {
        const novo: PosLivre = { ...p };
        if (dir === "esq") novo.l = esq;
        if (dir === "centroH") novo.l = Math.max(0, esq + (dirLim - esq - p.w) / 2);
        if (dir === "dir") novo.l = Math.max(0, dirLim - p.w);
        if (dir === "topo") novo.t = topo;
        if (dir === "centroV") novo.t = Math.max(0, topo + (baseLim - topo - p.h) / 2);
        if (dir === "base") novo.t = Math.max(0, baseLim - p.h);
        atualizarPos(b.id, novo);
        await salvarBloco({ ...b, config: { ...(b.config ?? {}), pos: novo } });
      }
    } else {
      const linhas = Math.max(...doAmbiente.map((b) => b.y + b.h), 1);
      const esq = varios ? Math.min(...livres.map((b) => b.x)) : 0;
      const dirLim = varios ? Math.max(...livres.map((b) => b.x + b.w)) : COLUNAS;
      const topo = varios ? Math.min(...livres.map((b) => b.y)) : 0;
      const baseLim = varios ? Math.max(...livres.map((b) => b.y + b.h)) : linhas;

      for (const bloco of livres) {
        let { x, y } = bloco;
        if (dir === "esq") x = esq;
        if (dir === "centroH") x = Math.max(0, esq + Math.round((dirLim - esq - bloco.w) / 2));
        if (dir === "dir") x = Math.max(0, dirLim - bloco.w);
        if (dir === "topo") y = topo;
        if (dir === "centroV") y = Math.max(0, topo + Math.round((baseLim - topo - bloco.h) / 2));
        if (dir === "base") y = Math.max(0, baseLim - bloco.h);
        setBlocos((ant) => ant.map((b) => (b.id === bloco.id ? { ...b, x, y } : b)));
        await moverBloco(bloco.id, { x, y, w: bloco.w, h: bloco.h });
      }
    }
    toast.success(livres.length > 1 ? `${livres.length} elementos alinhados.` : "Elemento alinhado.");
  };

  /** Camada acima de todos os elementos do ambiente (fica na frente). */
  const camadaDaFrente = () => (doAmbiente.length ? Math.max(...doAmbiente.map(camadaDe)) + 1 : 0);

  const novoBloco = () =>
    setBlocoEdit({
      nome: "", tipo: "luz", ambiente_id: ambienteId || ambientes[0]?.id, canal: 0,
      x: 0, y: 0, w: 3, h: 2, config: { camada: camadaDaFrente() },
    });

  /** Copia o elemento e coloca a cópia ao lado, já na frente e escolhida. */
  const duplicarBloco = async (b: Bloco) => {
    const camada = camadaDaFrente();
    const base: Partial<Bloco> = { ...b, nome: `${b.nome || "Elemento"} (cópia)` };
    delete (base as any).id;
    delete (base as any).created_at;
    delete (base as any).updated_at;
    let copia: Partial<Bloco>;
    if (modo === "livre") {
      const p = posLivre(b, celula().cx);
      const l = Math.max(0, Math.min(telaL - p.w, p.l + p.w + ESPACO));
      copia = { ...base, config: { ...((b.config ?? {}) as any), camada, pos: { ...p, l, t: p.t } } };
    } else {
      copia = {
        ...base,
        x: Math.max(0, Math.min(COLUNAS - b.w, b.x + b.w)),
        y: b.y,
        config: { ...((b.config ?? {}) as any), camada },
      };
    }
    const salvo = await salvarBloco(copia);
    if (!salvo) { toast.error("Não foi possível duplicar o elemento."); return; }
    await carregar();
    setSelecionados([salvo.id]);
    toast.success("Elemento duplicado.");
  };

  /** Depois de salvar no editor, o elemento novo já fica escolhido. */
  const aoSalvarBloco = async (salvo?: Bloco | null) => {
    await carregar();
    if (salvo?.id) setSelecionados([salvo.id]);
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    if (excluir.tipo === "ambiente") await excluirAmbiente(excluir.id);
    else await excluirBloco(excluir.id);
    setExcluir(null);
    toast.success("Excluído.");
    carregar();
  };

  if (!ambientes.length) {
    return (
      <>
        <div className="rounded-lg border bg-card p-10 text-center">
          <p className="text-muted-foreground mb-4">Você ainda não criou nenhum ambiente.</p>
          {admin ? (
            <Button onClick={() => setAmbienteEdit({ nome: "", ordem: 0 })}>
              <Plus className="h-4 w-4 mr-2" /> Criar meu primeiro ambiente
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Peça a um administrador para montar o painel.</p>
          )}
        </div>
        <AmbienteDialog ambiente={ambienteEdit} onChange={setAmbienteEdit} onSalvo={carregar} />
      </>
    );
  }

  const alinhamentos = [
    { dir: "esq", Icone: AlignHorizontalJustifyStart, titulo: "Alinhar à esquerda" },
    { dir: "centroH", Icone: AlignHorizontalJustifyCenter, titulo: "Centralizar na horizontal" },
    { dir: "dir", Icone: AlignHorizontalJustifyEnd, titulo: "Alinhar à direita" },
    { dir: "topo", Icone: AlignVerticalJustifyStart, titulo: "Alinhar em cima" },
    { dir: "centroV", Icone: AlignVerticalJustifyCenter, titulo: "Centralizar na vertical" },
    { dir: "base", Icone: AlignVerticalJustifyEnd, titulo: "Alinhar embaixo" },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={ambienteId} onValueChange={setAmbienteId} className="min-w-0">
          <TabsList className="flex-wrap h-auto">
            {ambientes.map((a) => (
              <TabsTrigger key={a.id} value={a.id} className="gap-1">
                {a.nome}
                {podeEditar && (
                  <>
                    <Pencil
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setAmbienteEdit(a); }}
                    />
                    <Trash2
                      className="h-3 w-3 text-destructive opacity-70 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setExcluir({ tipo: "ambiente", id: a.id, nome: a.nome }); }}
                    />
                  </>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {podeEditar && (
          <Button size="sm" variant="ghost" onClick={() => setAmbienteEdit({ nome: "", ordem: ambientes.length })}>
            <Plus className="h-4 w-4 mr-1" /> Ambiente
          </Button>
        )}
        {admin && (
          <div className="ml-auto flex gap-2">
            <Button variant={edicao ? "default" : "outline"} size="sm" onClick={() => setEdicao((v) => !v)}>
              {edicao ? <><Check className="h-4 w-4 mr-2" /> Concluir</> : <><Move className="h-4 w-4 mr-2" /> Editar painel</>}
            </Button>
            {edicao && (
              <Button size="sm" onClick={novoBloco}>
                <Plus className="h-4 w-4 mr-2" /> Novo elemento
              </Button>
            )}
          </div>
        )}
      </div>

      {podeEditar && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
          <span className="text-xs text-muted-foreground">Posicionamento:</span>
          <Button size="sm" variant={modo === "grade" ? "default" : "outline"} onClick={() => trocarModo("grade")}>
            <Grid3X3 className="h-4 w-4 mr-1" /> Alinhar à grade
          </Button>
          <Button size="sm" variant={modo === "livre" ? "default" : "outline"} onClick={() => trocarModo("livre")}>
            <MousePointer2 className="h-4 w-4 mr-1" /> Livre
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => ambienteAtual && setAmbienteEdit(ambienteAtual)}
            title="Definir o tamanho e a proporção da tela de parede"
          >
            <Monitor className="h-4 w-4 mr-1" /> Tela de parede ({telaL}×{telaA})
          </Button>
          <span className="ml-2 text-xs text-muted-foreground">
            {selecionados.length > 1
              ? `Alinhar ${selecionados.length} elementos escolhidos:`
              : "Alinhar elemento escolhido (Shift ou Ctrl para escolher vários):"}
          </span>
          {alinhamentos.map(({ dir, Icone, titulo }) => (
            <Button
              key={dir}
              size="icon"
              variant="outline"
              className="h-8 w-8"
              title={titulo}
              disabled={!selecionados.length}
              onClick={() => alinhar(dir)}
            >
              <Icone className="h-4 w-4" />
            </Button>
          ))}
          {selecionados.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelecionados([])}>
              Limpar seleção
            </Button>
          )}
          {selecionados.length > 0 && doAmbiente.length > 1 && (
            <Button size="sm" variant="ghost" onClick={() => setSelecionados(doAmbiente.map((b) => b.id))}>
              Escolher todos
            </Button>
          )}
        </div>
      )}

      {podeEditar && doAmbiente.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-3 py-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Camadas</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {doAmbiente.length} {doAmbiente.length === 1 ? "elemento" : "elementos"}
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground">de cima para baixo — o primeiro fica na frente</span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="icon" variant="ghost" className="h-7 w-7"
                title={camadasAmpliadas ? "Altura normal" : "Ampliar lista de camadas"}
                disabled={!camadasAbertas}
                onClick={() => setCamadasAmpliadas((v) => !v)}
              >
                {camadasAmpliadas ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                size="icon" variant="ghost" className="h-7 w-7"
                title={camadasAbertas ? "Encolher camadas" : "Mostrar camadas"}
                onClick={() => setCamadasAbertas((v) => !v)}
              >
                {camadasAbertas ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {camadasAbertas && (
          <div className={`overflow-y-auto divide-y border-t ${camadasAmpliadas ? "max-h-[70vh]" : "max-h-56"}`}>
            {daFrenteParaTras.map((b, idx) => {
              const ativo = estaSelecionado(b.id);
              const visivel = estaVisivel(b);
              return (
                <div
                  key={b.id}
                  onClick={(e) => selecionar(b.id, e)}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${ativo ? "bg-primary/10" : "hover:bg-muted/50"} ${!visivel ? "opacity-60" : ""}`}
                >
                  <span className="w-5 shrink-0 text-center text-[10px] font-semibold text-muted-foreground">{idx + 1}</span>
                  <span className={`flex-1 truncate text-sm ${!visivel ? "line-through" : ""}`}>
                    {b.nome || "Sem nome"}
                    {!visivel && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">oculto</span>}
                  </span>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    title="Editar elemento"
                    onClick={(e) => { e.stopPropagation(); setBlocoEdit(b); }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    title="Duplicar elemento"
                    onClick={(e) => { e.stopPropagation(); duplicarBloco(b); }}
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    title={visivel ? "Ocultar elemento" : "Mostrar elemento"}
                    onClick={(e) => { e.stopPropagation(); alternarVisivel(b); }}
                  >
                    {visivel
                      ? <Eye className="h-4 w-4 text-primary" />
                      : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    title={estaTravado(b) ? "Liberar elemento" : "Bloquear elemento"}
                    onClick={(e) => { e.stopPropagation(); alternarTravado(b); }}
                  >
                    {estaTravado(b)
                      ? <Lock className="h-4 w-4 text-amber-500" />
                      : <Unlock className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Trazer para a frente"
                    onClick={(e) => { e.stopPropagation(); moverCamada(b.id, "frente"); }}>
                    <ChevronsUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Avançar uma camada"
                    onClick={(e) => { e.stopPropagation(); moverCamada(b.id, "subir"); }}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Recuar uma camada"
                    onClick={(e) => { e.stopPropagation(); moverCamada(b.id, "descer"); }}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Enviar para o fundo"
                    onClick={(e) => { e.stopPropagation(); moverCamada(b.id, "fundo"); }}>
                    <ChevronsDown className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* Palco: reserva na página o espaço da tela de parede já reduzida. */}
      <div ref={palcoRef} className="w-full min-w-0 overflow-hidden" style={{ height: telaA * escala }}>
        <div
        ref={gradeRef}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        className={
          modo === "livre"
            ? "relative rounded-2xl border bg-muted/20 p-2 overflow-hidden"
            : "relative rounded-2xl border bg-muted/20 p-2 grid gap-2"
        }
        style={{
          width: telaL,
          height: telaA,
          transform: `scale(${escala})`,
          transformOrigin: "top left",
          ...(modo === "livre"
            ? {}
            : {
                gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))`,
                gridAutoRows: `${ALTURA_LINHA}px`,
              }),
        }}
      >
        {fundoUrl && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              backgroundImage: `url(${fundoUrl})`,
              backgroundSize: fundoAjuste === "conter" ? "contain" : fundoAjuste === "esticar" ? "100% 100%" : "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              opacity: fundoOpacidade,
            }}
          />
        )}
        {(podeEditar ? doFundoParaFrente : doFundoParaFrente.filter(estaVisivel)).map((b, indice) => {
          const p = modo === "livre" ? posLivre(b, celula().cx) : null;
          const travado = estaTravado(b);
          const visivel = estaVisivel(b);
          const zIndex = indice + 1;
          return (
            <div
              key={b.id}
              onPointerDown={(e) => aoArrastar(e, b)}
              className={`relative ${podeEditar && estaSelecionado(b.id) ? "ring-2 ring-primary rounded-xl" : ""} ${!visivel ? "opacity-40" : ""}`}
              style={
                p
                  ? {
                      position: "absolute",
                      left: p.l, top: p.t, width: p.w, height: p.h,
                      zIndex,
                      cursor: podeEditar ? (travado ? "not-allowed" : "grab") : undefined,
                      touchAction: podeEditar && !travado ? "none" : undefined,
                    }
                  : {
                      gridColumn: `${b.x + 1} / span ${b.w}`,
                      gridRow: `${b.y + 1} / span ${b.h}`,
                      zIndex,
                      cursor: podeEditar ? (travado ? "not-allowed" : "grab") : undefined,
                      touchAction: podeEditar && !travado ? "none" : undefined,
                    }
              }
            >
              <BlocoCard
                bloco={b}
                ligado={estados[b.id] ?? null}
                edicao={podeEditar}
                onEditar={() => setBlocoEdit(b)}
                onAcionar={() => { if (!podeEditar) dispararRegras({ tipo: "clique", bloco: b, ligado: estadosRef.current[b.id] ?? null }); }}
                onEstado={(v) => {
                  aplicarEstado(b.device_id, b.id, v);
                  if (!podeEditar) dispararRegras({ tipo: "mudanca", bloco: b, ligado: v });
                }}
              />

              {podeEditar && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setExcluir({ tipo: "bloco", id: b.id, nome: b.nome })}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full shadow"
                    title={visivel ? "Ocultar elemento" : "Mostrar elemento"}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => alternarVisivel(b)}
                  >
                    {visivel ? <Eye className="h-3 w-3 text-primary" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -top-2 -left-2 h-6 w-6 rounded-full shadow"
                    title={travado ? "Liberar elemento" : "Bloquear elemento"}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => alternarTravado(b)}
                  >
                    {travado ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3" />}
                  </Button>
                </>
              )}
              {podeEditar && !travado && (
                <>
                  <div
                    onPointerDown={(e) => aoRedimensionar(e, b)}
                    title="Arraste para redimensionar"
                    className="absolute -bottom-1 -right-1 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-primary bg-background shadow"
                    style={{ touchAction: "none" }}
                  />
                  <div
                    onPointerDown={(e) => aoRedimensionar(e, b)}
                    title="Arraste para mudar a largura"
                    className="absolute top-1/2 -right-1 h-8 w-2 -translate-y-1/2 cursor-ew-resize rounded-full bg-primary/70"
                    style={{ touchAction: "none" }}
                  />
                  <div
                    onPointerDown={(e) => aoRedimensionar(e, b)}
                    title="Arraste para mudar a altura"
                    className="absolute -bottom-1 left-1/2 h-2 w-8 -translate-x-1/2 cursor-ns-resize rounded-full bg-primary/70"
                    style={{ touchAction: "none" }}
                  />
                </>
              )}
            </div>
          );
        })}
        {!doAmbiente.length && (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground py-16">
            Nenhum elemento neste ambiente ainda.
            {podeEditar && (
              <Button size="sm" onClick={novoBloco}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar elemento
              </Button>
            )}
          </div>
        )}
        </div>
      </div>

      {podeEditar && (
        <p className="text-xs text-muted-foreground">
          {modo === "livre"
            ? "Modo livre: arraste os elementos para qualquer ponto da tela. A posição é salva automaticamente."
            : "Modo grade: os elementos encaixam nas colunas e linhas. A posição é salva automaticamente."}
        </p>
      )}

      <BlocoEditorDialog
        bloco={blocoEdit}
        dispositivos={dispositivos}
        cameras={cameras}
        onChange={setBlocoEdit}
        onSalvo={aoSalvarBloco}
      />
      <AmbienteDialog ambiente={ambienteEdit} onChange={setAmbienteEdit} onSalvo={carregar} />
      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
