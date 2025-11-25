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
import { Download, Upload, FileJson, Save } from "lucide-react";
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
  const [jsonPreview, setJsonPreview] = useState("");
  
  // Campos para salvar no banco
  const [nomeRegra, setNomeRegra] = useState("Nova Regra de Automação");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Carregar regra se tiver ID
    if (ruleId) {
      loadRegra(ruleId);
    }

    // Escutar mensagens do iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'BLOCKLY_EXPORT') {
        const rule: BlocklyRule = event.data.data;
        setCurrentRule(rule);
        setJsonPreview(JSON.stringify(rule, null, 2));
        toast.success("Regra recebida do editor!");
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ruleId]);

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

  const downloadJSON = () => {
    if (!currentRule) {
      toast.error("Nenhuma regra para baixar");
      return;
    }

    const blob = new Blob([JSON.stringify(currentRule, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regra-automacao-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON baixado!");
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.xml) {
          loadXmlToEditor(data.xml);
          setCurrentRule(data);
          toast.success("Regra importada!");
        }
      } catch (error) {
        toast.error("Erro ao importar JSON");
      }
    };
    reader.readAsText(file);
  };

  const salvarRegra = async () => {
    if (!currentRule) {
      toast.error("Exporte a regra primeiro antes de salvar");
      return;
    }

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
        flow_data: currentRule as any,
        descricao: `Regra criada com ${currentRule.blocks.length} blocos`
      };

      if (ruleId) {
        // Atualizar
        const { error } = await supabase
          .from("automacoes_vendas")
          .update(automacaoData)
          .eq("id", ruleId);

        if (error) throw error;
        toast.success("Regra atualizada no banco!");
      } else {
        // Criar nova
        const { data, error } = await supabase
          .from("automacoes_vendas")
          .insert(automacaoData)
          .select()
          .single();

        if (error) throw error;
        toast.success("Regra salva no banco!");
        
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
        <Button onClick={salvarRegra} disabled={isSaving || !currentRule}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvando..." : ruleId ? "Atualizar" : "Salvar no Sistema"}
        </Button>
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Importar JSON
            <input
              type="file"
              accept=".json"
              onChange={importJSON}
              className="hidden"
            />
          </label>
        </Button>
        <Button variant="outline" onClick={downloadJSON} disabled={!currentRule}>
          <Download className="w-4 h-4 mr-2" />
          Baixar JSON
        </Button>
      </div>

      {/* Preview JSON */}
      {jsonPreview && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">JSON da Regra</h3>
            <FileJson className="w-4 h-4 text-muted-foreground" />
          </div>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">
            {jsonPreview}
          </pre>
        </Card>
      )}
    </div>
  );
}
