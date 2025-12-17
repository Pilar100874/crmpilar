import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Macro, MacroStep, MacroExecutionStatus } from '@/types/macro';
import { runMacro, setExecutionStatusCallback, cancelExecution } from '@/services/macroEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface MacroContextType {
  macros: Macro[];
  executionStatus: MacroExecutionStatus | null;
  showFloatingButton: boolean;
  setShowFloatingButton: (show: boolean) => void;
  showQuickAccessMenu: boolean;
  setShowQuickAccessMenu: (show: boolean) => void;
  quickAccessMacroIds: string[];
  setQuickAccessMacroIds: (ids: string[]) => void;
  toggleQuickAccessMacro: (id: string) => void;
  
  // CRUD
  saveMacro: (macro: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMacro: (macro: Macro) => Promise<void>;
  deleteMacro: (id: string) => Promise<void>;
  
  // Execução
  executeMacro: (macroId: string) => Promise<void>;
  stopExecution: () => void;
  
  // Persistência
  loadMacros: () => Promise<void>;
}

const MacroContext = createContext<MacroContextType | null>(null);

const STORAGE_KEY = 'macros_v2';
const FLOATING_BUTTON_KEY = 'macro_floating_button_visible';
const QUICK_ACCESS_MENU_KEY = 'macro_quick_access_menu_visible';
const QUICK_ACCESS_MACROS_KEY = 'macro_quick_access_ids';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function MacroProvider({ children }: { children: ReactNode }) {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [executionStatus, setExecutionStatus] = useState<MacroExecutionStatus | null>(null);
  const [userInfo, setUserInfo] = useState<{ usuarioId: string; estabelecimentoId: string } | null>(null);
  const [showFloatingButton, setShowFloatingButtonState] = useState<boolean>(() => {
    const stored = localStorage.getItem(FLOATING_BUTTON_KEY);
    return stored === 'true';
  });
  const [showQuickAccessMenu, setShowQuickAccessMenuState] = useState<boolean>(() => {
    const stored = localStorage.getItem(QUICK_ACCESS_MENU_KEY);
    return stored === 'true';
  });
  const [quickAccessMacroIds, setQuickAccessMacroIdsState] = useState<string[]>(() => {
    const stored = localStorage.getItem(QUICK_ACCESS_MACROS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const setShowFloatingButton = useCallback((show: boolean) => {
    setShowFloatingButtonState(show);
    localStorage.setItem(FLOATING_BUTTON_KEY, String(show));
  }, []);

  const setShowQuickAccessMenu = useCallback((show: boolean) => {
    setShowQuickAccessMenuState(show);
    localStorage.setItem(QUICK_ACCESS_MENU_KEY, String(show));
  }, []);

  const setQuickAccessMacroIds = useCallback((ids: string[]) => {
    setQuickAccessMacroIdsState(ids);
    localStorage.setItem(QUICK_ACCESS_MACROS_KEY, JSON.stringify(ids));
  }, []);

  const toggleQuickAccessMacro = useCallback((id: string) => {
    setQuickAccessMacroIdsState(prev => {
      const newIds = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem(QUICK_ACCESS_MACROS_KEY, JSON.stringify(newIds));
      return newIds;
    });
  }, []);

  // Carregar informações do usuário
  useEffect(() => {
    const loadUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('id, estabelecimento_id')
          .eq('auth_user_id', user.id)
          .single();
        
        if (usuario) {
          setUserInfo({
            usuarioId: usuario.id,
            estabelecimentoId: usuario.estabelecimento_id
          });
        }
      }
    };
    loadUserInfo();
  }, []);

  // Configurar callback de status
  useEffect(() => {
    setExecutionStatusCallback(setExecutionStatus);
  }, []);

  // Carregar macros
  const loadMacros = useCallback(async () => {
    // Primeiro tenta localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const localMacros = JSON.parse(stored) as Macro[];
        setMacros(localMacros);
      } catch (e) {
        console.error('Erro ao parsear macros:', e);
      }
    }

    // Depois tenta Supabase
    if (userInfo) {
      const { data, error } = await supabase
        .from('user_macros')
        .select('*')
        .eq('usuario_id', userInfo.usuarioId);
      
      if (!error && data) {
        const supabaseMacros: Macro[] = data.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description || undefined,
          shortcut: m.shortcut || undefined,
          enabled: m.enabled ?? true,
          steps: (m.steps as unknown as MacroStep[]) || [],
          createdAt: m.created_at,
          updatedAt: m.updated_at
        }));
        setMacros(supabaseMacros);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseMacros));
      }
    }
  }, [userInfo]);

  useEffect(() => {
    loadMacros();
  }, [loadMacros]);

  // Salvar macro
  const saveMacro = useCallback(async (macroData: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Verificar se já existe macro com mesmo nome
    const existingMacro = macros.find(m => m.name.toLowerCase().trim() === macroData.name.toLowerCase().trim());
    if (existingMacro) {
      toast.error('Já existe uma macro com este nome');
      return;
    }

    const now = new Date().toISOString();
    const newMacro: Macro = {
      ...macroData,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };

    if (userInfo) {
      const { error } = await supabase.from('user_macros').insert({
        usuario_id: userInfo.usuarioId,
        estabelecimento_id: userInfo.estabelecimentoId,
        name: newMacro.name,
        description: newMacro.description,
        shortcut: newMacro.shortcut,
        enabled: newMacro.enabled,
        steps: newMacro.steps as unknown as Json
      });

      if (error) {
        console.error('Erro ao salvar macro:', error);
        toast.error('Erro ao salvar macro');
        return;
      }
    }

    const updatedMacros = [...macros, newMacro];
    setMacros(updatedMacros);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMacros));
    toast.success('Macro salva!');
  }, [macros, userInfo]);

  // Atualizar macro
  const updateMacro = useCallback(async (macro: Macro) => {
    // Verificar se já existe outra macro com mesmo nome
    const existingMacro = macros.find(m => m.id !== macro.id && m.name.toLowerCase().trim() === macro.name.toLowerCase().trim());
    if (existingMacro) {
      toast.error('Já existe uma macro com este nome');
      return;
    }

    const updatedMacro = { ...macro, updatedAt: new Date().toISOString() };

    if (userInfo && isValidUUID(macro.id)) {
      const { error } = await supabase
        .from('user_macros')
        .update({
          name: updatedMacro.name,
          description: updatedMacro.description,
          shortcut: updatedMacro.shortcut,
          enabled: updatedMacro.enabled,
          steps: updatedMacro.steps as unknown as Json
        })
        .eq('id', macro.id);

      if (error) {
        console.error('Erro ao atualizar macro:', error);
        toast.error('Erro ao atualizar');
        return;
      }
    }

    const updatedMacros = macros.map(m => m.id === macro.id ? updatedMacro : m);
    setMacros(updatedMacros);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMacros));
    toast.success('Macro atualizada!');
  }, [macros, userInfo]);

  // Deletar macro
  const deleteMacro = useCallback(async (id: string) => {
    const updatedMacros = macros.filter(m => m.id !== id);
    setMacros(updatedMacros);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMacros));

    if (userInfo && isValidUUID(id)) {
      await supabase.from('user_macros').delete().eq('id', id);
    }

    toast.success('Macro excluída');
  }, [macros, userInfo]);

  // Executar macro
  const executeMacro = useCallback(async (macroId: string) => {
    const macro = macros.find(m => m.id === macroId);
    if (!macro) {
      toast.error('Macro não encontrada');
      return;
    }

    if (!macro.enabled) {
      toast.warning('Macro desabilitada');
      return;
    }

    try {
      await runMacro(macro);
      toast.success(`Macro "${macro.name}" executada!`);
    } catch (error) {
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, [macros]);

  const stopExecution = useCallback(() => {
    cancelExecution();
  }, []);

  return (
    <MacroContext.Provider value={{
      macros,
      executionStatus,
      showFloatingButton,
      setShowFloatingButton,
      showQuickAccessMenu,
      setShowQuickAccessMenu,
      quickAccessMacroIds,
      setQuickAccessMacroIds,
      toggleQuickAccessMacro,
      saveMacro,
      updateMacro,
      deleteMacro,
      executeMacro,
      stopExecution,
      loadMacros
    }}>
      {children}
    </MacroContext.Provider>
  );
}

export function useMacro() {
  const context = useContext(MacroContext);
  if (!context) {
    throw new Error('useMacro deve ser usado dentro de MacroProvider');
  }
  return context;
}
