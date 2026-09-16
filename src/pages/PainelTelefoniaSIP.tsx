import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, RefreshCw, Search, Smartphone, Monitor, Server, PhoneCall, Users, Wifi } from "lucide-react";
import { useStatusRamais } from "@/hooks/useStatusRamais";

interface RamalCadastro {
  id: string;
  nome: string;
  ramal: string;
  tipo: string | null;
}

export default function PainelTelefoniaSIP() {
  const { statusPorRamal, chamadas, troncos, pabxDisponivel, motivoPabx, carregando, atualizar } = useStatusRamais(20000);
  const [cadastro, setCadastro] = useState<RamalCadastro[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("usuarios")
        .select("id, nome, ramal, tipo, ativo")
        .not("ramal", "is", null)
        .neq("ramal", "")
        .order("nome");
      const lista = ((data ?? []) as Array<RamalCadastro & { ativo: boolean | null }>)
        .filter((u) => u.ativo !== false)
        .map((u) => ({ id: u.id, nome: u.nome, ramal: String(u.ramal), tipo: u.tipo }));
      setCadastro(lista);
    })();
  }, []);

  /** Junta os ramais cadastrados no sistema com os que só existem no PABX. */
  const ramais = useMemo(() => {
    const mapa = new Map<string, { ramal: string; nome: string; tipo: string | null }>();
    cadastro.forEach((c) => mapa.set(c.ramal, { ramal: c.ramal, nome: c.nome, tipo: c.tipo }));
    Object.values(statusPorRamal).forEach((s) => {
      if (!mapa.has(s.ramal)) mapa.set(s.ramal, { ramal: s.ramal, nome: s.nome ?? `Ramal ${s.ramal}`, tipo: null });
    });
    const termo = busca.trim().toLowerCase();
    return Array.from(mapa.values())
      .filter((r) => !termo || r.nome.toLowerCase().includes(termo) || r.ramal.includes(termo))
      .sort((a, b) => a.ramal.localeCompare(b.ramal, "pt-BR", { numeric: true }));
  }, [cadastro, statusPorRamal, busca]);

  const resumo = useMemo(() => {
    let sistema = 0;
    let aparelho = 0;
    let emLigacao = 0;
    ramais.forEach((r) => {
      const s = statusPorRamal[r.ramal];
      if (s?.noSistema) sistema += 1;
      else if (s?.registradoPabx) aparelho += 1;
      if (s?.emChamada) emLigacao += 1;
    });
    return { sistema, aparelho, emLigacao, total: ramais.length };
  }, [ramais, statusPorRamal]);

  const cartoes = [
    { titulo: "Ramais cadastrados", valor: resumo.total, Icone: Users },
    { titulo: "Online pelo sistema", valor: resumo.sistema, Icone: Monitor },
    { titulo: "Online em aparelho SIP", valor: resumo.aparelho, Icone: Smartphone },
    { titulo: "Em ligação agora", valor: Math.max(resumo.emLigacao, chamadas.length), Icone: PhoneCall },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Phone className="h-6 w-6 text-primary" /> Painel de Telefonia SIP
            </h1>
            <p className="text-sm text-muted-foreground">
              Ramais, linhas e ligações da unidade em tempo real
            </p>
          </div>
          <Button variant="outline" onClick={() => void atualizar()} disabled={carregando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {pabxDisponivel === false && (
          <Alert>
            <AlertDescription>
              Não foi possível consultar o PABX ({motivoPabx}). A lista mostra apenas quem está conectado pelo
              sistema; telefones SIP físicos aparecem quando o PABX estiver acessível.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cartoes.map(({ titulo, valor, Icone }) => (
            <Card key={titulo}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{valor}</p>
                  <p className="text-xs text-muted-foreground">{titulo}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="ramais">
          <TabsList>
            <TabsTrigger value="ramais">Ramais</TabsTrigger>
            <TabsTrigger value="linhas">Linhas</TabsTrigger>
            <TabsTrigger value="ligacoes">Ligações</TabsTrigger>
          </TabsList>

          <TabsContent value="ramais" className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar nome ou ramal"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <Card>
              <CardContent className="p-0 divide-y">
                {ramais.length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground text-center">Nenhum ramal encontrado.</p>
                )}
                {ramais.map((r) => {
                  const s = statusPorRamal[r.ramal];
                  const online = Boolean(s?.noSistema || s?.registradoPabx);
                  return (
                    <div key={r.ramal} className="flex flex-wrap items-center gap-3 p-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          s?.emChamada ? "bg-amber-500" : online ? "bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{r.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Ramal {r.ramal}
                          {r.tipo ? ` · ${r.tipo}` : ""}
                          {s?.enderecoPabx ? ` · ${s.enderecoPabx}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {s?.origens.includes("web") && (
                          <Badge variant="secondary" className="gap-1">
                            <Monitor className="h-3 w-3" /> Sistema (web)
                          </Badge>
                        )}
                        {s?.origens.includes("apk") && (
                          <Badge variant="secondary" className="gap-1">
                            <Smartphone className="h-3 w-3" /> Aplicativo
                          </Badge>
                        )}
                        {s?.noAparelho && (
                          <Badge variant="secondary" className="gap-1">
                            <Wifi className="h-3 w-3" /> Aparelho SIP
                          </Badge>
                        )}
                        {s?.emChamada && <Badge className="bg-amber-500">Em ligação</Badge>}
                        {!online && <Badge variant="outline">Offline</Badge>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="linhas">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" /> Linhas / troncos do PABX
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {troncos.length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground text-center">
                    Nenhuma linha informada pelo PABX.
                  </p>
                )}
                {troncos.map((t, i) => (
                  <div key={`${t.nome ?? "linha"}-${i}`} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <p className="font-medium">{t.nome ?? "Linha"}</p>
                      <p className="text-xs text-muted-foreground">{t.tipo}</p>
                    </div>
                    <Badge variant={t.status === "Ativo" ? "secondary" : "destructive"}>{t.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ligacoes">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PhoneCall className="h-4 w-4" /> Ligações em andamento ({chamadas.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {chamadas.length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma ligação em andamento.</p>
                )}
                {chamadas.map((c, i) => (
                  <div key={`${c.canal ?? "canal"}-${i}`} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {c.origem ?? "—"} → {c.destino ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{c.canal}</p>
                    </div>
                    {c.duracao && <span className="text-xs text-muted-foreground">{c.duracao}</span>}
                    <Badge variant="secondary">{c.estado}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
