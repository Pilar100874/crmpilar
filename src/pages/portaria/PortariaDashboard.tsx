import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Cpu, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortariaPerfil } from "@/lib/portaria/api";
import BotaoAbrirAcesso, { AcessoCard } from "@/components/portaria/BotaoAbrirAcesso";

export default function PortariaDashboard() {
  const navigate = useNavigate();
  const { isStaff, isGestor } = usePortariaPerfil();
  const [acessos, setAcessos] = useState<AcessoCard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [totais, setTotais] = useState({ pessoas: 0, visitantes: 0, dispositivos: 0, eventos: 0 });

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("port_access_points")
      .select("id, nome, tipo, confirmar_abertura, ordem, device:port_devices(id, nome, status, habilitado, ultima_comunicacao)")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    const lista = (data ?? []) as unknown as AcessoCard[];

    const { data: comandos } = await supabase
      .from("port_remote_commands")
      .select("access_point_id, created_at")
      .eq("resultado", "sucesso")
      .order("created_at", { ascending: false })
      .limit(100);

    const ultimos = new Map<string, string>();
    (comandos ?? []).forEach((c) => {
      if (c.access_point_id && !ultimos.has(c.access_point_id)) ultimos.set(c.access_point_id, c.created_at);
    });

    setAcessos(lista.map((a) => ({ ...a, ultimo_acionamento: ultimos.get(a.id) ?? null })));
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const [pessoas, visitantes, dispositivos, eventos] = await Promise.all([
        supabase.from("port_people").select("id", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("port_visitors").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("port_devices").select("id", { count: "exact", head: true }).eq("habilitado", true),
        supabase.from("port_access_events").select("id", { count: "exact", head: true }).gte("created_at", hoje.toISOString()),
      ]);
      setTotais({
        pessoas: pessoas.count ?? 0,
        visitantes: visitantes.count ?? 0,
        dispositivos: dispositivos.count ?? 0,
        eventos: eventos.count ?? 0,
      });
    })();
  }, [isStaff]);

  const cards = [
    { label: "Pessoas ativas", valor: totais.pessoas, icon: Users, to: "/portaria/pessoas", visivel: isStaff },
    { label: "Visitantes ativos", valor: totais.visitantes, icon: UserPlus, to: "/portaria/visitantes", visivel: isStaff },
    { label: "Dispositivos", valor: totais.dispositivos, icon: Cpu, to: "/portaria/dispositivos", visivel: isGestor },
    { label: "Eventos hoje", valor: totais.eventos, icon: History, to: "/portaria/historico", visivel: isStaff },
  ].filter((c) => c.visivel);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Acessos rápidos</h2>
        <p className="text-sm text-muted-foreground">Toque para liberar a entrada. Tudo fica registrado.</p>
      </div>

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : acessos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum ponto de acesso configurado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {acessos.map((a) => <BotaoAbrirAcesso key={a.id} acesso={a} onAberto={carregar} />)}
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                onClick={() => navigate(c.to)}
                className="rounded-xl border bg-card p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <Icon className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold mt-2">{c.valor}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
