/**
 * Editor de Regras usando Blockly em Iframe
 * Solução isolada que evita problemas de compilação TypeScript
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface BlocklyRule {
  name: string;
  trigger: string;
  xml: string;
  code: string;
  blocks: Array<{ type: string; id: string }>;
  timestamp: string;
}

interface ScratchEditorProps {
  ruleId?: string;
}

export function ScratchEditor({ ruleId }: ScratchEditorProps) {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentRule, setCurrentRule] = useState<BlocklyRule | null>(null);
  
  // Campos para salvar no banco
  const [nomeRegra, setNomeRegra] = useState("Nova Regra de Automação");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveAfterExport, setAutoSaveAfterExport] = useState(false);

  useEffect(() => {
    // Carregar regra se tiver ID
    if (ruleId) {
      loadRegra(ruleId);
    }

    // Escutar mensagens do iframe
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'BLOCKLY_EXPORT') {
        const rule: BlocklyRule = event.data.data;
        setCurrentRule(rule);
        
        // Se autoSave está ativo, salvar automaticamente
        if (autoSaveAfterExport) {
          await salvarRegraAoBanco(rule);
          setAutoSaveAfterExport(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ruleId, autoSaveAfterExport, nomeRegra, isAtiva, prioridade]);

  const loadRegra = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("automacoes_vendas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setNomeRegra(data.nome);
        setIsAtiva(data.ativo);
        setPrioridade(data.prioridade || 0);

        const flowData = data.flow_data as any;
        if (flowData?.xml) {
          loadXmlToEditor(flowData.xml);
          setCurrentRule(flowData);
        }

        toast.success("Regra carregada!");
      }
    } catch (error: any) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar regra");
    }
  };

  const loadXmlToEditor = (xml: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'LOAD_XML',
        xml: xml
      }, '*');
    }
  };

  const salvarRegraAoBanco = async (rule: BlocklyRule) => {
    setIsSaving(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não identificado");
        return;
      }

      const automacaoData = {
        estabelecimento_id: estabelecimentoId,
        nome: nomeRegra,
        ativo: isAtiva,
        prioridade,
        flow_data: rule as any,
        descricao: `Regra com ${rule.blocks.length} blocos`
      };

      if (ruleId) {
        // Atualizar
        const { error } = await supabase
          .from("automacoes_vendas")
          .update(automacaoData)
          .eq("id", ruleId);

        if (error) throw error;
        toast.success("Regra atualizada!");
      } else {
        // Criar nova
        const { data, error } = await supabase
          .from("automacoes_vendas")
          .insert(automacaoData)
          .select()
          .single();

        if (error) throw error;
        toast.success("Regra salva!");
        
        // Navegar para edição da regra criada
        if (data?.id) {
          navigate(`/editor-regras/${data.id}`);
        }
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar no banco");
    } finally {
      setIsSaving(false);
    }
  };

  const salvarRegra = () => {
    if (!nomeRegra.trim()) {
      toast.error("Digite um nome para a regra");
      return;
    }
    
    // Ativar flag para salvar após exportação
    setAutoSaveAfterExport(true);
    setIsSaving(true);
    
    // Pedir para o iframe exportar
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'EXPORT_RULE'
      }, '*');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Configurações da Regra */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="nome">Nome da Regra</Label>
            <Input
              id="nome"
              value={nomeRegra}
              onChange={(e) => setNomeRegra(e.target.value)}
              placeholder="Ex: Desconto Aniversário"
            />
          </div>
          <div>
            <Label htmlFor="prioridade">Prioridade</Label>
            <Input
              id="prioridade"
              type="number"
              value={prioridade}
              onChange={(e) => setPrioridade(parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2">
              <Switch id="ativa" checked={isAtiva} onCheckedChange={setIsAtiva} />
              <Label htmlFor="ativa">Regra Ativa</Label>
            </div>
          </div>
        </div>
      </Card>

      {/* Editor Blockly em Iframe */}
      <Card className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          src="/blockly-editor.html"
          className="w-full h-full border-0"
          title="Editor Blockly"
        />
      </Card>

      {/* Controles */}
      <div className="flex gap-2">
        <Button onClick={salvarRegra} disabled={isSaving || !nomeRegra.trim()}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvando..." : ruleId ? "Atualizar" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
