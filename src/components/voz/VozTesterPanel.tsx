import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ROTAS_SISTEMA,
  matchRotaComCandidatosEm,
  type RotaSistema,
} from "@/lib/voz/rotasSistema";
import { frasesEfetivas, rotasEfetivas, norm } from "@/lib/voz/frasesGatilho";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileBarChart,
  FileDown,
  HelpCircle,
  Ban,
  Sparkles,
  Play,
} from "lucide-react";

type Relatorio = {
  id: string;
  nome: string;
  aliases?: string[] | null;
};

type ResultadoTeste =
  | { tipo: "voltar"; label: string; icone: any }
  | { tipo: "avancar"; label: string; icone: any }
  | { tipo: "pdf"; label: string; icone: any }
  | { tipo: "relatorios_menu"; label: string; icone: any }
  | { tipo: "relatorio"; label: string; icone: any; relatorio: Relatorio }
  | { tipo: "abrir_tela"; label: string; icone: any; rota: RotaSistema }
  | { tipo: "ambiguo"; label: string; icone: any; candidatos: Array<{ rota: RotaSistema; score: number }> }
  | { tipo: "nao_entendi"; label: string; icone: any };

export default function VozTesterPanel() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [frasesCustom, setFrasesCustom] = useState<Record<string, string[]> | null>(null);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: cfg } = await supabase
        .from("assistente_voz_config")
        .select("frases_customizadas")
        .eq("auth_user_id", u.user.id)
        .maybeSingle();
      if (cfg?.frases_customizadas && typeof cfg.frases_customizadas === "object") {
        setFrasesCustom(cfg.frases_customizadas as Record<string, string[]>);
      }
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("auth_user_id", u.user.id)
        .maybeSingle();
      if (usuario?.estabelecimento_id) {
        const { data: rels } = await supabase
          .from("relatorios_voz")
          .select("id, nome, aliases")
          .eq("estabelecimento_id", usuario.estabelecimento_id)
          .eq("ativo", true);
        setRelatorios((rels as any) || []);
      }
    })();
  }, []);

  const gVoltar = useMemo(() => frasesEfetivas("voltar", frasesCustom), [frasesCustom]);
  const gAvancar = useMemo(() => frasesEfetivas("avancar", frasesCustom), [frasesCustom]);
  const gPdf = useMemo(() => frasesEfetivas("pdf", frasesCustom), [frasesCustom]);
  const gRelatorios = useMemo(() => frasesEfetivas("relatorios", frasesCustom), [frasesCustom]);
  const rotasCustom = useMemo(() => rotasEfetivas(ROTAS_SISTEMA, frasesCustom), [frasesCustom]);

  const resultado: ResultadoTeste | null = useMemo(() => {
    const raw = texto.trim();
    if (!raw) return null;
    const t = norm(raw);

    if (gVoltar.some((g) => t.includes(norm(g)))) {
      return { tipo: "voltar", label: "Navegar para tela anterior", icone: ArrowLeft };
    }
    if (gAvancar.some((g) => t.includes(norm(g)))) {
      return { tipo: "avancar", label: "Navegar para próxima tela", icone: ArrowRight };
    }
    if (gPdf.some((g) => t === norm(g) || t.includes(norm(g)))) {
      return {
        tipo: "pdf",
        label: "Gerar PDF (apenas com relatório aberto)",
        icone: FileDown,
      };
    }
    if (gRelatorios.some((g) => {
      const n = norm(g);
      return t === n || t.startsWith(n + " ") || t.endsWith(" " + n);
    })) {
      return { tipo: "relatorios_menu", label: "Abrir lista de relatórios", icone: FileBarChart };
    }

    const rel = relatorios.find((r) => {
      if (norm(r.nome) === t) return true;
      if (r.aliases?.some((a) => norm(a) === t)) return true;
      return r.aliases?.some((a) => t.includes(norm(a))) || t.includes(norm(r.nome));
    });
    if (rel) {
      return {
        tipo: "relatorio",
        label: `Gerar relatório "${rel.nome}"`,
        icone: FileBarChart,
        relatorio: rel,
      };
    }

    const { escolhida, topN } = matchRotaComCandidatosEm(rotasCustom, raw);
    if (escolhida) {
      return {
        tipo: "abrir_tela",
        label: `Abrir "${escolhida.titulo}"`,
        icone: ExternalLink,
        rota: escolhida,
      };
    }
    const candidatosBons = topN.filter((c) => c.score >= 40);
    if (candidatosBons.length > 0) {
      return {
        tipo: "ambiguo",
        label: "Ambíguo — Pilar pediria para escolher",
        icone: HelpCircle,
        candidatos: candidatosBons.slice(0, 5),
      };
    }
    return { tipo: "nao_entendi", label: "Não reconhecido", icone: Ban };
  }, [texto, gVoltar, gAvancar, gPdf, gRelatorios, relatorios, rotasCustom]);

  const cor = (() => {
    if (!resultado) return "bg-muted/30";
    if (resultado.tipo === "nao_entendi") return "bg-destructive/10 border-destructive/30";
    if (resultado.tipo === "ambiguo") return "bg-amber-500/10 border-amber-500/30";
    return "bg-primary/10 border-primary/30";
  })();

  const Icone = resultado?.icone ?? Sparkles;

  const exemplos = [
    "abrir empresas",
    "monitor de filas",
    "voltar",
    "próxima tela",
    "meus relatórios",
    "logística monitoramento",
    "gerar pdf com capa",
    "cadastro de motoristas",
  ];

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
          <div className="text-sm text-muted-foreground">
            Digite uma frase abaixo para ver, <b>em tempo real</b>, qual intenção o Pilar reconheceria e
            qual ação (rota / relatório / navegação) ele executaria. Usa exatamente a mesma lógica
            determinística do assistente — inclusive seus apelidos personalizados.
          </div>
        </div>

        <Input
          autoFocus
          placeholder='Ex.: "abrir monitor de filas"'
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="text-base"
        />

        <div className="flex flex-wrap gap-1.5">
          {exemplos.map((ex) => (
            <button
              key={ex}
              onClick={() => setTexto(ex)}
              className="text-[11px] px-2 py-1 rounded bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition"
            >
              {ex}
            </button>
          ))}
          {texto && (
            <button
              onClick={() => setTexto("")}
              className="text-[11px] px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive transition"
            >
              limpar
            </button>
          )}
        </div>
      </Card>

      {resultado && (
        <Card className={`p-4 border ${cor}`}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-background/60 flex items-center justify-center shrink-0">
              <Icone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Intenção detectada
              </div>
              <div className="font-medium">{resultado.label}</div>

              {resultado.tipo === "abrir_tela" && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Rota: <code className="text-foreground">{resultado.rota.path}</code>
                  </div>
                  {resultado.rota.aliases && resultado.rota.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {resultado.rota.aliases.slice(0, 8).map((a) => (
                        <Badge key={a} variant="outline" className="text-[10px]">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => navigate(resultado.rota.path)}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Executar agora
                  </Button>
                </div>
              )}

              {resultado.tipo === "ambiguo" && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    O Pilar mostraria essas opções para o usuário escolher:
                  </div>
                  <div className="space-y-1">
                    {resultado.candidatos.map((c) => (
                      <div
                        key={c.rota.path}
                        className="flex items-center justify-between gap-2 text-xs bg-background/50 rounded px-2 py-1"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.rota.titulo}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {c.rota.path}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          score {c.score}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resultado.tipo === "relatorio" && (
                <div className="text-xs text-muted-foreground mt-1">
                  Relatório: <code className="text-foreground">{resultado.relatorio.nome}</code>
                </div>
              )}

              {resultado.tipo === "nao_entendi" && (
                <div className="text-xs text-muted-foreground mt-1">
                  Nenhuma frase reconhecida. O Pilar responderia:{" "}
                  <i>"Não entendi. Diga 'abrir &lt;tela&gt;' ou 'relatórios'."</i>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
