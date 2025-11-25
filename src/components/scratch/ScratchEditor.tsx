/**
 * Editor de Regras usando Scratch Blocks
 * Alternativa ao Google Blockly
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Code, Save } from "lucide-react";
import { toast } from "@/lib/toast-config";

// @ts-ignore - Scratch Blocks pode não ter tipos TypeScript
import * as ScratchBlocks from 'scratch-blocks';

export function ScratchEditor() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [jsonCode, setJsonCode] = useState("");

  useEffect(() => {
    if (!workspaceRef.current || workspace) return;

    try {
      // Configurar toolbox
      const toolbox = `
        <xml id="toolbox" style="display: none">
          <category name="Lógica" colour="#5C81A6">
            <block type="control_if"></block>
            <block type="operator_equals"></block>
            <block type="operator_gt"></block>
            <block type="operator_lt"></block>
            <block type="operator_and"></block>
            <block type="operator_or"></block>
          </category>
          <category name="Matemática" colour="#5CA65C">
            <block type="math_number"></block>
            <block type="operator_add"></block>
            <block type="operator_subtract"></block>
            <block type="operator_multiply"></block>
            <block type="operator_divide"></block>
          </category>
          <category name="Orçamento" colour="#A65C81">
            <block type="valor_total"></block>
            <block type="mes_compra"></block>
            <block type="mes_aniversario"></block>
          </category>
          <category name="Ações" colour="#A6815C">
            <block type="desconto_percentual"></block>
            <block type="desconto_fixo"></block>
            <block type="adicionar_frete"></block>
          </category>
        </xml>
      `;

      // Criar workspace
      const ws = ScratchBlocks.inject(workspaceRef.current, {
        toolbox: toolbox,
        media: 'media/',
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2
        },
        grid: {
          spacing: 20,
          length: 3,
          colour: '#ccc',
          snap: true
        },
        trashcan: true
      });

      // Definir blocos customizados
      defineCustomBlocks();

      setWorkspace(ws);
    } catch (error) {
      console.error("Erro ao inicializar Scratch Blocks:", error);
      toast.error("Erro ao carregar editor");
    }

    return () => {
      if (workspace) {
        workspace.dispose();
      }
    };
  }, []);

  const defineCustomBlocks = () => {
    // Bloco: valor_total
    ScratchBlocks.Blocks['valor_total'] = {
      init: function() {
        this.jsonInit({
          "message0": "valor total do orçamento",
          "output": "Number",
          "colour": 160,
          "tooltip": "Retorna o valor total do orçamento"
        });
      }
    };

    // Bloco: mes_compra
    ScratchBlocks.Blocks['mes_compra'] = {
      init: function() {
        this.jsonInit({
          "message0": "mês da compra",
          "output": "Number",
          "colour": 160,
          "tooltip": "Retorna o mês da compra (1-12)"
        });
      }
    };

    // Bloco: mes_aniversario
    ScratchBlocks.Blocks['mes_aniversario'] = {
      init: function() {
        this.jsonInit({
          "message0": "mês de aniversário do cliente",
          "output": "Number",
          "colour": 160,
          "tooltip": "Retorna o mês de aniversário"
        });
      }
    };

    // Bloco: desconto_percentual
    ScratchBlocks.Blocks['desconto_percentual'] = {
      init: function() {
        this.jsonInit({
          "message0": "aplicar desconto de %1 %",
          "args0": [
            {
              "type": "input_value",
              "name": "PERCENTUAL",
              "check": "Number"
            }
          ],
          "previousStatement": null,
          "nextStatement": null,
          "colour": 290,
          "tooltip": "Aplica desconto percentual"
        });
      }
    };

    // Bloco: desconto_fixo
    ScratchBlocks.Blocks['desconto_fixo'] = {
      init: function() {
        this.jsonInit({
          "message0": "aplicar desconto fixo de R$ %1",
          "args0": [
            {
              "type": "input_value",
              "name": "VALOR",
              "check": "Number"
            }
          ],
          "previousStatement": null,
          "nextStatement": null,
          "colour": 290,
          "tooltip": "Aplica desconto fixo"
        });
      }
    };

    // Bloco: adicionar_frete
    ScratchBlocks.Blocks['adicionar_frete'] = {
      init: function() {
        this.jsonInit({
          "message0": "adicionar frete de R$ %1",
          "args0": [
            {
              "type": "input_value",
              "name": "VALOR",
              "check": "Number"
            }
          ],
          "previousStatement": null,
          "nextStatement": null,
          "colour": 290,
          "tooltip": "Adiciona valor de frete"
        });
      }
    };
  };

  const exportRule = () => {
    if (!workspace) {
      toast.error("Editor não inicializado");
      return;
    }

    try {
      // Exportar XML
      const xml = ScratchBlocks.Xml.workspaceToDom(workspace);
      const xmlText = ScratchBlocks.Xml.domToText(xml);

      // Converter para JSON estruturado
      const blocks = workspace.getAllBlocks(false);
      const rule = {
        name: "Regra de Automação",
        trigger: "onBudgetCalculate",
        conditions: [],
        actions: [],
        xml: xmlText,
        blocks: blocks.map((block: any) => ({
          type: block.type,
          id: block.id
        }))
      };

      setJsonCode(JSON.stringify(rule, null, 2));
      toast.success("Regra exportada!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar regra");
    }
  };

  const downloadJSON = () => {
    if (!jsonCode) {
      toast.error("Exporte a regra primeiro");
      return;
    }

    const blob = new Blob([jsonCode], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "regra-scratch.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON baixado!");
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Workspace */}
      <Card className="flex-1">
        <div 
          ref={workspaceRef} 
          className="h-full w-full"
          style={{ minHeight: '500px' }}
        />
      </Card>

      {/* Controles */}
      <div className="flex gap-2">
        <Button onClick={exportRule}>
          <Code className="w-4 h-4 mr-2" />
          Exportar Regra
        </Button>
        <Button onClick={downloadJSON} variant="outline" disabled={!jsonCode}>
          <Download className="w-4 h-4 mr-2" />
          Baixar JSON
        </Button>
      </div>

      {/* Preview JSON */}
      {jsonCode && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">JSON da Regra</h3>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">
            {jsonCode}
          </pre>
        </Card>
      )}
    </div>
  );
}
