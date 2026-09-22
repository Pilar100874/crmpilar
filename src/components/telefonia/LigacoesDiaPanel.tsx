import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  RefreshCw,
  Search,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface LigacaoDia {
  id: string;
  origem: string;
  destino: string;
  origem_nome?: string;
  destino_nome?: string;
  inicio?: string;
  fim?: string;
  duracao_seg: number;
  conversa_seg: number;
  status: string;
  direcao: "Entrante" | "Sainte" | "Interna";
}

const STATUS_PERDIDA = ["Não atendida", "Ocupado", "Falhou"];
const OPCOES_STATUS = ["Atendida", "Não atendida", "Ocupado", "Falhou"];
const OPCOES_DIRECAO = ["Entrante", "Sainte", "Interna"];

const fmtSeg = (total: number) => {
  if (!total || total <= 0) return "00:00";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** "2026-09-22 09:12:33" -> "09:12" */
const fmtHora = (texto?: string) => {
  if (!texto) return "--:--";
  const m = texto.match(/(\d{2}):(\d{2})(?::\d{2})?/);
  return m ? `${m[1]}:${m[2]}` : texto;
};

const comNome = (numero: string, nome?: string) => (nome ? `${numero} — ${nome}` : numero || "—");

const varianteStatus = (status: string) => {
  if (status === "Atendida") return "default" as const;
  if (STATUS_PERDIDA.includes(status)) return "destructive" as const;
  return "secondary" as const;
};

const IconeDirecao = ({ direcao }: { direcao: LigacaoDia["direcao"] }) => {
  if (direcao === "Entrante") return <PhoneIncoming className="h-3.5 w-3.5 text-green-500" />;
  if (direcao === "Sainte") return <PhoneOutgoing className="h-3.5 w-3.5 text-blue-500" />;
  return <PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />;
};

/**
 * Ligações do dia: histórico CDR do PABX com resumo do volume de atendimentos.
 * Atualiza sozinho a cada 60 segundos.
 */
export function LigacoesDiaPanel() {
  const [ligacoes, setLigacoes] = useState<LigacaoDia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [avisoCdr, setAvisoCdr] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [filtroDirecao, setFiltroDirecao] = useState("todas");

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    setErro("");
    try {
      const { data, error } = await supabase.functions.invoke("ucm-telefonista", {
        body: { acao: "ligacoes_dia" },
      });
      const resposta = (data || {}) as {
        ok?: boolean;
        error?: string;
        aviso?: string;
        cdr_disponivel?: boolean;
        ligacoes?: LigacaoDia[];
      };
      // CDR desativado no PABX é situação esperada: mostra orientação, não erro.
      if (resposta.cdr_disponivel === false) {
        setAvisoCdr(
          resposta.aviso ||
            "O histórico de ligações (CDR) está desativado no PABX. Ative no UCM em CDR → Configurações de API.",
        );
        setLigacoes([]);
        return;
      }
      setAvisoCdr("");
      if (error || resposta.error || !resposta.ok) {
        let mensagem = resposta.error || "";
        const contexto = (error as { context?: Response } | null)?.context;
        if (!mensagem && contexto) {
          try {
            const corpoErro = (await contexto.json()) as { error?: string };
            mensagem = corpoErro?.error || "";
          } catch {
            /* sem corpo legível */
          }
        }
        throw new Error(mensagem || "Não foi possível carregar as ligações do dia");
      }
      setLigacoes(resposta.ligacoes ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar as ligações do dia");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    // Com o CDR desativado, re-testa a cada 5 min (pega a ativação sem spam).
    const intervalo = setInterval(() => void carregar(true), avisoCdr ? 300000 : 60000);
    return () => clearInterval(intervalo);
  }, [carregar, avisoCdr]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ligacoes.filter((l) => {
      if (filtroStatus !== "todas" && l.status !== filtroStatus) return false;
      if (filtroDirecao !== "todas" && l.direcao !== filtroDirecao) return false;
      if (!termo) return true;
      return [l.origem, l.destino, l.origem_nome, l.destino_nome]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(termo));
    });
  }, [ligacoes, busca, filtroStatus, filtroDirecao]);

  const resumo = useMemo(() => {
    const atendidas = ligacoes.filter((l) => l.status === "Atendida");
    const conversaTotal = atendidas.reduce((s, l) => s + (l.conversa_seg || 0), 0);
    return {
      total: ligacoes.length,
      atendidas: atendidas.length,
      perdidas: ligacoes.filter((l) => STATUS_PERDIDA.includes(l.status)).length,
      media: atendidas.length > 0 ? Math.round(conversaTotal / atendidas.length) : 0,
      conversaTotal,
    };
  }, [ligacoes]);

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo do volume de atendimentos */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <PhoneCall className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{resumo.total}</p>
              <p className="text-xs text-muted-foreground">Ligações hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <PhoneIncoming className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{resumo.atendidas}</p>
              <p className="text-xs text-muted-foreground">Atendidas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <PhoneMissed className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-lg font-bold text-foreground">{resumo.perdidas}</p>
              <p className="text-xs text-muted-foreground">Perdidas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{fmtSeg(resumo.media)}</p>
              <p className="text-xs text-muted-foreground">Conversa média</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Timer className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{fmtSeg(resumo.conversaTotal)}</p>
              <p className="text-xs text-muted-foreground">Tempo em conversa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="mr-auto text-base">Ligações de hoje</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void carregar()}
              title="Atualizar agora"
              disabled={carregando}
            >
              <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar número ou nome..."
                className="pl-8"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os status</SelectItem>
                {OPCOES_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroDirecao} onValueChange={setFiltroDirecao}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Direção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as direções</SelectItem>
                {OPCOES_DIRECAO.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {erro ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-destructive">{erro}</p>
              <Button variant="outline" size="sm" onClick={() => void carregar()}>
                Tentar de novo
              </Button>
            </div>
          ) : carregando && ligacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Carregando ligações do dia...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {ligacoes.length === 0
                ? "Nenhuma ligação registrada hoje."
                : "Nenhuma ligação encontrada com esses filtros."}
            </p>
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Horário</TableHead>
                      <TableHead className="w-28">Direção</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead className="w-24">Duração</TableHead>
                      <TableHead className="w-24">Conversa</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{fmtHora(l.inicio)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm">
                            <IconeDirecao direcao={l.direcao} />
                            {l.direcao}
                          </span>
                        </TableCell>
                        <TableCell>{comNome(l.origem, l.origem_nome)}</TableCell>
                        <TableCell>{comNome(l.destino, l.destino_nome)}</TableCell>
                        <TableCell>{fmtSeg(l.duracao_seg)}</TableCell>
                        <TableCell>{fmtSeg(l.conversa_seg)}</TableCell>
                        <TableCell>
                          <Badge variant={varianteStatus(l.status)}>{l.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Celular: cartões */}
              <div className="flex flex-col gap-2 md:hidden">
                {filtradas.map((l) => (
                  <div key={l.id} className="rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <IconeDirecao direcao={l.direcao} />
                      <span className="font-medium text-foreground">{fmtHora(l.inicio)}</span>
                      <span className="text-xs text-muted-foreground">{l.direcao}</span>
                      <Badge variant={varianteStatus(l.status)} className="ml-auto">
                        {l.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground">
                      {comNome(l.origem, l.origem_nome)} → {comNome(l.destino, l.destino_nome)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      duração {fmtSeg(l.duracao_seg)}
                      {l.status === "Atendida" ? ` · conversa ${fmtSeg(l.conversa_seg)}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
