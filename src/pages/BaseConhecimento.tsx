import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import KnowledgeBaseCRUD from "@/components/config/KnowledgeBaseCRUD";

export default function BaseConhecimento() {
  const navigate = useNavigate();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstabelecimentoId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("auth_user_id", user.id)
        .single();

      if (usuario?.estabelecimento_id) {
        setEstabelecimentoId(usuario.estabelecimento_id);
      }
    };

    fetchEstabelecimentoId();
  }, [navigate]);

  if (!estabelecimentoId) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground">
            Gerencie artigos e categorias da base de conhecimento
          </p>
        </div>
        <KnowledgeBaseCRUD estabelecimentoId={estabelecimentoId} />
      </div>
    </Layout>
  );
}
