import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, RefreshCw, Power, PowerOff, WifiOff, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DispositivoDetalhado,
  comandoAutomacao,
  listarDispositivosDetalhados,
} from "@/lib/automacao/api";

interface Leitura {
  ligado: boolean | null;
  ok: boolean;
  mensagem: string;
  em: number;
  ms: number;
}

const RITMOS = [
  { valor: 3_000, label: "3 segundos" },
  { valor: 5_000, label: "5 segundos" },
  { valor: 15_000, label: "15 segundos" },
  { valor: 30_000, label: "30 segundos" },
];

function haQuantoTempo(quando: number | string | null): string {
  if (!quando) return "sem registro";
  const t = typeof quando === "string" ? new Date(quando).getTime() : quando;
  if (!t || Number.isNaN(t)) return "sem registro";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 10) return "agora mesmo";
  if (s < 60) return `há ${s} segundos`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} minuto${m > 1 ? "s" : ""}`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} hora${h > 1 ? "s" : ""}`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

export default function AutomacaoEstado() {
  const [equipamentos, setEquipamentos] = useState<DispositivoDetalhado[]>([]);
  const [leituras, setLeituras] = useState<Record<string, Leitura>>({});
  const [consultando, setConsultando] = useState<Record<string, boolean>>({});
  const [automatico, setAutomatico] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [tique, setTique] = useState(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  // Reescreve os textos de "há quanto tempo" a cada 15 segundos.
  useEffect(() => {
    const t = setInterval(() => setTique((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const consultar = useCallback(async (equip: DispositivoDetalhado) => {
    setConsultando((a) => ({ ...a, [equip.id]: true }));
    const inicio = Date.now();
    const r = await comandoAutomacao(equip.id, "status");
    if (!montado.current) return;
    setLeituras((a) => ({
      ...a,
      [equip.id]: {
        ligado: r.ligado ?? null,
        ok: r.ok,
        mensagem: r.mensagem,
        em: Date.now(),
        ms: Date.now() - inicio,
      },
    }));
    setConsultando((a) => ({ ...a, [equip.id]: false }));
  }, []);

  const atualizarTudo = useCallback(async () => {
    setAtualizando(true);
    const lista = await listarDispositivosDetalhados();
    if (!montado.current) return;
    setEquipamentos(lista);
    const ativos = lista.filter((e) => e.habilitado);
    for (const e of ativos) await consultar(e);
    if (montado.current) setAtualizando(false);
  }, [consultar]);

  useEffect(() => {
    atualizarTudo();
  }, [atualizarTudo]);

  useEffect(() => {
    if (!automatico) return;
    const t = setInterval(() => atualizarTudo(), INTERVALO);
    return () => clearInterval(t);
  }, [automatico, atualizarTudo]);

  const ativos = equipamentos.filter((e) => e.habilitado);
  const desligadosDoSistema = equipamentos.filter((e) => !e.habilitado);
  const respondendo = ativos.filter((e) => leituras[e.id]?.ok).length;

  return (
    <div className="space-y-4" data-tique={tique}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold">Estado dos equipamentos</h2>
        </div>
        <Badge variant="secondary">
          {respondendo} de {ativos.length} respondendo
        </Badge>
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={automatico} onCheckedChange={setAutomatico} />
            Atualizar sozinho
          </label>
          <Button size="sm" variant="outline" onClick={atualizarTudo} disabled={atualizando}>
            <RefreshCw className={`h-4 w-4 mr-1 ${atualizando ? "animate-spin" : ""}`} />
            Atualizar agora
          </Button>
        </div>
      </div>

      {ativos.length === 0 && !atualizando && (
        <Card className="p-6 text-sm text-muted-foreground">
          Nenhum equipamento ativo cadastrado ainda.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ativos.map((e) => {
          const l = leituras[e.id];
          const ocupado = consultando[e.id];
          const ligado = l?.ok ? l.ligado : null;
          const cor = !l
            ? "border-border"
            : !l.ok
              ? "border-destructive/50"
              : ligado
                ? "border-emerald-500/60"
                : "border-border";
          return (
            <Card key={e.id} className={`p-4 border-2 ${cor}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
                    !l?.ok
                      ? "bg-destructive/10 text-destructive"
                      : ligado
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {!l?.ok ? (
                    <WifiOff className="h-5 w-5" />
                  ) : ligado === null ? (
                    <HelpCircle className="h-5 w-5" />
                  ) : ligado ? (
                    <Power className="h-5 w-5" />
                  ) : (
                    <PowerOff className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{e.nome}</p>
                    <Badge variant={l?.ok ? "secondary" : "destructive"} className="shrink-0">
                      {!l ? "consultando..." : l.ok ? "comunicando" : "sem comunicação"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {[e.modelo || e.tipo, e.localizacao, e.ip ? `${e.ip}${e.porta ? `:${e.porta}` : ""}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  <p className="mt-2 text-sm">
                    {!l?.ok
                      ? l?.mensagem || "Aguardando resposta do equipamento."
                      : ligado === null
                        ? "Este equipamento não informa se está ligado."
                        : ligado
                          ? "Ligado agora"
                          : "Desligado agora"}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Última leitura: {haQuantoTempo(l?.em ?? null)}</span>
                    {l?.ok && <span>Resposta em {l.ms} ms</span>}
                    <span>Último contato registrado: {haQuantoTempo(e.ultima_comunicacao)}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 px-2"
                    onClick={() => consultar(e)}
                    disabled={ocupado}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${ocupado ? "animate-spin" : ""}`} />
                    Verificar agora
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {desligadosDoSistema.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium mb-2">Equipamentos desativados no cadastro</p>
          <div className="flex flex-wrap gap-2">
            {desligadosDoSistema.map((e) => (
              <Badge key={e.id} variant="outline">
                {e.nome}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
