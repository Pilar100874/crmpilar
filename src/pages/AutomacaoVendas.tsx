import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft, Download, Upload } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import * as Blockly from "blockly";

export default function AutomacaoVendas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  
  const [automacaoNome, setAutomacaoNome] = useState("Nova Automação de Vendas");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!blocklyDiv.current || workspaceRef.current) return;

    // Definir blocos customizados
    Blockly.Blocks['inicio'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("🚀 Início da Automação");
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("Ponto inicial da automação");
      }
    };

    Blockly.Blocks['desconto_valor_compra'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("💰 Desconto por Valor de Compra");
        this.appendValueInput("VALOR_MIN")
          .setCheck("Number")
          .appendField("Valor mínimo R$:");
        this.appendValueInput("PERCENTUAL")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip("Aplica desconto baseado no valor da compra");
      }
    };

    Blockly.Blocks['desconto_quantidade_compras'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("🛒 Desconto por Quantidade de Compras");
        this.appendValueInput("QTD_MIN")
          .setCheck("Number")
          .appendField("Compras mínimas:");
        this.appendValueInput("PERCENTUAL")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(270);
        this.setTooltip("Desconto baseado no histórico de compras");
      }
    };

    Blockly.Blocks['desconto_produtos_grupo'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("📦 Desconto por Grupo de Produtos");
        this.appendDummyInput()
          .appendField("Grupo:")
          .appendField(new Blockly.FieldTextInput(""), "GRUPO");
        this.appendValueInput("PERCENTUAL")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(20);
        this.setTooltip("Desconto para produtos de grupo específico");
      }
    };

    Blockly.Blocks['desconto_pagamento_antecipado'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("💳 Desconto por Pagamento Antecipado");
        this.appendValueInput("DIAS")
          .setCheck("Number")
          .appendField("Dias de antecipação:");
        this.appendValueInput("PERCENTUAL")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(60);
        this.setTooltip("Desconto para pagamento antecipado");
      }
    };

    Blockly.Blocks['desconto_aniversario_cliente'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("🎂 Desconto Aniversário do Cliente");
        this.appendValueInput("DIAS_ANTES")
          .setCheck("Number")
          .appendField("Dias antes:");
        this.appendValueInput("DIAS_DEPOIS")
          .setCheck("Number")
          .appendField("Dias depois:");
        this.appendValueInput("PERCENTUAL")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Desconto no aniversário do cliente");
      }
    };

    Blockly.Blocks['desconto_aniversario_empresa'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("🏢 Desconto Aniversário da Empresa");
        this.appendValueInput("PERCENTUAL")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
        this.setTooltip("Desconto no aniversário da empresa");
      }
    };

    Blockly.Blocks['desconto_data_especial'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("📅 Desconto em Data Especial");
        this.appendDummyInput()
          .appendField("Data:")
          .appendField(new Blockly.FieldTextInput("2024-01-01"), "DATA");
        this.appendValueInput("PERCENTUAL")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(0);
        this.setTooltip("Desconto em datas especiais");
      }
    };

    Blockly.Blocks['desconto_historico_crescimento'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("📈 Desconto por Crescimento de Compras");
        this.appendValueInput("PERCENTUAL_CRESCIMENTO")
          .setCheck("Number")
          .appendField("Crescimento %:");
        this.appendValueInput("DESCONTO")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(180);
        this.setTooltip("Desconto baseado no crescimento");
      }
    };

    Blockly.Blocks['desconto_tempo_desde_ultimo'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("⏰ Desconto por Tempo Sem Comprar");
        this.appendValueInput("DIAS")
          .setCheck("Number")
          .appendField("Dias sem compra:");
        this.appendValueInput("PERCENTUAL")
          .setCheck("Number")
          .appendField("Desconto %:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(200);
        this.setTooltip("Desconto para reativar clientes");
      }
    };

    Blockly.Blocks['aplicar_desconto'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("✅ Aplicar Desconto");
        this.appendValueInput("VALOR")
          .setCheck("Number")
          .appendField("Valor/Percentual:");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
        this.setTooltip("Aplica o desconto calculado");
      }
    };

    Blockly.Blocks['fim'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("🏁 Fim da Automação");
        this.setPreviousStatement(true, null);
        this.setColour(210);
        this.setTooltip("Fim do fluxo");
      }
    };

    // Criar workspace
    workspaceRef.current = Blockly.inject(blocklyDiv.current, {
      toolbox: {
        kind: 'categoryToolbox',
        contents: [
          {
            kind: 'category',
            name: 'Início',
            colour: 160,
            contents: [
              { kind: 'block', type: 'inicio' }
            ]
          },
          {
            kind: 'category',
            name: 'Descontos por Valor',
            colour: 230,
            contents: [
              { kind: 'block', type: 'desconto_valor_compra' },
              { kind: 'block', type: 'desconto_quantidade_compras' }
            ]
          },
          {
            kind: 'category',
            name: 'Descontos por Produto',
            colour: 20,
            contents: [
              { kind: 'block', type: 'desconto_produtos_grupo' }
            ]
          },
          {
            kind: 'category',
            name: 'Descontos Especiais',
            colour: 60,
            contents: [
              { kind: 'block', type: 'desconto_pagamento_antecipado' },
              { kind: 'block', type: 'desconto_aniversario_cliente' },
              { kind: 'block', type: 'desconto_aniversario_empresa' },
              { kind: 'block', type: 'desconto_data_especial' }
            ]
          },
          {
            kind: 'category',
            name: 'Descontos por Histórico',
            colour: 180,
            contents: [
              { kind: 'block', type: 'desconto_historico_crescimento' },
              { kind: 'block', type: 'desconto_tempo_desde_ultimo' }
            ]
          },
          {
            kind: 'category',
            name: 'Ações',
            colour: 120,
            contents: [
              { kind: 'block', type: 'aplicar_desconto' },
              { kind: 'block', type: 'fim' }
            ]
          },
          {
            kind: 'sep'
          },
          {
            kind: 'category',
            name: 'Lógica',
            colour: 210,
            contents: [
              { kind: 'block', type: 'controls_if' },
              { kind: 'block', type: 'logic_compare' },
              { kind: 'block', type: 'logic_operation' },
              { kind: 'block', type: 'logic_negate' }
            ]
          },
          {
            kind: 'category',
            name: 'Matemática',
            colour: 230,
            contents: [
              { kind: 'block', type: 'math_number' },
              { kind: 'block', type: 'math_arithmetic' },
              { kind: 'block', type: 'math_single' }
            ]
          },
          {
            kind: 'category',
            name: 'Texto',
            colour: 160,
            contents: [
              { kind: 'block', type: 'text' },
              { kind: 'block', type: 'text_join' }
            ]
          },
          {
            kind: 'category',
            name: 'Variáveis',
            colour: 330,
            custom: 'VARIABLE'
          }
        ]
      },
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      trashcan: true,
      scrollbars: true,
      sounds: true,
      oneBasedIndex: false
    });

    if (id) {
      loadAutomacao(id);
    }

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, [id]);

  const loadAutomacao = async (automacaoId: string) => {
    try {
      const { data, error } = await supabase
        .from("automacoes_vendas")
        .select("*")
        .eq("id", automacaoId)
        .single();

      if (error) throw error;

      if (data) {
        setAutomacaoNome(data.nome);
        setIsAtiva(data.ativo);
        setPrioridade(data.prioridade || 0);

        const flowData = data.flow_data as any;
        if (flowData?.xml && workspaceRef.current) {
          const xml = Blockly.utils.xml.textToDom(flowData.xml);
          Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
        }

        toast.success("Automação carregada!");
      }
    } catch (error: any) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar automação");
    }
  };

  const handleSave = async () => {
    if (!workspaceRef.current) return;

    setIsSaving(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não identificado");
        return;
      }

      const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
      const xmlText = Blockly.Xml.domToText(xml);

      const automacaoData = {
        estabelecimento_id: estabelecimentoId,
        nome: automacaoNome,
        ativo: isAtiva,
        prioridade,
        flow_data: { xml: xmlText } as any,
      };

      if (id) {
        const { error } = await supabase
          .from("automacoes_vendas")
          .update(automacaoData)
          .eq("id", id);

        if (error) throw error;
        toast.success("Automação atualizada!");
      } else {
        const { data, error } = await supabase
          .from("automacoes_vendas")
          .insert(automacaoData)
          .select()
          .single();

        if (error) throw error;
        toast.success("Automação criada!");
        navigate(`/automacao-vendas/${data.id}`);
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar automação");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!workspaceRef.current) return;

    const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
    const xmlText = Blockly.Xml.domToText(xml);
    const blob = new Blob([xmlText], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${automacaoNome}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlText = event.target?.result as string;
        const xml = Blockly.utils.xml.textToDom(xmlText);
        workspaceRef.current?.clear();
        Blockly.Xml.domToWorkspace(xml, workspaceRef.current!);
        toast.success("Importado!");
      } catch (error) {
        toast.error("Erro ao importar");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={automacaoNome}
              onChange={(e) => setAutomacaoNome(e.target.value)}
              className="w-64"
              placeholder="Nome da automação"
            />
            <div className="flex items-center gap-2">
              <Switch id="ativa" checked={isAtiva} onCheckedChange={setIsAtiva} />
              <Label htmlFor="ativa">Ativa</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="prioridade">Prioridade:</Label>
              <Input
                id="prioridade"
                type="number"
                value={prioridade}
                onChange={(e) => setPrioridade(parseInt(e.target.value) || 0)}
                className="w-20"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <label>
                <Upload className="h-4 w-4 mr-2" />
                Importar
                <input type="file" accept=".xml" onChange={handleImport} className="hidden" />
              </label>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div ref={blocklyDiv} className="flex-1" />
      </div>
    </Layout>
  );
}
