import { useEffect, useRef, useState } from 'react';
import { ContactForBulkSend, CanalEnvio } from '../types';
import { executarSequencial, ItemEnvio, ResultadoEnvio } from './execucaoSequencial';

export function useExecucaoEnvio() {
  const [itensEnvio, setItens] = useState<ItemEnvio[]>([]);
  const [isSending, setEnviando] = useState(false);
  const [cancelamentoSolicitado, setCancelamento] = useState(false);
  const ativo = useRef(false);
  const cancelarRef = useRef(false);
  useEffect(() => () => { cancelarRef.current = true; }, []);

  const cancelarEnvio = () => {
    cancelarRef.current = true;
    setCancelamento(true);
  };

  const executarEnvio = async (
    contatos: ContactForBulkSend[], canal: CanalEnvio | null,
    processar: (contato: ContactForBulkSend, indice: number) => Promise<ResultadoEnvio>,
  ) => {
    if (ativo.current) return;
    ativo.current = true;
    cancelarRef.current = false;
    setCancelamento(false);
    setEnviando(true);
    setItens(contatos.map(c => ({ id: c.id, nome: c.nome, destino: (canal === 'email' ? c.email : c.telefone) || undefined, status: 'aguardando' })));
    try {
      await executarSequencial(contatos, () => cancelarRef.current, processar, (indice, resultado) => {
        setItens(anteriores => anteriores.map((item, i) => i === indice ? { ...item, ...resultado } : item));
      });
    } finally {
      ativo.current = false;
      setEnviando(false);
    }
  };
  const finalizados = itensEnvio.filter(i => !['aguardando', 'processando'].includes(i.status)).length;
  return { itensEnvio, isSending, cancelamentoSolicitado, cancelarEnvio, executarEnvio,
    sendProgress: itensEnvio.length ? finalizados / itensEnvio.length * 100 : 0 };
}