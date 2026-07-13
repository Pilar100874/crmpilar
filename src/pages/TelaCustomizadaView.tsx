import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FolderOpen, Link as LinkIcon, ArrowLeft, ChevronRight, LogOut } from "lucide-react";
import type { TelaCustomizada } from "./TelasCustomizadas";

export default function TelaCustomizadaView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const grupoParam = searchParams.get("grupo");

  const [items, setItems] = useState<TelaCustomizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState<TelaCustomizada[]>([]);
  const [currentParent, setCurrentParent] = useState<string | null>(id || null);
  const [isVinculado, setIsVinculado] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (!usuario) return;
      const { data: vinc } = await supabase
        .from("usuario_telas_customizadas")
        .select("tela_id")
        .eq("usuario_id", usuario.id)
        .limit(1)
        .maybeSingle();
      setIsVinculado(!!vinc?.tela_id);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Carrega a raiz e todos descendentes (mesmo estabelecimento por RLS).
        const { data, error } = await supabase
          .from("telas_customizadas")
          .select("*")
          .order("ordem", { ascending: true });
        if (error) throw error;
        setItems((data || []) as TelaCustomizada[]);

        // Descobre o "root" para iniciar
        const list = (data || []) as TelaCustomizada[];
        const root = list.find((d) => d.id === id);
        if (root) {
          // Se veio ?grupo=<id>, reconstrói o breadcrumb até esse grupo
          let chain: TelaCustomizada[] = [root];
          if (grupoParam && grupoParam !== root.id) {
            const path: TelaCustomizada[] = [];
            let cur = list.find((d) => d.id === grupoParam);
            while (cur && cur.id !== root.id) {
              path.unshift(cur);
              cur = list.find((d) => d.id === (cur as any).parent_id);
            }
            chain = [root, ...path];
          }
          setBreadcrumb(chain);
          setCurrentParent(chain[chain.length - 1].id);
        }
      } finally {
        setLoading(false);
      }

    })();
  }, [id]);

  const visible = useMemo(
    () => items.filter((i) => i.parent_id === currentParent),
    [items, currentParent]
  );

  const handleClick = (item: TelaCustomizada) => {
    if (item.tipo === "grupo") {
      setBreadcrumb((b) => [...b, item]);
      setCurrentParent(item.id);
    } else if (item.rota) {
      const sep = item.rota.includes("?") ? "&" : "?";
      const parts = ["notab=1", `fromtela=${id}`];
      // Preserva o grupo atual para o botão Voltar retornar ao submenu correto
      if (currentParent && currentParent !== id) parts.push(`fromgrupo=${currentParent}`);
      if (isVinculado) parts.push("solo=1");
      navigate(`${item.rota}${sep}${parts.join("&")}`);
    }

  };

  const goBack = () => {
    if (breadcrumb.length <= 1) {
      navigate(-1);
      return;
    }
    const nb = breadcrumb.slice(0, -1);
    setBreadcrumb(nb);
    setCurrentParent(nb[nb.length - 1].id);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      localStorage.removeItem("userType");
      localStorage.removeItem("userId");
      localStorage.removeItem("estabelecimentoId");
      window.location.href = "/";
    }
  };

  const title = breadcrumb[breadcrumb.length - 1]?.nome || "Tela Customizada";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <div key={b.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>
                  {b.nome}
                </span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="ml-auto">
            <LogOut className="w-4 h-4 mr-1" /> Sair
          </Button>
        </div>

        <h1 className="text-3xl font-bold">{title}</h1>

        {loading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : visible.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum botão configurado aqui.
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {visible.map((item) => (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="aspect-square rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center justify-center gap-3 text-center"
              >
                {item.tipo === "grupo" ? (
                  <FolderOpen className="w-12 h-12 text-primary" />
                ) : (
                  <LinkIcon className="w-12 h-12 text-primary" />
                )}
                <span className="font-semibold text-sm md:text-base leading-tight">
                  {item.nome}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
