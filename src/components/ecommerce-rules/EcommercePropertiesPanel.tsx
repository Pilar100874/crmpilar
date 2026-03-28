import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { Node } from "@xyflow/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ECOMMERCE_RULE_BLOCKS } from "@/types/ecommerceRules";
import { Checkbox } from "@/components/ui/checkbox";

interface EcommercePropertiesPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

const DIAS_SEMANA = [
  { value: "seg", label: "Segunda" },
  { value: "ter", label: "Terça" },
  { value: "qua", label: "Quarta" },
  { value: "qui", label: "Quinta" },
  { value: "sex", label: "Sexta" },
  { value: "sab", label: "Sábado" },
  { value: "dom", label: "Domingo" },
];

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export const EcommercePropertiesPanel = ({ node, onUpdate, onDelete, onClose }: EcommercePropertiesPanelProps) => {
  const nodeData = node.data as any;
  const blockDef = ECOMMERCE_RULE_BLOCKS.find(b => b.type === nodeData.type);
  const [label, setLabel] = useState(nodeData.label || "");
  const [note, setNote] = useState(nodeData.note || "");
  const [config, setConfig] = useState<Record<string, any>>(nodeData.config || {});

  useEffect(() => {
    setLabel(nodeData.label || "");
    setNote(nodeData.note || "");
    setConfig(nodeData.config || {});
  }, [node.id]);

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(node.id, { ...nodeData, config: newConfig });
  };

  const saveLabel = () => {
    onUpdate(node.id, { ...nodeData, label, note, config });
  };

  useEffect(() => {
    const timeout = setTimeout(saveLabel, 300);
    return () => clearTimeout(timeout);
  }, [label, note]);

  const renderConfigFields = () => {
    const type = nodeData.type;

    switch (type) {
      case "condicao_valor_carrinho":
      case "condicao_quantidade_itens":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Operador</Label>
              <Select value={config.operador || ">"} onValueChange={v => updateConfig("operador", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Maior que</SelectItem>
                  <SelectItem value=">=">Maior ou igual</SelectItem>
                  <SelectItem value="=">Igual a</SelectItem>
                  <SelectItem value="<">Menor que</SelectItem>
                  <SelectItem value="<=">Menor ou igual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor</Label>
              <Input type="number" value={config.valor || 0} onChange={e => updateConfig("valor", Number(e.target.value))} />
            </div>
          </div>
        );

      case "condicao_tipo_cliente":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={config.tipo || "b2c"} onValueChange={v => updateConfig("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="b2c">B2C (Pessoa Física)</SelectItem>
                <SelectItem value="b2b">B2B (Pessoa Jurídica)</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "condicao_cliente_recorrente":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Mín. compras anteriores</Label>
            <Input type="number" value={config.minCompras || 3} onChange={e => updateConfig("minCompras", Number(e.target.value))} />
          </div>
        );

      case "condicao_regiao_entrega":
        return (
          <div className="space-y-3">
            <Label className="text-xs">UFs permitidas</Label>
            <div className="grid grid-cols-5 gap-1">
              {UFS.map(uf => (
                <label key={uf} className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={(config.ufs || []).includes(uf)}
                    onCheckedChange={(checked) => {
                      const current = config.ufs || [];
                      updateConfig("ufs", checked ? [...current, uf] : current.filter((u: string) => u !== uf));
                    }}
                  />
                  {uf}
                </label>
              ))}
            </div>
          </div>
        );

      case "condicao_periodo":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={config.dataInicio || ""} onChange={e => updateConfig("dataInicio", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={config.dataFim || ""} onChange={e => updateConfig("dataFim", e.target.value)} />
            </div>
          </div>
        );

      case "condicao_dia_semana":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Dias da semana</Label>
            {DIAS_SEMANA.map(dia => (
              <label key={dia.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={(config.dias || []).includes(dia.value)}
                  onCheckedChange={(checked) => {
                    const current = config.dias || [];
                    updateConfig("dias", checked ? [...current, dia.value] : current.filter((d: string) => d !== dia.value));
                  }}
                />
                {dia.label}
              </label>
            ))}
          </div>
        );

      case "condicao_horario":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Hora Início</Label>
              <Input type="time" value={config.horaInicio || "18:00"} onChange={e => updateConfig("horaInicio", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hora Fim</Label>
              <Input type="time" value={config.horaFim || "23:59"} onChange={e => updateConfig("horaFim", e.target.value)} />
            </div>
          </div>
        );

      case "condicao_cupom":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Código do Cupom</Label>
              <Input value={config.codigo || ""} onChange={e => updateConfig("codigo", e.target.value.toUpperCase())} placeholder="EX: PROMO10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Usos Máximos</Label>
              <Input type="number" value={config.usosMaximos || 100} onChange={e => updateConfig("usosMaximos", Number(e.target.value))} />
            </div>
          </div>
        );

      case "acao_desconto_percentual":
      case "acao_desconto_pix":
      case "acao_desconto_boleto":
      case "acao_desconto_frete":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Percentual (%)</Label>
              <Input type="number" value={config.percentual || 0} onChange={e => updateConfig("percentual", Number(e.target.value))} min={0} max={100} />
            </div>
            {type === "acao_desconto_percentual" && (
              <div className="space-y-1">
                <Label className="text-xs">Aplicar em</Label>
                <Select value={config.aplicarEm || "carrinho"} onValueChange={v => updateConfig("aplicarEm", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carrinho">Todo o Carrinho</SelectItem>
                    <SelectItem value="produto">Produto Específico</SelectItem>
                    <SelectItem value="categoria">Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      case "acao_desconto_fixo":
      case "acao_frete_fixo":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" value={config.valor || 0} onChange={e => updateConfig("valor", Number(e.target.value))} step="0.01" />
          </div>
        );

      case "acao_compre_x_leve_y":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Compre (quantidade)</Label>
              <Input type="number" value={config.compre || 2} onChange={e => updateConfig("compre", Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Leve (quantidade)</Label>
              <Input type="number" value={config.leve || 3} onChange={e => updateConfig("leve", Number(e.target.value))} min={1} />
            </div>
          </div>
        );

      case "acao_parcelas_extras":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Máx. Parcelas</Label>
              <Input type="number" value={config.maxParcelas || 12} onChange={e => updateConfig("maxParcelas", Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={config.semJuros !== false} onCheckedChange={v => updateConfig("semJuros", v)} />
              Sem juros
            </label>
          </div>
        );

      case "acao_banner_promocional":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={config.titulo || ""} onChange={e => updateConfig("titulo", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL da Imagem</Label>
              <Input value={config.imagem || ""} onChange={e => updateConfig("imagem", e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link</Label>
              <Input value={config.link || ""} onChange={e => updateConfig("link", e.target.value)} placeholder="/ecommerce/catalogo" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Posição</Label>
              <Select value={config.posicao || "topo"} onValueChange={v => updateConfig("posicao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="topo">Topo da Página</SelectItem>
                  <SelectItem value="meio">Meio da Home</SelectItem>
                  <SelectItem value="lateral">Lateral</SelectItem>
                  <SelectItem value="rodape">Rodapé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "acao_popup_promocional":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={config.titulo || ""} onChange={e => updateConfig("titulo", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={config.mensagem || ""} onChange={e => updateConfig("mensagem", e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Texto do Botão</Label>
              <Input value={config.botaoTexto || "Aproveitar!"} onChange={e => updateConfig("botaoTexto", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delay (segundos)</Label>
              <Input type="number" value={config.delay || 3} onChange={e => updateConfig("delay", Number(e.target.value))} />
            </div>
          </div>
        );

      case "acao_mensagem_carrinho":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Mensagem (use {"{valor}"} para valor dinâmico)</Label>
            <Textarea value={config.mensagem || ""} onChange={e => updateConfig("mensagem", e.target.value)} rows={3} />
          </div>
        );

      case "acao_frete_gratis":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Aplicar para</Label>
            <Select value={config.regioes || "todas"} onValueChange={v => updateConfig("regioes", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as regiões</SelectItem>
                <SelectItem value="sudeste">Sudeste</SelectItem>
                <SelectItem value="sul">Sul</SelectItem>
                <SelectItem value="nordeste">Nordeste</SelectItem>
                <SelectItem value="norte">Norte</SelectItem>
                <SelectItem value="centro-oeste">Centro-Oeste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return <p className="text-xs text-muted-foreground">Sem configurações adicionais para este bloco.</p>;
    }
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Propriedades</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {blockDef && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/30">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: blockDef.color + '20' }}>
                {(() => { const I = (Icons as any)[blockDef.icon]; return I ? <I className="w-4 h-4" style={{ color: blockDef.color }} /> : null; })()}
              </div>
              <div>
                <span className="text-sm font-medium">{blockDef.label}</span>
                <span className="text-xs text-muted-foreground block">{blockDef.description}</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Rótulo</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome do bloco" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nota</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Anotação opcional..." />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Configurações</h4>
            {renderConfigFields()}
          </div>

          <div className="border-t pt-4">
            <Button variant="destructive" size="sm" className="w-full" onClick={() => onDelete(node.id)}>
              Excluir Bloco
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
