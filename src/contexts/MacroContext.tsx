import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Macro, MacroStep, MacroRecordingState, MacroExecutionStatus } from '@/types/macro';
import { runMacro, setExecutionStatusCallback, cancelExecution } from '@/services/macroEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface MacroRecordingMeta {
  name: string;
  description?: string;
  shortcut?: string;
}

interface MacroContextType {
  macros: Macro[];
  isRecording: boolean;
  recordingSteps: MacroStep[];
  executionStatus: MacroExecutionStatus | null;
  recordingMeta: MacroRecordingMeta | null;
  
  // Gravação
  startRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  addRecordingStep: (step: Omit<MacroStep, 'id'>) => void;
  insertDelay: (ms: number) => void;
  clearRecordingSteps: () => void;
  setRecordingMeta: (meta: MacroRecordingMeta | null) => void;
  saveCurrentRecording: () => Promise<void>;
  
  // CRUD
  saveMacro: (name: string, description?: string, shortcut?: string) => Promise<void>;
  updateMacro: (macro: Macro) => Promise<void>;
  deleteMacro: (id: string) => Promise<void>;
  duplicateMacro: (id: string) => Promise<void>;
  
  // Execução
  executeMacro: (macroId: string) => Promise<void>;
  stopExecution: () => void;
  
  // Persistência
  loadMacros: () => Promise<void>;
  exportMacro: (macro: Macro) => string;
  importMacro: (json: string) => Promise<void>;
}

const MacroContext = createContext<MacroContextType | undefined>(undefined);

const STORAGE_KEY = 'macros_v1';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function MacroProvider({ children }: { children: ReactNode }) {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSteps, setRecordingSteps] = useState<MacroStep[]>([]);
  const [recordingMeta, setRecordingMeta] = useState<MacroRecordingMeta | null>(null);
  const [executionStatus, setExecutionStatus] = useState<MacroExecutionStatus | null>(null);
  const [userInfo, setUserInfo] = useState<{ usuarioId: string; estabelecimentoId: string } | null>(null);

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

  // Carregar macros do localStorage (fallback) e Supabase
  const loadMacros = useCallback(async () => {
    // Primeiro tenta localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const localMacros = JSON.parse(stored) as Macro[];
        setMacros(localMacros);
      } catch (e) {
        console.error('Erro ao parsear macros do localStorage:', e);
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
        // Atualiza localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseMacros));
      }
    }
  }, [userInfo]);

  useEffect(() => {
    loadMacros();
  }, [loadMacros]);

  // Salvar macro
  const saveMacro = useCallback(async (name: string, description?: string, shortcut?: string) => {
    if (recordingSteps.length === 0) {
      toast.error('Nenhum passo gravado');
      return;
    }

    const now = new Date().toISOString();
    const newMacro: Macro = {
      id: generateId(),
      name,
      description,
      shortcut,
      enabled: true,
      steps: recordingSteps,
      createdAt: now,
      updatedAt: now
    };

    // Salva no Supabase se logado
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
        console.error('Erro ao salvar macro no Supabase:', error);
        toast.error('Erro ao salvar macro');
        return;
      }
    }

    const updatedMacros = [...macros, newMacro];
    setMacros(updatedMacros);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMacros));
    setRecordingSteps([]);
    setIsRecording(false);
    toast.success('Macro salva com sucesso!');
  }, [recordingSteps, macros, userInfo]);

  // Atualizar macro
  const updateMacro = useCallback(async (macro: Macro) => {
    const updatedMacro = { ...macro, updatedAt: new Date().toISOString() };

    if (userInfo) {
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
        toast.error('Erro ao atualizar macro');
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
    // Primeiro remove localmente para evitar estados inconsistentes
    const updatedMacros = macros.filter(m => m.id !== id);
    setMacros(updatedMacros);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMacros));

    // Só tenta deletar no Supabase se for UUID válido
    if (userInfo && isValidUUID(id)) {
      try {
        const { error } = await supabase.from('user_macros').delete().eq('id', id);
        if (error) {
          console.error('Erro ao deletar macro no servidor:', error);
        }
      } catch (err) {
        console.error('Erro inesperado ao deletar macro:', err);
      }
    }

    toast.success('Macro excluída');
  }, [macros, userInfo]);

  // Duplicar macro
  const duplicateMacro = useCallback(async (id: string) => {
    const original = macros.find(m => m.id === id);
    if (!original) return;

    const now = new Date().toISOString();
    const duplicate: Macro = {
      ...original,
      id: generateId(),
      name: `${original.name} (cópia)`,
      shortcut: undefined,
      createdAt: now,
      updatedAt: now
    };

    if (userInfo) {
      await supabase.from('user_macros').insert({
        usuario_id: userInfo.usuarioId,
        estabelecimento_id: userInfo.estabelecimentoId,
        name: duplicate.name,
        description: duplicate.description,
        shortcut: duplicate.shortcut,
        enabled: duplicate.enabled,
        steps: duplicate.steps as unknown as Json
      });
    }

    const updatedMacros = [...macros, duplicate];
    setMacros(updatedMacros);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMacros));
    toast.success('Macro duplicada!');
  }, [macros, userInfo]);

  // Gravação
  const startRecording = useCallback(() => {
    setRecordingSteps([]);
    setIsRecording(true);
    toast.info('Gravação iniciada');
  }, []);

  const resumeRecording = useCallback(() => {
    if (recordingSteps.length === 0) {
      toast.error('Nenhum passo gravado para retomar');
      return;
    }
    setIsRecording(true);
    toast.info('Gravação retomada');
  }, [recordingSteps]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    toast.info('Gravação pausada');
  }, []);

  const addRecordingStep = useCallback((step: Omit<MacroStep, 'id'>) => {
    if (!isRecording) return;
    
    const newStep: MacroStep = {
      ...step,
      id: generateId(),
      enabled: true
    };
    setRecordingSteps(prev => [...prev, newStep]);
  }, [isRecording]);

  const insertDelay = useCallback((ms: number) => {
    if (!isRecording) return;
    
    const delayStep: MacroStep = {
      id: generateId(),
      type: 'wait',
      ms,
      enabled: true,
      meta: { label: `Aguardar ${ms}ms` }
    };
    setRecordingSteps(prev => [...prev, delayStep]);
  }, [isRecording]);

  const clearRecordingSteps = useCallback(() => {
    setRecordingSteps([]);
  }, []);

  const saveCurrentRecording = useCallback(async () => {
    if (!recordingMeta) {
      toast.error('Preencha nome, descrição e atalho na aba Gravador antes de salvar');
      return;
    }

    await saveMacro(recordingMeta.name, recordingMeta.description, recordingMeta.shortcut);
    setRecordingMeta(null);
  }, [recordingMeta, saveMacro]);

  // Execução
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
      toast.error(`Erro na macro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, [macros]);

  const stopExecution = useCallback(() => {
    cancelExecution();
  }, []);

  // Export/Import
  const exportMacro = useCallback((macro: Macro): string => {
    return JSON.stringify(macro, null, 2);
  }, []);

  const importMacro = useCallback(async (json: string) => {
    try {
      const imported = JSON.parse(json) as Macro;
      
      // Valida estrutura básica
      if (!imported.name || !Array.isArray(imported.steps)) {
        throw new Error('Formato de macro inválido');
      }

      const now = new Date().toISOString();
      const newMacro: Macro = {
        ...imported,
        id: generateId(),
        shortcut: undefined, // Limpa atalho para evitar conflitos
        createdAt: now,
        updatedAt: now
      };

      if (userInfo) {
        await supabase.from('user_macros').insert({
          usuario_id: userInfo.usuarioId,
          estabelecimento_id: userInfo.estabelecimentoId,
          name: newMacro.name,
          description: newMacro.description,
          shortcut: newMacro.shortcut,
          enabled: newMacro.enabled,
          steps: newMacro.steps as unknown as Json
        });
      }

      const updatedMacros = [...macros, newMacro];
      setMacros(updatedMacros);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMacros));
      toast.success('Macro importada!');
    } catch (error) {
      toast.error('Erro ao importar macro');
      console.error(error);
    }
  }, [macros, userInfo]);

  return (
    <MacroContext.Provider value={{
      macros,
      isRecording,
      recordingSteps,
      executionStatus,
      recordingMeta,
      startRecording,
      resumeRecording,
      stopRecording,
      addRecordingStep,
      insertDelay,
      clearRecordingSteps,
      setRecordingMeta,
      saveCurrentRecording,
      saveMacro,
      updateMacro,
      deleteMacro,
      duplicateMacro,
      executeMacro,
      stopExecution,
      loadMacros,
      exportMacro,
      importMacro
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
