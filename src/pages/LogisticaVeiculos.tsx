import React, { useState, useEffect } from 'react';
import { Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VeiculosCRUD } from '@/components/logistica/VeiculosCRUD';

const LogisticaVeiculos: React.FC = () => {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstabelecimento();
  }, []);

  const fetchEstabelecimento = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuario?.estabelecimento_id) {
        setEstabelecimentoId(usuario.estabelecimento_id);
      }
    } catch (error) {
      console.error('Error fetching estabelecimento:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!estabelecimentoId) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-muted-foreground">Estabelecimento não encontrado</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Car className="h-6 w-6" />
          Cadastro de Veículos
        </h1>
        <p className="text-muted-foreground">
          Gerencie os veículos da sua frota
        </p>
      </div>

      <VeiculosCRUD estabelecimentoId={estabelecimentoId} />
    </div>
  );
};

export default LogisticaVeiculos;