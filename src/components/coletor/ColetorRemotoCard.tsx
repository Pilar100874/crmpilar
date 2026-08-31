import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Server, Wifi, WifiOff, ArrowUpCircle } from "lucide-react";

interface Dispositivo {
  id: string;
  hostname: string | null;
  plataforma: string | null;
  versao: string | null;
  unidade_nome: string | null;
  ultimo_contato: string;
  comando: string | null;
  comando_status: string;
  comando_resultado: string | null;
}

const ONLINE_MS = 3 * 60 * 1000;

export default function ColetorRemotoCard() {
  const [itens, setItens] = useState<Dispositivo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("coletor_dispositivos")
      .select("id,hostname,plataforma,versao,unidade_nome,ultimo_contato,comando,comando_status,comando_resultado")
      .order("ultimo_contato", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setItens((data ?? []) as Dispositivo[]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 20000);
    return () => clearInterval(t);
  }, [carregar]);

  const atualizar = async (d: Dispositivo) => {
    const { error } = await supabase
      .from("coletor_dispositivos")
      .update({
        comando: "atualizar_versao",
        comando_solicitado_em: new Date().toISOString(),
        comando_status: "pendente",
        comando_resultado: null,
      })
      .eq("id", d.id);
    if (error) {
      toast.error("Não foi possível enviar o comando: " + error.message);
      return;
    }
    toast.success("Atualização enviada. O equipamento aplica em até 1 minuto.");
    carregar();
  };

  const online = (d: Dispositivo) => Date.now() - new Date(d.ultimo_contato).getTime() < ONLINE_MS;

  return (
    <Card className="rounded-3xl border-primary/20 shadow-md">
      <CardContent className="p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground sm:text-xl">Coletores instalados</h2>
              <p className="text-sm text-muted-foreground">
                Atualize remotamente cada equipamento sem sair desta tela.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={carregar}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar lista
          </Button>
        </div>

        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum coletor se conectou ainda. Instale a ISO/aplicativo e escolha a unidade — ele aparece aqui em até 1 minuto.
          </p>
        ) : (
          <div className="space-y-3">
            {itens.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-foreground">{d.hostname || "Coletor"}</span>
                    <Badge variant={online(d) ? "default" : "secondary"} className="gap-1">
                      {online(d) ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {online(d) ? "Online" : "Offline"}
                    </Badge>
                    {d.versao && <Badge variant="outline">v{d.versao}</Badge>}
                    {d.unidade_nome && <Badge variant="outline">{d.unidade_nome}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.plataforma || "—"} · último contato {new Date(d.ultimo_contato).toLocaleString("pt-BR")}
                  </p>
                  {d.comando && (
                    <p className="mt-1 text-xs font-medium text-primary">Atualização em andamento…</p>
                  )}
                  {!d.comando && d.comando_resultado && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.comando_status === "erro" ? "Falha: " : ""}
                      {d.comando_resultado}
                    </p>
                  )}
                </div>
                <Button size="sm" disabled={!!d.comando} onClick={() => atualizar(d)}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  {d.comando ? "Aguardando…" : "Atualizar agora"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
