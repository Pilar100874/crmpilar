import React, { useState, useEffect } from 'react';
import { Car } from 'lucide-react';
import { toast } from 'sonner';
import { VeiculosCRUD } from '@/components/logistica/VeiculosCRUD';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

const LogisticaVeiculos: React.FC = () => {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstabelecimento();
  }, []);

  const fetchEstabelecimento = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (estabId) {
        setEstabelecimentoId(estabId);
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
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Car className="h-5 w-5 sm:h-6 sm:w-6" />
          Cadastro de Veículos
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os veículos da sua frota
        </p>
      </div>

      <VeiculosCRUD estabelecimentoId={estabelecimentoId} />
    </div>
  );
};

export default LogisticaVeiculos;