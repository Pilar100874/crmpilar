import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileText, Tag as TagIcon, Maximize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizarTitulo, resumoNota } from "@/lib/notas/wikilinks";
import type { Nota, NotaLink } from "@/hooks/useNotas";

export interface AgenteGrafo {
  id: string;
  nome: string;
  cor?: string | null;
}

type TipoNo = "nota" | "tag" | "agente";
type TipoAresta = "wikilink" | "tag" | "auto" | "agente";

interface NoGrafo {
  id: string;
  rotulo: string;
  tipo: TipoNo;
  cor?: string | null;
  grau: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixo?: boolean;
}

interface ArestaGrafo {
  origem: string;
  destino: string;
  tipo: TipoAresta;
}

const CORES: Record<TipoNo, string> = {
  nota: "hsl(var(--primary))",
  tag: "hsl(var(--muted-foreground))",
  agente: "hsl(var(--chart-2, var(--primary)))",
};

const CORES_ARESTA: Record<TipoAresta, string> = {
  wikilink: "hsl(var(--primary) / 0.55)",
  tag: "hsl(var(--muted-foreground) / 0.35)",
  auto: "hsl(var(--primary) / 0.28)",
  agente: "hsl(var(--muted-foreground) / 0.5)",
};

interface Props {
  notas: Nota[];
  links: NotaLink[];
  agentes?: AgenteGrafo[];
  onAbrirNota?: (nota: Nota) => void;
  className?: string;
}

/** Grafo de conhecimento estilo Obsidian: notas, tags e agentes conectados. */
export function NotasGrafo({ notas, links, agentes = [], onAbrirNota, className }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mostrarTags, setMostrarTags] = useState(true);
  const [mostrarAgentes, setMostrarAgentes] = useState(true);
  const [autoLinks, setAutoLinks] = useState(true);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  const nosRef = useRef<Map<string, NoGrafo>>(new Map());
  const arrastandoRef = useRef<{ id: string | null; panning: boolean; lastX: number; lastY: number }>({
    id: null,
    panning: false,
    lastX: 0,
    lastY: 0,
  });

  /** Estrutura lógica (nós + arestas) derivada dos dados. */
  const estrutura = useMemo(() => {
    const nos: Omit<NoGrafo, "x" | "y" | "vx" | "vy">[] = [];
    const arestas: ArestaGrafo[] = [];
    const grau = new Map<string, number>();
    const inc = (id: string) => grau.set(id, (grau.get(id) || 0) + 1);

    const porTituloNorm = new Map<string, Nota>();
    notas.forEach((n) => porTituloNorm.set(normalizarTitulo(n.titulo), n));

    // Wiki-links explícitos
    links.forEach((l) => {
      const destino = l.destino_id
        ? notas.find((n) => n.id === l.destino_id)
        : porTituloNorm.get(normalizarTitulo(l.destino_titulo));
      if (!destino) return;
      if (!notas.some((n) => n.id === l.origem_id)) return;
      if (destino.id === l.origem_id) return;
      arestas.push({ origem: `nota:${l.origem_id}`, destino: `nota:${destino.id}`, tipo: "wikilink" });
      inc(`nota:${l.origem_id}`);
      inc(`nota:${destino.id}`);
    });

    // Conexões automáticas: título de uma nota citado no conteúdo de outra
    if (autoLinks) {
      const jaExiste = new Set(arestas.map((a) => `${a.origem}|${a.destino}`));
      notas.forEach((origem) => {
        const texto = origem.conteudo.toLowerCase();
        notas.forEach((alvo) => {
          if (alvo.id === origem.id) return;
          const t = normalizarTitulo(alvo.titulo);
          if (t.length < 4 || !texto.includes(t)) return;
          const chave = `nota:${origem.id}|nota:${alvo.id}`;
          const inversa = `nota:${alvo.id}|nota:${origem.id}`;
          if (jaExiste.has(chave) || jaExiste.has(inversa)) return;
          jaExiste.add(chave);
          arestas.push({ origem: `nota:${origem.id}`, destino: `nota:${alvo.id}`, tipo: "auto" });
          inc(`nota:${origem.id}`);
          inc(`nota:${alvo.id}`);
        });
      });
    }

    // Tags
    const tags = new Set<string>();
    if (mostrarTags) {
      notas.forEach((n) =>
        n.tags.forEach((t) => {
          tags.add(t);
          arestas.push({ origem: `nota:${n.id}`, destino: `tag:${t}`, tipo: "tag" });
          inc(`nota:${n.id}`);
          inc(`tag:${t}`);
        })
      );
    }

    // Agentes de chat — conectam-se a notas que os mencionam ou compartilham tag com o nome
    const agentesVisiveis = mostrarAgentes ? agentes : [];
    agentesVisiveis.forEach((a) => {
      const nomeNorm = normalizarTitulo(a.nome);
      notas.forEach((n) => {
        const mencao =
          n.conteudo.toLowerCase().includes(nomeNorm) ||
          normalizarTitulo(n.titulo).includes(nomeNorm) ||
          n.tags.some((t) => nomeNorm.includes(t.toLowerCase()));
        if (!mencao) return;
        arestas.push({ origem: `agente:${a.id}`, destino: `nota:${n.id}`, tipo: "agente" });
        inc(`agente:${a.id}`);
        inc(`nota:${n.id}`);
      });
    });

    notas.forEach((n) =>
      nos.push({ id: `nota:${n.id}`, rotulo: n.titulo, tipo: "nota", grau: grau.get(`nota:${n.id}`) || 0 })
    );
    Array.from(tags).forEach((t) =>
      nos.push({ id: `tag:${t}`, rotulo: `#${t}`, tipo: "tag", grau: grau.get(`tag:${t}`) || 0 })
    );
    agentesVisiveis.forEach((a) =>
      nos.push({
        id: `agente:${a.id}`,
        rotulo: a.nome,
        tipo: "agente",
        cor: a.cor,
        grau: grau.get(`agente:${a.id}`) || 0,
      })
    );

    return { nos, arestas };
  }, [notas, links, agentes, mostrarTags, mostrarAgentes, autoLinks]);

  // Sincroniza posições preservando as já existentes
  useEffect(() => {
    const mapa = nosRef.current;
    const ids = new Set(estrutura.nos.map((n) => n.id));
    Array.from(mapa.keys()).forEach((id) => {
      if (!ids.has(id)) mapa.delete(id);
    });
    estrutura.nos.forEach((n, i) => {
      const atual = mapa.get(n.id);
      if (atual) {
        Object.assign(atual, { rotulo: n.rotulo, tipo: n.tipo, cor: n.cor, grau: n.grau });
      } else {
        const angulo = (i / Math.max(1, estrutura.nos.length)) * Math.PI * 2;
        const raio = 120 + Math.random() * 120;
        mapa.set(n.id, {
          ...n,
          x: 400 + Math.cos(angulo) * raio,
          y: 260 + Math.sin(angulo) * raio,
          vx: 0,
          vy: 0,
        });
      }
    });
    setTick((t) => t + 1);
  }, [estrutura]);

  // Simulação de forças
  useEffect(() => {
    let frame = 0;
    let vivo = true;
    let alpha = 1;

    const passo = () => {
      if (!vivo) return;
      const nos = Array.from(nosRef.current.values());
      if (nos.length === 0) {
        frame = requestAnimationFrame(passo);
        return;
      }
      const cx = 400;
      const cy = 260;

      // repulsão
      for (let i = 0; i < nos.length; i++) {
        for (let j = i + 1; j < nos.length; j++) {
          const a = nos[i];
          const b = nos[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 1) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            dist2 = 1;
          }
          const forca = 2600 / dist2;
          const dist = Math.sqrt(dist2);
          const fx = (dx / dist) * forca;
          const fy = (dy / dist) * forca;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // molas
      estrutura.arestas.forEach((e) => {
        const a = nosRef.current.get(e.origem);
        const b = nosRef.current.get(e.destino);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const alvo = e.tipo === "tag" ? 90 : 130;
        const forca = (dist - alvo) * 0.012;
        const fx = (dx / dist) * forca;
        const fy = (dy / dist) * forca;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      nos.forEach((n) => {
        n.vx += (cx - n.x) * 0.004;
        n.vy += (cy - n.y) * 0.004;
        if (n.fixo) {
          n.vx = 0;
          n.vy = 0;
          return;
        }
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx * alpha;
        n.y += n.vy * alpha;
      });

      alpha = Math.max(0.25, alpha * 0.999);
      setTick((t) => t + 1);
      frame = requestAnimationFrame(passo);
    };

    frame = requestAnimationFrame(passo);
    return () => {
      vivo = false;
      cancelAnimationFrame(frame);
    };
  }, [estrutura]);

  const paraCoordSvg = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const onMouseMove = (e: React.MouseEvent) => {
    const estado = arrastandoRef.current;
    if (estado.id) {
      const p = paraCoordSvg(e.clientX, e.clientY);
      const no = nosRef.current.get(estado.id);
      if (no) {
        no.x = p.x;
        no.y = p.y;
        no.vx = 0;
        no.vy = 0;
      }
      setTick((t) => t + 1);
    } else if (estado.panning) {
      setPan((p) => ({ x: p.x + (e.clientX - estado.lastX), y: p.y + (e.clientY - estado.lastY) }));
      estado.lastX = e.clientX;
      estado.lastY = e.clientY;
    }
  };

  const finalizarArraste = () => {
    const estado = arrastandoRef.current;
    if (estado.id) {
      const no = nosRef.current.get(estado.id);
      if (no) no.fixo = false;
    }
    arrastandoRef.current = { id: null, panning: false, lastX: 0, lastY: 0 };
  };

  const buscaNorm = busca.trim().toLowerCase();
  const nos = Array.from(nosRef.current.values());
  const vizinhos = useMemo(() => {
    if (!selecionado) return new Set<string>();
    const set = new Set<string>([selecionado]);
    estrutura.arestas.forEach((a) => {
      if (a.origem === selecionado) set.add(a.destino);
      if (a.destino === selecionado) set.add(a.origem);
    });
    return set;
  }, [selecionado, estrutura.arestas]);

  const detalhe = useMemo(() => {
    if (!selecionado?.startsWith("nota:")) return null;
    return notas.find((n) => `nota:${n.id}` === selecionado) || null;
  }, [selecionado, notas]);

  const raioDe = (n: NoGrafo) => (n.tipo === "tag" ? 5 : 7) + Math.min(9, n.grau * 1.1);

  const resetar = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    nosRef.current.clear();
    setTick((t) => t + 1);
  };

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Destacar no grafo..."
          className="h-9 w-[200px]"
        />
        <Button
          size="sm"
          variant={mostrarTags ? "default" : "outline"}
          onClick={() => setMostrarTags((v) => !v)}
        >
          <TagIcon className="mr-1 h-4 w-4" /> Tags
        </Button>
        <Button
          size="sm"
          variant={mostrarAgentes ? "default" : "outline"}
          onClick={() => setMostrarAgentes((v) => !v)}
        >
          <Bot className="mr-1 h-4 w-4" /> Agentes
        </Button>
        <Button size="sm" variant={autoLinks ? "default" : "outline"} onClick={() => setAutoLinks((v) => !v)}>
          <RefreshCw className="mr-1 h-4 w-4" /> Conexões automáticas
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {estrutura.nos.length} nós · {estrutura.arestas.length} conexões
          </Badge>
          <Button size="icon" variant="ghost" title="Reorganizar" onClick={resetar}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1">
        <svg
          ref={svgRef}
          className="h-[520px] w-full cursor-grab touch-none select-none bg-muted/20 active:cursor-grabbing"
          onMouseMove={onMouseMove}
          onMouseUp={finalizarArraste}
          onMouseLeave={finalizarArraste}
          onMouseDown={(e) => {
            arrastandoRef.current = { id: null, panning: true, lastX: e.clientX, lastY: e.clientY };
          }}
          onWheel={(e) => {
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom((z) => Math.min(3, Math.max(0.3, z * delta)));
          }}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} data-tick={tick}>
            {estrutura.arestas.map((a, i) => {
              const o = nosRef.current.get(a.origem);
              const d = nosRef.current.get(a.destino);
              if (!o || !d) return null;
              const ativo = !selecionado || (vizinhos.has(a.origem) && vizinhos.has(a.destino));
              return (
                <line
                  key={`${a.origem}-${a.destino}-${a.tipo}-${i}`}
                  x1={o.x}
                  y1={o.y}
                  x2={d.x}
                  y2={d.y}
                  stroke={CORES_ARESTA[a.tipo]}
                  strokeWidth={a.tipo === "wikilink" ? 1.6 : 1}
                  strokeDasharray={a.tipo === "auto" ? "4 3" : undefined}
                  opacity={ativo ? 1 : 0.12}
                />
              );
            })}
            {nos.map((n) => {
              const destacado = buscaNorm ? n.rotulo.toLowerCase().includes(buscaNorm) : false;
              const ativo = !selecionado || vizinhos.has(n.id);
              const r = raioDe(n);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  opacity={ativo ? 1 : 0.18}
                  className="cursor-pointer"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    n.fixo = true;
                    arrastandoRef.current = { id: n.id, panning: false, lastX: e.clientX, lastY: e.clientY };
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelecionado((s) => (s === n.id ? null : n.id));
                  }}
                  onDoubleClick={() => {
                    const nota = notas.find((x) => `nota:${x.id}` === n.id);
                    if (nota) onAbrirNota?.(nota);
                  }}
                >
                  <circle
                    r={r}
                    fill={n.cor || CORES[n.tipo]}
                    stroke={destacado || selecionado === n.id ? "hsl(var(--foreground))" : "transparent"}
                    strokeWidth={2}
                  />
                  <text
                    y={r + 11}
                    textAnchor="middle"
                    className="pointer-events-none fill-foreground text-[10px]"
                  >
                    {n.rotulo.length > 22 ? `${n.rotulo.slice(0, 22)}…` : n.rotulo}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {detalhe && (
          <div className="absolute right-3 top-3 w-64 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
            <div className="mb-1 flex items-center gap-1 text-sm font-semibold">
              <FileText className="h-4 w-4" /> {detalhe.titulo}
            </div>
            <p className="line-clamp-4 text-xs text-muted-foreground">{resumoNota(detalhe.conteudo, 180)}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {detalhe.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  #{t}
                </Badge>
              ))}
            </div>
            <Button size="sm" className="mt-2 w-full" onClick={() => onAbrirNota?.(detalhe)}>
              Abrir nota
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t p-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" /> Nota
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground" /> Tag
        </span>
        <span className="flex items-center gap-1">
          <Bot className="h-3 w-3" /> Agente de chat
        </span>
        <span className="ml-auto">Arraste os nós · scroll para zoom · duplo clique abre a nota</span>
      </div>
    </Card>
  );
}
